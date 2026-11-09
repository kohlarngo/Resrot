// ================= หลังบ้านผู้ดูแลแพลตฟอร์ม (admin) และนักพัฒนา (dev) =================
// โหลดก่อน backoffice.js — ใช้ pageHead / kpi / fg ฯลฯ จาก backoffice.js ตอนเรียกใช้เท่านั้น

function admHome(main) {
  const bks = DB.bookings(), today = todayISO(), ym = today.slice(0, 7), users = DB.users();
  const owners = users.filter(u => u.role === 'owner'), pendingOwners = owners.filter(u => u.ownerStatus === 'pending');
  const month = bks.filter(b => b.createdAt.startsWith(ym) && b.status !== 'cancelled');
  const top = Object.values(bks.filter(b => b.status !== 'cancelled').reduce((m, b) => { (m[b.ownerId] ||= { id: b.ownerId, n: 0, gmv: 0 }); m[b.ownerId].n++; m[b.ownerId].gmv += b.total; return m; }, {})).sort((a, b) => b.gmv - a.gmv).slice(0, 5);
  const al = boAlerts();
  main.innerHTML = pageHead('ภาพรวมแพลตฟอร์ม', fmtDate(today)) +
    (al.list.length ? al.list.map(([ic, t, h]) => `<a class="notice warn" href="${h}" style="display:flex;text-decoration:none"><i class="fa-solid ${ic}"></i><div>${t} →</div></a>`).join('') : '') +
    `<div class="kpi-grid k4">${kpi('fa-clipboard-list', 'info', 'การจองเดือนนี้', month.length, `ทั้งหมด ${bks.length}`)}${kpi('fa-sack-dollar', 'ok', 'มูลค่าการจองเดือนนี้ (GMV)', shortMoney(month.reduce((s, b) => s + b.total, 0)))}${kpi('fa-store', 'violet', 'ผู้ให้บริการ', owners.filter(o => o.ownerStatus === 'approved').length, pendingOwners.length ? `รออนุมัติ ${pendingOwners.length}` : '')}${kpi('fa-ship', 'warn', 'ทริปที่เปิดอยู่', DB.trips().length)}</div>
    <div class="bo-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px"><div class="card"><div class="card-h"><h3><i class="fa-solid fa-trophy"></i> ผู้ให้บริการยอดสูงสุด</h3></div>
      ${top.length ? `<table class="tbl"><tbody>${top.map(t => `<tr><td>${esc(users.find(u => u.id === t.id)?.biz?.name || users.find(u => u.id === t.id)?.name || '-')}</td><td>${t.n} การจอง</td><td><b>${shortMoney(t.gmv)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="bo-empty">ยังไม่มีข้อมูล</div>'}</div>
    <div class="card"><div class="card-h"><h3><i class="fa-solid fa-clock"></i> การจองล่าสุด</h3><a href="#/admin/bookings">ทั้งหมด</a></div>
      <table class="tbl"><tbody>${bks.slice(0, 6).map(b => `<tr class="click" data-b="${esc(b.id)}"><td>${esc(b.id)}</td><td>${esc(b.tripName || '')}</td><td>${money(b.total)}</td><td>${boPill(b.status)}</td></tr>`).join('') || '<tr><td class="bo-empty">ยังไม่มีการจอง</td></tr>'}</tbody></table></div></div>`;
  $$('[data-b]', main).forEach(r => r.onclick = () => bookingModal(r.dataset.b));
}

// ---------- ผู้ให้บริการ ----------
function admPartners(main, params) {
  const tab = params.get('st') || 'pending', owners = DB.users().filter(u => u.role === 'owner');
  const list = owners.filter(o => tab === 'all' || o.ownerStatus === tab), cnt = k => owners.filter(o => k === 'all' || o.ownerStatus === k).length;
  main.innerHTML = pageHead('ผู้ให้บริการ', 'อนุมัติ/ระงับร้านที่ลงทะเบียน') +
    `<div class="tabs">${[['pending', 'รออนุมัติ'], ['approved', 'ใช้งานอยู่'], ['rejected', 'ไม่ผ่าน'], ['all', 'ทั้งหมด']].map(([k, l]) => `<a href="#/admin/partners?st=${k}" class="${tab === k ? 'on' : ''}">${l} <em>${cnt(k)}</em></a>`).join('')}</div>` +
    (list.length ? list.map(o => `<div class="card"><div class="row between" style="flex-wrap:wrap"><div><b style="font-size:16px">${esc(o.biz?.name || o.name)}</b> <span class="pill ${o.ownerStatus === 'approved' ? 'ok' : o.ownerStatus === 'rejected' ? 'bad' : ''}">${{ pending: 'รออนุมัติ', approved: 'ใช้งานอยู่', rejected: 'ไม่ผ่าน' }[o.ownerStatus]}</span>${o.active === false ? ' <span class="pill bad">ระงับ</span>' : ''}
      <div class="small muted">${esc(o.name)} · ${esc(o.email)} · ${esc(o.biz?.phone || o.phone || '')} ${o.biz?.line ? '· LINE ' + esc(o.biz.line) : ''} · ${CATEGORIES[o.biz?.kind]?.label || ''}</div><div class="small muted">ทริป ${CACHE.trips.filter(t => t.ownerId === o.id).length} · การจอง ${DB.bookings().filter(b => b.ownerId === o.id).length}</div></div>
      <div class="row">${o.ownerStatus !== 'approved' ? `<button class="btn btn-primary btn-sm" data-ap="${o.id}">อนุมัติ</button>` : `<button class="btn btn-outline btn-sm" data-sus="${o.id}">${o.active === false ? 'เปิดใช้งาน' : 'ระงับ'}</button>`}${o.ownerStatus === 'pending' ? `<button class="btn btn-ghost btn-sm" data-rj="${o.id}" style="color:var(--bad)">ไม่อนุมัติ</button>` : ''}</div></div></div>`).join('') : '<div class="card bo-empty">ไม่มีรายการ</div>');
  const act = (sel, patch, log) => $$(sel, main).forEach(b => b.onclick = async () => { const id = b.dataset[Object.keys(b.dataset)[0]]; const o = owners.find(x => x.id === id); try { await DB.setProfile(id, typeof patch === 'function' ? patch(o) : patch); DB.log(log, o.email); toast('บันทึกแล้ว'); render(); } catch {} });
  act('[data-ap]', { owner_status: 'approved', active: true }, 'partner.approve'); act('[data-rj]', { owner_status: 'rejected' }, 'partner.reject'); act('[data-sus]', o => ({ active: o.active === false }), 'partner.suspend');
}

// ---------- ทริปทั้งหมด ----------
function admTrips(main) {
  const list = CACHE.trips, users = DB.users(), dev = DB.currentUser()?.role === 'dev';
  main.innerHTML = pageHead('ทริปทั้งหมด', `${list.length} รายการ`, dev ? '<button class="btn btn-primary" id="nt"><i class="fa-solid fa-plus"></i> เพิ่มทริป</button>' : '') + `<div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>ทริป</th><th>ผู้ให้บริการ</th><th>หมวด</th><th>ราคาเริ่มต้น</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${list.map(t => `<tr><td><a href="index.html#/trip/${esc(t.id)}" target="_blank"><b>${esc(t.name)}</b></a></td><td>${esc(users.find(u => u.id === t.ownerId)?.biz?.name || DB.owner(t.ownerId)?.name || '-')}</td><td>${catLabel(t.category)}</td><td>${isFinite(lowest(t)) ? money(lowest(t)) : '-'}</td>
      <td>${t.banned ? '<span class="pill bad">ถูกระงับ</span>' : t.active === false ? '<span class="pill">ปิด</span>' : '<span class="pill ok">เปิด</span>'}</td><td style="white-space:nowrap">${dev ? `<button class="btn btn-primary btn-sm" data-ed="${esc(t.id)}">แก้ไข</button> ` : ''}<button class="btn btn-outline btn-sm" data-bn="${esc(t.id)}">${t.banned ? 'ปลดระงับ' : 'ระงับ'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="bo-empty" style="text-align:center;padding:24px">ยังไม่มีทริป</td></tr>'}</tbody></table></div></div>`;
  if (dev) { $('#nt').onclick = () => tripEditor(null); $$('[data-ed]', main).forEach(b => b.onclick = () => tripEditor(DB.trip(b.dataset.ed))); }
  $$('[data-bn]', main).forEach(b => b.onclick = async () => { const t = DB.trip(b.dataset.bn); try { await DB.saveTrip({ ...t, banned: !t.banned }); DB.log('trip.ban', t.id); render(); } catch {} });
}

// ---------- โฆษณา ----------
const AD_KINDS = { popup: 'ป็อปอัปหน้าแรก', card: 'การ์ดหน้าแรก', side_left: 'แบนเนอร์ข้างซ้าย', side_right: 'แบนเนอร์ข้างขวา', bottom_bar: 'แถบล่างจอ', featured: 'ทริปแนะนำ (จ่ายค่าโฆษณา)' };
function admAds(main) {
  const list = DB.ads(), today = todayISO();
  const live = a => a.active && (!a.start || a.start <= today) && (!a.end || a.end >= today);
  main.innerHTML = pageHead('โฆษณา', 'แบนเนอร์ / ป็อปอัป / ทริปแนะนำ — ติดตามยอดดูและคลิก', '<button class="btn btn-primary" id="na"><i class="fa-solid fa-plus"></i> เพิ่มโฆษณา</button>') +
    `<div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>โฆษณา</th><th>ตำแหน่ง</th><th>ช่วงเวลา</th><th>ดู / คลิก</th><th>ค่าโฆษณา</th><th>สถานะ</th></tr></thead><tbody>
    ${list.map(a => `<tr class="click" data-a="${a.id}"><td><b>${esc(a.advertiser)}</b><div class="small muted">${esc(a.title)}</div></td><td>${AD_KINDS[a.kind]}</td><td class="small">${a.start ? fmtDate(a.start, false) : '-'} → ${a.end ? fmtDate(a.end, false) : '-'}</td><td>${a.views} / ${a.clicks}${a.views ? ` <span class="small muted">(${(a.clicks / a.views * 100).toFixed(1)}%)</span>` : ''}</td><td>${money(a.fee)} ${a.paid ? '<span class="pill ok">จ่ายแล้ว</span>' : a.fee ? '<span class="pill bad">ค้าง</span>' : ''}</td><td>${live(a) ? '<span class="pill ok">แสดงอยู่</span>' : '<span class="pill">ไม่แสดง</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="bo-empty" style="text-align:center;padding:24px">ยังไม่มีโฆษณา</td></tr>'}</tbody></table></div></div>`;
  const edit = a0 => {
    const a = a0 || { kind: 'side_right', advertiser: '', active: true, fee: 0, paid: false }; let image = a.image || '';
    const m = openModal(`<h2>${a0 ? 'แก้ไขโฆษณา' : 'เพิ่มโฆษณา'}</h2><form id="af" class="form-grid" style="grid-template-columns:1fr 1fr">
      <div class="fg"><label>ตำแหน่ง</label><select name="kind">${Object.entries(AD_KINDS).map(([k, l]) => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>${fg('advertiser', 'ผู้ลงโฆษณา *', a.advertiser)}
      ${fg('title', 'หัวข้อ', a.title, 'maxlength="80"')}${fg('body', 'ข้อความสั้น', a.body, 'maxlength="160"')}
      <div class="fg"><label>ทริปที่โปรโมต (สำหรับ "ทริปแนะนำ"/ลิงก์ไปหน้าทริป)</label><select name="tripId"><option value="">—</option>${CACHE.trips.map(t => `<option value="${esc(t.id)}" ${a.tripId === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>${fg('link', 'ลิงก์ปลายทาง (https://...)', a.link)}
      ${fg('phone', 'เบอร์โทร', a.phone)}${fg('fee', 'ค่าโฆษณา (฿)', a.fee, 'type="number" min="0"')}${fg('start', 'เริ่มแสดง', a.start || '', 'type="date"')}${fg('end', 'สิ้นสุด', a.end || '', 'type="date"')}
      <div class="fg" style="grid-column:1/-1"><label>รูปโฆษณา</label><div class="row"><img id="ai" src="${esc(image || 'assets/icon-192.png')}" style="width:96px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--bo-line)"><button type="button" class="btn btn-outline btn-sm" id="aib">อัปโหลดรูป</button></div></div>
      <label class="small" style="display:flex;gap:8px"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}> เปิดแสดง</label><label class="small" style="display:flex;gap:8px"><input type="checkbox" name="paid" ${a.paid ? 'checked' : ''}> ชำระค่าโฆษณาแล้ว</label>
      <div class="row" style="grid-column:1/-1;justify-content:space-between">${a0 ? '<button type="button" class="btn btn-ghost" id="adel" style="color:var(--bad)">ลบ</button>' : '<span></span>'}<button class="btn btn-primary">บันทึก</button></div></form>`);
    $('#aib', m).onclick = async () => { const f = await pickFile(); if (!f) return; try { image = await uploadImage(f); $('#ai', m).src = image; } catch (e) { toast(e.message, 'err'); } };
    $('#adel', m)?.addEventListener('click', async () => { if (await confirmBox('ลบโฆษณานี้?')) { await DB.deleteAd(a.id); closeModal(); render(); } });
    $('#af', m).onsubmit = async e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); if (!f.advertiser.trim()) return toast('กรุณากรอกผู้ลงโฆษณา', 'err');
      if (f.link && !/^https?:\/\//i.test(f.link)) return toast('ลิงก์ต้องขึ้นต้นด้วย http(s)://', 'err');
      if (f.kind === 'featured' && !f.tripId) return toast('เลือกทริปที่ต้องการโปรโมต', 'err');
      try { await DB.saveAd({ ...a, ...f, image, active: !!f.active, paid: !!f.paid, fee: +f.fee || 0, start: f.start || null, end: f.end || null }); DB.log('ad.save', f.advertiser); closeModal(); toast('บันทึกแล้ว'); render(); } catch {}
    };
  };
  $('#na').onclick = () => edit(null); $$('[data-a]', main).forEach(r => r.onclick = () => edit(list.find(a => a.id === r.dataset.a)));
}

// ---------- SOS ----------
function admSos(main) {
  const list = DB.sos(), ST = { new: ['ใหม่', 'bad'], handling: ['กำลังช่วยเหลือ', 'warn'], done: ['เสร็จสิ้น', 'ok'] };
  const contacts = DB.sosContacts();
  main.innerHTML = pageHead('แจ้งเหตุ SOS', 'รายการที่ลูกค้ากดขอความช่วยเหลือจากหน้าเว็บ') + (list.length ? list.map(s => {
    const inc = SOS_INCIDENTS.find(i => i.id === s.incident), svc = contacts.find(c => c.id === s.service);
    return `<div class="card ${s.status === 'new' ? 'danger' : ''}"><div class="row between" style="flex-wrap:wrap"><div><span class="pill ${ST[s.status][1]}">${ST[s.status][0]}</span> <b>${esc(inc?.label || 'ไม่ระบุเหตุ')}</b> <span class="small muted">${fmtDateTime(s.at)} · ส่งถึง ${esc(svc?.name || s.service || '')}</span></div>
      <select class="sel" data-sst="${s.id}">${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
      <div style="margin-top:6px">${esc(s.name || '-')} · ${s.phone ? `<a href="${telUrl(s.phone)}">${esc(s.phone)}</a>` : '-'} · ${esc(s.people || 1)} คน${s.mark ? ` · จุดสังเกต: ${esc(s.mark)}` : ''}</div>${s.note ? `<div class="small">${esc(s.note)}</div>` : ''}
      ${s.lat != null ? `<div class="small"><a href="${mapsLink(s.lat, s.lng)}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot red"></i> ${(+s.lat).toFixed(5)}, ${(+s.lng).toFixed(5)}</a></div>` : '<div class="small muted">ไม่มีพิกัด</div>'}
      ${(s.photos || []).length ? `<div class="row" style="gap:6px;margin-top:6px">${s.photos.map(p => { const u = supa.storage.from('tour-sos').getPublicUrl(p).data.publicUrl; return `<a href="${esc(u)}" target="_blank"><img src="${esc(u)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px"></a>`; }).join('')}</div>` : ''}</div>`;
  }).join('') : '<div class="card bo-empty">ยังไม่มีการแจ้งเหตุ</div>') +
    `<div class="card"><div class="card-h"><h3><i class="fa-solid fa-phone"></i> เบอร์ติดต่อฉุกเฉินที่แสดงบนเว็บ</h3></div><textarea id="sc" rows="8" style="width:100%;font-family:monospace;font-size:12px">${esc(JSON.stringify(contacts, null, 2))}</textarea><div class="small muted">แก้ไขเป็น JSON: id, icon, name, hotline, local, localName</div><div class="row" style="margin-top:8px"><button class="btn btn-primary btn-sm" id="scs">บันทึกเบอร์</button><button class="btn btn-ghost btn-sm" id="scr">คืนค่าเริ่มต้น</button></div></div>`;
  $$('[data-sst]', main).forEach(s => s.onchange = async () => { await DB.setSosStatus(s.dataset.sst, s.value); DB.log('sos.status', s.dataset.sst + ' → ' + s.value); render(); });
  $('#scs').onclick = async () => { try { const v = JSON.parse($('#sc').value); if (!Array.isArray(v) || v.some(c => !c.id || !c.name || !c.hotline)) throw new Error('ทุกรายการต้องมี id, name, hotline'); await DB.saveSosContacts(v); DB.log('sos.contacts', v.length + ' รายการ'); toast('บันทึกแล้ว'); } catch (e) { toast('JSON ไม่ถูกต้อง: ' + e.message, 'err'); } };
  $('#scr').onclick = async () => { if (await confirmBox('คืนค่าเริ่มต้น?')) { await DB.saveSosContacts(DEFAULT_SOS_CONTACTS); render(); } };
}

// ---------- ผู้ใช้ ----------
function admUsers(main, params) {
  const me = DB.currentUser(), q = (params.get('q') || '').toLowerCase(), list = DB.users().filter(u => !q || [u.name, u.email, u.phone].join(' ').toLowerCase().includes(q));
  main.innerHTML = pageHead('ผู้ใช้', `${list.length} บัญชี`) + `<div class="filters"><div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="uq" value="${esc(params.get('q') || '')}" placeholder="ค้นหาชื่อ / อีเมล / เบอร์"></div></div>
    <div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สมัครเมื่อ</th><th></th></tr></thead><tbody>
    ${list.slice(0, 300).map(u => `<tr><td>${esc(u.name)}<div class="small muted">${esc(u.phone || '')}</div></td><td>${esc(u.email)}</td><td>${me.role === 'dev' && u.id !== me.id ? `<select class="sel" data-role="${u.id}">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>` : `<span class="pill">${ROLES[u.role].label}</span>`}</td><td class="small">${fmtDate(u.createdAt, false)}</td>
      <td>${u.id !== me.id && (me.role === 'dev' || !isStaff(u)) ? `<button class="btn btn-outline btn-sm" data-act="${u.id}">${u.active === false ? 'เปิดใช้งาน' : 'ระงับ'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div></div>
    ${me.role !== 'dev' ? '<p class="small muted">การเปลี่ยนบทบาทผู้ใช้ทำได้ที่หน้านักพัฒนา (dev.html) เท่านั้น</p>' : ''}`;
  $('#uq').onchange = e => (location.hash = '#/admin/users?q=' + encodeURIComponent(e.target.value.trim()));
  $$('[data-role]', main).forEach(s => s.onchange = async () => {
    const u = list.find(x => x.id === s.dataset.role); if (!(await confirmBox(`เปลี่ยนบทบาทของ ${esc(u.email)} เป็น "${ROLES[s.value].label}"?`))) return render();
    const patch = { role: s.value }; if (s.value === 'owner') patch.owner_status = 'approved';
    try { await DB.setProfile(u.id, patch); DB.log('user.role', `${u.email} → ${s.value}`); toast('บันทึกแล้ว'); } catch {} render();
  });
  $$('[data-act]', main).forEach(b => b.onclick = async () => { const u = list.find(x => x.id === b.dataset.act); try { await DB.setProfile(u.id, { active: u.active === false }); DB.log('user.active', u.email); render(); } catch {} });
}

// ---------- ตั้งค่าเว็บ ----------
function admSettings(main) {
  const s = DB.settings();
  main.innerHTML = pageHead('ตั้งค่าเว็บ') + `<form id="sf" class="card" style="max-width:640px"><div class="form-grid" style="grid-template-columns:1fr 1fr">${fg('bizName', 'ชื่อแบรนด์', s.bizName)}${fg('legalName', 'ชื่อนิติบุคคล / ท้ายเว็บ', s.legalName)}${fg('phone', 'เบอร์ติดต่อ', s.phone)}${fg('line', 'LINE ID', s.line)}</div>
    <h3 style="margin-top:16px">ประกาศบนหัวเว็บ</h3><label class="small" style="display:flex;gap:8px"><input type="checkbox" name="announceOn" ${s.announceOn ? 'checked' : ''}> แสดงประกาศ</label>
    <div class="form-grid" style="grid-template-columns:3fr 1fr">${fg('announce', 'ข้อความ', s.announce, 'maxlength="200"')}<div class="fg"><label>สี</label><select name="announceType">${[['info', 'ฟ้า'], ['warn', 'เหลือง'], ['bad', 'แดง']].map(([k, l]) => `<option value="${k}" ${s.announceType === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <button class="btn btn-primary" style="margin-top:12px">บันทึก</button></form>`;
  $('#sf').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); try { await DB.setKv('settings', { ...s, ...f, announceOn: !!f.announceOn }); DB.log('settings.save', ''); toast('บันทึกแล้ว'); render(); } catch {} };
}
function admAudit(main) {
  const list = CACHE.audit;
  main.innerHTML = pageHead('ประวัติการทำงาน', '500 รายการล่าสุด') + `<div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>เวลา</th><th>ผู้ทำ</th><th>การกระทำ</th><th>รายละเอียด</th></tr></thead><tbody>${list.map(a => `<tr><td class="small">${fmtDateTime(a.at)}</td><td>${esc(a.name || '-')}</td><td><code>${esc(a.action)}</code></td><td class="small">${esc(a.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="bo-empty" style="text-align:center;padding:24px">ยังไม่มีประวัติ</td></tr>'}</tbody></table></div></div>`;
}

// ================= นักพัฒนา =================
async function devSystem(main) {
  const f = DB.flags();
  const tables = ['tour_trips', 'tour_bookings', 'tour_profiles', 'tour_coupons', 'tour_reviews', 'tour_ads', 'tour_sos'];
  main.innerHTML = pageHead('สถานะระบบ') + `<div class="kpi-grid k4" id="cnt">${tables.map(t => kpi('fa-database', 'info', t, '…')).join('')}</div>
    <div class="card" style="max-width:560px"><div class="card-h"><h3><i class="fa-solid fa-screwdriver-wrench"></i> โหมดปิดปรับปรุง</h3></div><label class="small" style="display:flex;gap:8px"><input type="checkbox" id="mt" ${f.maintenance ? 'checked' : ''}> ปิดเว็บลูกค้าชั่วคราว (ทีมงานยังเข้าได้)</label>
      <div class="fg" style="margin-top:8px"><label>ข้อความถึงลูกค้า</label><input id="mm" value="${esc(f.maintenanceMsg)}"></div><button class="btn btn-primary btn-sm" id="ms" style="margin-top:8px">บันทึก</button></div>
    <div class="card"><div class="card-h"><h3><i class="fa-solid fa-plug"></i> การเชื่อมต่อ</h3></div><div class="small">Supabase: <code>${esc(CFG.SUPABASE_URL)}</code></div><div class="small">เวอร์ชันสคีมาที่ต้องการ: 0001_tourgo_core</div></div>`;
  $('#ms').onclick = async () => { await DB.setKv('flags', { ...f, maintenance: $('#mt').checked, maintenanceMsg: $('#mm').value }); DB.log('flags.maintenance', String($('#mt').checked)); toast('บันทึกแล้ว'); render(); };
  const res = await Promise.all(tables.map(t => supa.from(t).select('*', { count: 'exact', head: true }).then(r => (r.error ? 'ERR' : r.count))));
  if ($('#cnt')) $('#cnt').innerHTML = tables.map((t, i) => kpi('fa-database', res[i] === 'ERR' ? 'bad' : 'info', t, res[i])).join('');
}
function devLogs(main) {
  main.innerHTML = pageHead('Error logs', '200 รายการล่าสุดจากเครื่องผู้ใช้') + `<div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>เวลา</th><th>ชนิด</th><th>ข้อความ</th><th>หน้า</th></tr></thead><tbody>${CACHE.errors.map(e => `<tr><td class="small">${fmtDateTime(e.at)}</td><td>${esc(e.kind)}</td><td class="small">${esc(e.message)}</td><td class="small">${esc(e.page)}</td></tr>`).join('') || '<tr><td colspan="4" class="bo-empty" style="text-align:center;padding:24px">ไม่มี error 🎉</td></tr>'}</tbody></table></div></div>`;
}
function devBackup(main) {
  main.innerHTML = pageHead('สำรองข้อมูล', 'ดาวน์โหลดข้อมูลหลักเป็นไฟล์ JSON') + `<div class="card"><p class="small muted">รวม: ทริป, การจอง (ไม่รวมสลิป), โค้ดส่วนลด, โฆษณา, รีวิว, ตั้งค่า</p><button class="btn btn-primary" id="bk"><i class="fa-solid fa-download"></i> ดาวน์โหลดสำรอง</button></div>`;
  $('#bk').onclick = () => {
    const strip = b => ({ ...b, payment: { ...b.payment, slip: b.payment.slip ? '[slip]' : null } });
    downloadFile(`tour-backup-${todayISO()}.json`, JSON.stringify({ at: new Date().toISOString(), trips: CACHE.trips, bookings: CACHE.bookings.map(strip), coupons: CACHE.coupons, ads: CACHE.ads, reviews: CACHE.reviews, kv: CACHE.kv }, null, 1), 'application/json');
    DB.log('backup', todayISO());
  };
}
