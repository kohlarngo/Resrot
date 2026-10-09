// ================= หลังบ้านเจ้าของรีสอร์ท แบบเรียบง่าย =================
// โครงสร้างตามตัวอย่าง kohlardgo: แท็บหลักมีแค่ การจอง · ห้องพัก · หน้ารีสอร์ท (+ ตารางห้องว่าง) ทุกหน้าใช้รูปแบบเดียวกัน:
// การ์ดสรุป → ตัวกรอง → รายการ · ทุกห้อง/ทุกรีสอร์ทมีปุ่ม "เปลี่ยนรูป" ที่อัปโหลดจากเครื่องได้ทันที
// ใช้ฟังก์ชันกลางจาก admin.js (pageHead, kpi, bkAction, bindBk, hotelForm, sharePromo ฯลฯ)

// ---------- ขั้นตอนเริ่มต้น (แสดงจนกว่าจะทำครบ) ----------
function ownerSetupCard() {
  const u = DB.currentUser(), po = u.payout || {}, hs = DB.hotels(true);
  const steps = [
    [hs.some(h => h.rooms.length), 'เพิ่มรีสอร์ทและห้องพัก', 'ใส่ห้อง ราคา จำนวนห้อง และรูป', '#/admin/rooms'],
    [isPromptpayId(po.promptpayId) || !!(po.bankInfo || '').trim(), 'ตั้งบัญชีรับเงิน', 'ใส่พร้อมเพย์หรือเลขบัญชี ลูกค้าจะโอนเงินเข้าบัญชีคุณโดยตรง', '#/admin/payout'],
    [hs.some(h => (h.images || []).length > 1 && Object.keys(h.social || {}).length), 'ตกแต่งหน้ารีสอร์ท', 'ใส่รูปปก รูปเพิ่มเติม และลิงก์ Facebook / TikTok / LINE', '#/admin/shop'],
  ];
  const todo = steps.filter(s => !s[0]).length;
  if (!todo) return '';
  return `<section class="card checklist"><div class="card-h"><h3><i class="fa-solid fa-list-check"></i> เริ่มต้นใช้งาน — เหลืออีก ${todo} ขั้นตอน</h3><span class="small muted">${steps.length - todo}/${steps.length} เสร็จแล้ว</span></div>
    ${steps.map(([ok, t, s, h], i) => `<a class="ck-step ${ok ? 'done' : ''}" href="${h}"><span class="ck-n">${ok ? '<i class="fa-solid fa-check"></i>' : i + 1}</span><div><b>${t}</b><small>${s}</small></div>${ok ? '' : '<i class="fa-solid fa-chevron-right muted"></i>'}</a>`).join('')}</section>`;
}

// ================= 1) การจอง =================
function boOwnerBookings(main, params) {
  const f = { st: params.has('q') ? '' : (params.get('st') ?? 'pending'), when: '', q: params.get('q') || '' };
  const PER = 40; let shown = PER;
  const real = () => DB.bookings().filter(b => b.source !== 'external'); // รายการ "ปิดห้อง" ดูได้ที่ตารางห้องว่าง
  main.innerHTML = pageHead('การจอง', 'ลูกค้าโอนเงินแล้วแนบสลิป → ตรวจยอดในแอปธนาคาร → กด "อนุมัติ" · เปิดหน้านี้ค้างไว้ หน้าจะอัปเดตและมีเสียงเตือนเมื่อมีการจองใหม่') + ownerSetupCard() + `
    <div class="kpi-grid k4" id="ob-stats"></div>
    <section class="card"><div class="ob-tool">
      <select id="ob-st" class="sel"><option value="">ทุกสถานะ</option>${['pending', 'confirmed', 'inhouse', 'completed', 'cancelled'].map(k => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${BO_ST[k]}</option>`).join('')}</select>
      <select id="ob-when" class="sel"><option value="">ทุกช่วงเวลา</option><option value="upcoming">วันนี้เป็นต้นไป</option><option value="past">ที่ผ่านมาแล้ว</option></select>
      <input id="ob-q" type="search" class="sel" placeholder="ค้นหาชื่อ / เบอร์ / รหัสจอง / ห้อง" value="${esc(f.q)}" style="flex:1;min-width:200px">
      <button class="btn btn-ghost btn-sm" id="ob-refresh"><i class="fa-solid fa-rotate"></i> รีเฟรช</button></div>
      <div id="ob-list"></div></section>`;
  const today = todayISO(), month = today.slice(0, 7);
  const slipPill = b => b.payment.slip ? '<span class="pill ok"><i class="fa-solid fa-receipt"></i> มีสลิป</span>' : b.status === 'pending' && PAY_ONLINE.includes(b.payment.method) ? '<span class="pill bad">ยังไม่ส่งสลิป</span>' : '';
  const acts = b => {
    if (!can('frontdesk')) return '';
    const st = boStatus(b);
    if (st === 'pending') return qaBtn(b, 'approve', '<i class="fa-solid fa-check"></i> อนุมัติ') + qaBtn(b, 'reject', 'ปฏิเสธ', 'btn-danger');
    if (st === 'confirmed' && b.checkIn <= today) return qaBtn(b, 'checkin', '<i class="fa-solid fa-right-to-bracket"></i> เช็คอิน');
    if (st === 'inhouse') return qaBtn(b, 'checkout', '<i class="fa-solid fa-right-from-bracket"></i> เช็คเอาท์');
    return '';
  };
  const draw = () => {
    const all = real();
    const pend = all.filter(b => b.status === 'pending'), arr = all.filter(b => b.checkIn === today && b.status !== 'cancelled');
    const up = all.filter(b => b.status === 'confirmed' && b.checkOut >= today), mon = all.filter(b => b.status === 'confirmed' && b.checkIn.startsWith(month));
    $('#ob-stats').innerHTML = kpi('fa-hourglass-half', pend.length ? 'warn' : 'ok', 'รอยืนยัน', pend.length, `${pend.filter(readyToApprove).length} รายการพร้อมตรวจ`)
      + kpi('fa-calendar-day', 'info', 'เช็คอินวันนี้', arr.length, 'แขกที่จะมาถึงวันนี้')
      + kpi('fa-circle-check', 'ok', 'ยืนยันแล้ว (กำลังจะมาถึง)', up.length, 'รวมแขกที่พักอยู่')
      + kpi('fa-chart-line', 'violet', 'ยืนยันแล้วเดือนนี้', mon.length, money(mon.reduce((s, b) => s + b.price.total, 0)));
    const t = f.q.toLowerCase();
    let list = all.filter(b => (!f.st || boStatus(b) === f.st)
      && (!f.when || (f.when === 'upcoming' ? b.checkOut >= today : b.checkOut < today))
      && (!t || [b.id, guestName(b), b.guest.phone, b.guest.email, b.hotelName, b.roomName].join(' ').toLowerCase().includes(t)));
    list.sort((a, c) => (c.status === 'pending') - (a.status === 'pending') || (a.status === 'pending' ? (a.createdAt < c.createdAt ? -1 : 1) : f.when === 'upcoming' ? (a.checkIn < c.checkIn ? -1 : 1) : (a.createdAt < c.createdAt ? 1 : -1)));
    const rows = list.slice(0, shown);
    $('#ob-list').innerHTML = !list.length ? '<div class="bo-empty sm"><i class="fa-regular fa-calendar"></i><p class="muted">ไม่มีการจองตามเงื่อนไขนี้</p></div>' :
      rows.map(b => `<div class="ob-card" data-bk="${b.id}"><span class="bo-av sm">${esc(b.guest.firstName[0] || '?')}</span>
        <div class="ob-info"><div><b>${esc(guestName(b))}</b> ${stChip(b)}</div><div class="small muted">${esc(b.guest.phone)} · ${b.id} · ${relTime(b.createdAt)}</div>
          <div class="small">${esc(b.hotelName)} · ${b.qty}× ${esc(b.roomName)}</div>
          <div class="small"><i class="fa-regular fa-calendar"></i> ${fmtDate(b.checkIn, false)} → ${fmtDate(b.checkOut, false)} · ${b.nights} คืน</div></div>
        <div class="ob-side"><b>${money(b.price.total)}</b><div class="ob-pills">${payChip(b)} ${slipPill(b)}</div><div class="ob-acts">${acts(b)}</div></div></div>`).join('')
      + (list.length > shown ? `<div style="text-align:center;padding:12px"><button class="btn btn-outline btn-sm" id="ob-more">แสดงเพิ่ม (${list.length - shown})</button></div>` : '');
    $('#ob-more')?.addEventListener('click', () => { shown += PER; draw(); });
    bindBk($('#ob-list'), draw);
  };
  $('#ob-st').onchange = e => { f.st = e.target.value; shown = PER; draw(); };
  $('#ob-when').onchange = e => { f.when = e.target.value; shown = PER; draw(); };
  $('#ob-q').oninput = debounce(e => { f.q = e.target.value.trim(); shown = PER; draw(); }, 200);
  $('#ob-refresh').onclick = async () => { await DB.load(); render(); };
  draw();
}

// ================= ตัวจัดการรูป (อัปโหลด / เลือกปก / ลบ) =================
// imgs = อาร์เรย์ของ URL หรือ id รูป (แก้ในอาร์เรย์เดิม) — รูปแรกคือภาพปก
function imgManager(box, imgs, { min = 1 } = {}) {
  const draw = () => {
    box.innerHTML = `<div class="im-grid">${imgs.map((u, i) => `<div class="im-item ${i === 0 ? 'cover' : ''}"><img src="${esc(imgUrl(u, 300))}" alt="" onerror="this.onerror=null;this.src='https://picsum.photos/seed/im${i}/300/200'">
        ${i === 0 ? '<span class="im-badge">ภาพปก</span>' : `<button type="button" class="im-star" data-cover="${i}" title="ตั้งเป็นภาพปก"><i class="fa-solid fa-star"></i></button>`}
        <button type="button" class="im-x" data-del="${i}" title="ลบรูป"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}
      <label class="im-add"><i class="fa-solid fa-camera"></i><span>เพิ่มรูป</span><input type="file" accept="image/*" multiple hidden></label></div>
      <input class="im-url" placeholder="หรือวางลิงก์รูป (URL) แล้วกด Enter">`;
    $$('[data-cover]', box).forEach(b => b.onclick = () => { const [x] = imgs.splice(+b.dataset.cover, 1); imgs.unshift(x); draw(); });
    $$('[data-del]', box).forEach(b => b.onclick = () => { if (imgs.length <= min) return toast(`ต้องมีรูปอย่างน้อย ${min} รูป`, 'err'); imgs.splice(+b.dataset.del, 1); draw(); });
    $('.im-url', box).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) { imgs.push(v); draw(); } } };
    $('input[type=file]', box).onchange = async e => {
      const files = [...e.target.files]; if (!files.length) return;
      toast(`กำลังอัปโหลด ${files.length} รูป...`, 'info');
      try { for (const file of files) imgs.push(await uploadImage(await resizeImage(file, 1600))); toast(`เพิ่ม ${files.length} รูปแล้ว`); }
      catch (err) { toast('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'err'); }
      draw();
    };
  };
  draw();
}
// เลือกไฟล์ → ย่อ → อัปโหลด → คืน URL (ใช้กับปุ่ม "เปลี่ยนรูป")
function pickAndUploadImage() {
  return new Promise((res, rej) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const file = inp.files[0]; if (!file) return res(null); try { res(await uploadImage(await resizeImage(file, 1600))); } catch (e) { rej(e); } };
    inp.click();
  });
}

// ================= 2) ห้องพัก =================
function boRoomsPage(main) {
  const hotels = DB.hotels(true);
  const net = r => Math.round(r.price * (1 - (r.discount || 0) / 100));
  const empty = '<div class="bo-empty sm"><i class="fa-solid fa-bed"></i><p class="muted">ยังไม่มีห้องพัก — กด "+ เพิ่มห้องพัก"</p></div>';
  const card = (h, r) => `<div class="rm-card"><div class="rm-img">${imgTag(r.img, 500, '', r.id)}<button class="rm-chg" data-rimg="${h.id}|${r.id}"><i class="fa-solid fa-camera"></i> เปลี่ยนรูป</button></div>
    <div class="rm-body"><b>${esc(r.name)}</b><div class="small muted">${esc(r.bed)} · ${r.size} ตร.ม. · พักได้ ${r.maxGuests} คน · ${esc(r.view)}</div>
      <div class="rm-price"><b>${money(net(r))}</b> /คืน ${r.discount ? `<s class="muted small">${money(r.price)}</s> <span class="tag-s red">-${r.discount}%</span>` : ''}</div>
      <div class="rm-chips"><span class="tag-s">${r.total} ห้อง</span>${r.breakfast ? '<span class="tag-s blue">อาหารเช้า</span>' : ''}${r.freeCancel ? '<span class="tag-s green">ยกเลิกฟรี</span>' : ''}${r.payAtHotel ? '<span class="tag-s green">จ่ายที่พัก</span>' : ''}</div>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn btn-outline btn-sm" data-redit="${h.id}|${r.id}"><i class="fa-solid fa-pen"></i> แก้ไข</button><button class="btn btn-ghost btn-sm red" data-rdel="${h.id}|${r.id}"><i class="fa-solid fa-trash"></i></button></div></div></div>`;
  main.innerHTML = pageHead('ห้องพัก', 'เพิ่มห้อง แก้ราคา จำนวนห้อง หรือกด "เปลี่ยนรูป" บนรูปห้องเพื่อเปลี่ยนรูปได้ทันที') + (hotels.length ? hotels.map(h => `<section class="card"><div class="card-h"><h3><i class="fa-solid fa-hotel"></i> ${esc(h.name)}</h3><button class="btn btn-primary btn-sm" data-radd="${h.id}"><i class="fa-solid fa-plus"></i> เพิ่มห้องพัก</button></div>
      <div class="rm-grid">${h.rooms.map(r => card(h, r)).join('') || empty}</div></section>`).join('')
    : '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3><p class="muted">เพิ่มข้อมูลรีสอร์ทก่อน แล้วค่อยเพิ่มห้องพัก</p><a class="btn btn-primary" href="#/admin/shop">ไปหน้ารีสอร์ท</a></div></section>');
  const redraw = () => boRoomsPage(main);
  const clone = id => JSON.parse(JSON.stringify(DB.hotel(id)));
  $$('[data-radd]', main).forEach(b => b.onclick = () => roomModal(clone(b.dataset.radd), null, redraw));
  $$('[data-redit]', main).forEach(b => b.onclick = () => { const [hid, rid] = b.dataset.redit.split('|'); const h = clone(hid); roomModal(h, h.rooms.find(r => r.id === rid), redraw); });
  $$('[data-rimg]', main).forEach(b => b.onclick = async () => {
    const [hid, rid] = b.dataset.rimg.split('|'), h = clone(hid), r = h.rooms.find(x => x.id === rid);
    try { toast('เลือกรูปจากเครื่อง...', 'info'); const url = await pickAndUploadImage(); if (!url) return; r.img = url; DB.saveHotel(h); DB.log('room.image', `${h.name} / ${r.name}`); toast('เปลี่ยนรูปห้องแล้ว'); redraw(); }
    catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); }
  });
  $$('[data-rdel]', main).forEach(b => b.onclick = async () => {
    const [hid, rid] = b.dataset.rdel.split('|'), h = clone(hid), r = h.rooms.find(x => x.id === rid);
    if (DB.bookings().some(x => x.roomId === rid && x.status !== 'cancelled' && x.checkOut >= todayISO())) return toast('ลบไม่ได้ — ห้องนี้ยังมีการจองที่ยังไม่สิ้นสุด (ปิดห้องแทนได้ที่ตารางห้องว่าง)', 'err');
    if (h.rooms.length <= 1) return toast('รีสอร์ทต้องมีห้องอย่างน้อย 1 ประเภท', 'err');
    if (!(await confirmBox(`ลบห้อง "${esc(r.name)}" ออกจาก ${esc(h.name)}?`, 'ลบห้อง'))) return;
    h.rooms = h.rooms.filter(x => x.id !== rid); DB.saveHotel(h); DB.log('room.delete', `${h.name} / ${r.name}`); toast('ลบห้องแล้ว'); redraw();
  });
}
function roomModal(h, r, done) {
  const isNew = !r;
  if (isNew) { const t = ROOM_TEMPLATES.superior; r = { id: `${h.id}-r${Date.now() % 100000}`, name: t.name, size: t.size, bed: t.bed, maxGuests: t.maxGuests, view: t.view, img: t.img, total: 5, price: 2000, discount: 0, breakfast: false, freeCancel: true, payAtHotel: false }; }
  const m = openModal(`<h2>${isNew ? 'เพิ่มห้องพัก' : 'แก้ไขห้องพัก'} <span class="small muted">· ${esc(h.name)}</span></h2>
    <form id="rm-f" class="form-grid" novalidate style="margin-top:14px">
      ${isNew ? `<div class="fg full"><label>เริ่มจากประเภทห้อง (เติมค่าให้อัตโนมัติ)</label><div class="row wrap" style="gap:8px">${Object.entries(ROOM_TEMPLATES).map(([k, t]) => `<button type="button" class="btn btn-outline btn-sm" data-tpl="${k}"><i class="fa-solid ${ROOM_ICONS[k]}"></i> ${esc(t.name.replace(/^ห้อง/, ''))}</button>`).join('')}</div></div>` : ''}
      <div class="fg full"><label>ชื่อห้อง <span class="req">*</span></label><input name="name" value="${esc(r.name)}"></div>
      <div class="fg"><label>ราคาต่อคืน (฿) <span class="req">*</span></label><input name="price" type="number" min="1" value="${r.price}"></div>
      <div class="fg"><label>ส่วนลด %</label><input name="discount" type="number" min="0" max="90" value="${r.discount || 0}"></div>
      <div class="fg"><label>จำนวนห้อง <span class="req">*</span></label><input name="total" type="number" min="1" value="${r.total}"></div>
      <div class="fg"><label>พักได้ (คน) <span class="req">*</span></label><input name="maxGuests" type="number" min="1" value="${r.maxGuests}"></div>
      <div class="fg"><label>ขนาด (ตร.ม.)</label><input name="size" type="number" min="0" value="${r.size}"></div>
      <div class="fg"><label>วิว</label><input name="view" value="${esc(r.view)}"></div>
      <div class="fg full"><label>เตียง</label><input name="bed" value="${esc(r.bed)}"></div>
      <div class="fg full"><label>รูปห้อง</label>
        <div class="imageField"><img id="rm-prev" src="${esc(imgUrl(r.img, 400))}" alt="" onerror="this.onerror=null;this.src='https://picsum.photos/seed/room/400/300'">
          <div style="flex:1"><label class="btn btn-outline btn-sm" style="cursor:pointer"><i class="fa-solid fa-camera"></i> เปลี่ยนรูป (เลือกจากเครื่อง)<input type="file" id="rm-file" accept="image/*" hidden></label>
            <input name="img" value="${esc(r.img)}" placeholder="หรือวางลิงก์รูป (URL)" style="margin-top:8px"></div></div></div>
      <div class="fg full"><div class="row wrap small" style="gap:18px">${[['breakfast', 'รวมอาหารเช้า'], ['freeCancel', 'ยกเลิกฟรี'], ['payAtHotel', 'ชำระที่ที่พักได้']].map(([k, l]) => `<label class="row" style="gap:6px"><input type="checkbox" name="${k}" ${r[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="rm-save">บันทึก</button></div>`, 'wide');
  const f = $('#rm-f', m), prev = () => $('#rm-prev', m).src = imgUrl(f.elements.img.value || r.img, 400);
  f.elements.img.oninput = prev;
  $$('[data-tpl]', m).forEach(b => b.onclick = () => { const t = ROOM_TEMPLATES[b.dataset.tpl];
    f.elements.name.value = t.name; f.elements.bed.value = t.bed; f.elements.size.value = t.size; f.elements.maxGuests.value = t.maxGuests; f.elements.view.value = t.view; f.elements.img.value = t.img;
    f.elements.price.value = Math.round(1600 * t.mult / 50) * 50; prev(); });
  $('#rm-file', m).onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { toast('กำลังอัปโหลดรูป...', 'info'); f.elements.img.value = await uploadImage(await resizeImage(file, 1600)); prev(); toast('อัปโหลดรูปแล้ว — กด "บันทึก" เพื่อใช้งาน'); }
    catch (err) { toast('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'err'); }
  };
  $('#rm-save', m).onclick = () => {
    const v = k => f.elements[k].value, n = k => +f.elements[k].value;
    if (!v('name').trim()) return toast('กรุณาใส่ชื่อห้อง', 'err');
    if (!(n('price') > 0) || !(n('total') >= 1) || !(n('maxGuests') >= 1)) return toast('ราคา จำนวนห้อง และจำนวนคนต้องมากกว่า 0', 'err');
    Object.assign(r, { name: v('name').trim(), price: n('price'), discount: Math.min(90, Math.max(0, n('discount') || 0)), total: Math.floor(n('total')), maxGuests: Math.floor(n('maxGuests')), size: n('size') || 0, view: v('view').trim(), bed: v('bed').trim(), img: v('img').trim() || r.img,
      breakfast: f.elements.breakfast.checked, freeCancel: f.elements.freeCancel.checked, payAtHotel: f.elements.payAtHotel.checked });
    if (isNew) h.rooms.push(r); else h.rooms = h.rooms.map(x => x.id === r.id ? r : x);
    DB.saveHotel(h); DB.log(isNew ? 'room.add' : 'room.edit', `${h.name} / ${r.name}`); closeModal(); toast(isNew ? 'เพิ่มห้องแล้ว' : 'บันทึกแล้ว'); done?.();
  };
}

// ================= 3) หน้ารีสอร์ท (ตกแต่งหน้าที่ลูกค้าเห็น) =================
function boShopPage(main) {
  const hotels = DB.hotels(true);
  main.innerHTML = pageHead('หน้ารีสอร์ท', 'ตกแต่งหน้ารีสอร์ทที่ลูกค้าเห็น — ภาพปก รูป คำอธิบาย และลิงก์ Facebook / TikTok / LINE', hotels.length ? '' : '<button class="btn btn-primary" id="sh-new"><i class="fa-solid fa-plus"></i> เพิ่มรีสอร์ทของคุณ</button>') + (hotels.length ? hotels.map(h => {
    const soc = Object.entries(SOCIALS).filter(([k]) => h.social?.[k]);
    return `<section class="card sh-card"><div class="sh-cover">${imgTag(h.images[0], 900, '', h.id)}<span class="im-badge">ภาพปก</span></div>
      <div class="sh-body"><div class="row between wrap" style="gap:10px"><div><h2 style="margin:0">${esc(h.name)}</h2><div class="small muted">${esc(h.type)} · ${esc(h.area)}, ${esc(h.city)}</div></div>
          <label class="switch big"><input type="checkbox" data-act="${h.id}" ${h.active !== false ? 'checked' : ''}><span></span>${h.active !== false ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
        <p class="small" style="margin:10px 0">${esc(h.description || '— ยังไม่มีคำอธิบาย —')}</p>
        <div class="sh-thumbs">${h.images.slice(0, 8).map(i => imgTag(i, 160)).join('')}${h.images.length > 8 ? `<span class="small muted">+${h.images.length - 8}</span>` : ''}</div>
        <div class="row wrap small" style="gap:10px;margin-top:10px">${soc.length ? soc.map(([k, c]) => `<span><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</span>`).join('') : '<span class="muted">ยังไม่ได้ใส่ลิงก์โซเชียล</span>'}<span class="muted">· ลิงก์: <code>${esc(resortLink(h).replace(/^https?:\/\//, ''))}</code></span></div>
        <div class="row wrap" style="gap:8px;margin-top:14px"><button class="btn btn-primary" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> ตกแต่งหน้ารีสอร์ท</button>
          <a class="btn btn-outline" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้าเว็บ</a>
          <button class="btn btn-outline" data-share="${h.id}"><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต</button>
          <button class="btn btn-ghost" data-edit="${h.id}"><i class="fa-solid fa-gear"></i> ตั้งค่าเพิ่มเติม (แผนที่ สิ่งอำนวยความสะดวก)</button></div></div></section>`;
  }).join('') : '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3><p class="muted">เพิ่มข้อมูลรีสอร์ท รูป ห้องพัก และราคา แล้วลูกค้าจะจองได้ทันที</p></div></section>');
  const redraw = () => boShopPage(main);
  $('#sh-new', main)?.addEventListener('click', () => hotelForm(null, redraw));
  $$('[data-deco]', main).forEach(b => b.onclick = () => shopModal(JSON.parse(JSON.stringify(DB.hotel(b.dataset.deco))), redraw));
  $$('[data-edit]', main).forEach(b => b.onclick = () => hotelForm(DB.hotel(b.dataset.edit), redraw));
  $$('[data-share]', main).forEach(b => b.onclick = () => sharePromo(DB.hotel(b.dataset.share)));
  $$('[data-act]', main).forEach(c => c.onchange = () => { const h = DB.hotel(c.dataset.act); h.active = c.checked; DB.saveHotel(h); DB.log('hotel.toggle', `${h.name} → ${c.checked ? 'เปิดขาย' : 'ปิด'}`); toast(c.checked ? 'เปิดขายแล้ว' : 'ปิดการขายแล้ว'); redraw(); });
}
function shopModal(h, done) {
  const imgs = [...h.images];
  const m = openModal(`<h2><i class="fa-solid fa-paintbrush"></i> ตกแต่งหน้ารีสอร์ท <span class="small muted">· ${esc(h.name)}</span></h2>
    <form id="sh-f" class="form-grid" novalidate style="margin-top:14px">
      <div class="fg full"><label>รูปภาพ — รูปแรกคือ <b>ภาพปก</b> (กดดาวเพื่อตั้งรูปอื่นเป็นปก)</label><div id="sh-imgs"></div></div>
      <div class="fg full"><label>ชื่อรีสอร์ท <span class="req">*</span></label><input name="name" value="${esc(h.name)}"></div>
      <div class="fg full"><label>คำอธิบาย</label><textarea name="description" rows="3">${esc(h.description || '')}</textarea></div>
      <div class="fg full"><label>จุดเด่น (บรรทัดละ 1 ข้อ)</label><textarea name="highlights" rows="3">${esc((h.highlights || []).join('\n'))}</textarea></div>
      <div class="fg full"><label>ชื่อลิงก์ประจำรีสอร์ท (a-z 0-9 -)</label><input name="slug" value="${esc(h.slug || '')}" maxlength="40" placeholder="เช่น sea-view-lan"><div class="small muted" style="margin-top:4px">ลิงก์: <code id="sh-link"></code></div></div>
      ${Object.entries(SOCIALS).map(([k, c]) => `<div class="fg"><label><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</label><input name="soc_${k}" value="${esc(h.social?.[k] || '')}" placeholder="${esc(c.ph)}"></div>`).join('')}
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="sh-save">บันทึก</button></div>`, 'wide');
  imgManager($('#sh-imgs', m), imgs);
  const f = $('#sh-f', m), link = () => $('#sh-link', m).textContent = resortLink({ id: h.id, slug: normSlug(f.elements.slug.value) });
  f.elements.slug.oninput = link; link();
  $('#sh-save', m).onclick = () => {
    const v = k => f.elements[k].value;
    if (!v('name').trim()) return toast('กรุณาใส่ชื่อรีสอร์ท', 'err');
    const sl = normSlug(v('slug'));
    if (sl && DB.hotels(true).some(x => x.id !== h.id && (x.slug === sl || x.id === sl))) return toast('ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น', 'err');
    Object.assign(h, { name: v('name').trim(), description: v('description'), images: imgs.length ? imgs : h.images, slug: sl || undefined,
      highlights: v('highlights').split('\n').map(s => s.trim()).filter(Boolean),
      social: Object.fromEntries(Object.keys(SOCIALS).map(k => [k, v('soc_' + k).trim()]).filter(([, x]) => x)) });
    DB.saveHotel(h); DB.log('hotel.decorate', h.name); closeModal(); toast('บันทึกหน้ารีสอร์ทแล้ว'); done?.();
  };
}
