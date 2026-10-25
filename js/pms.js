// ================= PMS เบื้องต้นสำหรับรีสอร์ท: Folio · ย้ายห้อง/อัปเกรด · เช็คเอาท์เร็ว-ช้า · สถานะห้อง/แม่บ้าน · ข้อจำกัดการขาย · คิวรอห้อง =================
// ข้อมูลใน JSON ของการจอง/รีสอร์ท (เหมือนส่วนอื่น) ยกเว้นสถานะห้อง (sd_room_status) และคิวรอห้อง (sd_waitlist) ที่เป็นตารางแยก — ดู supabase/migrations/20261025000050_staydee_pms_ops.sql

// กล่องแนะนำสำหรับมือใหม่ — กดปิดแล้วจำไว้ในเบราว์เซอร์นี้
function pmsHelp(key, title, steps) {
  try { if (localStorage.getItem('pms_help_' + key)) return ''; } catch (e) {}
  return `<div class="notice" data-help="${key}" style="margin-bottom:12px"><i class="fa-solid fa-lightbulb"></i><div style="flex:1"><b>${title}</b><ol style="margin:6px 0 0 18px;padding:0">${steps.map(x => `<li>${x}</li>`).join('')}</ol></div><button type="button" class="btn btn-ghost btn-sm" data-help-x="${key}">เข้าใจแล้ว</button></div>`;
}
function pmsHelpBind(main) {
  $$('[data-help-x]', main).forEach(b => b.onclick = () => { try { localStorage.setItem('pms_help_' + b.dataset.helpX, '1'); } catch (e) {} b.closest('[data-help]').remove(); });
}

// ---------- ข้อจำกัดการขาย: MinLOS / CTA / CTD / ปิดขาย (เซิร์ฟเวอร์ตรวจซ้ำใน sd_create_booking) ----------
function restrictMsg(h, roomId, ci, co) {
  const nights = diffDays(ci, co), last = addDays(co, -1);
  for (const r of h?.restrict || []) {
    if (!r.from || !r.to || (r.roomId && r.roomId !== roomId)) continue;
    if (r.stop && ci <= r.to && last >= r.from) return `ช่วงวันที่นี้ปิดรับจองชั่วคราว (${fmtDate(r.from, false)} – ${fmtDate(r.to, false)})`;
    if (r.cta && ci >= r.from && ci <= r.to) return `ไม่รับเช็คอินในวันที่ ${fmtDate(ci, false)} — ลองเลื่อนวันเข้าพัก`;
    if (r.ctd && co >= r.from && co <= r.to) return `ไม่รับเช็คเอาท์ในวันที่ ${fmtDate(co, false)} — ลองเปลี่ยนวันออก`;
    if (+r.minLos > 1 && ci >= r.from && ci <= r.to && nights < +r.minLos) return `ช่วงนี้ต้องพักอย่างน้อย ${r.minLos} คืน`;
  }
  return '';
}
const restrictMsgOfRoom = (room, ci, co) => { const h = CACHE.hotels.find(x => x.rooms.some(r => r.id === room.id)); return h ? restrictMsg(h, room.id, ci, co) : ''; };

// ---------- คิวรอห้อง (ฝั่งลูกค้า) ----------
function soldRoomHtml(h, r, rmsg = '') {
  return `<div style="padding:24px;text-align:center"><div class="red bold">${rmsg ? esc(rmsg) : 'ห้องประเภทนี้เต็มในวันที่เลือก'}</div>
    ${rmsg ? '' : `<div class="small muted" style="margin:6px 0 10px">ถ้ามีคนยกเลิก เจ้าของรีสอร์ทจะติดต่อคุณกลับ</div><button type="button" class="btn btn-outline" data-waitlist="${esc(r.id)}" data-h="${esc(h.id)}"><i class="fa-solid fa-hourglass-half"></i> เข้าคิวรอห้อง</button>`}</div>`;
}
function waitlistModal(hotelId, roomId) {
  const h = DB.hotel(hotelId), r = h?.rooms.find(x => x.id === roomId), u = DB.currentUser();
  if (!h) return;
  const m = openModal(`<h2><i class="fa-solid fa-hourglass-half"></i> เข้าคิวรอห้อง</h2>
    <p class="small muted" style="margin:4px 0 12px">${esc(h.name)}${r ? ' · ' + esc(r.name) : ''}<br>${fmtDate(S.checkIn, false)} – ${fmtDate(S.checkOut, false)} · ${S.rooms} ห้อง — ถ้ามีห้องว่าง เจ้าของรีสอร์ทจะติดต่อกลับ (ยังไม่ใช่การจอง ไม่มีการเก็บเงิน)</p>
    <form id="wl-f" class="form-grid" novalidate>
      <div class="fg"><label>ชื่อ <span class="req">*</span></label><input name="name" value="${esc(u?.name || '')}"></div>
      <div class="fg"><label>เบอร์โทร <span class="req">*</span></label><input name="phone" inputmode="tel" value="${esc(u?.phone || '')}"></div>
      <div class="fg full"><label>อีเมล (ไม่บังคับ)</label><input name="email" type="email" value="${esc(u?.email || '')}"></div>
      <div class="fg full"><label>หมายเหตุ (ไม่บังคับ)</label><input name="note" maxlength="300"></div>
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="wl-go">เข้าคิว</button></div>`);
  $('#wl-go', m).onclick = async () => {
    const f = $('#wl-f', m).elements, btn = $('#wl-go', m);
    if (!f.name.value.trim()) return toast('กรุณากรอกชื่อ', 'err');
    if (f.phone.value.replace(/\D/g, '').length < 9) return toast('เบอร์โทรไม่ถูกต้อง', 'err');
    btn.disabled = true;
    try {
      await rpc('sd_join_waitlist', { p: { hotelId, roomId, checkIn: S.checkIn, checkOut: S.checkOut, qty: S.rooms, name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), note: f.note.value.trim() } });
      closeModal(); toast('เข้าคิวแล้ว — เจ้าของรีสอร์ทจะติดต่อกลับถ้ามีห้องว่าง');
    } catch (e) { btn.disabled = false; toast(e.message || 'เข้าคิวไม่สำเร็จ', 'err'); }
  };
}
document.addEventListener('click', e => { const b = e.target.closest?.('[data-waitlist]'); if (b) waitlistModal(b.dataset.h, b.dataset.waitlist); });

// ---------- Folio · จัดห้อง · ย้ายห้อง · เช็คเอาท์เร็ว/ช้า (ในหน้าต่างรายละเอียดการจอง) ----------
const FOLIO_PRESETS = ['ค่าอาหาร / เครื่องดื่ม', 'เช่ามอเตอร์ไซค์ / จักรยาน', 'ค่าเรือ / รถรับส่ง', 'เตียงเสริม', 'ซักรีด', 'ค่าเสียหาย / ปรับ', 'อื่นๆ'];
const folioSum = (b, only) => (b.folio || []).filter(x => !only || only(x)).reduce((s, x) => s + x.qty * x.price, 0);
function pmsDrawer(m, b, refresh) {
  const box = $('#pms-sec', m); if (!box) return;
  const edit = can('bookings.edit') || can('frontdesk');
  const live = b.status !== 'cancelled' && !b.checkedOutAt, h = DB.hotel(b.hotelId), room = h?.rooms.find(r => r.id === b.roomId);
  const folio = b.folio || [], fTotal = folioSum(b), fDue = folioSum(b, x => !x.paid), roomDue = b.payment.paid ? 0 : b.price.total;
  const reload = () => { refresh?.(); bookingDrawer(b.id, refresh); };
  const patch = p => { DB.updateBooking(b.id, p); reload(); };
  const units = b.units || [], total = room ? Math.min(+room.total || 0, 200) : 0;
  const taken = n => DB.bookings().some(x => x.id !== b.id && x.roomId === b.roomId && x.status !== 'cancelled' && !x.checkedOutAt && (x.units || []).includes(n) && x.checkIn < b.checkOut && x.checkOut > b.checkIn);
  box.innerHTML = `<h4><i class="fa-solid fa-file-invoice-dollar"></i> บิลรายห้อง (Folio) · ค่าใช้จ่ายระหว่างพัก</h4>
    ${folio.length ? `<div class="table-scroll"><table class="tbl"><tbody>${folio.map(x => `<tr><td>${esc(x.name)}<div class="small muted">${fmtDateTime(x.at)}${x.by ? ' · ' + esc(x.by) : ''}</div></td><td>${x.qty} × ${money(x.price)}</td><td><b>${money(x.qty * x.price)}</b></td>
      <td>${x.paid ? '<span class="pill ok">ชำระแล้ว</span>' : '<span class="pill bad">ค้างชำระ</span>'}</td><td style="white-space:nowrap">${edit && live ? `<button class="btn btn-ghost btn-sm" data-fp="${esc(x.id)}" title="สลับสถานะชำระ"><i class="fa-solid fa-money-bill"></i></button><button class="btn btn-ghost btn-sm red" data-fd="${esc(x.id)}" title="ลบรายการ"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="small muted">ยังไม่มีค่าใช้จ่ายเพิ่ม — ถ้าแขกใช้บริการระหว่างพัก (อาหาร เช่ามอเตอร์ไซค์ ฯลฯ) เลือกประเภท ใส่ราคา แล้วกด “เพิ่ม” ด้านล่าง ยอดจะรวมไปในบิลตอนเช็คเอาท์</p>'}
    <div class="dl"><span>ค่าห้อง</span><b>${money(b.price.total)} ${b.payment.paid ? '<span class="pill ok">ชำระแล้ว</span>' : '<span class="pill bad">ค้างชำระ</span>'}</b></div>
    <div class="dl"><span>ค่าใช้จ่ายเพิ่ม</span><b>${money(fTotal)}</b></div>
    <div class="dl total"><span>ยอดค้างชำระรวม</span><b>${money(roomDue + fDue)}</b></div>
    ${edit && live ? `<form id="fo-f" class="row wrap" style="gap:6px;margin-top:10px"><select name="cat" style="max-width:190px">${FOLIO_PRESETS.map(p => `<option>${esc(p)}</option>`).join('')}</select><input name="name" placeholder="รายละเอียด (ไม่บังคับ)" style="flex:1;min-width:120px"><input name="qty" type="number" min="1" value="1" style="width:64px" title="จำนวน"><input name="price" type="number" step="0.01" placeholder="ราคา/หน่วย (บาท)" style="width:150px"><button class="btn btn-sm btn-primary"><i class="fa-solid fa-plus"></i> เพิ่ม</button></form>
      ${fDue > 0 ? '<button type="button" class="btn btn-sm btn-outline" id="fo-payall" style="margin-top:8px"><i class="fa-solid fa-circle-check"></i> รับชำระค่าใช้จ่ายเพิ่มทั้งหมด</button>' : ''}` : ''}
    ${room && live && edit ? `<h4 style="margin-top:16px"><i class="fa-solid fa-door-open"></i> จัดห้อง · ย้ายห้อง · เช็คเอาท์</h4>
      <div class="small muted" style="margin-bottom:6px">เลือกเลขห้องที่จัดให้แขก (ใช้กับสถานะห้อง/แม่บ้าน — เช็คเอาท์แล้วห้องจะถูกตั้งเป็น “สกปรก” อัตโนมัติ)</div>
      <div class="row wrap" style="gap:6px">${Array.from({ length: total }, (_, i) => i + 1).map(n => `<button type="button" class="btn btn-sm ${units.includes(n) ? 'btn-primary' : 'btn-outline'}" data-un="${n}" ${taken(n) ? 'disabled title="มีการจองอื่นใช้เลขนี้ในช่วงเดียวกัน"' : ''}>${n}</button>`).join('') || '<span class="small muted">ไม่มีจำนวนห้อง</span>'}</div>
      <div class="row wrap" style="gap:8px;margin-top:10px"><button type="button" class="btn btn-sm btn-outline" id="mv-room"><i class="fa-solid fa-right-left"></i> ย้ายห้อง / อัปเกรด</button>
        <button type="button" class="btn btn-sm btn-outline" id="lc-out"><i class="fa-solid fa-clock"></i> เช็คเอาท์สาย</button>
        ${b.checkedInAt && b.checkOut > todayISO() ? '<button type="button" class="btn btn-sm btn-outline" id="ec-out"><i class="fa-solid fa-person-walking-luggage"></i> เช็คเอาท์ก่อนกำหนด</button>' : ''}</div>
      ${b.lateCheckout ? `<div class="small" style="margin-top:6px">เช็คเอาท์สาย: ${esc(b.lateCheckout.time)} · ค่าธรรมเนียม ${money(b.lateCheckout.fee)}</div>` : ''}${b.earlyCheckout ? `<div class="small" style="margin-top:6px">เช็คเอาท์ก่อนกำหนด: เดิมออก ${fmtDate(b.earlyCheckout.from, false)} (ไม่ใช้ ${b.earlyCheckout.nightsLost} คืน)</div>` : ''}
      ${(b.moves || []).map(x => `<div class="small muted" style="margin-top:4px">${fmtDateTime(x.at)} · ย้ายจาก ${esc(x.from)} → ${esc(x.to)}${x.fee ? ' · ส่วนต่าง ' + money(x.fee) : ' · ไม่คิดส่วนต่าง'}</div>`).join('')}` : ''}`;
  const by = DB.currentUser()?.name || '';
  $('#fo-f', box)?.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target.elements, price = +f.price.value, qty = Math.max(1, Math.round(+f.qty.value) || 1);
    if (!price) return toast('กรุณาใส่ราคา', 'err');
    const name = [f.cat.value, f.name.value.trim()].filter(Boolean).join(' — ');
    DB.log('folio.add', `${b.id} · ${name} · ${money(qty * price)}`);
    patch({ folio: [...folio, { id: 'f' + Date.now().toString(36), at: new Date().toISOString(), name, qty, price: r2(price), by, paid: false }] });
  });
  $$('[data-fd]', box).forEach(x => x.onclick = async () => { if (await confirmBox('ลบรายการนี้ออกจากบิล?', 'ลบ')) { DB.log('folio.del', `${b.id} · ${x.dataset.fd}`); patch({ folio: folio.filter(i => i.id !== x.dataset.fd) }); } });
  $$('[data-fp]', box).forEach(x => x.onclick = () => patch({ folio: folio.map(i => i.id === x.dataset.fp ? { ...i, paid: !i.paid, paidAt: i.paid ? undefined : new Date().toISOString() } : i) }));
  $('#fo-payall', box)?.addEventListener('click', () => { DB.log('folio.payall', `${b.id} · ${money(fDue)}`); patch({ folio: folio.map(i => ({ ...i, paid: true, paidAt: i.paidAt || new Date().toISOString() })) }); });
  $$('[data-un]', box).forEach(x => x.onclick = () => {
    const n = +x.dataset.un, next = units.includes(n) ? units.filter(u => u !== n) : [...units, n].slice(-Math.max(1, b.qty));
    patch({ units: next.sort((p, q) => p - q) });
  });
  $('#lc-out', box)?.addEventListener('click', () => {
    const lm = openModal(`<h2><i class="fa-solid fa-clock"></i> เช็คเอาท์สาย</h2>
      <p class="small muted" style="margin:4px 0 12px">แขกขอออกช้ากว่าเวลาปกติ — ใส่เวลาที่ตกลงกัน และค่าธรรมเนียม (ถ้าไม่คิด ใส่ 0) ระบบจะเพิ่มค่าธรรมเนียมเข้าบิลให้เอง</p>
      <div class="form-grid"><div class="fg"><label>เวลาที่แขกจะออก</label><input id="lc-t" type="time" value="14:00"></div><div class="fg"><label>ค่าธรรมเนียม (บาท)</label><input id="lc-fee" type="number" min="0" step="1" value="0" inputmode="numeric"></div></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="lc-go">บันทึก</button></div>`);
    $('#lc-go', lm).onclick = () => {
      const time = $('#lc-t', lm).value, amt = Math.max(0, +$('#lc-fee', lm).value || 0);
      if (!time) return toast('เลือกเวลาที่แขกจะออก', 'err');
      closeModal(); DB.log('checkout.late', `${b.id} · ${time} · ${amt}`);
      patch({ lateCheckout: { time, fee: amt, at: new Date().toISOString(), by }, ...(amt ? { folio: [...folio, { id: 'f' + Date.now().toString(36), at: new Date().toISOString(), name: `ค่าเช็คเอาท์สาย ${time}`, qty: 1, price: amt, by, paid: false }] } : {}) });
    };
  });
  $('#ec-out', box)?.addEventListener('click', async () => {
    const lost = diffDays(todayISO(), b.checkOut);
    if (!(await confirmBox(`แขกออกก่อนกำหนด — ปรับวันออกเป็น <b>วันนี้</b> (${fmtDate(todayISO(), false)}) และคืนห้อง ${lost} คืนที่เหลือให้ขายต่อ<br><span class="small muted">ยอดเงินของการจองไม่ถูกเปลี่ยน — คืนเงินให้แขก (ถ้ามี) ให้ทำเองแล้วบันทึกโน้ต</span>`, 'ยืนยัน'))) return;
    DB.log('checkout.early', `${b.id} · เดิม ${b.checkOut} · ${lost} คืน`);
    patch({ earlyCheckout: { from: b.checkOut, nightsLost: lost, at: new Date().toISOString(), by }, checkOut: todayISO(), nights: Math.max(1, diffDays(b.checkIn, todayISO())) });
  });
  $('#mv-room', box)?.addEventListener('click', () => moveRoomModal(b, h, reload));
}

// ย้ายห้อง / อัปเกรด: เลือกประเภทห้องใหม่ที่ว่างในช่วงเดียวกัน · เลือกคิดส่วนต่างหรืออัปเกรดฟรี
function moveRoomModal(b, h, done) {
  const cur = h.rooms.find(r => r.id === b.roomId), from = b.checkedInAt ? todayISO() : b.checkIn;
  const opts = h.rooms.filter(r => r.id !== b.roomId).map(r => ({ r, free: Math.max(0, r.total - DB.bookedCount(r.id, b.checkIn, b.checkOut, b.id)), diff: Math.round(DB.quote(r, b.checkIn, b.checkOut, b.qty).sub - DB.quote(cur, b.checkIn, b.checkOut, b.qty).sub) }));
  const m = openModal(`<h2><i class="fa-solid fa-right-left"></i> ย้ายห้อง / อัปเกรด <span class="small muted">· ${esc(b.id)}</span></h2>
    <p class="small muted" style="margin:4px 0 12px">ปัจจุบัน: ${b.qty} × ${esc(b.roomName)} · ${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}</p>
    <div class="bo-list">${opts.map((o, i) => `<label class="row between" style="gap:10px;padding:8px 0;border-top:1px solid var(--border,#e5e7eb);${o.free < b.qty ? 'opacity:.5' : ''}"><span class="row" style="gap:8px"><input type="radio" name="mv" value="${i}" ${o.free < b.qty ? 'disabled' : ''}> <b>${esc(o.r.name)}</b></span><span class="small muted">${o.free < b.qty ? 'เต็ม' : `ว่าง ${o.free} ห้อง`} · ส่วนต่างตามราคาปกติ ${o.diff >= 0 ? '+' : ''}${money(o.diff)}</span></label>`).join('') || '<p class="muted">ไม่มีประเภทห้องอื่น</p>'}</div>
    <div class="fg" style="margin-top:12px"><label>ส่วนต่างที่เรียกเก็บ (บาท) — 0 = อัปเกรดฟรี / ติดลบไม่ได้</label><input id="mv-fee" type="number" min="0" step="0.01" value="0"></div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close><i class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button><button class="btn btn-primary" id="mv-go">ย้ายห้อง</button></div>`);
  $$('[name=mv]', m).forEach(r => r.onchange = () => { const o = opts[+r.value]; $('#mv-fee', m).value = Math.max(0, o.diff); });
  $('#mv-go', m).onclick = () => {
    const sel = $('[name=mv]:checked', m); if (!sel) return toast('เลือกห้องที่จะย้ายไป', 'err');
    const o = opts[+sel.value], fee = Math.max(0, +$('#mv-fee', m).value || 0);
    closeModal();
    const rec = { at: new Date().toISOString(), from: b.roomName, to: o.r.name, fee, by: DB.currentUser()?.name || '' };
    DB.log('booking.move', `${b.id} · ${b.roomName} → ${o.r.name} · ส่วนต่าง ${fee}`);
    DB.updateBooking(b.id, { roomId: o.r.id, roomName: o.r.name, units: [], moves: [...(b.moves || []), rec],
      ...(fee ? { folio: [...(b.folio || []), { id: 'f' + Date.now().toString(36), at: rec.at, name: `ส่วนต่างอัปเกรด ${b.roomName} → ${o.r.name}`, qty: 1, price: fee, by: rec.by, paid: false }] } : {}) });
    toast('ย้ายห้องแล้ว'); done?.();
  };
}

// เช็คเอาท์แล้ว → ห้องที่จัดไว้ถูกตั้งเป็น “สกปรก” (รอแม่บ้าน)
async function pmsAfterCheckout(b) {
  const us = b.units || []; if (!us.length) return;
  try {
    const r = await supa.from('sd_room_status').upsert(us.map(unit => ({ hotel_id: b.hotelId, room_id: b.roomId, unit, status: 'dirty', note: '' })), { onConflict: 'hotel_id,room_id,unit' });
    if (r.error) throw r.error;
  } catch (e) { console.warn('ตั้งสถานะห้องไม่สำเร็จ', e); }
}

// ---------- สถานะห้อง / งานแม่บ้าน (ใช้บนมือถือ) ----------
const HK = { clean: ['สะอาด', '#16a34a', 'fa-circle-check'], dirty: ['สกปรก', '#dc2626', 'fa-broom'], inspect: ['รอตรวจ', '#d97706', 'fa-magnifying-glass'], ooo: ['ปิดซ่อม', '#6b7280', 'fa-screwdriver-wrench'] };
async function boHousekeeping(main) {
  const hotels = DB.hotels(true), today = todayISO();
  main.innerHTML = pageHead('งานแม่บ้าน · สถานะห้อง', 'แตะห้องเพื่อเปลี่ยนสถานะ — สะอาด · สกปรก · รอตรวจ · ปิดซ่อม') + '<section class="card"><p class="muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p></section>';
  const res = await supa.from('sd_room_status').select('*').in('hotel_id', hotels.map(h => h.id));
  if (res.error) { main.innerHTML = pageHead('งานแม่บ้าน · สถานะห้อง', '') + `<section class="card"><div class="notice warn"><i class="fa-solid fa-triangle-exclamation"></i><div>ยังใช้งานสถานะห้องไม่ได้: ${esc(res.error.message)}<br><span class="small">(ต้องเปิดใช้ตารางสถานะห้องในฐานข้อมูลก่อน)</span></div></div></section>`; return; }
  const st = new Map(res.data.map(x => [`${x.room_id}#${x.unit}`, x]));
  const bks = DB.bookings().filter(b => b.status !== 'cancelled');
  let filter = 'all';
  const units = hotels.flatMap(h => h.rooms.flatMap(r => Array.from({ length: Math.min(+r.total || 0, 200) }, (_, i) => {
    const n = i + 1, row = st.get(`${r.id}#${n}`), mine = bks.filter(b => b.roomId === r.id && (b.units || []).includes(n));
    return { h, r, n, status: row?.status || 'clean', note: row?.note || '',
      out: mine.some(b => b.checkOut === today && !b.checkedOutAt), inn: mine.some(b => b.checkIn === today && !b.checkedInAt), stay: mine.some(b => b.checkedInAt && !b.checkedOutAt) };
  })));
  const set = async (u, status, note = u.note) => {
    const r = await supa.from('sd_room_status').upsert({ hotel_id: u.h.id, room_id: u.r.id, unit: u.n, status, note }, { onConflict: 'hotel_id,room_id,unit' });
    if (r.error) return toast('บันทึกสถานะไม่สำเร็จ: ' + r.error.message, 'err');
    st.set(`${u.r.id}#${u.n}`, { status, note }); u.status = status; u.note = note; DB.log('hk.set', `${u.h.name} · ${u.r.name} #${u.n} → ${HK[status][0]}`); draw();
  };
  const draw = () => {
    const cnt = k => units.filter(u => u.status === k).length, list = units.filter(u => filter === 'all' || u.status === filter);
    main.innerHTML = pageHead('งานแม่บ้าน · สถานะห้อง', `${units.length} ห้อง · แตะห้องเพื่อเปลี่ยนสถานะ`, '<button class="btn btn-outline" id="hk-r"><i class="fa-solid fa-rotate"></i> รีเฟรช</button>') + `
      ${pmsHelp('hk', 'งานแม่บ้าน ใช้ยังไง', ['แตะที่เลขห้อง แล้วเลือกสถานะ: สะอาด / สกปรก / รอตรวจ / ปิดซ่อม', 'ในหน้ารายละเอียดการจอง เลือกเลขห้องให้แขกไว้ก่อน — พอกดเช็คเอาท์ ห้องนั้นจะเปลี่ยนเป็น “สกปรก” เอง', 'ใช้บนมือถือได้ — ให้แม่บ้านเปิดหน้านี้แล้วแตะเปลี่ยนสถานะเมื่อทำความสะอาดเสร็จ'])}
      <div class="row wrap" style="gap:8px;margin-bottom:12px"><button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}" data-f="all">ทั้งหมด ${units.length}</button>${Object.entries(HK).map(([k, [l, c]]) => `<button class="btn btn-sm ${filter === k ? 'btn-primary' : 'btn-outline'}" data-f="${k}"><i class="fa-solid ${HK[k][2]}" style="color:${filter === k ? '#fff' : c}"></i> ${l} ${cnt(k)}</button>`).join('')}</div>
      ${hotels.map(h => h.rooms.map(r => { const us = list.filter(u => u.r.id === r.id); return us.length ? `<section class="card"><div class="card-h"><h3>${esc(hotels.length > 1 ? h.name + ' · ' : '')}${esc(r.name)}</h3></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px">${us.map(u => `<button type="button" data-u="${esc(r.id)}#${u.n}" style="border:2px solid ${HK[u.status][1]};background:${HK[u.status][1]}18;border-radius:12px;padding:10px 6px;text-align:center;cursor:pointer;font:inherit;color:inherit">
          <div style="font-size:22px;font-weight:800">${u.n}</div><div class="small" style="color:${HK[u.status][1]};font-weight:700"><i class="fa-solid ${HK[u.status][2]}"></i> ${HK[u.status][0]}</div>
          <div class="small muted">${u.out ? 'ออกวันนี้' : u.inn ? 'เข้าวันนี้' : u.stay ? 'มีแขกพัก' : '&nbsp;'}</div>${u.note ? `<div class="small" style="margin-top:2px">${esc(u.note)}</div>` : ''}</button>`).join('')}</div></section>` : ''; }).join('')).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-bed"></i><p class="muted">' + (units.length ? 'ไม่มีห้องในตัวกรองนี้ — กด “ทั้งหมด” เพื่อดูทุกห้อง' : 'ยังไม่มีห้อง — ไปที่ “แก้ไขรีสอร์ท” เพิ่มประเภทห้องและจำนวนห้องก่อน') + '</p></div></section>'}`;
    pmsHelpBind(main);
    $$('[data-f]', main).forEach(b => b.onclick = () => { filter = b.dataset.f; draw(); });
    $('#hk-r', main).onclick = () => boHousekeeping(main);
    $$('[data-u]', main).forEach(b => b.onclick = () => {
      const [rid, n] = b.dataset.u.split('#'), u = units.find(x => x.r.id === rid && x.n === +n);
      const m = openModal(`<h2>${esc(u.r.name)} · ห้อง ${u.n}</h2><div class="small muted" style="margin-bottom:10px">${u.out ? 'มีแขกเช็คเอาท์วันนี้ · ' : ''}${u.inn ? 'มีแขกเข้าวันนี้ · ' : ''}${u.stay ? 'มีแขกพักอยู่' : ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${Object.entries(HK).map(([k, [l, c, ic]]) => `<button type="button" class="btn btn-lg ${u.status === k ? 'btn-primary' : 'btn-outline'}" data-s="${k}" style="padding:16px 8px"><i class="fa-solid ${ic}" style="color:${u.status === k ? '#fff' : c}"></i> ${l}</button>`).join('')}</div>
        <div class="fg" style="margin-top:12px"><label>หมายเหตุ (เช่น ก๊อกน้ำรั่ว ขาดผ้าเช็ดตัว)</label><input id="hk-note" maxlength="200" value="${esc(u.note)}"></div>
        <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn btn-ghost" data-close>ปิด</button></div>`);
      $$('[data-s]', m).forEach(x => x.onclick = () => { const note = $('#hk-note', m).value.trim(); closeModal(); set(u, x.dataset.s, note); });
    });
  };
  draw();
}

// ---------- ข้อจำกัดการขาย (เจ้าของตั้งเอง) ----------
function boRestrict(main) {
  const hotels = DB.hotels(true);
  const ruleText = r => [r.stop && 'ปิดรับจอง', r.cta && 'ไม่รับเข้าพัก', r.ctd && 'ไม่รับออก', +r.minLos > 1 && `พักขั้นต่ำ ${r.minLos} คืน`].filter(Boolean).join(' · ');
  main.innerHTML = pageHead('ข้อจำกัดการขาย', 'ควบคุมการรับจอง เช่น ปิดรับจองบางช่วง · บังคับพักขั้นต่ำ — มีผลกับลูกค้าที่จองผ่านเว็บ') + pmsHelp('rs', 'ข้อจำกัดการขาย ใช้ยังไง', ['เลือก “ต้องการทำอะไร” ก่อน แล้วเลือกช่วงวันที่', 'กด “เพิ่มกฎ” — ลูกค้าที่เลือกวันตรงกฎจะจองไม่ได้และเห็นข้อความบอกเหตุผล', 'อยากยกเลิกกฎ กดถังขยะท้ายแถว']) + (hotels.length ? hotels.map(h => `<section class="card"><div class="card-h"><h3>${esc(h.name)}</h3></div>
    ${(h.restrict || []).length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>ช่วงวันที่</th><th>ห้อง</th><th>กฎ</th><th></th></tr></thead><tbody>${h.restrict.map((r, i) => `<tr><td>${fmtDate(r.from, false)} – ${fmtDate(r.to, false)}</td><td>${esc(h.rooms.find(x => x.id === r.roomId)?.name || 'ทุกประเภท')}</td><td>${esc(ruleText(r))}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm red" data-rd="${esc(h.id)}#${i}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">ยังไม่มีข้อจำกัด</p>'}
    <form data-rf="${esc(h.id)}" style="margin-top:12px;border-top:1px solid var(--border,#e5e7eb);padding-top:12px"><b class="small">เพิ่มกฎใหม่</b>
      <div class="form-grid" style="margin-top:6px">
        <div class="fg full"><label>ต้องการทำอะไร</label><select name="kind"><option value="stop">ปิดรับจองช่วงนี้ (เช่น ปิดปรับปรุง / ไม่รับแขก)</option><option value="minLos">บังคับพักขั้นต่ำกี่คืน (เช่น วันหยุดยาวต้องพัก 2 คืน)</option><option value="cta">ไม่รับแขก “เข้าพัก” ในวันที่เลือก (แขกที่พักคร่อมยังได้)</option><option value="ctd">ไม่รับแขก “ออก” ในวันที่เลือก</option></select></div>
        <div class="fg"><label>ตั้งแต่วันที่</label><input name="from" type="date" min="${todayISO()}"></div><div class="fg"><label>ถึงวันที่ <span class="small muted">(วันเดียวเว้นว่างได้)</span></label><input name="to" type="date" min="${todayISO()}"></div>
        <div class="fg"><label>ใช้กับห้อง</label><select name="roomId"><option value="">ทุกประเภท</option>${h.rooms.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></div>
        <div class="fg" data-nights><label>พักขั้นต่ำ (คืน)</label><input name="minLos" type="number" min="2" max="30" value="2" inputmode="numeric"></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px"><i class="fa-solid fa-plus"></i> เพิ่มกฎ</button></form></section>`).join('') : '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">เพิ่มรีสอร์ทก่อน</p></div></section>') +
    '<p class="small muted">หมายเหตุ: “พักขั้นต่ำ” ดูจากวันเข้าพักที่อยู่ในช่วง · “ปิดรับจอง” = ห้ามมีคืนพักในช่วงนั้น · ถ้าต้องการปิดห้องจริงเพื่อซ่อม ใช้เมนู “ตารางห้องว่าง / ปิดห้อง” (ศัพท์ในวงการ: MinLOS = พักขั้นต่ำ, CTA = ไม่รับเข้าพัก, CTD = ไม่รับออก)</p>';
  const save = (h, restrict) => { const c = JSON.parse(JSON.stringify(DB.hotel(h.id))); c.restrict = restrict; DB.saveHotel(c); boRestrict(main); };
  pmsHelpBind(main);
  $$('[data-rf]', main).forEach(f => { const sync = () => { f.querySelector('[data-nights]').style.display = f.elements.kind.value === 'minLos' ? '' : 'none'; }; f.elements.kind.onchange = sync; sync(); });
  $$('[data-rf]', main).forEach(f => f.onsubmit = e => {
    e.preventDefault(); const h = DB.hotel(f.dataset.rf), v = f.elements, k = v.kind.value;
    const rule = { from: v.from.value, to: v.to.value || v.from.value, roomId: v.roomId.value || undefined, minLos: k === 'minLos' ? Math.max(0, Math.round(+v.minLos.value) || 0) : 0, cta: k === 'cta', ctd: k === 'ctd', stop: k === 'stop' };
    if (!rule.from || !rule.to || rule.to < rule.from) return toast('เลือกช่วงวันที่ให้ถูกต้อง', 'err');
    if (k === 'minLos' && rule.minLos < 2) return toast('พักขั้นต่ำต้องตั้งแต่ 2 คืนขึ้นไป', 'err');
    DB.log('restrict.add', `${h.name} · ${rule.from}–${rule.to}`); save(h, [...(h.restrict || []), rule]); toast('เพิ่มกฎแล้ว');
  });
  $$('[data-rd]', main).forEach(b => b.onclick = () => { const [hid, i] = b.dataset.rd.split('#'), h = DB.hotel(hid); DB.log('restrict.del', h.name); save(h, (h.restrict || []).filter((_, k) => k !== +i)); toast('ลบกฎแล้ว'); });
}

// ---------- คิวรอห้อง (เจ้าของ) ----------
async function boWaitlist(main) {
  const hotels = DB.hotels(true), ST = { waiting: ['รอติดต่อ', 'bad'], contacted: ['ติดต่อแล้ว', 'vip'], done: ['เสร็จสิ้น', 'ok'] };
  main.innerHTML = pageHead('คิวรอห้อง', 'ลูกค้าที่เข้าคิวเมื่อห้องเต็ม — ถ้ามีห้องว่างจะขึ้นป้ายให้ติดต่อกลับ') + '<section class="card"><p class="muted"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p></section>';
  const res = await supa.from('sd_waitlist').select('*').in('hotel_id', hotels.map(h => h.id)).order('created_at', { ascending: false }).limit(300);
  if (res.error) { main.innerHTML = pageHead('คิวรอห้อง', '') + `<section class="card"><div class="notice warn"><i class="fa-solid fa-triangle-exclamation"></i><div>ยังใช้งานคิวรอห้องไม่ได้: ${esc(res.error.message)}</div></div></section>`; return; }
  const rows = res.data, today = todayISO();
  main.innerHTML = pageHead('คิวรอห้อง', `${rows.filter(r => r.status === 'waiting').length} รายรอติดต่อ`) + pmsHelp('wl', 'คิวรอห้อง ใช้ยังไง', ['เมื่อห้องเต็ม ลูกค้ากด “เข้าคิวรอห้อง” ที่หน้ารีสอร์ท ชื่อและเบอร์จะมาอยู่ที่นี่', 'ถ้ามีคนยกเลิก ช่อง “ห้องว่างตอนนี้” จะขึ้นป้ายเขียว — กดเบอร์โทรเพื่อโทรหาลูกค้าได้เลย', 'ติดต่อแล้วให้เปลี่ยนสถานะเป็น “ติดต่อแล้ว” หรือ “เสร็จสิ้น”']) + `<section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>ลูกค้า</th><th>ที่พัก / ห้อง</th><th>วันที่ต้องการ</th><th>ห้องว่างตอนนี้</th><th>สถานะ</th><th></th></tr></thead><tbody>${rows.map(w => {
    const h = DB.hotel(w.hotel_id), r = h?.rooms.find(x => x.id === w.room_id), free = r && w.check_in >= today ? Math.max(0, r.total - DB.bookedCount(r.id, w.check_in, w.check_out)) : null;
    return `<tr><td><b>${esc(w.name)}</b><div class="small"><a href="tel:${esc(w.phone)}">${esc(w.phone)}</a>${w.email ? ' · ' + esc(w.email) : ''}</div>${w.note ? `<div class="small muted">${esc(w.note)}</div>` : ''}</td><td>${esc(h?.name || '')}<div class="small muted">${esc(r?.name || 'ทุกประเภท')} × ${w.qty}</div></td>
      <td class="small">${fmtDate(w.check_in, false)} – ${fmtDate(w.check_out, false)}</td><td>${free == null ? '<span class="muted">—</span>' : free >= w.qty ? `<span class="pill ok">ว่าง ${free} ห้อง — ติดต่อเลย</span>` : '<span class="pill bad">ยังเต็ม</span>'}</td>
      <td><select data-ws="${esc(w.id)}">${Object.entries(ST).map(([k, [l]]) => `<option value="${k}" ${w.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><button class="btn btn-ghost btn-sm red" data-wd="${esc(w.id)}"><i class="fa-solid fa-trash"></i></button></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">ยังไม่มีคิวรอห้อง — จะมีรายการเมื่อลูกค้ากดเข้าคิวตอนห้องเต็ม</td></tr>'}</tbody></table></div></section>`;
  pmsHelpBind(main);
  $$('[data-ws]', main).forEach(s => s.onchange = async () => { const r = await supa.from('sd_waitlist').update({ status: s.value }).eq('id', s.dataset.ws); if (r.error) toast('บันทึกไม่สำเร็จ: ' + r.error.message, 'err'); else toast('อัปเดตแล้ว'); });
  $$('[data-wd]', main).forEach(b => b.onclick = async () => { if (!(await confirmBox('ลบรายการนี้?', 'ลบ'))) return; const r = await supa.from('sd_waitlist').delete().eq('id', b.dataset.wd); if (r.error) return toast('ลบไม่สำเร็จ: ' + r.error.message, 'err'); boWaitlist(main); });
}
