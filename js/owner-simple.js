// ================= หลังบ้านเจ้าของรีสอร์ท แบบเรียบง่าย =================
// โครงสร้างตามตัวอย่าง kohlardgo: แท็บหลักมีแค่ การจอง · ห้องพัก · หน้ารีสอร์ท (+ ตารางห้องว่าง) ทุกหน้าใช้รูปแบบเดียวกัน:
// การ์ดสรุป → ตัวกรอง → รายการ · ทุกห้อง/ทุกรีสอร์ทมีปุ่ม "เปลี่ยนรูป" ที่อัปโหลดจากเครื่องได้ทันที
// ใช้ฟังก์ชันกลางจาก admin.js (pageHead, kpi, bkAction, bindBk, hotelForm, sharePromo ฯลฯ)

// เลื่อนไปที่ช่อง + ไฮไลต์ + โฟกัส (ใช้กับลิงก์จากเช็กลิสต์ "เริ่มต้นใช้งาน")
function boFocus(root, sel) {
  const el = (root || document).querySelector(sel); if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const box = el.closest('.fg') || el; box.classList.add('bo-flash'); setTimeout(() => box.classList.remove('bo-flash'), 3500);
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) setTimeout(() => el.focus({ preventScroll: true }), 350);
  return true;
}
const boClearParams = () => { try { history.replaceState(null, '', location.pathname + location.search + location.hash.split('?')[0]); } catch {} };

// ---------- ขั้นตอนเริ่มต้น (แสดงจนกว่าจะทำครบ) ----------
// ขั้นที่ต้องทำก่อนเปิดขาย: แต่ละขั้นบอกชัดว่า "ยังขาดอะไร" · ขั้นเสริม (ไม่นับคะแนน) แสดงท้ายการ์ด
function ownerSetupCard() {
  const u = DB.currentUser(), po = u.payout || {}, bz = u.biz || {}, hs = DB.hotels(true);
  const rooms = hs.reduce((n, h) => n + (h.rooms || []).length, 0), maxImg = Math.max(0, ...hs.map(h => (h.images || []).length));
  const hasPay = isPromptpayId(po.promptpayId) || !!(po.bankInfo || '').trim();
  const missing = (...a) => a.filter(Boolean).join(' · ');
  const steps = [
    [rooms > 0, 'เพิ่มรีสอร์ทและห้องพัก', 'ใส่ชื่อห้อง ราคาต่อคืน จำนวนห้อง จำนวนคนพัก และรูปห้อง', '#/admin/rooms?focus=add', hs.length ? 'ยังไม่มีห้องพักเลย' : 'ยังไม่มีรีสอร์ทในบัญชี'],
    [hasPay, 'ตั้งบัญชีรับเงิน', 'ใส่พร้อมเพย์หรือเลขบัญชีธนาคาร ลูกค้าจะโอนเข้าบัญชีคุณโดยตรง', '#/admin/payout?focus=promptpayId', 'ยังไม่ได้ใส่พร้อมเพย์หรือบัญชีธนาคาร ลูกค้าจะจองได้เฉพาะห้อง “ชำระที่ที่พัก”'],
    [!!(bz.phone || '').trim() && !!(bz.line || '').trim(), 'ใส่เบอร์โทรและ LINE ติดต่อ', 'ลูกค้าจะเห็นในใบยืนยันการจอง เพื่อติดต่อคุณโดยตรง', '#/admin/payout?focus=' + ((bz.phone || '').trim() ? 'line' : 'phone'), missing(!(bz.phone || '').trim() && 'ยังไม่มีเบอร์โทร', !(bz.line || '').trim() && 'ยังไม่มี LINE')],
    [hs.some(h => (h.description || '').trim().length >= 30 && (h.highlights || []).length >= 1), 'เขียนคำอธิบายและจุดเด่น', 'บอกลูกค้าว่ารีสอร์ทดีอย่างไร อย่างน้อยคำอธิบาย 30 ตัวอักษร และจุดเด่น 1 ข้อ', '#/admin/shop?deco=' + (hs.some(h => (h.description || '').trim().length >= 30) ? 'highlights' : 'description'), missing(!hs.some(h => (h.description || '').trim().length >= 30) && 'คำอธิบายสั้นเกินไปหรือยังไม่มี', !hs.some(h => (h.highlights || []).length) && 'ยังไม่มีจุดเด่น')],
    [maxImg >= 4, 'ใส่รูปรีสอร์ทอย่างน้อย 4 รูป', 'รูปแรกคือภาพปก ควรมีรูปสระ ห้องพัก วิว และอาหาร', '#/admin/shop?deco=images', `ตอนนี้มี ${maxImg} รูป ต้องเพิ่มอีก ${4 - maxImg} รูป`],
    [hs.some(h => Object.keys(h.social || {}).length), 'ใส่ลิงก์ Facebook / TikTok / LINE', 'ให้ลูกค้ากดไปดูเพจหรือทักแชตได้ทันที', '#/admin/shop?deco=social', 'ยังไม่ได้ใส่ลิงก์โซเชียลใดๆ'],
    [hs.some(h => (h.houseRules || '').trim()), 'ตรวจและบันทึกกฎของรีสอร์ท', 'ลูกค้าต้องอ่านและยอมรับกฎนี้ตอนลงทะเบียนเช็กอิน กดบันทึกแม้ใช้ข้อความตั้งต้น', '#/admin/shop?deco=houseRules', 'ยังไม่ได้บันทึกกฎของรีสอร์ท'],
  ];
  const extras = [
    [+bz.targetMonthly > 0, 'ตั้งเป้ายอดขายต่อเดือน', 'ใส่หรือไม่ใส่ก็ได้ — ใช้ดูความคืบหน้าในหน้ายอดขายภาพรวม', '#/admin/payout?focus=targetMonthly'],
    [DB.coupons().some(c => c.ownerId === u.id), 'สร้างโค้ดส่วนลดแรก', 'ช่วยกระตุ้นการจอง เช่น ลด 10% เมื่อจองล่วงหน้า', '#/admin/coupons'],
    ...(hs.some(icalOn) ? [[false, 'ขายที่ Agoda / Booking.com ด้วย? ตั้งซิงก์ปฏิทิน', 'ลดห้องบนเว็บอัตโนมัติ ไม่ให้จองซ้ำ', '#/admin/channels']] : []),
  ];
  const todo = steps.filter(s => !s[0]).length, done = steps.length - todo;
  if (!todo) return '';
  const first = steps.findIndex(s => !s[0]), h0 = hs[0];
  return `<section class="card checklist"><div class="card-h"><h3><i class="fa-solid fa-list-check"></i> เริ่มต้นใช้งาน — เหลืออีก ${todo} ขั้นตอน</h3><span class="small muted">${done}/${steps.length} เสร็จแล้ว</span></div>
    <div class="ck-bar"><i style="width:${Math.round(done / steps.length * 100)}%"></i></div>
    ${steps.map(([ok, t, s, h, miss], i) => `<a class="ck-step ${ok ? 'done' : ''} ${i === first ? 'next' : ''}" href="${h}"><span class="ck-n">${ok ? '<i class="fa-solid fa-check"></i>' : i + 1}</span><div><b>${t}</b><small>${s}</small>${!ok && miss ? `<small class="ck-miss"><i class="fa-solid fa-circle-exclamation"></i> ยังขาด: ${miss}</small>` : ''}</div>${ok ? '' : i === first ? '<span class="ck-go">ทำขั้นนี้</span>' : '<i class="fa-solid fa-chevron-right muted"></i>'}</a>`).join('')}
    <div class="ck-extra"><small class="muted">เสริม (ไม่บังคับ)</small>${extras.map(([ok, t, s, h]) => `<a class="ck-step sm ${ok ? 'done' : ''}" href="${h}"><span class="ck-n">${ok ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-plus"></i>'}</span><div><b>${t}</b><small>${s}</small></div><i class="fa-solid fa-chevron-right muted"></i></a>`).join('')}</div>
    ${h0 ? `<div class="ck-foot"><a class="btn btn-outline btn-sm" href="${siteUrl('#/hotel/' + (h0.slug || h0.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้ารีสอร์ทที่ลูกค้าเห็น</a></div>` : ''}</section>`;
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
// ================= 2) ห้องพัก =================
function boRoomsPage(main, params) {
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
  if (params?.get('focus') === 'add') { boClearParams(); setTimeout(() => $('[data-radd]', main)?.click(), 250); }
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
      <div class="fg"><label>จำนวนห้อง <span class="req">*</span></label><input name="total" type="number" min="1" value="${r.total}"></div>
      <div class="fg"><label>พักได้ (คน) <span class="req">*</span></label><input name="maxGuests" type="number" min="1" value="${r.maxGuests}"></div>
      <div class="fg"><label>ขนาด (ตร.ม.)</label><input name="size" type="number" min="0" value="${r.size}"></div>
      <div class="fg"><label>วิว</label><input name="view" value="${esc(r.view)}"></div>
      <div class="fg full"><label>เตียง</label><input name="bed" value="${esc(r.bed)}"></div>
      <div class="fg full"><label>รูปห้อง</label>
        <div class="imageField"><img id="rm-prev" src="${esc(imgUrl(r.img, 400))}" alt="" onerror="this.onerror=null;this.src='https://picsum.photos/seed/room/400/300'">
          <div style="flex:1"><label class="btn btn-outline btn-sm" style="cursor:pointer"><i class="fa-solid fa-camera"></i> เปลี่ยนรูป (เลือกจากเครื่อง)<input type="file" id="rm-file" accept="image/*" hidden></label>
            <input name="img" value="${esc(r.img)}" placeholder="หรือวางลิงก์รูป (URL)" style="margin-top:8px"></div></div></div>
      ${can('hotels.media') ? `<div class="fg full"><label>รูปห้องเพิ่มเติม (สไลด์) <span class="small muted">— สไลด์จะแสดงเมื่อเปิด "สไลด์" ของรีสอร์ทนี้ · รูปด้านบนคือรูปแรก</span></label><div id="rm-imgs"></div></div>` : ''}
      <div class="fg full"><div class="row wrap small" style="gap:18px">${[['breakfast', 'รวมอาหารเช้า'], ['freeCancel', 'ยกเลิกฟรี'], ['payAtHotel', 'ชำระที่ที่พักได้']].map(([k, l]) => `<label class="row" style="gap:6px"><input type="checkbox" name="${k}" ${r[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="rm-save">บันทึก</button></div>`, 'wide');
  const extra = [...(r.imgs || [])]; if ($('#rm-imgs', m)) imgManager($('#rm-imgs', m), extra, { min: 0 });
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
    Object.assign(r, { name: v('name').trim(), price: n('price'), total: Math.floor(n('total')), maxGuests: Math.floor(n('maxGuests')), size: n('size') || 0, view: v('view').trim(), bed: v('bed').trim(), img: v('img').trim() || r.img,
      breakfast: f.elements.breakfast.checked, freeCancel: f.elements.freeCancel.checked, payAtHotel: f.elements.payAtHotel.checked, ...($('#rm-imgs', m) ? { imgs: extra.filter(Boolean) } : {}) });
    if (isNew) h.rooms.push(r); else h.rooms = h.rooms.map(x => x.id === r.id ? r : x);
    DB.saveHotel(h); DB.log(isNew ? 'room.add' : 'room.edit', `${h.name} / ${r.name}`); closeModal(); toast(isNew ? 'เพิ่มห้องแล้ว' : 'บันทึกแล้ว'); done?.();
  };
}

// ================= 3) หน้ารีสอร์ท (ตกแต่งหน้าที่ลูกค้าเห็น) =================
function boShopPage(main, params) {
  const hotels = DB.hotels(true);
  main.innerHTML = pageHead('หน้ารีสอร์ท', 'แก้ไขรีสอร์ทที่ลูกค้าเห็น —ภาพปก รูป คำอธิบาย และลิงก์ Facebook / TikTok / LINE', hotels.length ? '' : '<button class="btn btn-primary" id="sh-new"><i class="fa-solid fa-plus"></i> เพิ่มรีสอร์ทของคุณ</button>') + (hotels.length ? hotels.map(h => {
    const soc = Object.entries(SOCIALS).filter(([k]) => h.social?.[k]);
    return `<section class="card sh-card"><div class="sh-cover">${imgTag(h.images[0], 900, '', h.id)}<span class="im-badge">ภาพปก</span></div>
      <div class="sh-body"><div class="row between wrap" style="gap:10px"><div><h2 style="margin:0">${esc(h.name)}</h2><div class="small muted">${esc(h.type)} · ${esc(h.area)}, ${esc(h.city)}</div></div>
          <label class="switch big"><input type="checkbox" data-act="${h.id}" ${h.active !== false ? 'checked' : ''} ${h.banned ? 'disabled' : ''}><span></span>${h.banned ? 'ถูกแบน' : h.active !== false ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
        ${h.banned ? `<div class="small red" style="margin-top:6px"><i class="fa-solid fa-ban"></i> ถูกแบนโดยผู้ดูแลระบบ (${h.banned.until ? 'ถึง ' + fmtDateTime(h.banned.until) : 'ถาวร'})${h.banned.reason ? ` — ${esc(h.banned.reason)}` : ''} · ติดต่อทีมงานเพื่อขอปลดแบน</div>` : ''}<p class="small" style="margin:10px 0">${esc(h.description || '— ยังไม่มีคำอธิบาย —')}</p>
        <div class="sh-thumbs">${h.images.slice(0, 8).map(i => imgTag(i, 160)).join('')}${h.images.length > 8 ? `<span class="small muted">+${h.images.length - 8}</span>` : ''}</div>
        <div class="small" style="margin-top:8px"><i class="fa-solid fa-images"></i> สไลด์รูป: ${h.images.length < 2 ? '<span class="muted">ต้องมีรูปอย่างน้อย 2 รูป</span>' : h.slideshow?.on !== true ? '<span class="muted">ปิดอยู่ — เปิดได้โดยผู้พัฒนาระบบเท่านั้น (แสดงเป็นแกลเลอรี)</span>' : `<b>เปิด</b> · เปลี่ยนรูปทุก ${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))} วินาที`}</div>
        <div class="row wrap small" style="gap:10px;margin-top:10px">${soc.length ? soc.map(([k, c]) => `<span><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</span>`).join('') : '<span class="muted">ยังไม่ได้ใส่ลิงก์โซเชียล</span>'}<span class="muted">· ลิงก์: <code>${esc(resortLink(h).replace(/^https?:\/\//, ''))}</code></span><button type="button" class="btn btn-outline btn-sm" data-copylink="${h.id}"><i class="fa-regular fa-copy"></i> คัดลอกลิงก์</button></div>
        <div class="row wrap" style="gap:8px;margin-top:14px"><button class="btn btn-primary" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> แก้ไขรีสอร์ท</button>
          <a class="btn btn-outline" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้าเว็บ</a>
          <button class="btn btn-outline" data-share="${h.id}"><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต</button>
          <button class="btn btn-ghost" data-edit="${h.id}"><i class="fa-solid fa-gear"></i> ตั้งค่าเพิ่มเติม (แผนที่ สิ่งอำนวยความสะดวก)</button></div></div></section>`;
  }).join('') : '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3><p class="muted">เพิ่มข้อมูลรีสอร์ท รูป ห้องพัก และราคา แล้วลูกค้าจะจองได้ทันที</p></div></section>');
  const redraw = () => boShopPage(main);
  const deco = params?.get('deco');
  if (deco && hotels[0]) {
    boClearParams();
    setTimeout(() => {
      shopModal(JSON.parse(JSON.stringify(DB.hotel(hotels[0].id))), redraw);
      const sel = { description: '#sh-f [name=description]', highlights: '#sh-f [name=highlights]', houseRules: '#sh-f [name=houseRules]', images: '#sh-imgs', social: '#sh-f [name^=soc_]' }[deco];
      if (sel) setTimeout(() => boFocus($('#modal'), sel.replace('#sh-f ', '').replace(/^#sh-imgs$/, '#sh-imgs')) || boFocus(document, sel), 300);
    }, 250);
  }
  $('#sh-new', main)?.addEventListener('click', () => hotelForm(null, redraw));
  $$('[data-deco]', main).forEach(b => b.onclick = () => shopModal(JSON.parse(JSON.stringify(DB.hotel(b.dataset.deco))), redraw));
  $$('[data-edit]', main).forEach(b => b.onclick = () => hotelForm(DB.hotel(b.dataset.edit), redraw));
  $$('[data-share]', main).forEach(b => b.onclick = () => sharePromo(DB.hotel(b.dataset.share)));
  $$('[data-copylink]', main).forEach(b => b.onclick = () => { copyText(resortLink(DB.hotel(b.dataset.copylink))); toast('คัดลอกลิงก์แล้ว'); });
  $$('[data-act]', main).forEach(c => c.onchange = () => { const h = DB.hotel(c.dataset.act); h.active = c.checked; DB.saveHotel(h); DB.log('hotel.toggle', `${h.name} → ${c.checked ? 'เปิดขาย' : 'ปิด'}`); toast(c.checked ? 'เปิดขายแล้ว' : 'ปิดการขายแล้ว'); redraw(); });
}
function shopModal(h, done) {
  const imgs = [...h.images];
  const m = openModal(`<h2><i class="fa-solid fa-paintbrush"></i> แก้ไขรีสอร์ท <span class="small muted">· ${esc(h.name)}</span></h2>
    <form id="sh-f" class="form-grid" novalidate style="margin-top:14px">
      <div class="fg full"><label>รูปภาพ — รูปแรกคือ <b>ภาพปก</b> (กดดาวเพื่อตั้งรูปอื่นเป็นปก)</label><div id="sh-imgs"></div></div>
      <div class="fg full"><label>โลโก้รีสอร์ท <span class="small muted">— แสดงบนหัวใบทะเบียนผู้เข้าพักที่พิมพ์ (ไม่บังคับ)</span></label>
        <div class="row" style="gap:12px;align-items:center"><span id="sh-logo-prev" style="display:inline-flex;align-items:center;justify-content:center;width:96px;height:64px;border:1px dashed var(--border,#ccd);border-radius:8px;overflow:hidden"></span>
          <button type="button" class="btn btn-outline btn-sm" id="sh-logo-up"><i class="fa-solid fa-camera"></i> อัปโหลดโลโก้</button><button type="button" class="btn btn-ghost btn-sm" id="sh-logo-rm"><i class="fa-solid fa-trash"></i> ลบโลโก้</button></div></div>
      ${can('hotels.media') ? `<div class="fg full slide-set"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" name="slide_on" ${h.slideshow?.on === true ? 'checked' : ''}> <i class="fa-solid fa-images"></i> สไลด์รูปอัตโนมัติบนหน้ารีสอร์ท</label>
        <div class="row wrap" style="gap:8px;margin-top:8px;align-items:center"><span class="small">เปลี่ยนรูปทุก</span>
          <input name="slide_sec" type="range" min="2" max="15" step="1" value="${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))}" style="flex:1;min-width:140px;max-width:260px"><b id="sl-sec-v" style="min-width:64px"></b></div>
        <div class="small muted" style="margin-top:4px">ลูกค้าเอาเมาส์ชี้หรือแตะรูป สไลด์จะหยุดชั่วคราว · ต้องมีรูปอย่างน้อย 2 รูป</div></div>` : ''}
      <div class="fg full"><label>ชื่อรีสอร์ท <span class="req">*</span></label><input name="name" value="${esc(h.name)}"></div>
      <div class="fg full"><label>คำอธิบาย</label><textarea name="description" rows="3">${esc(h.description || '')}</textarea></div>
      <div class="fg full"><label>จุดเด่น (บรรทัดละ 1 ข้อ)</label><textarea name="highlights" rows="3">${esc((h.highlights || []).join('\n'))}</textarea></div>
      <div class="fg full"><label><i class="fa-solid fa-scale-balanced"></i> กฎของรีสอร์ท (บรรทัดละ 1 ข้อ) — แสดงให้ผู้เข้าพักอ่านและเซ็นรับทราบตอนลงทะเบียนเช็คอิน และพิมพ์ในเอกสาร</label>
        <div class="small muted" style="margin:2px 0 6px">กดเลือกกฎตัวอย่างที่ต้องการ (กดซ้ำเพื่อเอาออก) แล้วแก้ข้อความ เพิ่ม หรือลบได้เองในช่องด้านล่าง</div>
        <div id="sh-rule-chips" class="row wrap" style="gap:6px;margin-bottom:8px"></div>
        <textarea name="houseRules" rows="8" maxlength="2000" placeholder="เช่น&#10;ห้ามสูบบุหรี่ในห้องพัก&#10;เงียบหลัง 22.00 น.&#10;กุญแจหายปรับ 500 บาท&#10;ห้ามนำอาหารมีกลิ่นแรงเข้าห้อง">${esc(h.houseRules || DEFAULT_HOUSE_RULES)}</textarea>
        <div class="small muted" style="margin-top:4px">เว้นว่าง = ไม่แสดงส่วนกฎในฟอร์มลงทะเบียน · ผู้เข้าพักแต่ละท่านเซ็นตามข้อความ ณ วันที่ลงทะเบียน (แก้กฎภายหลังไม่กระทบเอกสารเดิม)</div></div>
      ${isAdmin(DB.currentUser()) ? `<div class="fg full"><label>ชื่อลิงก์ประจำรีสอร์ท (a-z 0-9 -)</label><input name="slug" value="${esc(h.slug || '')}" maxlength="40" placeholder="เช่น sea-view-lan"><div class="small muted" style="margin-top:4px">ลิงก์: <code id="sh-link"></code><button type="button" class="btn btn-outline btn-sm" id="sh-copy" style="margin-left:6px"><i class="fa-regular fa-copy"></i> คัดลอก</button></div></div>` : ''}
      ${Object.entries(SOCIALS).map(([k, c]) => `<div class="fg"><label><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</label><input name="soc_${k}" value="${esc(h.social?.[k] || '')}" placeholder="${esc(c.ph)}"></div>`).join('')}
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="sh-save">บันทึก</button></div>`, 'wide');
  imgManager($('#sh-imgs', m), imgs);
  let logo = h.logo || '';
  const drawLogo = () => { $('#sh-logo-prev', m).innerHTML = logo ? `<img src="${esc(logo)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">` : '<span class="small muted">ยังไม่มีโลโก้</span>'; $('#sh-logo-rm', m).style.display = logo ? '' : 'none'; };
  drawLogo();
  $('#sh-logo-up', m).onclick = async () => {
    try { toast('เลือกรูปโลโก้จากเครื่อง...', 'info'); const url = await pickAndUploadImage(600); if (!url) return; logo = url; drawLogo(); toast('อัปโหลดโลโก้แล้ว — กด "บันทึก" เพื่อใช้งาน'); }
    catch (e) { toast('อัปโหลดโลโก้ไม่สำเร็จ: ' + e.message, 'err'); }
  };
  $('#sh-logo-rm', m).onclick = () => { logo = ''; drawLogo(); };
  const ruleTa = $('[name=houseRules]', m), ruleChips = $('#sh-rule-chips', m), ruleLines = () => ruleTa.value.split('\n').map(x => x.trim()).filter(Boolean);
  const drawChips = () => { const on = new Set(ruleLines()); ruleChips.innerHTML = HOUSE_RULE_SAMPLES.map(([lbl, t], i) => `<button type="button" class="btn btn-sm ${on.has(t) ? 'btn-primary' : 'btn-outline'}" data-rs="${i}"><i class="fa-solid ${on.has(t) ? 'fa-check' : 'fa-plus'}"></i> ${esc(lbl)}</button>`).join(''); };
  ruleChips.onclick = e => { const b = e.target.closest('[data-rs]'); if (!b) return; const t = HOUSE_RULE_SAMPLES[+b.dataset.rs][1], ls = ruleLines(); ruleTa.value = (ls.includes(t) ? ls.filter(x => x !== t) : [...ls, t]).join('\n'); drawChips(); };
  ruleTa.addEventListener('input', drawChips); drawChips();
  const f = $('#sh-f', m), link = () => $('#sh-link', m).textContent = resortLink({ id: h.id, slug: normSlug(f.elements.slug.value) });
  if (f.elements.slug) { f.elements.slug.oninput = link; link(); $('#sh-copy', m).onclick = () => { copyText($('#sh-link', m).textContent); toast('คัดลอกลิงก์แล้ว'); }; }
  if (f.elements.slide_sec) { const secLbl = () => $('#sl-sec-v', m).textContent = f.elements.slide_sec.value + ' วินาที';
    f.elements.slide_sec.oninput = secLbl; secLbl(); }
  $('#sh-save', m).onclick = () => {
    const v = k => f.elements[k].value;
    if (!v('name').trim()) return toast('กรุณาใส่ชื่อรีสอร์ท', 'err');
    const sl = f.elements.slug ? normSlug(v('slug')) : h.slug;
    if (sl && DB.hotels(true).some(x => x.id !== h.id && (x.slug === sl || x.id === sl))) return toast('ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น', 'err');
    Object.assign(h, { name: v('name').trim(), description: v('description'), images: imgs.length ? imgs : h.images, logo: logo || undefined, slug: sl || undefined,
      slideshow: f.elements.slide_on ? { on: f.elements.slide_on.checked, seconds: Math.min(15, Math.max(2, Math.round(+v('slide_sec')) || 4)) } : h.slideshow,
      highlights: v('highlights').split('\n').map(s => s.trim()).filter(Boolean),
      houseRules: v('houseRules').split('\n').map(s => s.trim()).filter(Boolean).join('\n').slice(0, 2000),
      social: Object.fromEntries(Object.keys(SOCIALS).map(k => [k, v('soc_' + k).trim()]).filter(([, x]) => x)) });
    DB.saveHotel(h); DB.log('hotel.decorate', h.name); closeModal(); toast('บันทึกหน้ารีสอร์ทแล้ว'); done?.();
  };
}

// ================= นักพัฒนา: สไลด์ & รูปของทุกรีสอร์ท =================
// เปิด/ปิดสไลด์ ตั้งเวลา จัดการรูป ของรีสอร์ททุกแห่ง (ต้องมีสิทธิ์ hotels.media — ตรวจที่ฐานข้อมูลด้วย RLS)
function boDevMedia(main) {
  const hotels = DB.hotels(true);
  const sec = h => Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)));
  const ownerName = h => { const o = h.ownerId ? DB.owner(h.ownerId) : null; return o ? (o.biz?.resortName || o.name) : 'แพลตฟอร์ม'; };
  const reqOf = h => DB.serviceRequests().find(r => r.hotel_id === h.id && r.service === 'ical');
  const reqHtml = h => { const r = reqOf(h); return r ? `<div class="small" style="margin-top:4px;color:#b45309"><i class="fa-solid fa-arrows-rotate"></i> <b>ขอใช้ซิงก์ iCal (Plus)</b> · ${fmtDateTime(r.created_at)} · ${[r.phone && `โทร <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`, r.line && 'LINE ' + esc(r.line)].filter(Boolean).join(' · ')}${r.note ? ` · “${esc(r.note)}”` : ''} <button type="button" class="btn btn-ghost btn-sm" data-req-x="${r.id}">ปิดคำขอ</button></div>` : ''; };
  const closeReq = async (id, status) => { const r = await supa.from('sd_service_requests').update({ status }).eq('id', id); if (r.error) return toast('บันทึกไม่สำเร็จ: ' + r.error.message, 'err'); CACHE.svcReq = (CACHE.svcReq || []).filter(x => x.id !== id); };
  main.innerHTML = pageHead('สไลด์ & รูปรีสอร์ท', `${hotels.length} รีสอร์ท · เปิด/ปิดสไลด์ ตั้งเวลา และจัดการรูปของรีสอร์ททุกแห่ง (เจ้าของรีสอร์ทยังแก้ของตัวเองได้เหมือนเดิม)`) + `
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> ตั้งค่าให้ทุกรีสอร์ทพร้อมกัน</h3></div>
      <div class="row wrap" style="gap:12px;align-items:center"><label class="row" style="gap:8px"><input type="checkbox" id="bulk-on" checked> เปิดสไลด์อัตโนมัติ</label>
        <span class="small">เปลี่ยนรูปทุก</span><input type="range" id="bulk-sec" min="2" max="15" step="1" value="4" style="width:200px"><b id="bulk-v" style="min-width:64px">4 วินาที</b>
        <button class="btn btn-primary btn-sm" id="bulk-go"><i class="fa-solid fa-check-double"></i> ใช้กับทุกรีสอร์ท</button></div></section>
    <div class="card sh-find"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="dm-q" placeholder="ค้นหารีสอร์ท หรือชื่อเจ้าของ..." autocomplete="off"><span class="small muted" id="dm-n">${hotels.length} แห่ง</span></div>
    <div id="dm-list">${hotels.map(h => `<section class="card sh-row" data-h="${h.id}" data-q="${esc((h.name + ' ' + ownerName(h)).toLowerCase())}">
      <div class="sh-thumb">${imgTag(h.images[0], 200, '', h.id)}</div>
      <div class="sh-main"><b class="sh-name">${esc(h.name)}</b><div class="small muted">เจ้าของ: ${esc(ownerName(h))} · ${h.images.length} รูป${h.active === false ? ' · <span class="red">ปิดการขาย</span>' : ''}</div>${reqHtml(h)}</div>
      <div class="sh-ctl"><label class="row" style="gap:6px"><input type="checkbox" data-sl-on="${h.id}" ${h.slideshow?.on === true ? 'checked' : ''} ${h.images.length < 2 ? 'disabled' : ''}> สไลด์</label>
        <input type="range" data-sl-sec="${h.id}" min="2" max="15" step="1" value="${sec(h)}" style="width:110px" ${h.images.length < 2 ? 'disabled' : ''}><b data-sl-v="${h.id}" style="min-width:58px;font-size:13px">${sec(h)} วินาที</b>
        <label class="row" style="gap:6px" title="ให้เจ้าของรีสอร์ทนี้ใช้ซิงก์ปฏิทิน Agoda / Booking.com (iCal)"><input type="checkbox" data-ic-on="${h.id}" ${h.icalOn === true ? 'checked' : ''} ${DB.flags().icalSync ? 'disabled' : ''}> ซิงก์ iCal (Plus)${DB.flags().icalSync ? ' <span class="small muted">(เปิดทั้งระบบ)</span>' : ''}</label></div>
      <div class="sh-act"><button class="btn btn-primary btn-sm" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> จัดการรูป</button>
        <a class="btn btn-outline btn-sm" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener" title="ดูหน้าเว็บ"><i class="fa-solid fa-eye"></i></a></div></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ทในระบบ</p></div></section>'}</div>`;
  const save = (id, patch) => { const h = JSON.parse(JSON.stringify(DB.hotel(id))); h.slideshow = { on: h.slideshow?.on === true, seconds: sec(h), ...patch }; DB.saveHotel(h); DB.log('hotel.slideshow', `${h.name} → ${h.slideshow.on ? 'เปิด ' + h.slideshow.seconds + ' วินาที' : 'ปิด'}`); };
  $$('[data-sl-on]', main).forEach(c => c.onchange = () => { save(c.dataset.slOn, { on: c.checked }); toast(c.checked ? 'เปิดสไลด์แล้ว' : 'ปิดสไลด์แล้ว'); });
  $$('[data-ic-on]', main).forEach(c => c.onchange = async () => {
    const h = JSON.parse(JSON.stringify(DB.hotel(c.dataset.icOn))); h.icalOn = c.checked; DB.saveHotel(h); DB.log('hotel.ical', `${h.name} → ${c.checked ? 'เปิด' : 'ปิด'}ซิงก์ iCal`); toast(c.checked ? 'เปิดซิงก์ iCal ให้รีสอร์ทนี้แล้ว' : 'ปิดซิงก์ iCal ของรีสอร์ทนี้แล้ว');
    const r = c.checked && reqOf(h); if (r) { await closeReq(r.id, 'done'); boDevMedia(main); } // เปิดให้แล้ว = ปิดคำขอที่ค้างอยู่
  });
  $$('[data-req-x]', main).forEach(b => b.onclick = async () => { if (!(await confirmBox('ปิดคำขอนี้โดยไม่เปิดบริการให้?', 'ปิดคำขอ'))) return; await closeReq(b.dataset.reqX, 'rejected'); boDevMedia(main); });
  $$('[data-sl-sec]', main).forEach(r => {
    r.oninput = () => $(`[data-sl-v="${r.dataset.slSec}"]`, main).textContent = r.value + ' วินาที';
    r.onchange = () => { save(r.dataset.slSec, { seconds: +r.value }); toast(`ตั้งเวลาสไลด์ ${r.value} วินาทีแล้ว`); };
  });
  $$('[data-deco]', main).forEach(b => b.onclick = () => shopModal(JSON.parse(JSON.stringify(DB.hotel(b.dataset.deco))), () => boDevMedia(main)));
  const dq = $('#dm-q', main); if (dq) dq.oninput = () => { const q = dq.value.trim().toLowerCase(); let n = 0; $$('.sh-row', main).forEach(r => { const ok = !q || r.dataset.q.includes(q); r.style.display = ok ? '' : 'none'; if (ok) n++; }); $('#dm-n', main).textContent = n + ' แห่ง'; };
  $('#bulk-sec', main).oninput = e => $('#bulk-v', main).textContent = e.target.value + ' วินาที';
  $('#bulk-go', main).onclick = async () => {
    const on = $('#bulk-on', main).checked, seconds = +$('#bulk-sec', main).value;
    if (!(await confirmBox(`ตั้งสไลด์ของ <b>ทุกรีสอร์ท (${hotels.length} แห่ง)</b> เป็น ${on ? 'เปิด · เปลี่ยนรูปทุก ' + seconds + ' วินาที' : 'ปิด'} ?`, 'ใช้กับทุกรีสอร์ท'))) return;
    hotels.forEach(h => save(h.id, { on, seconds }));
    toast(`ตั้งค่าสไลด์ให้ ${hotels.length} รีสอร์ทแล้ว`); boDevMedia(main);
  };
}

// ================= นักพัฒนา: รูปทั้งเว็บ (โลโก้ ไอคอน แบนเนอร์ โปรโมชั่น ชายหาด ฯลฯ) =================
// ทุกช่องมีรูปตั้งต้นในโค้ด — ถ้าตั้งรูปใหม่ที่นี่จะใช้รูปใหม่ทั่วเว็บทันที · "คืนค่าเดิม" = กลับไปใช้รูปตั้งต้น
function boDevSiteImages(main) {
  const cur = DB.siteImages(), groups = [...new Set(SITE_IMAGE_SLOTS.map(s => s.group))];
  const tile = s => { const own = cur[s.key], first = own && typeof own === 'object' ? own.list?.[0] : own, src = first ? imgUrl(first, 700) : (/^(https?:|data:|assets\/)/.test(s.def) ? s.def : imgUrl(s.def, 700));
    return `<div class="si-tile"><div class="si-img" style="aspect-ratio:${s.ratio}"><img src="${esc(src)}" alt="" onerror="this.onerror=null;this.src='https://picsum.photos/seed/${s.key}/600/400'">${own ? `<span class="im-badge">${typeof own === 'object' ? 'สไลด์ ' + (own.list || []).length + ' รูป' : 'เปลี่ยนแล้ว'}</span>` : ''}</div>
      <div class="si-body"><b>${esc(s.label)}</b><div class="row wrap" style="gap:6px;margin-top:8px">${s.multi ? `<button class="btn btn-primary btn-sm" data-slide="${s.key}"><i class="fa-solid fa-images"></i> สไลด์รูป</button>` : `<button class="btn btn-primary btn-sm" data-up="${s.key}"><i class="fa-solid fa-camera"></i> เปลี่ยนรูป</button>`}
        ${s.multi ? '' : `<button class="btn btn-outline btn-sm" data-url="${s.key}" title="วางลิงก์รูป"><i class="fa-solid fa-link"></i></button>`}${own ? `<button class="btn btn-ghost btn-sm" data-reset="${s.key}"><i class="fa-solid fa-rotate-left"></i> คืนค่าเดิม</button>` : ''}</div></div></div>`; };
  main.innerHTML = pageHead('รูปทั้งเว็บ', 'เปลี่ยนรูปทุกอย่างในเว็บได้จากที่นี่ — โลโก้ ไอคอน แบนเนอร์และโปรโมชั่นหน้าแรก รูปชายหาด (รูปของแต่ละรีสอร์ทและห้องอยู่ที่เมนู "สไลด์ & รูปรีสอร์ท" / "ห้อง & รูปห้อง")')
    + groups.map(g => `<section class="card"><div class="card-h"><h3>${esc(g)}</h3></div><div class="si-grid">${SITE_IMAGE_SLOTS.filter(s => s.group === g).map(tile).join('')}</div></section>`).join('')
    + '<div class="notice info"><i class="fa-solid fa-circle-info"></i><div>รูปที่ลูกค้าเห็นตอนแชร์ลิงก์ใน Facebook / LINE (og-image) เป็นไฟล์ในเว็บ แก้ได้เฉพาะโดยการเปลี่ยนไฟล์ <code>assets/og-image.jpg</code></div></div>';
  const save = async (key, url, label) => { try { const r = await DB.saveSiteImages({ [key]: url }); if (!r) return; DB.log('site.image', `${label} ${url ? '→ เปลี่ยนรูป' : '→ คืนค่าเดิม'}`); applySiteIcons(); toast(url ? 'เปลี่ยนรูปแล้ว' : 'คืนรูปเดิมแล้ว'); boDevSiteImages(main); } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message, 'err'); } };
  const slot = k => SITE_IMAGE_SLOTS.find(s => s.key === k);
  $$('[data-slide]', main).forEach(b => b.onclick = () => slideSlotModal(slot(b.dataset.slide), () => boDevSiteImages(main)));
  $$('[data-up]', main).forEach(b => b.onclick = async () => { const s = slot(b.dataset.up);
    try { toast('เลือกรูปจากเครื่อง...', 'info'); const url = await pickAndUploadImage(s.max); if (url) await save(s.key, url, s.label); } catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); } });
  $$('[data-url]', main).forEach(b => b.onclick = async () => { const s = slot(b.dataset.url);
    const v = await promptBox(`ลิงก์รูป — ${s.label}`, 'วางลิงก์รูป (https://...) ที่เปิดดูรูปได้โดยตรง', 'ใช้รูปนี้');
    if (v == null) return;
    if (!/^https:\/\/[^\s'"()<>]+$/.test(v.trim())) return toast('ลิงก์ไม่ถูกต้อง — ต้องขึ้นต้น https:// และห้ามมีช่องว่างหรืออักขระพิเศษ', 'err');
    save(s.key, v.trim(), s.label); });
  $$('[data-reset]', main).forEach(b => b.onclick = async () => { const s = slot(b.dataset.reset); if (await confirmBox(`คืนรูปเดิมของ "${esc(s.label)}"?`, 'คืนค่าเดิม')) save(s.key, null, s.label); });
}

// ================= นักพัฒนา: แก้หน้าเว็บ (เนื้อหา JSON) =================
// ปุ่มเปิดโหมดแก้ไขบนหน้าเว็บ + รายการข้อความที่แก้ไว้ (คืนค่าตั้งต้นทีละรายการหรือทั้งหมด)
function boDevContent(main) {
  const c = DB.content(), langs = [['th', '🇹🇭 ไทย'], ['en', '🇬🇧 English'], ['zh', '🇨🇳 中文']];
  const rows = langs.flatMap(([l, name]) => Object.entries(c.texts[l] || {}).map(([k, v]) => ({ l, name, k, v })));
  const styled = Object.keys(c.styles);
  main.innerHTML = pageHead('แก้หน้าเว็บ', 'แก้ข้อความ สี ขนาดตัวอักษร และรูป บนหน้าเว็บจริงได้เลย ไม่ต้องแก้โค้ด — เนื้อหาเก็บในฐานข้อมูลและเห็นผลกับลูกค้าทันทีที่กดบันทึก', `<a class="btn btn-primary" href="${siteUrl('#/?edit=1')}" target="_blank" rel="noopener"><i class="fa-solid fa-pen-to-square"></i> เปิดหน้าเว็บในโหมดแก้ไข</a>`) + `
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-circle-question"></i> วิธีใช้</h3></div>
      <ol class="small" style="margin:0;padding-left:22px;display:grid;gap:6px"><li>กด <b>"เปิดหน้าเว็บในโหมดแก้ไข"</b> (ต้องล็อกอินด้วยบัญชีนักพัฒนาในหน้าเว็บลูกค้า — หรือกดปุ่ม "แก้ไขหน้าเว็บ" มุมขวาล่างของหน้าเว็บ)</li>
        <li>คลิกข้อความที่มีกรอบเส้นประเพื่อพิมพ์แก้ · เลือกสี/ขนาด/ตัวหนา/จัดวางจากแถบเครื่องมือด้านล่าง</li>
        <li>คลิก <b>"เปลี่ยนรูป"</b> บนรูปเพื่ออัปโหลดรูปใหม่ (รูปบันทึกทันที)</li>
        <li>กด <b>"บันทึก"</b> — ข้อความที่แก้จะแสดงกับลูกค้าทันที · <b>เปลี่ยนภาษาแล้วแก้ต่อ</b> จะเป็นการแก้ข้อความของภาษานั้นๆ (ไทย / English / 中文 แยกกัน)</li></ol></section>
    <section class="card"><div class="card-h"><h3>ข้อความที่แก้ไว้ (${rows.length}) · สไตล์ที่ตั้งไว้ (${styled.length})</h3>${rows.length || styled.length ? '<button class="btn btn-ghost btn-sm red" id="ct-all"><i class="fa-solid fa-rotate-left"></i> คืนค่าตั้งต้นทั้งหมด</button>' : ''}</div>
      ${rows.length || styled.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>ภาษา</th><th>ตำแหน่ง (คีย์)</th><th>ข้อความ</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td>${r.name}</td><td><code>${esc(r.k)}</code></td><td>${esc(r.v)}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm red" data-ctdel="${r.l}|${esc(r.k)}"><i class="fa-solid fa-rotate-left"></i> คืนค่า</button></td></tr>`).join('')}
        ${styled.map(k => `<tr><td>ทุกภาษา</td><td><code>${esc(k)}</code></td><td class="small muted">สไตล์: ${esc(JSON.stringify(c.styles[k]))}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm red" data-ctsty="${esc(k)}"><i class="fa-solid fa-rotate-left"></i> คืนค่า</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="bo-empty sm"><i class="fa-regular fa-file-lines"></i><p class="muted">ยังไม่มีการแก้ไข — ทุกข้อความเป็นค่าตั้งต้น</p></div>'}</section>`;
  const commit = async (fn, msg) => { const n = DB.content(); fn(n); const r = await DB.saveContent(n); if (r) { DB.log('site.content', msg); toast('คืนค่าแล้ว'); boDevContent(main); } };
  $$('[data-ctdel]', main).forEach(b => b.onclick = () => { const [l, k] = b.dataset.ctdel.split('|'); commit(n => delete n.texts[l][k], `คืนค่าข้อความ ${l}/${k}`); });
  $$('[data-ctsty]', main).forEach(b => b.onclick = () => commit(n => delete n.styles[b.dataset.ctsty], `คืนค่าสไตล์ ${b.dataset.ctsty}`));
  $('#ct-all', main)?.addEventListener('click', async () => { if (await confirmBox('คืนข้อความและสไตล์ <b>ทั้งหมด</b> กลับเป็นค่าตั้งต้น? (รูปไม่ถูกแตะ)', 'คืนค่าทั้งหมด')) commit(n => { n.texts = { th: {}, en: {}, zh: {} }; n.styles = {}; }, 'คืนค่าเนื้อหาทั้งหมด'); });
}

// ================= สไลด์รูปของช่องรูปทั้งเว็บ (แบนเนอร์ / โปรโมชั่น) =================
// ใส่ได้หลายรูป (อัปโหลดหรือวางลิงก์) + ตั้งเวลาเปลี่ยนรูป 2–15 วินาที — เก็บเป็น { list, seconds } ใน sd_kv 'images'
// ไม่ใส่รูปเลย = ใช้รูปตั้งต้น · ใช้ทั้งในโหมดแก้ไขบนหน้าเว็บและหน้า dev "รูปทั้งเว็บ"
function slideSlotModal(slot, done) {
  const v = DB.siteImages()[slot.key];
  const imgs = v ? (typeof v === 'object' ? [...(v.list || [])] : [v]) : [];
  const sec0 = v && typeof v === 'object' && v.seconds ? Math.min(15, Math.max(2, Math.round(+v.seconds))) : 5;
  const m = openModal(`<h2><i class="fa-solid fa-images"></i> สไลด์รูป <span class="small muted">· ${esc(slot.label)}</span></h2>
    <p class="small muted" style="margin:6px 0 12px">ใส่ได้หลายรูป — ถ้ามีมากกว่า 1 รูปจะสไลด์อัตโนมัติ · รูปแรกแสดงก่อน · ไม่มีรูปเลย = ใช้รูปตั้งต้น</p>
    <div id="ss-imgs"></div>
    <div class="fg" style="margin-top:14px"><label>เปลี่ยนรูปทุก <b id="ss-v"></b></label><input type="range" id="ss-sec" min="2" max="15" step="1" value="${sec0}" style="width:100%;max-width:360px"></div>
    <div class="row wrap" style="justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-outline" id="ss-reset"><i class="fa-solid fa-rotate-left"></i> คืนรูปเดิมทั้งหมด</button><button class="btn btn-primary" id="ss-save">บันทึก</button></div>`, 'wide');
  imgManager($('#ss-imgs', m), imgs, { min: 0 });
  const lbl = () => $('#ss-v', m).textContent = $('#ss-sec', m).value + ' วินาที';
  $('#ss-sec', m).oninput = lbl; lbl();
  const commit = async value => { const r = await DB.saveSiteImages({ [slot.key]: value }); if (!r) return; DB.log('site.image', `${slot.label} → ${value ? 'สไลด์ ' + (value.list ? value.list.length : 1) + ' รูป' : 'คืนค่าเดิม'}`); closeModal(); applySiteIcons(); toast(value ? 'บันทึกสไลด์แล้ว' : 'คืนรูปเดิมแล้ว'); done?.(); };
  $('#ss-save', m).onclick = () => { const l = imgs.filter(Boolean); commit(!l.length ? null : l.length === 1 ? l[0] : { list: l, seconds: +$('#ss-sec', m).value }); };
  $('#ss-reset', m).onclick = () => commit(null);
}

// ================= จองจากช่องทางอื่น (Agoda / Booking.com / โทรศัพท์ ฯลฯ) =================
// บันทึกการจองที่เกิดนอกระบบ → ลดห้องว่างบนเว็บทันที (ใช้ sd_block_rooms เดิม) · ยังไม่ดึงข้อมูลจาก OTA อัตโนมัติ
// ซิงก์ปฏิทิน iCal: dev เปิดทั้งระบบ (flags.icalSync) หรือเปิดเฉพาะรีสอร์ท (h.icalOn — ตั้งที่หน้า "สไลด์ & รูปรีสอร์ท" ของ dev)
const icalOn = h => !!h && (DB.flags().icalSync === true || h.icalOn === true);
function boChannels(main) {
  const hotels = DB.hotels(true);
  const f = { ch: '', st: 'active', hid: hotels[0]?.id || '' };
  const chColor = c => ({ 'Agoda': '#c2410c', 'Booking.com': '#1d4ed8', 'Traveloka': '#0369a1', 'Trip.com': '#6d28d9', 'Airbnb': '#be123c' }[c] || '#475569');
  main.innerHTML = pageHead('จองจากช่องทางอื่น', 'บันทึกการจองจาก Agoda / Booking.com / โทรศัพท์ เพื่อลดห้องว่างบนเว็บของเรา ไม่ให้ลูกค้าจองซ้ำ', '<button class="btn btn-primary" id="ch-add"><i class="fa-solid fa-plus"></i> บันทึกการจองใหม่</button>') + `
    ${hotels.some(icalOn)
      ? '<div class="notice info"><i class="fa-solid fa-circle-info"></i><div>มี 2 วิธีลดห้อง: <b>ซิงก์อัตโนมัติ (Plus)</b> วางลิงก์ปฏิทิน iCal จาก Agoda / Booking.com ด้านล่าง ระบบดึงทุก 20 นาที (ไม่ใช่เรียลไทม์ จึงอาจจองซ้อนได้ในช่วงรอ) หรือ <b>บันทึกเอง</b> ด้วยปุ่ม “บันทึกการจองใหม่”</div></div>'
      : '<div class="notice info"><i class="fa-solid fa-circle-info"></i><div>เมื่อมีลูกค้าจองจาก Agoda / Booking.com / โทรศัพท์ กด <b>“บันทึกการจองใหม่”</b> เพื่อลดห้องที่นี่ทันที และกด <b>“เปิดห้องคืน”</b> เมื่อลูกค้ายกเลิก</div></div>'}
    <section class="card" id="ch-feeds"></section>
    <div id="ch-sum" class="tl-sum"></div>
    <section class="card"><div class="ob-tool">
      ${hotels.length > 1 ? `<select id="ch-h" class="sel">${hotels.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select>` : ''}
      <select id="ch-c" class="sel"><option value="">ทุกช่องทาง</option>${BLOCK_CHANNELS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
      <select id="ch-s" class="sel"><option value="active">ยังปิดห้องอยู่</option><option value="released">เปิดห้องคืนแล้ว</option><option value="">ทั้งหมด</option></select>
    </div><div id="ch-list"></div></section>`;

  const ICAL_CH = ['Agoda', 'Booking.com', 'Airbnb', 'Traveloka', 'Trip.com'];
  const drawFeeds = async () => {
    const box = $('#ch-feeds'); if (!box) return;
    const h = DB.hotel(f.hid); if (!h) { box.innerHTML = ''; return; }
    if (!icalOn(h)) {
      const st = DB.settings(), u = DB.currentUser(), biz = u?.biz || {};
      const open = (await supa.from('sd_service_requests').select('*').eq('hotel_id', h.id).eq('service', 'ical').eq('status', 'new').maybeSingle()).data;
      box.innerHTML = `<div class="card-h"><h3><i class="fa-solid fa-arrows-rotate"></i> ซิงก์อัตโนมัติ <span class="pill" style="background:#f59e0b;color:#fff"><i class="fa-solid fa-crown"></i> Plus</span></h3></div>
        <p style="margin:0 0 8px">ดึงข้อมูล Agoda / Booking.com ทุก 20 นาที แล้วลดห้องบนเว็บให้อัตโนมัติ ไม่ต้องคอยกรอกเองทุกครั้ง · เป็นบริการเสริมแบบ <b>Plus</b> (มีค่าบริการ) ต้องติดต่อผู้พัฒนาก่อน</p>
        ${open ? `<div class="notice info"><i class="fa-solid fa-circle-check"></i><div><b>ส่งคำขอแล้ว</b> เมื่อ ${fmtDateTime(open.created_at)} — ผู้พัฒนาจะติดต่อกลับทาง ${[open.phone && 'โทร ' + esc(open.phone), open.line && 'LINE ' + esc(open.line)].filter(Boolean).join(' / ')}</div></div>`
        : `<form id="ic-req" class="form-grid" novalidate><div class="fg"><label>เบอร์โทรที่ให้ติดต่อกลับ</label><input name="phone" type="tel" maxlength="30" value="${esc(biz.phone || '')}" placeholder="08x-xxx-xxxx"></div>
          <div class="fg"><label>LINE ID</label><input name="line" maxlength="60" value="${esc(biz.line || '')}" placeholder="@ไลน์ไอดี"></div>
          <div class="fg full"><label>ข้อความถึงผู้พัฒนา (ไม่บังคับ)</label><input name="note" maxlength="300" placeholder="เช่น ขายที่ Agoda และ Booking.com"></div>
          <div class="full"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> ขอใช้บริการซิงก์อัตโนมัติ (iCal)</button></div></form>`}
        <p class="small muted" style="margin:10px 0 0">${st.phone || st.line ? `ติดต่อผู้พัฒนาโดยตรง${st.phone ? ` โทร <a href="tel:${esc(st.phone)}">${esc(st.phone)}</a>` : ''}${st.line ? ` · LINE ${esc(st.line)}` : ''} · ` : ''}ระหว่างนี้ยังใช้ปุ่ม “บันทึกการจองใหม่” ลดห้องด้วยตัวเองได้ฟรี</p>`;
      const rf = $('#ic-req', box);
      if (rf) rf.onsubmit = async e => {
        e.preventDefault();
        const phone = rf.elements.phone.value.trim(), line = rf.elements.line.value.trim();
        if (!phone && !line) return toast('กรอกเบอร์โทรหรือ LINE อย่างน้อย 1 ช่องทาง เพื่อให้ผู้พัฒนาติดต่อกลับ', 'err');
        const btn = rf.querySelector('button'); btn.disabled = true;
        const r = await supa.from('sd_service_requests').insert({ hotel_id: h.id, service: 'ical', phone, line, note: rf.elements.note.value.trim() });
        if (r.error) { btn.disabled = false; return toast('ส่งคำขอไม่สำเร็จ: ' + r.error.message, 'err'); }
        DB.log('service.request', `${h.name} · ซิงก์ iCal (Plus)`); toast('ส่งคำขอแล้ว — ผู้พัฒนาจะติดต่อกลับ'); drawFeeds();
      };
      return;
    }
    const res = await supa.from('sd_ical_feeds').select('*').eq('hotel_id', h.id).order('created_at');
    const feeds = res.data || [], roomName = id => (h.rooms.find(r => r.id === id) || {}).name || '(ห้องถูกลบ)';
    box.innerHTML = `<div class="card-h"><h3><i class="fa-solid fa-arrows-rotate"></i> ซิงก์อัตโนมัติ (iCal)</h3><span class="small muted">ดึงทุก 20 นาที · ใช้ได้เมื่อ Agoda / Booking.com ให้ลิงก์ปฏิทิน</span></div>
      ${feeds.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>ห้อง</th><th>ช่องทาง</th><th>สถานะ</th><th></th></tr></thead><tbody>${feeds.map(x => `<tr><td>${esc(roomName(x.room_id))}</td><td>${esc(x.channel)}</td>
        <td class="small">${x.last_status === 'ok' ? `<span class="pill ok">ปกติ</span> ซิงก์ล่าสุด ${fmtDateTime(x.last_sync_at)} · ${x.last_count} รายการ` : x.last_status === 'error' ? `<span class="pill bad">ผิดพลาด</span> <span class="red">${esc(x.last_error || '')}</span>` : '<span class="muted">ยังไม่เคยซิงก์</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-outline" data-fs="${x.id}"><i class="fa-solid fa-rotate"></i> ซิงก์ตอนนี้</button> <button class="btn btn-sm btn-ghost red" data-fd="${x.id}" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted" style="padding:0 20px">ยังไม่มีลิงก์ iCal — เพิ่มด้านล่าง ลิงก์ 1 อันต่อ 1 ประเภทห้อง</p>'}
      <form id="fd-f" class="ob-tool" style="padding:12px 20px;gap:10px;flex-wrap:wrap" novalidate>
        <select name="room" class="sel">${h.rooms.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
        <select name="channel" class="sel">${ICAL_CH.map(c => `<option>${esc(c)}</option>`).join('')}</select>
        <input name="url" class="sel" placeholder="วางลิงก์ iCal (https://…/….ics)" style="flex:1;min-width:260px">
        <button class="btn btn-primary" id="fd-add"><i class="fa-solid fa-plus"></i> เพิ่มและซิงก์</button></form>
      <div class="red small" id="fd-err" style="padding:0 20px 12px"></div>`;
    const sync = async id => { toast('กำลังซิงก์...', 'info'); const r = await supa.functions.invoke('sd-ical-sync', { body: { feedId: id } }); if (r.error) toast('ซิงก์ไม่สำเร็จ: ' + r.error.message, 'err'); else { const x = (r.data?.results || [])[0] || {}; toast(x.ok ? `ซิงก์แล้ว: เพิ่ม ${x.added ?? 0} · เปิดคืน ${x.released ?? 0}` : 'ซิงก์ไม่สำเร็จ: ' + (x.error || ''), x.ok ? 'ok' : 'err'); } await DB.load(); draw(); drawFeeds(); };
    $$('[data-fs]', box).forEach(b => b.onclick = () => sync(b.dataset.fs));
    $$('[data-fd]', box).forEach(b => b.onclick = async () => { if (!(await confirmBox('ลบลิงก์นี้? รายการที่ซิงก์เข้ามาแล้วจะยังปิดห้องอยู่จนกว่าจะเปิดห้องคืนเอง', 'ลบ'))) return; await supa.from('sd_ical_feeds').delete().eq('id', b.dataset.fd); drawFeeds(); });
    $('#fd-f', box).onsubmit = async e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)), err = $('#fd-err', box); err.textContent = '';
      const u = (v.url || '').trim();
      if (!/^https:\/\//i.test(u)) return err.textContent = 'ลิงก์ต้องขึ้นต้นด้วย https://';
      const ins = await supa.from('sd_ical_feeds').insert({ hotel_id: h.id, room_id: v.room, channel: v.channel, url: u }).select().single();
      if (ins.error) return err.textContent = 'บันทึกไม่สำเร็จ: ' + ins.error.message;
      DB.log('ical.add', `${h.name} · ${v.channel}`); sync(ins.data.id);
    };
  };
  const draw = () => {
    const today = todayISO();
    const all = DB.bookings().filter(b => b.source === 'external' && (!f.hid || b.hotelId === f.hid));
    const act = all.filter(b => b.status !== 'cancelled'), soon = act.filter(b => b.checkIn >= today && b.checkIn <= addDays(today, 7));
    const cnt = {}; act.forEach(b => { const c = b.channel || 'ปิดห้อง'; cnt[c] = (cnt[c] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    $('#ch-sum').innerHTML = [['fa-lock', 'info', 'รายการที่ปิดห้องอยู่', `${act.length} รายการ`], ['fa-calendar-day', soon.length ? 'warn' : 'ok', 'เข้าพักใน 7 วัน', `${soon.length} รายการ`], ['fa-trophy', 'ok', 'ช่องทางที่จองมากสุด', top ? `${esc(top[0])} (${top[1]})` : '—'], ['fa-lock-open', 'ok', 'เปิดห้องคืนแล้ว', `${all.length - act.length} รายการ`]]
      .map(([ic, c, l, v]) => `<div class="tl-tile ${c}"><i class="fa-solid ${ic}"></i><div><small>${l}</small><b>${v}</b></div></div>`).join('');
    const list = all.filter(b => (!f.ch || (b.channel || 'ปิดห้อง') === f.ch) && (!f.st || (f.st === 'active') === (b.status !== 'cancelled'))).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    $('#ch-list').innerHTML = !list.length ? '<div class="bo-empty sm"><i class="fa-solid fa-inbox"></i><p class="muted">ยังไม่มีรายการ — กด “บันทึกการจองใหม่” เมื่อมีลูกค้าจองจากช่องทางอื่น</p></div>' :
      `<div class="table-scroll"><table class="tbl"><thead><tr><th>ช่องทาง</th><th>ลูกค้า / อ้างอิง</th><th>ห้อง</th><th>วันที่พัก</th><th>สถานะ</th><th></th></tr></thead><tbody>${list.map((b, i) => {
        const on = b.status !== 'cancelled', c = b.channel || 'ปิดห้อง';
        return `<tr><td><span class="pill" style="background:${chColor(c)}1a;color:${chColor(c)};border:1px solid ${chColor(c)}55">${esc(c)}</span></td>
        <td><b>${esc(guestName(b))}</b>${b.guest.note ? `<div class="small muted">${esc(b.guest.note)}</div>` : ''}${b.auto ? '<div class="small muted"><i class="fa-solid fa-arrows-rotate"></i> ซิงก์อัตโนมัติ</div>' : ''}</td>
        <td>${esc(b.roomName)} × ${b.qty}</td><td class="small">${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}<div class="muted">${b.nights} คืน</div></td>
        <td>${on ? '<span class="pill warn">ปิดห้องอยู่</span>' : '<span class="pill ok">เปิดคืนแล้ว</span>'}${on && b.conflict ? '<div><span class="pill bad">จองซ้อนกับรายการอื่น</span></div>' : ''}</td>
        <td style="text-align:right">${on && b.checkOut >= today ? `<button class="btn btn-sm btn-outline" data-rel="${i}"><i class="fa-solid fa-lock-open"></i> เปิดห้องคืน</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
    $$('[data-rel]', main).forEach(btn => btn.onclick = async () => {
      const b = list[+btn.dataset.rel];
      if (!(await confirmBox(`เปิดห้องคืน <b>${esc(b.roomName)} × ${b.qty}</b> (${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}) จาก ${esc(b.channel || 'ปิดห้อง')}? ลูกค้าบนเว็บจะจองห้องนี้ได้อีกครั้ง`, 'เปิดห้องคืน'))) return;
      DB.updateBooking(b.id, { status: 'cancelled', cancelledBy: 'เจ้าของ (เปิดห้องคืน)', cancelledAt: new Date().toISOString() });
      DB.log('booking.release', `${b.id} · ${b.roomName} × ${b.qty} · ${b.checkIn} → ${b.checkOut}`); toast('เปิดห้องคืนแล้ว'); draw();
    });
  };
  $('#ch-h')?.addEventListener('change', e => { f.hid = e.target.value; draw(); drawFeeds(); });
  $('#ch-c').onchange = e => { f.ch = e.target.value; draw(); };
  $('#ch-s').onchange = e => { f.st = e.target.value; draw(); };
  $('#ch-add').onclick = () => blockRoomsModal(DB.hotel(f.hid), { channel: 'Agoda' }, draw);
  draw(); drawFeeds();
}

// ---------- แจ้งเตือนการจอง (Telegram + Web Push) ----------
const NOTIFY_VAPID_PUBLIC = 'BNZP8pEMnY_mtugVH_GhwhJiLI7mYn4npBpPhbeuHxWXzX9m0SQjM1E35uZ7UE4xxT_U81ugqTMNx8c6SzEhhtI';
const NOTIFY_EVENTS = [['new', 'มีการจองใหม่'], ['slip', 'ลูกค้าส่งสลิปโอนเงิน'], ['cancel', 'ลูกค้าขอยกเลิก'], ['checkin', 'ลูกค้ากรอกเช็คอินเอง']];
const b64ToBytes = s => Uint8Array.from(atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

function boNotify(main) {
  const uid = () => supa.auth.getUser().then(r => r.data.user?.id);
  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const pushOk = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  main.innerHTML = pageHead('การแจ้งเตือน', 'ให้ระบบส่งข้อความหาคุณทันทีเมื่อมีลูกค้าจอง ไม่ต้องเปิดเว็บมาดูเอง') + '<div id="nt-box"><div class="muted small">กำลังโหลด…</div></div>';

  const soft = p => Promise.race([Promise.resolve(p), new Promise(r => setTimeout(() => r(null), 2500))]).catch(() => null); // service worker บางเครื่องไม่ตอบ — อย่าให้หน้าค้าง
  const draw = async () => { try { await draw0(); } catch (err) { console.error(err); $('#nt-box').innerHTML = `<div class="notice warn"><i class="fa-solid fa-triangle-exclamation"></i><div>โหลดหน้านี้ไม่สำเร็จ: ${esc(err.message || err)}</div></div>`; } };
  const draw0 = async () => {
    const [subsR, prefR, tgR] = await Promise.all([supa.from('sd_notify_subs').select('id, kind, endpoint, label, created_at').order('created_at'), supa.from('sd_notify_prefs').select('prefs').maybeSingle(), supa.rpc('sd_notify_tg_status')]);
    const subs = subsR.data || [], prefs = { new: true, slip: true, cancel: true, checkin: true, ...(prefR.data?.prefs || {}) };
    const reg = pushOk ? await soft(navigator.serviceWorker.getRegistration()) : null, mine = reg ? await soft(reg.pushManager.getSubscription()) : null;
    const thisOn = !!mine && subs.some(s => s.kind === 'webpush' && s.endpoint === mine.endpoint);
    const tg = tgR.data || {}, pushes = subs.filter(s => s.kind === 'webpush');
    $('#nt-box').innerHTML = `
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-mobile-screen"></i> แจ้งเตือนบนเครื่องนี้ (Web Push)</h3>${thisOn ? '<span class="pill ok">เปิดอยู่</span>' : ''}</div>
        <div style="padding:14px 20px">
          ${!pushOk ? '<div class="notice warn"><i class="fa-solid fa-triangle-exclamation"></i><div>เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน' + (isIos ? ' — บน iPhone ต้องเปิดจากไอคอนบนหน้าจอโฮม (ดูด้านล่าง)' : '') + '</div></div>' : ''}
          ${isIos && !standalone ? '<div class="notice info"><i class="fa-solid fa-circle-info"></i><div><b>iPhone:</b> กดปุ่มแชร์ใน Safari → <b>เพิ่มลงในหน้าจอโฮม</b> แล้วเปิดระบบจากไอคอนนั้น จึงจะเปิดแจ้งเตือนได้</div></div>' : ''}
          <div class="row" style="gap:10px;flex-wrap:wrap">${thisOn
            ? '<button class="btn btn-outline" id="nt-off"><i class="fa-solid fa-bell-slash"></i> ปิดบนเครื่องนี้</button><button class="btn btn-ghost" id="nt-test"><i class="fa-solid fa-paper-plane"></i> ส่งทดสอบ</button>'
            : `<button class="btn btn-primary" id="nt-on" ${pushOk ? '' : 'disabled'}><i class="fa-solid fa-bell"></i> เปิดแจ้งเตือนบนเครื่องนี้</button>`}</div>
          ${pushes.length ? `<div class="small muted" style="margin-top:10px">อุปกรณ์ที่เปิดไว้ ${pushes.length} เครื่อง ${pushes.length > 1 || !thisOn ? '<button class="btn btn-sm btn-ghost red" id="nt-clr">ลบทั้งหมด</button>' : ''}</div>` : ''}
        </div></section>
      <section class="card"><div class="card-h"><h3><i class="fa-brands fa-telegram"></i> Telegram</h3>${tg.connected ? '<span class="pill ok">เชื่อมแล้ว</span>' : ''}</div>
        <div style="padding:14px 20px">
          ${tg.connected ? `<div class="row between" style="padding:4px 0"><span><i class="fa-solid fa-circle-check" style="color:#0a8f3c"></i> ส่งไปที่ <b>${esc(tg.chat)}</b> ผ่านบอท @${esc(tg.bot)}</span><button class="btn btn-sm btn-ghost red" id="nt-tgx">ยกเลิกเชื่อม</button></div>`
          : tg.bot ? `<div class="notice info"><i class="fa-solid fa-circle-info"></i><div><b>ขั้นตอนสุดท้าย:</b> เปิดบอท <a href="https://t.me/${esc(tg.bot)}" target="_blank" rel="noopener"><b>@${esc(tg.bot)}</b></a> ใน Telegram แล้วกด <b>Start</b> (ถ้าจะให้ส่งเข้ากลุ่ม ให้เพิ่มบอทเข้ากลุ่มแล้วพิมพ์ข้อความ 1 ครั้ง) จากนั้นกดปุ่มด้านล่าง</div></div>
              <div class="row" style="gap:10px;flex-wrap:wrap"><button class="btn btn-primary" id="nt-detect"><i class="fa-solid fa-magnifying-glass"></i> ตรวจสอบ</button><button class="btn btn-ghost red" id="nt-tgx">เริ่มใหม่</button></div>`
          : `<ol class="small" style="margin:0 0 12px;padding-left:20px;line-height:1.8">
              <li>เปิด Telegram แล้วค้นหา <a href="https://t.me/BotFather" target="_blank" rel="noopener"><b>@BotFather</b></a></li>
              <li>พิมพ์ <b>/newbot</b> ตั้งชื่อบอทตามต้องการ (ชื่อผู้ใช้ต้องลงท้ายด้วย <b>bot</b>)</li>
              <li>BotFather จะส่ง <b>token</b> มาให้ — คัดลอกมาวางด้านล่าง</li></ol>
            <form id="nt-f" class="row" style="gap:10px;flex-wrap:wrap" novalidate><input id="nt-token" class="sel" style="flex:1;min-width:240px" placeholder="วาง token ที่นี่ เช่น 123456789:AAH…" autocomplete="off"><button class="btn btn-primary" id="nt-con"><i class="fa-brands fa-telegram"></i> เชื่อมต่อ</button></form>`}
        </div></section>
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-list-check"></i> แจ้งเตือนเรื่องอะไรบ้าง</h3></div>
        <div style="padding:8px 20px 16px">${NOTIFY_EVENTS.map(([k, l]) => `<label style="display:flex;gap:10px;align-items:center;padding:8px 0"><input type="checkbox" data-pf="${k}" ${prefs[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></section>`;

    const del = async ids => { const r = await supa.from('sd_notify_subs').delete().in('id', ids); if (r.error) toast(r.error.message, 'err'); draw(); };
    $('#nt-on')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      try {
        if (await Notification.requestPermission() !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน — เปิดได้ที่การตั้งค่าเบราว์เซอร์');
        const r = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready;
        const sub = (await r.pushManager.getSubscription()) || await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(NOTIFY_VAPID_PUBLIC) });
        const j = sub.toJSON();
        const ins = await supa.from('sd_notify_subs').upsert({ owner_id: await uid(), kind: 'webpush', endpoint: j.endpoint, keys: j.keys, label: (navigator.userAgent.match(/iPhone|iPad|Android|Windows|Mac/) || ['อุปกรณ์'])[0] }, { onConflict: 'kind,endpoint' });
        if (ins.error) throw ins.error;
        toast('เปิดแจ้งเตือนบนเครื่องนี้แล้ว');
      } catch (err) { toast(err.message || 'เปิดแจ้งเตือนไม่สำเร็จ', 'err'); }
      draw();
    });
    $('#nt-off')?.addEventListener('click', async () => { const id = subs.find(s => s.kind === 'webpush' && s.endpoint === mine.endpoint)?.id; await mine.unsubscribe().catch(() => {}); if (id) del([id]); else draw(); });
    $('#nt-clr')?.addEventListener('click', () => del(pushes.map(p => p.id)));
    $('#nt-test')?.addEventListener('click', () => reg.showNotification('ทดสอบแจ้งเตือน', { body: 'ถ้าเห็นข้อความนี้ แปลว่าเครื่องนี้พร้อมรับแจ้งเตือนแล้ว', icon: 'assets/icon-192.png' }));
    const call = async (action, extra = {}) => { const r = await supa.functions.invoke('sd-notify', { body: { action, ...extra } }); let msg = r.error?.message; try { msg = (await r.error?.context?.json())?.error || msg; } catch {} return { ok: !r.error, msg, d: r.data }; };
    $('#nt-f')?.addEventListener('submit', async e => {
      e.preventDefault(); const btn = $('#nt-con'); btn.disabled = true;
      const r = await call('tg-connect', { token: $('#nt-token').value }); toast(r.ok ? 'ตรวจ token ผ่านแล้ว' : r.msg || 'เชื่อมไม่สำเร็จ', r.ok ? 'ok' : 'err'); draw();
    });
    $('#nt-detect')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true; const r = await call('tg-detect'); toast(r.ok ? 'เชื่อม Telegram สำเร็จ — ส่งข้อความทดสอบแล้ว' : r.msg || 'ตรวจสอบไม่สำเร็จ', r.ok ? 'ok' : 'err'); draw();
    });
    $('#nt-tgx')?.addEventListener('click', async () => { const r = await supa.rpc('sd_notify_tg_remove'); if (r.error) toast(r.error.message, 'err'); draw(); });
    $$('[data-pf]').forEach(c => c.onchange = async () => {
      prefs[c.dataset.pf] = c.checked;
      const r = await supa.from('sd_notify_prefs').upsert({ owner_id: await uid(), prefs }, { onConflict: 'owner_id' }); if (r.error) toast(r.error.message, 'err');
    });
  };
  draw();
}

// ---------- พนักงานของฉัน (เจ้าของจ้างแอดมินส่วนตัว) ----------
function boMyTeam(main) {
  main.innerHTML = pageHead('พนักงานของฉัน', 'สร้างบัญชีให้พนักงานเข้ามาช่วยดูแลรีสอร์ท — เลือกได้ว่าแต่ละคนทำอะไรได้บ้าง เรื่องเงิน (บัญชีรับเงิน · รายงานการเงิน) เป็นของเจ้าของคนเดียว', '<button class="btn btn-primary" id="tm-add"><i class="fa-solid fa-user-plus"></i> เพิ่มพนักงาน</button>')
    + '<section class="card flush"><div id="tm-list"><div class="muted small" style="padding:16px 20px">กำลังโหลด…</div></div></section>';
  const form = u => {
    const isNew = !u, pw = genPassword(), have = new Set(u?.perms || ['ops.view', 'frontdesk', 'bookings.view']);
    const m = openModal(`<h2>${isNew ? 'เพิ่มพนักงาน' : 'แก้ไขพนักงาน'}</h2>
      <form id="tf" class="form-grid" style="margin-top:14px" novalidate>
        <div class="fg full"><label>ชื่อ-นามสกุล <span class="req">*</span></label><input name="name" value="${esc(u?.name || '')}"></div>
        <div class="fg"><label>อีเมล (ใช้เข้าสู่ระบบ) <span class="req">*</span></label><input name="email" type="email" value="${esc(u?.email || '')}" ${isNew ? '' : 'disabled'}></div>
        <div class="fg"><label>เบอร์โทร</label><input name="phone" value="${esc(u?.phone || '')}"></div>
        ${isNew ? `<div class="fg full"><label>รหัสผ่านเริ่มต้น</label><div class="pw-wrap"><input name="pass" value="${pw}" class="mono"><button type="button" id="tf-gen" title="สุ่มใหม่"><i class="fa-solid fa-rotate"></i></button></div><div class="small muted" style="margin-top:4px">อย่างน้อย 8 ตัวอักษร — ส่งให้พนักงานเอง และให้เปลี่ยนรหัสหลังเข้าใช้ครั้งแรก</div></div>` : ''}
        <div class="fg full"><label>สิทธิ์ของคนนี้</label>
          <div class="row wrap" style="gap:8px;margin-bottom:6px"><button type="button" class="btn btn-sm btn-outline" id="tp-all">เลือกทั้งหมด</button><button type="button" class="btn btn-sm btn-ghost" id="tp-none">ล้าง</button></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 14px">${Object.entries(STAFF_PERM_LABELS).map(([k, l]) => `<label class="small perm-opt"><input type="checkbox" name="perm" value="${k}" ${have.has(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>
          <div class="small muted" style="margin-top:6px"><i class="fa-solid fa-lock"></i> พนักงานเข้าถึงบัญชีรับเงิน รายงานการเงิน และการตั้งค่าพนักงาน/แจ้งเตือนไม่ได้ ไม่ว่าจะติ๊กอะไร</div></div>
        <div class="full row" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary">บันทึก</button></div></form>`);
    const perms = () => $$('input[name=perm]:checked', m).map(i => i.value);
    $('#tp-all', m).onclick = () => $$('input[name=perm]', m).forEach(i => i.checked = true);
    $('#tp-none', m).onclick = () => $$('input[name=perm]', m).forEach(i => i.checked = false);
    $('#tf-gen', m)?.addEventListener('click', () => $('[name=pass]', m).value = genPassword());
    $('#tf', m).onsubmit = async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      if (!v.name.trim()) return toast('กรุณากรอกชื่อ', 'err');
      const btn = $('button.btn-primary', e.target); btn.disabled = true;
      let r;
      if (isNew) {
        const email = v.email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast('รูปแบบอีเมลไม่ถูกต้อง', 'err'); }
        if ((v.pass || '').length < 8) { btn.disabled = false; return toast('รหัสผ่านอย่างน้อย 8 ตัวอักษร', 'err'); }
        r = await DB.ownerStaffAdmin('create', { email, password: v.pass, name: v.name.trim(), phone: v.phone.trim(), perms: perms() });
        btn.disabled = false;
        if (r.error) return toast(r.error, 'err');
        DB.log('team.add', email);
        closeModal(); showCredential(email, v.pass, 'เพิ่มพนักงานเรียบร้อย', 'owner'); return load();
      }
      r = await DB.ownerStaffAdmin('update', { id: u.id, name: v.name.trim(), phone: v.phone.trim(), perms: perms() });
      btn.disabled = false;
      if (r.error) return toast(r.error, 'err');
      DB.log('team.edit', u.email); closeModal(); toast('บันทึกแล้ว'); load();
    };
  };

  let list = [];
  const draw = () => {
    $('#tm-list').innerHTML = list.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>พนักงาน</th><th>ทำอะไรได้</th><th>สถานะ</th><th></th></tr></thead><tbody>
      ${list.map(u => `<tr><td><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}${u.phone ? ' · ' + esc(u.phone) : ''}</div></td>
        <td class="small">${(u.perms || []).filter(p => STAFF_PERM_LABELS[p]).map(p => `<span class="pill">${esc(STAFF_PERM_LABELS[p])}</span>`).join(' ') || '<span class="muted">ยังไม่ได้ให้สิทธิ์</span>'}</td>
        <td>${u.active === false ? '<span class="pill bad">ระงับ</span>' : '<span class="pill ok">ใช้งานอยู่</span>'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-outline" data-te="${u.id}">แก้ไข</button> <button class="btn btn-sm btn-ghost" data-tpw="${u.id}" title="ตั้งรหัสผ่านใหม่"><i class="fa-solid fa-key"></i></button> <button class="btn btn-sm btn-ghost" data-tsus="${u.id}">${u.active === false ? 'เปิดใช้' : 'ระงับ'}</button> <button class="btn btn-sm btn-ghost red" data-tdel="${u.id}" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
      </tbody></table></div>`
      : '<div class="bo-empty" style="padding:28px 20px"><i class="fa-solid fa-user-group"></i><h3>ยังไม่มีพนักงาน</h3><p class="muted small">กด “เพิ่มพนักงาน” เพื่อสร้างบัญชีให้แอดมินที่คุณจ้างมาช่วยงาน</p></div>';
    const by = id => list.find(x => x.id === id);
    $$('[data-te]', main).forEach(b => b.onclick = () => form(by(b.dataset.te)));
    $$('[data-tpw]', main).forEach(b => b.onclick = async () => {
      const u = by(b.dataset.tpw), pw = genPassword();
      if (!(await confirmBox(`ตั้งรหัสผ่านใหม่ให้ <b>${esc(u.name)}</b>?`, 'รีเซ็ตรหัสผ่าน'))) return;
      const r = await DB.ownerStaffAdmin('resetpw', { id: u.id, password: pw });
      if (r.error) return toast(r.error, 'err');
      DB.log('team.resetpw', u.email); showCredential(u.email, pw, 'รีเซ็ตรหัสผ่านแล้ว', 'owner'); load();
    });
    $$('[data-tsus]', main).forEach(b => b.onclick = async () => {
      const u = by(b.dataset.tsus), suspend = u.active !== false;
      if (!(await confirmBox(`${suspend ? 'ระงับ' : 'เปิดใช้งาน'}บัญชี <b>${esc(u.name)}</b>?`, suspend ? 'ระงับบัญชี' : 'เปิดใช้งาน'))) return;
      const r = await DB.ownerStaffAdmin('update', { id: u.id, active: !suspend });
      if (r.error) return toast(r.error, 'err');
      DB.log(suspend ? 'team.suspend' : 'team.activate', u.email); toast('อัปเดตแล้ว'); load();
    });
    $$('[data-tdel]', main).forEach(b => b.onclick = async () => {
      const u = by(b.dataset.tdel);
      if (!(await confirmBox(`ลบ <b>${esc(u.name)}</b> (${esc(u.email)})? บัญชีนี้จะเข้าสู่ระบบไม่ได้อีก`, 'ลบพนักงาน'))) return;
      const r = await DB.ownerStaffAdmin('delete', { id: u.id });
      if (r.error) return toast(r.error, 'err');
      DB.log('team.delete', u.email); toast('ลบแล้ว'); load();
    });
  };
  const load = async () => { list = await DB.ownerStaffList(); draw(); };
  $('#tm-add').onclick = () => form(null);
  load();
}

// ================= ปิดรีสอร์ท & ปรับปรุง =================
// 1) ปิดการขายทั้งรีสอร์ท (h.active) · 2) ปิดปรับปรุงเป็นช่วงวัน = ปิดห้องที่ว่างทุกประเภทด้วย sd_block_rooms (เหมือน "ปิดห้อง" ในตารางห้องว่าง)
const CLOSE_CH = 'ปิดปรับปรุง';
function boClosure(main) {
  const hotels = DB.hotels(true), today = todayISO();
  const closures = () => {
    const g = {};
    DB.bookings().filter(b => b.source === 'external' && b.channel === CLOSE_CH && b.status !== 'cancelled' && b.checkOut > today).forEach(b => {
      const note = b.guest?.note || '', k = [b.hotelId, b.checkIn, b.checkOut, note].join('|');
      (g[k] ||= { hotelId: b.hotelId, checkIn: b.checkIn, checkOut: b.checkOut, note, ids: [], rooms: 0 }).ids.push(b.id);
      g[k].rooms += b.qty;
    });
    return Object.values(g).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  };
  const redraw = () => boClosure(main);
  const all = closures();
  main.innerHTML = pageHead('ปิดรีสอร์ท & ปรับปรุง', 'ปิดการขายชั่วคราว หรือปิดรับจองเป็นช่วงวันที่ เมื่อรีสอร์ทปิดซ่อม / ปรับปรุง') + (hotels.length ? hotels.map(h => {
    const mine = all.filter(c => c.hotelId === h.id), open = h.active !== false;
    return `<section class="card" data-h="${esc(h.id)}"><div class="card-h"><h3><i class="fa-solid fa-hotel"></i> ${esc(h.name)}</h3>
        <label class="switch big"><input type="checkbox" data-cl-act ${open ? 'checked' : ''} ${h.banned ? 'disabled' : ''}><span></span>${h.banned ? 'ถูกแบน' : open ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
      <p class="small muted" style="margin:0 0 14px">${open ? 'ปิดสวิตช์เพื่อปิดรีสอร์ททั้งหมด — ลูกค้าจะค้นหาและจองไม่ได้ (การจองที่มีอยู่ไม่ถูกยกเลิก)' : '<b class="red">รีสอร์ทปิดการขายอยู่</b> — ลูกค้าไม่เห็นรีสอร์ทนี้ เปิดสวิตช์เมื่อพร้อมรับจองอีกครั้ง'}</p>
      <h4 style="margin:0 0 8px"><i class="fa-solid fa-screwdriver-wrench"></i> ปิดปรับปรุงเป็นช่วงวัน</h4>
      <form class="form-grid cl-f" novalidate>
        <div class="fg"><label>ปิดตั้งแต่วันที่</label><input name="from" type="date" min="${today}" value="${today}"></div>
        <div class="fg"><label>เปิดรับจองอีกครั้งวันที่</label><input name="to" type="date" min="${addDays(today, 1)}" value="${addDays(today, 7)}"></div>
        <div class="fg full"><label>เหตุผล / หมายเหตุ (เห็นเฉพาะคุณ)</label><input name="note" maxlength="200" placeholder="เช่น ทาสีห้องพัก ซ่อมระบบน้ำ"></div>
        <div class="full"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-ban"></i> ปิดทุกห้องในช่วงนี้</button></div>
      </form>
      <div class="small muted" style="margin-top:6px">ห้องที่มีลูกค้าจองอยู่แล้วในช่วงนี้จะไม่ถูกยกเลิก — ระบบปิดเฉพาะห้องที่ยังว่าง · ปิดได้ไม่เกิน 90 คืนต่อครั้ง</div>
      <h4 style="margin:18px 0 8px">รายการที่ปิดอยู่ / กำลังจะปิด</h4>
      ${mine.length ? mine.map(c => `<div class="row between wrap" style="gap:8px;padding:8px 0;border-top:1px solid var(--line,#e8ebf0)"><div><b>${fmtDate(c.checkIn, false)} – ${fmtDate(c.checkOut, false)}</b> <span class="small muted">(${diffDays(c.checkIn, c.checkOut)} คืน · ปิด ${c.rooms} ห้อง)</span>${c.note ? `<div class="small muted">${esc(c.note)}</div>` : ''}</div>
        <button class="btn btn-outline btn-sm" data-cl-open="${esc(c.ids.join(','))}"><i class="fa-solid fa-lock-open"></i> เปิดรับจองคืน</button></div>`).join('') : '<p class="small muted" style="margin:0">ยังไม่มีรายการปิดปรับปรุง</p>'}
    </section>`;
  }).join('') : '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3></div></section>');

  $$('[data-cl-act]', main).forEach(c => c.onchange = () => {
    const h = DB.hotel(c.closest('[data-h]').dataset.h); h.active = c.checked; DB.saveHotel(h);
    DB.log('hotel.toggle', `${h.name} → ${c.checked ? 'เปิดขาย' : 'ปิด'}`); toast(c.checked ? 'เปิดขายแล้ว' : 'ปิดรีสอร์ทแล้ว — ลูกค้าจะไม่เห็นรีสอร์ทนี้'); redraw();
  });
  $$('.cl-f', main).forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    const h = DB.hotel(f.closest('[data-h]').dataset.h), ci = f.elements.from.value, co = f.elements.to.value, note = f.elements.note.value.trim();
    if (!ci || !co || co <= ci) return toast('วันที่ไม่ถูกต้อง — วันเปิดรับจองต้องหลังวันที่เริ่มปิด', 'err');
    if (ci < today) return toast('เริ่มปิดย้อนหลังไม่ได้', 'err');
    if (diffDays(ci, co) > 90) return toast('ปิดได้ไม่เกิน 90 คืนต่อครั้ง', 'err');
    if (!h.rooms?.length) return toast('รีสอร์ทนี้ยังไม่มีห้องพัก', 'err');
    if (!(await confirmBox(`ปิด <b>${esc(h.name)}</b> ตั้งแต่ ${fmtDate(ci, false)} ถึง ${fmtDate(co, false)} (${diffDays(ci, co)} คืน)?<br>ลูกค้าจะจองห้องที่ว่างในช่วงนี้ไม่ได้`, 'ปิดรับจอง'))) return;
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    let closed = 0; const partial = [];
    try {
      for (const r of h.rooms) {
        const free = DB.available(r, ci, co);
        if (free < r.total) partial.push(r.name);
        for (let left = free; left > 0; left -= 50) {
          const qty = Math.min(50, left);
          await DB.blockRooms({ hotelId: h.id, roomId: r.id, checkIn: ci, checkOut: co, qty, channel: CLOSE_CH, guestName: CLOSE_CH, note });
          closed += qty;
        }
      }
      DB.log('hotel.maintenance', `${h.name} · ${ci} → ${co} · ปิด ${closed} ห้อง`);
      toast(closed ? `ปิดปรับปรุงแล้ว (${closed} ห้อง)${partial.length ? ` · ${partial.join(', ')} มีลูกค้าจองอยู่ ปิดได้เฉพาะห้องที่ว่าง` : ''}` : 'ไม่มีห้องว่างให้ปิดในช่วงนี้', closed ? undefined : 'err');
      redraw();
    } catch (err) { btn.disabled = false; toast('ปิดไม่สำเร็จ: ' + err.message, 'err'); if (closed) redraw(); }
  });
  $$('[data-cl-open]', main).forEach(b => b.onclick = async () => {
    if (!(await confirmBox('เปิดรับจองช่วงนี้คืน? ลูกค้าจะจองห้องในช่วงนี้ได้อีกครั้ง', 'เปิดรับจองคืน'))) return;
    const at = new Date().toISOString();
    b.dataset.clOpen.split(',').forEach(id => DB.updateBooking(id, { status: 'cancelled', cancelledBy: 'เจ้าของ (เปิดรับจองคืน)', cancelledAt: at }));
    DB.log('hotel.maintenance.release', b.dataset.clOpen); toast('เปิดรับจองคืนแล้ว'); redraw();
  });
}
