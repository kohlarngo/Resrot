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

// จุดเด่นตัวอย่าง — เจ้าของกดเลือก/ยกเลิก แล้วพิมพ์เพิ่มหรือแก้ข้อความเองได้
const HIGHLIGHT_SAMPLES = ['ติดชายหาด เดินลงทะเลได้เลย', 'วิวทะเลสวย', 'มีสระว่ายน้ำ', 'มีอาหารเช้า', 'Wi-Fi ฟรี', 'ห้องแอร์ ห้องน้ำในตัว', 'มีที่จอดรถ', 'ใกล้ท่าเรือ เดินทางสะดวก', 'รับส่งท่าเรือ', 'เช่ารถมอเตอร์ไซค์ได้', 'ห้องใหม่ สะอาด', 'เลี้ยงสัตว์เลี้ยงได้', 'เหมาะกับครอบครัว', 'เหมาะกับกลุ่มเพื่อน', 'ใกล้ร้านอาหารและร้านสะดวกซื้อ', 'มีอุปกรณ์ปิ้งย่าง / BBQ'];

// ---------- ขั้นตอนเริ่มต้น (แสดงจนกว่าจะทำครบ) ----------
// ขั้นที่ต้องทำก่อนเปิดขาย: แต่ละขั้นบอกชัดว่า "ยังขาดอะไร" · ขั้นเสริม (ไม่นับคะแนน) แสดงท้ายการ์ด
function ownerSetupData() {
  const u = DB.currentUser(), po = u.payout || {}, bz = u.biz || {}, hs = DB.hotels(true).filter(h => !h.practice);
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
  return { steps, extras, hs, u };
}
function ownerSetupCard() {
  if (typeof prShowing === 'function' && prShowing()) return '';
  const { steps, extras, hs, u } = ownerSetupData();
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
    return `<section class="card sh-card"><div class="sh-cover">${imgTag(h.images[0], 900, '', h.id)}${demoWm(h)}<span class="im-badge">ภาพปก</span></div>
      <div class="sh-body"><div class="row between wrap" style="gap:10px"><div><h2 style="margin:0">${esc(h.name)}</h2><div class="small muted">${esc(h.type)} · ${esc(h.area)}, ${esc(h.city)}</div></div>
          <label class="switch big"><input type="checkbox" data-act="${h.id}" ${h.active !== false ? 'checked' : ''} ${h.banned ? 'disabled' : ''}><span></span>${h.banned ? 'ถูกแบน' : h.active !== false ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
        ${h.banned ? `<div class="small red" style="margin-top:6px"><i class="fa-solid fa-ban"></i> ถูกแบนโดยผู้ดูแลระบบ (${h.banned.until ? 'ถึง ' + fmtDateTime(h.banned.until) : 'ถาวร'})${h.banned.reason ? ` — ${esc(h.banned.reason)}` : ''} · ติดต่อทีมงานเพื่อขอปลดแบน</div>` : ''}<p class="small" style="margin:10px 0">${esc(h.description || '— ยังไม่มีคำอธิบาย —')}</p>
        <div class="sh-thumbs">${h.images.slice(0, 8).map(i => imgTag(i, 160)).join('')}${h.images.length > 8 ? `<span class="small muted">+${h.images.length - 8}</span>` : ''}</div>
        <div class="small" style="margin-top:8px"><i class="fa-solid fa-images"></i> สไลด์รูป: ${h.images.length < 2 ? '<span class="muted">ต้องมีรูปอย่างน้อย 2 รูป</span>' : h.slideshow?.on !== true ? '<span class="muted">ปิดอยู่ — เปิดได้โดยผู้พัฒนาระบบเท่านั้น (แสดงเป็นแกลเลอรี)</span>' : `<b>เปิด</b> · เปลี่ยนรูปทุก ${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))} วินาที`}</div>
        <div class="row wrap small" style="gap:10px;margin-top:10px">${soc.length ? soc.map(([k, c]) => `<span><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</span>`).join('') : '<span class="muted">ยังไม่ได้ใส่ลิงก์โซเชียล</span>'}<span class="muted">· ลิงก์: <code>${esc(resortLink(h).replace(/^https?:\/\//, ''))}</code></span><button type="button" class="btn btn-outline btn-sm" data-copylink="${h.id}"><i class="fa-regular fa-copy"></i> คัดลอกลิงก์</button></div>
        <div class="row wrap" style="gap:8px;margin-top:14px"><button class="btn btn-primary" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> แก้ไขรีสอร์ท</button>
          <a class="btn btn-outline" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้าเว็บ</a>
          <button class="btn btn-outline" data-share="${h.id}"><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต</button></div></div></section>`;
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
const HIDDEN_AMEN = ['ev', 'frontdesk', 'shuttle', 'sunset', 'parking']; // ไม่ให้เลือกในฟอร์ม (ค่าเดิมที่บันทึกไว้ยังคงอยู่)
function shopModal(h, done) {
  const imgs = [...h.images];
  const m = openModal(`<h2><i class="fa-solid fa-paintbrush"></i> แก้ไขรีสอร์ท <span class="small muted">· ${esc(h.name)}</span></h2>
    <form id="sh-f" class="form-grid" novalidate style="margin-top:14px">
      <div class="fg full"><label>รูปภาพ — รูปแรกคือ <b>ภาพปก</b> (กดดาวเพื่อตั้งรูปอื่นเป็นปก)</label><div id="sh-imgs"></div></div>
      <div class="fg full"><label>โลโก้รีสอร์ท <span class="small muted">— ใช้ที่หัวหน้าเว็บของรีสอร์ท ใบทะเบียนผู้เข้าพัก และเอกสารการเงิน (ไม่บังคับ · ถ้าไม่ใส่ใช้โลโก้รวม)</span></label>
        <div class="row" style="gap:12px;align-items:center"><span id="sh-logo-prev" style="display:inline-flex;align-items:center;justify-content:center;width:96px;height:64px;border:1px dashed var(--border,#ccd);border-radius:8px;overflow:hidden"></span>
          <button type="button" class="btn btn-outline btn-sm" id="sh-logo-up"><i class="fa-solid fa-camera"></i> อัปโหลดโลโก้</button><button type="button" class="btn btn-ghost btn-sm" id="sh-logo-rm"><i class="fa-solid fa-trash"></i> ลบโลโก้</button></div></div>
      ${can('hotels.media') ? `<div class="fg full slide-set"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" name="slide_on" ${h.slideshow?.on === true ? 'checked' : ''}> <i class="fa-solid fa-images"></i> สไลด์รูปอัตโนมัติบนหน้ารีสอร์ท</label>
        <div class="row wrap" style="gap:8px;margin-top:8px;align-items:center"><span class="small">เปลี่ยนรูปทุก</span>
          <input name="slide_sec" type="range" min="2" max="15" step="1" value="${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))}" style="flex:1;min-width:140px;max-width:260px"><b id="sl-sec-v" style="min-width:64px"></b></div>
        <div class="small muted" style="margin-top:4px">ลูกค้าเอาเมาส์ชี้หรือแตะรูป สไลด์จะหยุดชั่วคราว · ต้องมีรูปอย่างน้อย 2 รูป</div></div>` : ''}
      <div class="fg full"><label>ชื่อรีสอร์ท <span class="req">*</span></label><input name="name" value="${esc(h.name)}"></div>
      <div class="fg full"><label>คำอธิบาย</label><textarea name="description" rows="3">${esc(h.description || '')}</textarea></div>
      <div class="fg full"><label>จุดเด่น (บรรทัดละ 1 ข้อ)</label>
        <div class="small muted" style="margin:2px 0 6px">กดเลือกจุดเด่นที่ตรงกับรีสอร์ท (กดซ้ำเพื่อเอาออก) หรือพิมพ์เพิ่มเองในช่องด้านล่างก็ได้</div>
        <div id="sh-hl-chips" class="row wrap" style="gap:6px;margin-bottom:8px"></div>
        <textarea name="highlights" rows="4" placeholder="เช่น&#10;ติดชายหาด เดินลงทะเลได้เลย&#10;มีสระว่ายน้ำ">${esc((h.highlights || []).join('\n'))}</textarea></div>
      <div class="fg full"><label>สิ่งอำนวยความสะดวก</label><div class="row wrap small">${Object.entries(AMENITIES).filter(([k]) => !HIDDEN_AMEN.includes(k)).map(([k, [ic, l]]) => `<label class="row" style="gap:6px;min-width:170px"><input type="checkbox" name="amen" value="${k}" ${(h.amenities || []).includes(k) ? 'checked' : ''}> <i class="fa-solid ${ic} muted"></i> ${l}</label>`).join('')}${(h.amenities || []).filter(a => a.startsWith('x:')).map(a => `<label class="row" style="gap:6px;min-width:170px"><input type="checkbox" name="amen" value="${esc(a)}" checked> <i class="fa-solid fa-circle-check muted"></i> ${esc(a.slice(2))}</label>`).join('')}<span id="amen-custom" class="row wrap" style="gap:6px;width:100%"></span></div>
        <div class="row" style="gap:8px;margin-top:8px"><input id="amen-new" maxlength="40" placeholder="พิมพ์สิ่งอำนวยความสะดวกเพิ่มเอง เช่น ร้านนวด" style="flex:1"><button type="button" class="btn btn-outline btn-sm" id="amen-add"><i class="fa-solid fa-plus"></i> เพิ่ม</button></div></div>
      <div class="fg"><label>ประเภท</label><select name="type">${['โรงแรม', 'รีสอร์ท', 'วิลล่า', 'บังกะโล', 'เกสต์เฮาส์', 'โฮสเทล', 'แกลมปิ้ง'].map(t => `<option ${h.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="fg"><label>หาด / ย่าน</label><select name="city">${DESTINATIONS.map(d => `<option ${h.city === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
      <div class="fg full"><label>ตำแหน่งบนแผนที่ — คลิกบนแผนที่ หรือลากหมุดไปที่รีสอร์ท</label><div id="h-map" class="pick-map"></div>
        <div class="row between wrap small" style="margin-top:6px;gap:8px"><span class="muted"><i class="fa-solid fa-location-dot"></i> <span id="h-coord"></span></span><button type="button" class="btn btn-ghost btn-sm" id="h-gps"><i class="fa-solid fa-location-crosshairs"></i> ใช้ตำแหน่งปัจจุบันของฉัน</button></div></div>
      <div class="fg"><label>ระยะจากท่าเรือหน้าบ้าน (กม.)</label><input name="distance" type="number" step="0.1" min="0" value="${h.distance ?? 1}"><div class="small muted" style="margin-top:4px">คำนวณให้อัตโนมัติเมื่อปักหมุด (แก้ได้)</div></div>
      <div class="fg"><label>เวลาเช็คอิน</label><input name="checkIn" value="${esc(h.checkIn || '14:00')}"></div>
      <div class="fg"><label>เวลาเช็คเอาท์</label><input name="checkOut" value="${esc(h.checkOut || '12:00')}"></div>
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
  const hlTa = $('[name=highlights]', m), hlChips = $('#sh-hl-chips', m), hlLines = () => hlTa.value.split('\n').map(x => x.trim()).filter(Boolean);
  const drawHl = () => { const on = new Set(hlLines()); hlChips.innerHTML = HIGHLIGHT_SAMPLES.map((t, i) => `<button type="button" class="btn btn-sm ${on.has(t) ? 'btn-primary' : 'btn-outline'}" data-hs="${i}"><i class="fa-solid ${on.has(t) ? 'fa-check' : 'fa-plus'}"></i> ${esc(t)}</button>`).join(''); };
  hlChips.onclick = e => { const b = e.target.closest('[data-hs]'); if (!b) return; const t = HIGHLIGHT_SAMPLES[+b.dataset.hs], ls = hlLines(); hlTa.value = (ls.includes(t) ? ls.filter(x => x !== t) : [...ls, t]).join('\n'); drawHl(); };
  hlTa.addEventListener('input', drawHl); drawHl();
  // แผนที่เลือกตำแหน่ง + สิ่งอำนวยความสะดวก (ย้ายมาจาก "ตั้งค่าเพิ่มเติม")
  const pos = { lat: +h.lat, lng: +h.lng }, PIER = DESTINATIONS[0];
  let map = null, pin = null;
  const setPos = (lat, lng, pan) => {
    pos.lat = +lat.toFixed(6); pos.lng = +lng.toFixed(6);
    pin?.setLatLng([pos.lat, pos.lng]); if (pan) map?.setView([pos.lat, pos.lng], 16);
    $('[name=distance]', m).value = geoKm(PIER, pos).toFixed(1); $('#h-coord', m).textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    const z = onKohLarn(pos.lat, pos.lng) && nearestZone(pos.lat, pos.lng); if (z) $('[name=city]', m).value = z.d.name;
  };
  $('#h-coord', m).textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
  if (window.L) {
    map = L.map($('#h-map', m), { scrollWheelZoom: false }).setView([pos.lat, pos.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    pin = L.marker([pos.lat, pos.lng], { draggable: true, icon: L.divIcon({ className: '', html: '<div class="sos-pin pick-pin"><i class="fa-solid fa-location-dot"></i></div>', iconSize: [36, 36], iconAnchor: [18, 34] }) }).addTo(map);
    pin.on('dragend', () => { const p = pin.getLatLng(); setPos(p.lat, p.lng); });
    map.on('click', e => setPos(e.latlng.lat, e.latlng.lng));
    setTimeout(() => map.invalidateSize(), 250);
    $('[name=city]', m).addEventListener('change', e => { const d = DESTINATIONS.find(x => x.name === e.target.value); if (d) map.setView([d.lat, d.lng], 16); });
  } else $('#h-map', m).innerHTML = '<div class="muted small" style="padding:20px">โหลดแผนที่ไม่ได้ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</div>';
  $('#h-gps', m).onclick = () => {
    if (!navigator.geolocation) return toast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง', 'err');
    gpsOnce($('#h-gps', m), p => { setPos(p.coords.latitude, p.coords.longitude, true); toast('ปักหมุดที่ตำแหน่งปัจจุบันแล้ว'); }, () => toast('ระบุตำแหน่งไม่ได้ — กรุณาอนุญาตการเข้าถึงตำแหน่ง', 'err'), { enableHighAccuracy: true, timeout: 10000 });
  };
  const addAmen = () => { const inp = $('#amen-new', m), t = inp.value.trim().slice(0, 40); if (!t) return;
    const key = 'x:' + t;
    if ($$('[name=amen]', m).some(c => c.value === key || (AMENITIES[c.value]?.[1] === t))) { inp.value = ''; return toast('มีรายการนี้อยู่แล้ว', 'err'); }
    const lb = document.createElement('label'); lb.className = 'row'; lb.style.cssText = 'gap:6px;min-width:170px';
    lb.innerHTML = `<input type="checkbox" name="amen" checked> <i class="fa-solid fa-circle-check muted"></i> <span></span>`;
    $('input', lb).value = key; $('span', lb).textContent = t; $('#amen-custom', m).before(lb); inp.value = ''; };
  $('#amen-add', m).onclick = addAmen;
  $('#amen-new', m).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addAmen(); } };
  const f = $('#sh-f', m), link = () => $('#sh-link', m).textContent = resortLink({ id: h.id, slug: normSlug(f.elements.slug.value) });
  if (f.elements.slug) { f.elements.slug.oninput = link; link(); $('#sh-copy', m).onclick = () => { copyText($('#sh-link', m).textContent); toast('คัดลอกลิงก์แล้ว'); }; }
  if (f.elements.slide_sec) { const secLbl = () => $('#sl-sec-v', m).textContent = f.elements.slide_sec.value + ' วินาที';
    f.elements.slide_sec.oninput = secLbl; secLbl(); }
  $('#sh-save', m).onclick = () => {
    const v = k => f.elements[k].value;
    if (!v('name').trim()) return toast('กรุณาใส่ชื่อรีสอร์ท', 'err');
    const sl = f.elements.slug ? normSlug(v('slug')) : h.slug;
    if (sl && DB.hotels(true).some(x => x.id !== h.id && (x.slug === sl || x.id === sl))) return toast('ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น', 'err');
    const area = (h.area || '').trim() || v('city');
    Object.assign(h, { name: v('name').trim(), description: v('description'),
      type: v('type'), city: v('city'), area, lat: pos.lat, lng: pos.lng, distance: Math.max(0, +v('distance') || 0), checkIn: v('checkIn'), checkOut: v('checkOut'),
      amenities: new FormData(f).getAll('amen'), address: `${area}, ${v('city')}, เกาะล้าน จ.ชลบุรี`, images: imgs.length ? imgs : h.images, logo: logo || undefined, slug: sl || undefined,
      slideshow: f.elements.slide_on ? { on: f.elements.slide_on.checked, seconds: Math.min(15, Math.max(2, Math.round(+v('slide_sec')) || 4)) } : h.slideshow,
      highlights: v('highlights').split('\n').map(s => s.trim()).filter(Boolean),
      houseRules: v('houseRules').split('\n').map(s => s.trim()).filter(Boolean).join('\n').slice(0, 2000),
      social: Object.fromEntries(Object.keys(SOCIALS).map(k => [k, v('soc_' + k).trim()]).filter(([, x]) => x)) });
    DB.saveHotel(h); DB.log('hotel.decorate', h.name); closeModal(); toast('บันทึกหน้ารีสอร์ทแล้ว'); done?.();
  };
}

// ================= นักพัฒนา: ซิงก์ปฏิทิน iCal (Plus) รายรีสอร์ท =================
// เลือกเปิดให้เฉพาะรีสอร์ทที่ซื้อบริการ (h.icalOn) · ถ้าเปิดสวิตช์ "ทั้งระบบ" ที่หน้าฟีเจอร์ ทุกรีสอร์ทใช้ได้ ยกเว้นที่ติ๊กออก (h.icalOff)
function boDevIcal(main) {
  const hotels = DB.hotels(true), all = DB.flags().icalSync === true;
  const ownerName = h => { const o = h.ownerId ? DB.owner(h.ownerId) : null; return o ? (o.biz?.resortName || o.name) : 'แพลตฟอร์ม'; };
  const reqOf = h => DB.serviceRequests().find(r => r.hotel_id === h.id && r.service === 'ical');
  const reqHtml = h => { const r = reqOf(h); return r ? `<div class="small" style="margin-top:4px;color:#b45309"><i class="fa-solid fa-arrows-rotate"></i> <b>ขอใช้ซิงก์ iCal (Plus)</b> · ${fmtDateTime(r.created_at)} · ${[r.phone && `โทร <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`, r.line && 'LINE ' + esc(r.line)].filter(Boolean).join(' · ')}${r.note ? ` · “${esc(r.note)}”` : ''} <button type="button" class="btn btn-ghost btn-sm" data-req-x="${r.id}">ปิดคำขอ</button></div>` : ''; };
  const closeReq = async (id, status) => { const r = await supa.from('sd_service_requests').update({ status }).eq('id', id); if (r.error) return toast('บันทึกไม่สำเร็จ: ' + r.error.message, 'err'); CACHE.svcReq = (CACHE.svcReq || []).filter(x => x.id !== id); };
  const n = hotels.filter(icalOn).length;
  main.innerHTML = pageHead('ซิงก์ปฏิทิน iCal (Plus)', `ซิงก์ปฏิทิน Agoda / Booking.com · ฟีเจอร์ Plus (มีค่าบริการ) · เปิดแล้ว ${n} จาก ${hotels.length} รีสอร์ท`) + `
    ${all ? '<section class="card"><div class="small"><i class="fa-solid fa-circle-info"></i> ตอนนี้ <b>เปิดทั้งระบบ</b> (สวิตช์ที่หน้า “ฟีเจอร์ & โหมดปิดปรับปรุง”) — ทุกรีสอร์ทใช้ได้ ติ๊กออกเฉพาะรีสอร์ทที่ไม่ให้ใช้ หรือปิดสวิตช์ทั้งระบบแล้วติ๊กเปิดเฉพาะรีสอร์ทที่ต้องการ</div></section>' : ''}
    <div class="card sh-find"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="ic-q" placeholder="ค้นหารีสอร์ท หรือชื่อเจ้าของ..." autocomplete="off"><span class="small muted" id="ic-n">${hotels.length} แห่ง</span></div>
    <div id="ic-list">${hotels.map(h => `<section class="card sh-row" data-q="${esc((h.name + ' ' + ownerName(h)).toLowerCase())}">
      <div class="sh-thumb">${imgTag(h.images[0], 200, '', h.id)}</div>
      <div class="sh-main"><b class="sh-name">${esc(h.name)}</b><div class="small muted">เจ้าของ: ${esc(ownerName(h))}${h.active === false ? ' · <span class="red">ปิดการขาย</span>' : ''}</div>${reqHtml(h)}</div>
      <div class="sh-ctl"><label class="switch"><input type="checkbox" data-ic-on="${h.id}" ${icalOn(h) ? 'checked' : ''}><span></span>${icalOn(h) ? 'เปิดใช้' : 'ปิด'}</label></div></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ทในระบบ</p></div></section>'}</div>`;
  $$('[data-ic-on]', main).forEach(c => c.onchange = async () => {
    const h = JSON.parse(JSON.stringify(DB.hotel(c.dataset.icOn)));
    if (DB.flags().icalSync) { h.icalOff = !c.checked; if (c.checked) h.icalOn = true; } else { h.icalOn = c.checked; if (c.checked) delete h.icalOff; }
    DB.saveHotel(h); DB.log('hotel.ical', `${h.name} → ${c.checked ? 'เปิด' : 'ปิด'}ซิงก์ iCal`); toast(c.checked ? 'เปิดซิงก์ iCal ให้รีสอร์ทนี้แล้ว' : 'ปิดซิงก์ iCal ของรีสอร์ทนี้แล้ว');
    const r = c.checked && reqOf(h); if (r) await closeReq(r.id, 'done'); // เปิดให้แล้ว = ปิดคำขอที่ค้างอยู่
    boDevIcal(main);
  });
  $$('[data-req-x]', main).forEach(b => b.onclick = async () => { if (!(await confirmBox('ปิดคำขอนี้โดยไม่เปิดบริการให้?', 'ปิดคำขอ'))) return; await closeReq(b.dataset.reqX, 'rejected'); boDevIcal(main); });
  const q = $('#ic-q', main); if (q) q.oninput = () => { const t = q.value.trim().toLowerCase(); let k = 0; $$('.sh-row', main).forEach(r => { const ok = !t || r.dataset.q.includes(t); r.style.display = ok ? '' : 'none'; if (ok) k++; }); $('#ic-n', main).textContent = k + ' แห่ง'; };
}

// ================= นักพัฒนา: รีสอร์ท VIP / แนะนำ =================
// เปิด VIP รายรีสอร์ท (h.vip = {on, tag}) → ป้ายสีทองบนการ์ดและหน้ารีสอร์ท + ขึ้นอันดับบนสุดในผลค้นหา + แสดงในหน้าแรก
const vipRunning = h => { const v = h.vip || {}, t = todayISO(); return !(v.from && t < v.from) && !(v.to && t > v.to); };
function boDevVip(main) {
  const hotels = DB.hotels(true), TAGS = ['VIP', 'แนะนำ', 'ยอดนิยม'];
  const ownerName = h => { const o = h.ownerId ? DB.owner(h.ownerId) : null; return o ? (o.biz?.resortName || o.name) : 'แพลตฟอร์ม'; };
  const n = hotels.filter(h => h.vip?.on === true).length;
  main.innerHTML = pageHead('รีสอร์ท VIP / แนะนำ', `เปิด ${n} จาก ${hotels.length} รีสอร์ท · รีสอร์ท VIP มีป้ายสีทอง ขึ้นอันดับบนสุดของผลค้นหา และแสดงในหน้าแรก`) + `
    <div class="card sh-find"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="vp-q" placeholder="ค้นหารีสอร์ท หรือชื่อเจ้าของ..." autocomplete="off"><span class="small muted" id="vp-n">${hotels.length} แห่ง</span></div>
    <div id="vp-list">${hotels.map(h => `<section class="card sh-row" data-q="${esc((h.name + ' ' + ownerName(h)).toLowerCase())}">
      <div class="sh-thumb">${imgTag(h.images[0], 200, '', h.id)}</div>
      <div class="sh-main"><b class="sh-name">${esc(h.name)}</b><div class="small muted">เจ้าของ: ${esc(ownerName(h))}${h.active === false ? ' · <span class="red">ปิดการขาย</span>' : ''}</div></div>
      <div class="sh-ctl"><button class="btn btn-outline btn-sm" data-vp-img="${h.id}" ${h.vip?.on === true ? '' : 'disabled'}><i class="fa-solid fa-sliders"></i> ตั้งค่าเว็บ VIP</button>${h.vip?.on === true ? ` <a class="btn btn-outline btn-sm" href="${esc(vipLink(h))}" target="_blank" rel="noopener" title="เปิดเว็บจองส่วนตัว"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''} <span class="small muted">ช่วงวันที่</span> <input type="date" data-vp-from="${h.id}" value="${esc(h.vip?.from || '')}" ${h.vip?.on === true ? '' : 'disabled'} title="เริ่ม (ว่าง = ทันที)"> – <input type="date" data-vp-to="${h.id}" value="${esc(h.vip?.to || '')}" ${h.vip?.on === true ? '' : 'disabled'} title="สิ้นสุด (ว่าง = ไม่จำกัด)"> <select data-vp-tag="${h.id}" ${h.vip?.on === true ? '' : 'disabled'}>${TAGS.map(t => `<option ${(h.vip?.tag || 'VIP') === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="switch"><input type="checkbox" data-vp-on="${h.id}" ${h.vip?.on === true ? 'checked' : ''}><span></span>${h.vip?.on === true ? (vipRunning(h) ? 'เปิด' : 'เปิด (นอกช่วงวันที่)') : 'ปิด'}</label></div></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ทในระบบ</p></div></section>'}</div>`;
  const save = (id, patch) => { const h = JSON.parse(JSON.stringify(DB.hotel(id))); h.vip = { ...h.vip, on: h.vip?.on === true, tag: h.vip?.tag || 'VIP', ...patch }; DB.saveHotel(h); DB.log('hotel.vip', `${h.name} → ${h.vip.on ? 'VIP (' + h.vip.tag + ')' : 'ปิด VIP'}`); };
  $$('[data-vp-on]', main).forEach(c => c.onchange = () => { save(c.dataset.vpOn, { on: c.checked }); toast(c.checked ? 'เปิด VIP ให้รีสอร์ทนี้แล้ว' : 'ปิด VIP ของรีสอร์ทนี้แล้ว'); boDevVip(main); });
  const dateSave = (el, key) => el.onchange = () => {
    const id = el.dataset[key === 'from' ? 'vpFrom' : 'vpTo'], o = DB.hotel(id).vip || {}, a = key === 'from' ? el.value : o.from || '', b = key === 'to' ? el.value : o.to || '';
    if (a && b && a > b) { el.value = o[key] || ''; return toast('วันเริ่มต้องไม่เกินวันสิ้นสุด', 'err'); }
    save(id, { [key]: el.value }); toast('บันทึกช่วงวันที่ VIP แล้ว'); boDevVip(main);
  };
  $$('[data-vp-from]', main).forEach(el => dateSave(el, 'from'));
  $$('[data-vp-to]', main).forEach(el => dateSave(el, 'to'));
  $$('[data-vp-tag]', main).forEach(s => s.onchange = () => { save(s.dataset.vpTag, { tag: s.value }); toast('เปลี่ยนป้ายเป็น “' + s.value + '” แล้ว'); });
  $$('[data-vp-img]', main).forEach(b => b.onclick = () => vipBuilder(main, b.dataset.vpImg, () => boDevVip(main)));
  const q = $('#vp-q', main); if (q) q.oninput = () => { const t = q.value.trim().toLowerCase(); let k = 0; $$('.sh-row', main).forEach(r => { const ok = !t || r.dataset.q.includes(t); r.style.display = ok ? '' : 'none'; if (ok) k++; }); $('#vp-n', main).textContent = k + ' แห่ง'; };
}

// ตั้งค่าเว็บจองส่วนตัว (VIP) แบบเห็นหน้าจอจริง: เลือกหน้า → กดที่ข้อความ/รูปในจอมือถือ → แก้ทางขวา เห็นผลทันที → บันทึก
// ใช้ทั้งเจ้าของรีสอร์ทและนักพัฒนา · ไม่แตะสวิตช์เปิด/ปิด VIP (h.vip.on) และป้าย (h.vip.tag) — สองค่านั้นนักพัฒนาเป็นคนตั้ง
const VB_SCREENS = [
  ['', 'fa-house', 'หน้าแรก', ['images', 'logo', 'brand', 'brandSub', 'tagline', 'sub', 'cta', 'tabs', 'color']],
  ['search', 'fa-magnifying-glass', 'ค้นหา', ['searchTitle', 'gallery', 'galleryTitle']],
  ['rooms', 'fa-hotel', 'รายละเอียด & ห้องพัก', ['images', 'roomsTitle', 'pickBtn', 'about', 'aboutTitle']],
  ['room', 'fa-bed', 'เลือกห้องพัก', ['roomTitle', 'roomAmenTitle', 'bookBtn']],
  ['services', 'fa-bell-concierge', 'บริการเพิ่มเติม', ['svc', 'svcPage', 'svcImg', 'svcTitle', 'services', 'svcNote']],
];
// [ป้าย, ชนิด, ค่าตั้งต้น] · ชนิด: t = ข้อความใน vip · x = ข้อความใน vip.text · show = เปิด/ปิดส่วน (vip.hide) · img / imgs / color / services
const VB_FIELDS = {
  images: ['รูปปก & แกลเลอรี (รูปแรก = ภาพปก)', 'imgs'], logo: ['โลโก้', 'img'], svcImg: ['รูปแบนเนอร์', 'img'], color: ['สีธีมเว็บ', 'color'],
  brand: ['ชื่อแบรนด์', 't', h => h.name], brandSub: ['คำใต้ชื่อแบรนด์', 't', h => [h.type, h.area].filter(Boolean).join(' · ') || 'HOTELS & RESORTS'],
  tagline: ['ข้อความหัวเว็บ (ตัวใหญ่)', 't', () => 'พักผ่อน… ให้ทุกการเดินทางพิเศษกว่าเดิม'], sub: ['ข้อความรอง', 't', () => 'ที่พักคุณภาพ ในทุกช่วงเวลาของคุณ'],
  cta: ['ข้อความปุ่ม', 't', () => 'จองห้องพัก'], svcTitle: ['ข้อความบนแบนเนอร์', 't', () => 'เพิ่มความสะดวกสบาย ให้การเข้าพักของคุณ'],
  tabs: ['แถบเมนูล่าง', 'show'], gallery: ['รูปบรรยากาศรีสอร์ท', 'show'], about: ['ส่วน “เกี่ยวกับที่พัก”', 'show'], svc: ['หน้าบริการเพิ่มเติม', 'show'],
  services: ['รายการบริการ', 'services'],
  searchTitle: ['หัวข้อหน้า', 'x'], galleryTitle: ['หัวข้อรูปบรรยากาศ', 'x'], roomsTitle: ['หัวข้อรายการห้อง', 'x'], pickBtn: ['ข้อความปุ่มล่าง', 'x'], aboutTitle: ['หัวข้อเกี่ยวกับที่พัก', 'x'],
  roomTitle: ['หัวข้อหน้า', 'x'], roomAmenTitle: ['หัวข้อสิ่งอำนวยความสะดวก', 'x'], bookBtn: ['ข้อความปุ่มจอง', 'x'], svcPage: ['หัวข้อหน้า', 'x'], svcNote: ['ข้อความท้ายหน้า', 'x'],
};
function vipBuilder(main, hotelId, back) {
  const h = DB.hotel(hotelId); if (!h) return back?.();
  const { on, tag, from, to, ...rest } = JSON.parse(JSON.stringify(h.vip || {}));
  const d = { text: {}, hide: {}, images: [], tcolor: {}, tpos: {}, ...rest }; // ค่าที่กำลังแก้ (ยังไม่บันทึก) · tcolor = สีตัวอักษร · tpos = ตำแหน่ง/ขนาด/จัดแนว รายช่อง
  let scr = '', dirty = false;
  const src = s => `${PORTAL ? SITE_URL + '?t=' + Date.now() : ''}#/vip/${h.slug || h.id}?preview=1${s ? '&s=' + s : ''}`;
  main.innerHTML = `<div class="vb">
    <div class="vb-head"><button class="btn btn-ghost btn-sm" id="vb-back"><i class="fa-solid fa-arrow-left"></i> กลับ</button>
      <div><b><i class="fa-solid fa-crown" style="color:#d4a017"></i> ตั้งค่าเว็บจอง · ${esc(h.name)}</b><div class="small muted">① เลือกหน้า ② กดที่ข้อความหรือรูปบนจอมือถือ (ลากข้อความเพื่อขยับได้) ③ แก้ทางขวา เห็นผลทันที ④ กด “บันทึก”</div></div>
      <div class="row" style="gap:8px"><a class="btn btn-outline btn-sm" href="${esc(vipLink(h))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> เปิดเว็บจริง</a><button class="btn btn-primary btn-sm" id="vb-save"><i class="fa-solid fa-check"></i> บันทึก</button></div></div>
    <div class="vb-tabs">${VB_SCREENS.map(([k, i, l], n) => `<button data-vb-s="${k}" class="${k === scr ? 'on' : ''}"><i class="fa-solid ${i}"></i><span>${n + 1}. ${l}</span></button>`).join('')}</div>
    <div class="vb-body"><div class="vb-phone"><div class="vb-notch"></div><iframe id="vb-fr" title="ตัวอย่างหน้าเว็บ" src="${esc(src(''))}"></iframe></div>
      <div class="vb-panel card" id="vb-panel"></div></div></div>`;
  const fr = $('#vb-fr', main);
  const push = debounce(() => { const w = fr.contentWindow; if (!w?.render) return; w.__vipDraft = d; w.render(); }, 120);
  const changed = () => { dirty = true; push(); };
  const val = k => { const [, t, def] = VB_FIELDS[k]; return t === 'x' ? d.text[k] || '' : t === 't' ? d[k] || '' : ''; };
  const ph = k => { const [, t, def] = VB_FIELDS[k]; return t === 'x' ? VIP_TEXT[k] : def ? def(h) : ''; };
  const svcRows = () => String(d.services || '').split('\n').filter(x => x.trim()).map(x => { const [a, ...b] = x.split(/\s+-\s+|\|/); return [a.trim(), b.join(' ').trim()]; });
  // ปุ่มขยับ / ขนาด / จัดแนว (ใช้กับข้อความและโลโก้)
  const moveHtml = (k, align = true) => `<div class="vb-move"><span class="small muted">ขยับ</span>${[['l', 'left'], ['u', 'up'], ['d', 'down'], ['r', 'right']].map(([m, i]) => `<button class="btn btn-ghost btn-sm" data-mv="${k}|${m}" title="ขยับ"><i class="fa-solid fa-arrow-${i}"></i></button>`).join('')}
        <span class="small muted">ขนาด</span><button class="btn btn-ghost btn-sm" data-mv="${k}|-" title="เล็กลง">A−</button><button class="btn btn-ghost btn-sm" data-mv="${k}|+" title="ใหญ่ขึ้น">A+</button>
        ${align ? '<span class="small muted">จัดแนว</span>' + [['left', 'left'], ['center', 'center'], ['right', 'right']].map(([a, i]) => `<button class="btn btn-ghost btn-sm${d.tpos[k]?.a === a ? ' on' : ''}" data-mv="${k}|${a}" title="ชิด${a === 'left' ? 'ซ้าย' : a === 'right' ? 'ขวา' : 'กลาง'}"><i class="fa-solid fa-align-${i}"></i></button>`).join('') : ''}
        ${d.tpos[k] ? `<button class="btn btn-ghost btn-sm" data-mv="${k}|0">คืนตำแหน่งเดิม</button>` : ''}</div>`;
  const fieldHtml = k => {
    const [label, t] = VB_FIELDS[k];
    if (t === 'show') return `<div class="vb-f vb-sw" data-f="${k}"><span>${label}</span><label class="switch big"><input type="checkbox" data-show="${k}" ${d.hide[k] ? '' : 'checked'}><span></span>${d.hide[k] ? 'ซ่อน' : 'แสดง'}</label></div>`;
    if (t === 'color') return `<div class="vb-f" data-f="${k}"><label>${label}</label><div class="row" style="gap:8px">${['#12305a', '#0f766e', '#7c2d12', '#6d28d9', '#be123c', '#111827'].map(c => `<button class="vb-sw-c" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-color-in value="${esc(vipColor({ vip: d }))}"></div></div>`;
    if (t === 'imgs') return `<div class="vb-f" data-f="${k}"><label>${label}</label><div class="small muted" style="margin-bottom:6px">ไม่ใส่ = ใช้รูปรีสอร์ทปกติ · สูงสุด 8 รูป</div><div id="vb-imgs"></div></div>`;
    if (t === 'img') return `<div class="vb-f" data-f="${k}"><label>${label}</label><div class="row" style="gap:10px;align-items:center"><div class="vb-thumb" style="background:${esc(vipColor({ vip: d }))}">${d[k] ? `<img src="${esc(imgUrl(d[k], 200))}" alt="">` : '<i class="fa-regular fa-image"></i>'}</div>
      <button class="btn btn-outline btn-sm" data-up="${k}"><i class="fa-solid fa-upload"></i> ${d[k] ? 'เปลี่ยนรูป' : 'อัปโหลด'}</button>${d[k] ? `<button class="btn btn-ghost btn-sm" data-rm="${k}">ลบ</button>` : ''}</div>
      ${k === 'logo' ? moveHtml(k, false) + '<div class="small muted">ลากโลโก้บนจอมือถือเพื่อขยับได้</div>' : ''}</div>`;
    if (t === 'services') return `<div class="vb-f" data-f="${k}"><label>${label}</label><div id="vb-svc">${svcRows().map(([a, b], i) => `<div class="vb-svc-row"><input data-sa="${i}" value="${esc(a)}" placeholder="ชื่อบริการ เช่น สปา & นวด"><input data-sb="${i}" value="${esc(b)}" placeholder="รายละเอียดสั้นๆ"><button class="btn btn-ghost btn-sm" data-sx="${i}" aria-label="ลบ"><i class="fa-solid fa-trash"></i></button></div>`).join('')}</div>
      <button class="btn btn-outline btn-sm" id="vb-svc-add" style="margin-top:6px"><i class="fa-solid fa-plus"></i> เพิ่มบริการ</button></div>`;
    const col = d.tcolor[k];
    const ctaHtml = k !== 'cta' ? '' : `<div class="vb-cta"><div class="small muted" style="margin:8px 0 4px">รูปแบบกรอบปุ่ม</div><div class="vb-cta-opts">${[['pill', 'ขาวโค้ง'], ['solid', 'สีธีม'], ['outline', 'เส้นขอบ'], ['glass', 'กระจกใส'], ['square', 'เหลี่ยม'], ['gold', 'ทอง']].map(([s, l]) => `<button class="vb-cta-o${(d.ctaStyle || 'pill') === s ? ' on' : ''}" data-cta-st="${s}"><span class="va-pill va-pill--${s}" style="--vip:${esc(vipColor({ vip: d }))}">จอง</span><small>${l}</small></button>`).join('')}</div>
      <div class="vb-cols" style="margin-top:8px">${['#ffffff', '#12305a', '#d4a017', '#dc2626', '#16a34a', '#111827'].map(c => `<button class="vb-sw-c sm" data-cta-bg="${c}" style="background:${c}" title="${c}"></button>`).join('')}<label class="vb-col sm" title="เลือกสีเอง"><i class="fa-solid fa-palette"></i><input type="color" data-cta-bg-in value="${esc(d.ctaBg || '#ffffff')}"></label><span class="small muted">สีกรอบปุ่ม</span>${d.ctaBg ? '<button class="btn btn-ghost btn-sm" data-cta-bg="">สีเดิม</button>' : ''}</div></div>`;
    return `<div class="vb-f" data-f="${k}"><label>${label}</label><div class="vb-txt"><input data-txt="${k}" value="${esc(val(k))}" placeholder="${esc(ph(k))}" maxlength="${k === 'sub' || k === 'svcNote' ? 120 : 80}">
      <label class="vb-col${col ? ' set' : ''}" title="สีตัวอักษร"><i class="fa-solid fa-font"></i><span style="background:${esc(col || 'transparent')}"></span><input type="color" data-tcol="${k}" value="${esc(col || '#ffffff')}"></label>${col ? `<button class="btn btn-ghost btn-sm" data-tcol-x="${k}" title="ใช้สีเดิม">สีเดิม</button>` : ''}</div>
      <div class="vb-cols">${['#ffffff', '#111827', '#12305a', '#d4a017', '#dc2626', '#16a34a'].map(c => `<button class="vb-sw-c sm" data-tcq="${k}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}<span class="small muted">สีตัวอักษร</span></div>
      ${ctaHtml}${moveHtml(k)}
      <div class="small muted">ว่างไว้ = “${esc(ph(k))}” · ลากข้อความบนจอมือถือเพื่อขยับได้</div></div>`;
  };
  const drawPanel = (focus) => {
    const p = $('#vb-panel', main), [, , title, keys] = VB_SCREENS.find(x => x[0] === scr);
    p.innerHTML = `<h3 style="margin:0 0 4px">${title}</h3><p class="small muted" style="margin:0 0 12px"><i class="fa-solid fa-hand-pointer"></i> กดที่ข้อความหรือรูปบนจอมือถือ ช่องที่ตรงกันจะเด่นขึ้นมา</p>${keys.map(fieldHtml).join('')}`;
    if (keys.includes('images')) imgManager($('#vb-imgs', p), d.images, { min: 0 });
    $$('[data-txt]', p).forEach(i => i.oninput = () => { const k = i.dataset.txt; if (VB_FIELDS[k][1] === 'x') d.text[k] = i.value.trim(); else d[k] = i.value.trim(); changed(); });
    $$('[data-cta-st]', p).forEach(b => b.onclick = () => { d.ctaStyle = b.dataset.ctaSt; d.ctaBg = ''; changed(); drawPanel('cta'); }); // เลือกรูปแบบใหม่ = ล้างสีที่ตั้งเอง ให้เห็นแบบนั้นชัดๆ (เลือกสีใหม่ทีหลังได้)
    $$('[data-cta-bg]', p).forEach(b => b.onclick = () => { d.ctaBg = b.dataset.ctaBg; changed(); drawPanel('cta'); });
    $('[data-cta-bg-in]', p)?.addEventListener('input', e => { d.ctaBg = e.target.value; changed(); });
    $$('[data-mv]', p).forEach(b => b.onclick = () => {
      const [k, m] = b.dataset.mv.split('|'), ps = { ...d.tpos[k] };
      if (m === '0') delete d.tpos[k];
      else {
        if (m === 'l') ps.x = (ps.x || 0) - 8; if (m === 'r') ps.x = (ps.x || 0) + 8; if (m === 'u') ps.y = (ps.y || 0) - 8; if (m === 'd') ps.y = (ps.y || 0) + 8;
        if (m === '+') ps.s = Math.min(2.5, Math.round(((ps.s || 1) + 0.1) * 10) / 10); if (m === '-') ps.s = Math.max(0.5, Math.round(((ps.s || 1) - 0.1) * 10) / 10);
        if (['left', 'center', 'right'].includes(m)) ps.a = ps.a === m ? undefined : m;
        d.tpos[k] = ps;
      }
      changed(); drawPanel(k);
    });
    const setCol = (k, c) => { if (c) d.tcolor[k] = c; else delete d.tcolor[k]; changed(); drawPanel(k); };
    $$('[data-tcol]', p).forEach(i => { i.oninput = () => { d.tcolor[i.dataset.tcol] = i.value; i.previousElementSibling.style.background = i.value; changed(); }; i.onchange = () => drawPanel(i.dataset.tcol); });
    $$('[data-tcq]', p).forEach(b => b.onclick = () => setCol(b.dataset.tcq, b.dataset.c));
    $$('[data-tcol-x]', p).forEach(b => b.onclick = () => setCol(b.dataset.tcolX, ''));
    $$('[data-show]', p).forEach(c => c.onchange = () => { if (c.checked) delete d.hide[c.dataset.show]; else d.hide[c.dataset.show] = true; c.parentElement.lastChild.textContent = c.checked ? 'แสดง' : 'ซ่อน'; changed(); });
    $$('[data-color]', p).forEach(b => b.onclick = () => { d.color = b.dataset.color; $('[data-color-in]', p).value = d.color; changed(); });
    $('[data-color-in]', p)?.addEventListener('input', e => { d.color = e.target.value; changed(); });
    $$('[data-up]', p).forEach(b => b.onclick = async () => { try { const u = await pickAndUploadImage(b.dataset.up === 'logo' ? 600 : 1600); if (u) { d[b.dataset.up] = u; changed(); drawPanel(b.dataset.up); } } catch (e) { toast('อัปโหลดไม่สำเร็จ: ' + e.message, 'err'); } });
    $$('[data-rm]', p).forEach(b => b.onclick = () => { d[b.dataset.rm] = ''; changed(); drawPanel(b.dataset.rm); });
    const svcSave = () => { d.services = $$('.vb-svc-row', p).map(r => { const a = $('[data-sa]', r).value.trim(), b = $('[data-sb]', r).value.trim(); return a ? (b ? `${a} - ${b}` : a) : ''; }).filter(Boolean).join('\n').slice(0, 1500); changed(); };
    $$('#vb-svc input', p).forEach(i => i.oninput = svcSave);
    $$('[data-sx]', p).forEach(b => b.onclick = () => { b.parentElement.remove(); svcSave(); drawPanel('services'); });
    $('#vb-svc-add', p)?.addEventListener('click', () => { d.services = (d.services ? d.services + '\n' : '') + 'บริการใหม่'; changed(); drawPanel('services'); setTimeout(() => { const l = $$('#vb-svc [data-sa]', p).pop(); l?.select(); }, 0); });
    if (focus) { const f = $(`[data-f="${focus}"]`, p); if (f) { f.classList.add('hl'); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); $('input:not([type=checkbox]):not([type=color])', f)?.focus(); setTimeout(() => f.classList.remove('hl'), 1600); } }
  };
  const setScreen = (k, focus) => {
    scr = k; $$('[data-vb-s]', main).forEach(b => b.classList.toggle('on', b.dataset.vbS === k));
    const w = fr.contentWindow; if (w) { w.__vipDraft = d; const hs = '#' + src(k).split('#')[1]; if (w.location.hash !== hs) w.location.hash = hs; else w.render?.(); }
    drawPanel(focus);
  };
  // กดในจอตัวอย่าง: ไม่เปิดลิงก์/ปฏิทิน · ถ้ากดโดนส่วนที่แก้ได้ → เปิดช่องนั้นทางขวา
  fr.onload = () => {
    const w = fr.contentWindow, doc = fr.contentDocument; if (!doc) return;
    w.__vipDraft = d;
    if (scr && w.location.hash !== '#' + src(scr).split('#')[1]) w.location.hash = '#' + src(scr).split('#')[1]; // โหลดใหม่แล้วกลับมาหน้าที่เลือกไว้ ไม่เด้งไปหน้าแรก
    // ลากข้อความเพื่อขยับ: กดค้างที่ข้อความ (ช่องชนิด t / x) แล้วลาก — ปล่อยแล้วบันทึกตำแหน่งลงค่าที่กำลังแก้
    const isTxt = k => k === 'logo' || ['t', 'x'].includes(VB_FIELDS[k]?.[1]);
    let drag = null, dragged = false;
    const pt = e => e.touches?.[0] || e.changedTouches?.[0] || e;
    const startDrag = e => { const el = e.target.closest('[data-vedit]'); if (!el || !isTxt(el.dataset.vedit)) return; const q = pt(e); drag = { el, k: el.dataset.vedit, sx: q.clientX, sy: q.clientY, base: { ...d.tpos[el.dataset.vedit] }, moved: false }; };
    const moveDrag = e => {
      if (!drag) return; const q = pt(e), dx = q.clientX - drag.sx, dy = q.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      drag.moved = true; e.preventDefault();
      const b = drag.base; drag.x = Math.round((b.x || 0) + dx); drag.y = Math.round((b.y || 0) + dy);
      drag.el.style.transform = `translate(${drag.x}px,${drag.y}px) scale(${b.s || 1})`; drag.el.style.outline = '2px solid #f59e0b';
    };
    const endDrag = () => { if (!drag) return; if (drag.moved) { d.tpos[drag.k] = { ...drag.base, x: drag.x, y: drag.y }; dragged = true; setTimeout(() => dragged = false, 50); changed(); const k = drag.k; if (VB_SCREENS.find(x => x[0] === scr)[3].includes(k)) drawPanel(k); } drag = null; };
    doc.addEventListener('mousemove', moveDrag, { capture: true, passive: false }); doc.addEventListener('touchmove', moveDrag, { capture: true, passive: false });
    doc.addEventListener('mouseup', endDrag, true); doc.addEventListener('touchend', endDrag, true);
    const trap = e => { if (e.target.closest?.('.va-nav, .va-thumbs')) return; // ปุ่มเลื่อนรูปใช้ได้ในจอตัวอย่าง
      e.preventDefault(); e.stopPropagation(); if (e.type === 'mousedown' || e.type === 'touchstart') return startDrag(e); if (dragged) return; const el = e.target.closest('[data-vedit]'); if (!el) return toast('ส่วนนี้ดึงจากข้อมูลห้องพัก/รีสอร์ท — แก้ได้ที่เมนู “ห้องพัก” หรือ “หน้ารีสอร์ท”', 'info'); const k = el.dataset.vedit; const sc = VB_SCREENS.find(x => x[0] === scr)[3].includes(k) ? scr : VB_SCREENS.find(x => x[3].includes(k))?.[0] ?? scr; if (sc !== scr) setScreen(sc, k); else drawPanel(k); };
    ['click', 'mousedown', 'touchstart'].forEach(t => doc.addEventListener(t, trap, { capture: true, passive: false }));
    const wait = setInterval(() => { if (doc.querySelector('.va-wrap')) { clearInterval(wait); push(); } }, 200); setTimeout(() => clearInterval(wait), 20000);
  };
  $$('[data-vb-s]', main).forEach(b => b.onclick = () => setScreen(b.dataset.vbS));
  $('#vb-back', main).onclick = async () => { if (dirty && !(await confirmBox('ยังไม่ได้บันทึก — ออกโดยไม่บันทึก?', 'ออก'))) return; back?.(); };
  $('#vb-save', main).onclick = () => {
    const cur = JSON.parse(JSON.stringify(DB.hotel(h.id)));
    cur.vip = { ...cur.vip, ...JSON.parse(JSON.stringify(d)), images: d.images.slice(0, 8), on: cur.vip?.on === true, tag: cur.vip?.tag || 'VIP', from: cur.vip?.from || '', to: cur.vip?.to || '' };
    DB.saveHotel(cur); DB.log('hotel.vipsite', cur.name); dirty = false; toast('บันทึกเว็บจองแล้ว — ลูกค้าเห็นทันที');
  };
  // imgManager แก้อาร์เรย์ d.images โดยตรง (อัปโหลด/ลบ/ตั้งปก) → คอยดูการเปลี่ยนแปลงแล้วอัปเดตจอตัวอย่าง
  let sig = JSON.stringify(d.images);
  const poll = setInterval(() => { if (!document.body.contains(fr)) return clearInterval(poll); const s2 = JSON.stringify(d.images); if (s2 !== sig) { sig = s2; changed(); } }, 700);
  drawPanel();
}

// ================= เจ้าของรีสอร์ท: เว็บจองส่วนตัว (VIP) =================
function boVipSite(main) {
  const hotels = DB.hotels(true), s = DB.settings();
  main.innerHTML = pageHead('เว็บจองส่วนตัว (VIP)', 'เว็บไซต์จองห้องของรีสอร์ทคุณเอง — มีแต่รีสอร์ทของคุณ ไม่มีรีสอร์ทอื่นหรือโฆษณา ส่งลิงก์ให้ลูกค้าจองตรงได้เลย') +
    (hotels.map(h => h.vip?.on === true ? `<section class="card"><div class="card-h"><h3><i class="fa-solid fa-crown" style="color:#d4a017"></i> ${esc(h.name)} <span class="pill ok">เปิดใช้ VIP แล้ว</span></h3></div>
      <div class="row wrap" style="gap:14px;align-items:flex-start">
        <div style="width:220px;max-width:100%;border-radius:12px;overflow:hidden;aspect-ratio:16/10;background:#eee">${imgTag((h.vip.images || [])[0] || h.images[0], 500, '', h.id)}</div>
        <div style="flex:1;min-width:240px">
          <div class="small muted">ลิงก์เว็บจองของคุณ</div>
          <div class="row" style="gap:6px;margin:4px 0 10px"><input readonly value="${esc(vipLink(h))}" style="flex:1;min-width:0" onclick="this.select()"><button class="btn btn-outline btn-sm" data-vs-copy="${h.id}"><i class="fa-regular fa-copy"></i> คัดลอก</button></div>
          <div class="small" style="margin-bottom:10px">${esc(h.vip.tagline || 'ยังไม่ได้ตั้งข้อความหัวเว็บ')} · ${(h.vip.images || []).length} รูป VIP · ${String(h.vip.services || '').split(/\n/).filter(x => x.trim()).length} บริการเพิ่มเติม</div>
          <div class="row wrap" style="gap:8px"><button class="btn btn-primary btn-sm" data-vs-edit="${h.id}"><i class="fa-solid fa-wand-magic-sparkles"></i> ตั้งค่าเว็บ (แก้บนหน้าจอจริง)</button>
            <a class="btn btn-outline btn-sm" href="${esc(vipLink(h))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> เปิดดูเว็บ</a></div>
        </div></div></section>`
    : `<section class="card"><div class="card-h"><h3><i class="fa-solid fa-crown muted"></i> ${esc(h.name)}</h3></div>
      <p class="small">ยังไม่ได้เปิดใช้ <b>เว็บจองส่วนตัว (VIP)</b> — เว็บจองแบรนด์ของรีสอร์ทคุณเอง พร้อมรูปปกใหญ่ แกลเลอรี บริการเพิ่มเติม และป้าย VIP สีทองในหน้าค้นหา kohlarngo</p>
      <p class="small muted">ติดต่อทีมงานเพื่อเปิดใช้: ${[s.phone && `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}">${esc(s.phone)}</a>`, s.line && `LINE ${esc(s.line)}`].filter(Boolean).join(' · ') || 'ผู้ดูแลระบบ'}</p></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ท</p></div></section>');
  $$('[data-vs-copy]', main).forEach(b => b.onclick = () => { copyText(vipLink(DB.hotel(b.dataset.vsCopy))); toast('คัดลอกลิงก์เว็บจองแล้ว'); });
  $$('[data-vs-edit]', main).forEach(b => b.onclick = () => vipBuilder(main, b.dataset.vsEdit, () => boVipSite(main)));
}

// ================= นักพัฒนา: สไลด์ & รูปของทุกรีสอร์ท =================
// เปิด/ปิดสไลด์ ตั้งเวลา จัดการรูป ของรีสอร์ททุกแห่ง (ต้องมีสิทธิ์ hotels.media — ตรวจที่ฐานข้อมูลด้วย RLS)
function boDevMedia(main) {
  const hotels = DB.hotels(true);
  const sec = h => Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)));
  const ownerName = h => { const o = h.ownerId ? DB.owner(h.ownerId) : null; return o ? (o.biz?.resortName || o.name) : 'แพลตฟอร์ม'; };
  main.innerHTML = pageHead('สไลด์ & รูปรีสอร์ท', `${hotels.length} รีสอร์ท · เปิด/ปิดสไลด์ ตั้งเวลา และจัดการรูปของรีสอร์ททุกแห่ง (เจ้าของรีสอร์ทยังแก้ของตัวเองได้เหมือนเดิม)`) + `
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> ตั้งค่าให้ทุกรีสอร์ทพร้อมกัน</h3></div>
      <div class="row wrap" style="gap:12px;align-items:center"><label class="row" style="gap:8px"><input type="checkbox" id="bulk-on" checked> เปิดสไลด์อัตโนมัติ</label>
        <span class="small">เปลี่ยนรูปทุก</span><input type="range" id="bulk-sec" min="2" max="15" step="1" value="4" style="width:200px"><b id="bulk-v" style="min-width:64px">4 วินาที</b>
        <button class="btn btn-primary btn-sm" id="bulk-go"><i class="fa-solid fa-check-double"></i> ใช้กับทุกรีสอร์ท</button></div></section>
    <div class="card sh-find"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="dm-q" placeholder="ค้นหารีสอร์ท หรือชื่อเจ้าของ..." autocomplete="off"><span class="small muted" id="dm-n">${hotels.length} แห่ง</span></div>
    <div id="dm-list">${hotels.map(h => `<section class="card sh-row" data-h="${h.id}" data-q="${esc((h.name + ' ' + ownerName(h)).toLowerCase())}">
      <div class="sh-thumb">${imgTag(h.images[0], 200, '', h.id)}</div>
      <div class="sh-main"><b class="sh-name">${esc(h.name)}</b><div class="small muted">เจ้าของ: ${esc(ownerName(h))} · ${h.images.length} รูป${h.active === false ? ' · <span class="red">ปิดการขาย</span>' : ''}</div></div>
      <div class="sh-ctl"><label class="row" style="gap:6px"><input type="checkbox" data-sl-on="${h.id}" ${h.slideshow?.on === true ? 'checked' : ''} ${h.images.length < 2 ? 'disabled' : ''}> สไลด์</label>
        <input type="range" data-sl-sec="${h.id}" min="2" max="15" step="1" value="${sec(h)}" style="width:110px" ${h.images.length < 2 ? 'disabled' : ''}><b data-sl-v="${h.id}" style="min-width:58px;font-size:13px">${sec(h)} วินาที</b></div>
      <div class="sh-act"><button class="btn btn-primary btn-sm" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> จัดการรูป</button>
        <a class="btn btn-outline btn-sm" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener" title="ดูหน้าเว็บ"><i class="fa-solid fa-eye"></i></a></div></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ทในระบบ</p></div></section>'}</div>`;
  const save = (id, patch) => { const h = JSON.parse(JSON.stringify(DB.hotel(id))); h.slideshow = { on: h.slideshow?.on === true, seconds: sec(h), ...patch }; DB.saveHotel(h); DB.log('hotel.slideshow', `${h.name} → ${h.slideshow.on ? 'เปิด ' + h.slideshow.seconds + ' วินาที' : 'ปิด'}`); };
  $$('[data-sl-on]', main).forEach(c => c.onchange = () => { save(c.dataset.slOn, { on: c.checked }); toast(c.checked ? 'เปิดสไลด์แล้ว' : 'ปิดสไลด์แล้ว'); });
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
// ซิงก์ปฏิทิน iCal: dev เปิดทั้งระบบ (flags.icalSync — ยกเว้นรายรีสอร์ทด้วย h.icalOff) หรือเปิดเฉพาะรีสอร์ท (h.icalOn — ตั้งที่หน้า "สไลด์ & รูปรีสอร์ท" ของ dev)
const icalOn = h => !!h && h.icalOff !== true && (DB.flags().icalSync === true || h.icalOn === true);
function boChannels(main) {
  const hotels = DB.hotels(true);
  const f = { ch: '', st: 'active', hid: hotels[0]?.id || '' };
  const chColor = c => ({ 'Agoda': '#c2410c', 'Booking.com': '#1d4ed8', 'Traveloka': '#0369a1', 'Trip.com': '#6d28d9', 'Airbnb': '#be123c', 'Facebook': '#1877f2', 'TikTok': '#111827' }[c] || '#475569');
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
const NOTIFY_EVENTS = [['new', 'มีการจองใหม่'], ['slip', 'ลูกค้าส่งสลิปโอนเงิน'], ['cancel', 'ลูกค้าขอยกเลิก'], ['checkin', 'ลูกค้ากรอกเช็คอินเอง'], ['waitlist', 'มีคนเข้าคิวรอห้อง / ห้องว่างตรงกับคิวที่รออยู่']];
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
    const subs = subsR.data || [], prefs = { new: true, slip: true, cancel: true, checkin: true, waitlist: true, ...(prefR.data?.prefs || {}) };
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

// ================= ลิงก์ส่งลูกค้า =================
// สร้างลิงก์จองของรีสอร์ท (กำหนดวัน/จำนวนคนไว้ล่วงหน้าได้) แล้วคัดลอก / ส่งเข้า LINE / เปิดทดสอบ
function boLinks(main) {
  const hotels = DB.hotels(true), tdy = todayISO();
  main.innerHTML = pageHead('ลิงก์ส่งลูกค้า', 'ส่งลิงก์ให้ลูกค้าจองตรงกับรีสอร์ท — กำหนดวันเข้าพักไว้ในลิงก์ได้ ลูกค้าเปิดแล้วเห็นราคาและห้องว่างของวันนั้นเลย ไม่ต้องเลือกวันเอง') + (hotels.length ? hotels.map(h => `
    <section class="card" data-h="${esc(h.id)}"><div class="card-h"><h3><i class="fa-solid fa-link"></i> ${esc(h.name)}</h3></div>
      <div class="fg"><label>ลิงก์รีสอร์ท <span class="small muted">— ใช้ได้ตลอด ลูกค้าเลือกวันเอง</span></label>
        <div class="row" style="gap:8px"><input data-rlink readonly style="flex:1"><button class="btn btn-outline btn-sm" data-rcopy><i class="fa-regular fa-copy"></i> คัดลอก</button></div></div>
      <div class="fg"><label>ลิงก์พร้อมวันเข้าพัก <span class="small muted">— เลือกวันด้านล่าง ลูกค้าเปิดแล้วเห็นราคา/ห้องว่างของวันนั้นเลย</span></label>
        <div class="row wrap" style="gap:8px"><input type="date" data-in min="${tdy}" style="max-width:160px" title="เช็คอิน"><span class="muted">ถึง</span><input type="date" data-out min="${tdy}" style="max-width:160px" title="เช็คเอาท์"><input type="number" data-a min="1" max="20" value="2" style="max-width:80px" title="ผู้ใหญ่"><span class="small muted">คน</span><input type="number" data-r min="1" max="10" value="1" style="max-width:80px" title="จำนวนห้อง"><span class="small muted">ห้อง</span></div>
        <div class="small" data-note style="margin-top:4px"></div></div>
      <div class="fg"><input data-link readonly style="width:100%"></div>
      <div class="row wrap" style="gap:8px"><button class="btn btn-primary" data-copy><i class="fa-regular fa-copy"></i> คัดลอกลิงก์พร้อมวัน</button>
        <button class="btn btn-outline" data-line><i class="fa-brands fa-line"></i> ส่งเข้า LINE</button>
        <button class="btn btn-ghost" data-promo><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต (Facebook / TikTok)</button></div>
    </section>`).join('') : '<div class="empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3><p class="muted">เพิ่มรีสอร์ทที่เมนู "หน้ารีสอร์ท" ก่อน</p></div>');
  $$('section[data-h]', main).forEach(sec => {
    const h = DB.hotel(sec.dataset.h), q = s => $(s, sec);
    const trip = () => { const i = q('[data-in]').value, o = q('[data-out]').value; return i && o && o > i ? { in: i, out: o, a: Math.max(1, +q('[data-a]').value || 2), r: Math.max(1, +q('[data-r]').value || 1) } : null; };
    const draw = () => {
      const t = trip(), i = q('[data-in]').value, o = q('[data-out]').value;
      q('[data-link]').value = resortLink(h, '', t);
      q('[data-note]').innerHTML = t ? `<span class="green"><i class="fa-solid fa-check"></i> ลูกค้าจะเห็น ${fmtDate(i)} – ${fmtDate(o)} · ${diffDays(i, o)} คืน · ${t.a} คน ${t.r} ห้อง</span>` : (i || o ? '<span class="muted">เลือกเช็คอินและเช็คเอาท์ให้ครบ</span>' : '<span class="muted">ไม่กำหนดวัน — ลูกค้าเลือกวันเอง</span>');
    };
    q('[data-in]').onchange = () => { const i = q('[data-in]').value, o = q('[data-out]'); if (i && (!o.value || o.value <= i)) o.value = addDays(i, 1); o.min = i ? addDays(i, 1) : tdy; draw(); };
    ['[data-out]', '[data-a]', '[data-r]'].forEach(s => q(s).onchange = draw);
    q('[data-rlink]').value = resortLink(h);
    q('[data-rcopy]').onclick = () => { copyText(q('[data-rlink]').value); toast('คัดลอกลิงก์รีสอร์ทแล้ว'); };
    q('[data-copy]').onclick = () => { copyText(q('[data-link]').value); toast('คัดลอกลิงก์แล้ว'); };
    q('[data-line]').onclick = () => window.open(`https://line.me/R/share?text=${encodeURIComponent(`จองห้องพัก ${h.name} ได้ที่นี่เลย 👇\n${q('[data-link]').value}`)}`, '_blank', 'noopener');
    q('[data-promo]').onclick = () => sharePromo(h);
    draw();
  });
}

// ================= ตั้งราคา (ราคาตามวันในสัปดาห์ + ช่วงวันที่ อยู่หน้าเดียวกัน) =================
// ส่วน "ราคาตามวันในสัปดาห์": ราคาตามวันในสัปดาห์ต่อห้อง (rooms[].dayPrices = { 0..6: ราคา }, 0=อาทิตย์ · ว่าง = ราคาปกติ)
// ส่วน "ช่วงวันที่": ราคาเป็นช่วงวันที่ เช่น ปีใหม่ สงกรานต์ (rooms[].priceRules = [{from,to,price}])
// ลำดับ: ช่วงวันที่ > ราคาตามวันในสัปดาห์ > ราคาปกติ · ต้องตรงกับ sd_price / DB.nightPrice
const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
function boPrices(main) {
  const hotels = DB.hotels(true), today = todayISO();
  const live = r => (r.priceRules || []).filter(x => x.to >= today);
  const roomHtml = r => `<div class="rm-row" data-r="${esc(r.id)}" style="padding:12px 0;border-top:1px solid var(--border)"><b>${esc(r.name)}</b> <span class="small muted">ราคาปกติ ${money(r.price)}/คืน</span>
      <div style="margin-top:10px"><div class="row between wrap" style="gap:8px"><div><b class="small">ราคาตามวันในสัปดาห์</b> <span class="small muted">— ช่องที่เว้นว่างใช้ราคาปกติ</span></div><button class="btn btn-primary btn-sm" data-wsave>บันทึก</button></div>
        <div class="row wrap" style="gap:8px;margin-top:8px">${DOW_TH.map((n, d) => `<label class="small" style="display:flex;flex-direction:column;gap:2px;width:78px"><span>${n}</span><input type="number" min="0" data-dp="${d}" value="${r.dayPrices?.[d] > 0 ? r.dayPrices[d] : ''}" placeholder="${r.price}"></label>`).join('')}</div></div>
      <div style="margin-top:14px"><div class="row between wrap" style="gap:8px"><div><b class="small">ช่วงวันที่ (ปีใหม่ สงกรานต์ ฯลฯ)</b> <span class="small muted">— ชนะราคาตามวันในสัปดาห์</span></div><button class="btn btn-outline btn-sm" data-add><i class="fa-solid fa-plus"></i> เพิ่มช่วงวัน</button></div>
        ${live(r).length ? live(r).map(x => `<div class="row between small" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;margin-top:6px"><span><b>${fmtDate(x.from)}</b> – <b>${fmtDate(x.to)}</b> · ${money(x.price)}/คืน</span><button class="btn btn-ghost btn-sm" data-del="${r.priceRules.indexOf(x)}" title="ลบ"><i class="fa-solid fa-trash"></i></button></div>`).join('') : '<div class="small muted" style="margin-top:6px">ยังไม่ได้ตั้งราคาตามช่วงวันที่</div>'}</div></div>`;
  const sub = 'ตั้งราคาห้องได้ที่เดียว: ราคาตามวันในสัปดาห์ (เช่น คืนศุกร์–เสาร์แพงกว่า) และราคาตามช่วงวันที่ (เช่น ปีใหม่ สงกรานต์) · ลำดับ: ช่วงวันที่ > วันในสัปดาห์ > ราคาปกติ · ส่วนลดของห้องคิดต่อจากราคานี้';
  main.innerHTML = pageHead('ตั้งราคา', sub) + (hotels.length ? hotels.map(h => `
    <section class="card" data-h="${esc(h.id)}"><div class="card-h"><h3><i class="fa-solid fa-tags"></i> ${esc(h.name)}</h3></div>
      ${h.rooms.length ? h.rooms.map(roomHtml).join('') : '<p class="muted">ยังไม่มีห้องพัก — เพิ่มห้องที่เมนู "ห้องพัก" ก่อน</p>'}</section>`).join('') : '<div class="empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3></div>');
  const save = (h, msg) => { DB.saveHotel(h); toast(msg); boPrices(main); };
  $$('section[data-h]', main).forEach(sec => {
    const h = DB.hotel(sec.dataset.h);
    $$('[data-r]', sec).forEach(row => {
      const r = h.rooms.find(x => x.id === row.dataset.r);
      $('[data-wsave]', row)?.addEventListener('click', () => {
        const dp = {};
        $$('[data-dp]', row).forEach(i => { const v = Math.round(+i.value); if (v > 0) dp[i.dataset.dp] = v; });
        r.dayPrices = dp;
        DB.log('room.price', `${h.name} / ${r.name} ราคาตามวันในสัปดาห์`); save(h, 'บันทึกราคาตามวันแล้ว');
      });
      $$('[data-del]', row).forEach(b => b.onclick = () => {
        const x = r.priceRules[+b.dataset.del];
        r.priceRules = r.priceRules.filter(y => y !== x);
        DB.log('room.price', `${h.name} / ${r.name} ลบราคาช่วง ${x.from}–${x.to}`); save(h, 'ลบแล้ว');
      });
      $('[data-add]', row)?.addEventListener('click', () => {
        const m = openModal(`<h2><i class="fa-solid fa-tags"></i> เพิ่มราคาตามช่วงวันที่ <span class="small muted">· ${esc(r.name)}</span></h2>
          <div class="form-grid" style="margin-top:12px"><div class="fg"><label>ตั้งแต่วันที่ <span class="req">*</span></label><input type="date" id="pr-from" min="${today}"></div>
            <div class="fg"><label>ถึงวันที่ (คืนสุดท้าย) <span class="req">*</span></label><input type="date" id="pr-to" min="${today}"></div>
            <div class="fg full"><label>ราคาต่อคืน (฿) <span class="req">*</span> <span class="small muted">— ปกติ ${money(r.price)}</span></label><input type="number" id="pr-price" min="1" placeholder="เช่น ${Math.round(r.price * 1.5 / 50) * 50}"></div></div>
          <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="pr-save">บันทึก</button></div>`);
        $('#pr-from', m).onchange = () => { const i = $('#pr-from', m).value, o = $('#pr-to', m); if (i && (!o.value || o.value < i)) o.value = i; o.min = i || today; };
        $('#pr-save', m).onclick = () => {
          const from = $('#pr-from', m).value, to = $('#pr-to', m).value, price = Math.round(+$('#pr-price', m).value);
          if (!from || !to || to < from) return toast('เลือกวันที่เริ่มและวันที่สิ้นสุดให้ครบ', 'err');
          if (!(price > 0)) return toast('ใส่ราคาต่อคืนให้มากกว่า 0', 'err');
          r.priceRules = [...live(r), { from, to, price }].sort((x, y) => x.from.localeCompare(y.from));
          DB.log('room.price', `${h.name} / ${r.name} ราคา ${from}–${to} = ${price}`); closeModal(); save(h, 'บันทึกราคาตามช่วงวันที่แล้ว');
        };
      });
    });
  });
}

// ================= เอกสารการเงิน: ปรับแต่งได้เองทั้งหมด (ใบแจ้งหนี้ · ใบเสร็จ · ใบกำกับภาษี · ประเภทที่เจ้าของสร้างเอง) =================
// ผู้ออกเอกสาร h.taxInfo · รูปแบบ/ประเภทเอกสาร h.docCfg · เลขที่รันรายรีสอร์ท/ประเภท/ปี h.docSeq · เอกสารที่ออกแล้วเก็บที่การจอง b.docs[ประเภท] (ออกซ้ำได้เลขเดิม)
const DOC_DEFAULT_TYPES = () => [
  { id: 'invoice', th: 'ใบแจ้งหนี้', en: 'Invoice', code: 'INV', vat: false, needPaid: false, buyer: false, discLines: true, sigL: 'ผู้มีอำนาจลงนาม', sigR: 'ผู้รับเอกสาร', note: '', defNote: '' },
  { id: 'receipt', th: 'ใบเสร็จรับเงิน', en: 'Receipt', code: 'RC', vat: false, needPaid: true, buyer: false, discLines: true, sigL: 'ผู้รับเงิน', sigR: 'ผู้ชำระเงิน', note: '', defNote: '' },
  { id: 'tax', th: 'ใบกำกับภาษี', en: 'Tax Invoice', code: 'TX', vat: true, needPaid: false, buyer: true, discLines: true, sigL: 'ผู้รับเงิน / ผู้มีอำนาจลงนาม', sigR: 'ผู้ชำระเงิน', note: '', defNote: '' },
];
// โลโก้รีสอร์ท: ใช้ของรีสอร์ทนั้น (ถ้าตั้งไว้) ไม่งั้นใช้โลโก้เดียวของบัญชี (หน้า “บัญชีรับเงิน” › ข้อมูลรีสอร์ท)
const resortLogo = h => h?.logo || (/^https:\/\//i.test(DB.currentUser()?.biz?.logo || '') ? DB.currentUser().biz.logo : '');
const docCfgOf = h => { const c = h?.docCfg || {}; return { accent: '#1a5fd0', logo: true, header: '', footer: '', ...c, types: Array.isArray(c.types) ? c.types : DOC_DEFAULT_TYPES() }; };
const r2 = n => Math.round(n * 100) / 100, fmt2 = n => r2(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function bahtText(n) {
  const D = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'], U = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const six = s => { let o = ''; const L = s.length; [...s].forEach((c, i) => { const d = +c, p = L - i - 1; if (!d) return; o += (p === 1 && d === 1 ? '' : p === 1 && d === 2 ? 'ยี่' : p === 0 && d === 1 && L > 1 ? 'เอ็ด' : D[d]) + U[p]; }); return o; };
  const int = s => { s = s.replace(/^0+/, '') || '0'; if (s === '0') return D[0]; const parts = []; while (s.length) { parts.unshift(s.slice(-6)); s = s.slice(0, -6); } return parts.map((p, i) => six(p.replace(/^0+(?=\d)/, '')) + (i < parts.length - 1 ? 'ล้าน' : '')).join(''); };
  const [b, st] = r2(n).toFixed(2).split('.');
  return int(b) + 'บาท' + (st === '00' ? 'ถ้วน' : int(st) + 'สตางค์');
}
// ชื่อผู้ประกอบการเริ่มต้น = ชื่อรีสอร์ท · ที่อยู่เริ่มต้น = ที่อยู่รีสอร์ท (แก้เป็นชื่อนิติบุคคลได้ที่ “ข้อมูลผู้ออก”)
const taxInfoOf = h => { const t = { taxId: '', branch: 'สำนักงานใหญ่', phone: '', vat: false, svc: 0, ...(h?.taxInfo || {}) }; return { ...t, legalName: (t.legalName || '').trim() || h?.name || '', address: (t.address || '').trim() || h?.address || '' }; };

function boDocs(main) {
  const hotels = DB.hotels(true);
  if (!hotels.length) { main.innerHTML = pageHead('เอกสารการเงิน', '') + '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">เพิ่มรีสอร์ทก่อน แล้วจึงออกเอกสารได้</p></div></section>'; return; }
  const bks = DB.bookings().filter(b => b.source !== 'external' && b.status !== 'cancelled').sort((a, c) => (c.createdAt || '').localeCompare(a.createdAt || ''));
  main.innerHTML = pageHead('เอกสารการเงิน', 'ออกใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ ใบกำกับภาษี หรือเอกสารแบบที่คุณสร้างเอง · พิมพ์หรือบันทึกเป็น PDF', '<button class="btn btn-primary" id="dc-quote"><i class="fa-solid fa-file-invoice-dollar"></i> ออกใบเสนอราคา</button>') + `
    ${DB.hotels(true).some(h => (h.quotes || []).length) ? `<section class="card"><div class="card-h"><h3><i class="fa-solid fa-file-invoice-dollar"></i> ใบเสนอราคาที่ออกแล้ว</h3></div><div class="bo-list">${DB.hotels(true).flatMap(h => (h.quotes || []).map(q => ({ h, q }))).sort((a, c) => c.q.at.localeCompare(a.q.at)).slice(0, 20).map(({ h, q }) => `<div class="row wrap" style="gap:14px;align-items:center;padding:8px 0;border-top:1px solid var(--border,#e5e7eb)"><div><b>${esc(q.no)}</b> · ${esc(q.cust.name)}<div class="small muted">${esc(h.name)} · ${fmtDate(q.at.slice(0, 10), false)} · ยืนราคาถึง ${fmtDate(q.validUntil, false)} · ${money(q.items.reduce((s, x) => s + x.qty * x.price, 0))}</div></div><button class="btn btn-outline btn-sm" data-qp="${esc(h.id)}|${esc(q.no)}"><i class="fa-solid fa-print"></i> พิมพ์ซ้ำ</button> <button class="btn btn-outline btn-sm" data-qe="${esc(h.id)}|${esc(q.no)}"><i class="fa-solid fa-pen"></i> แก้ไข</button> <button class="btn btn-ghost btn-sm red" data-qd="${esc(h.id)}|${esc(q.no)}" title="ลบ"><i class="fa-solid fa-trash"></i></button></div>`).join('')}</div></section>` : ''}
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-building"></i> ผู้ออกเอกสาร & รูปแบบเอกสาร</h3></div>
      <div class="bo-list">${hotels.map(h => { const t = taxInfoOf(h), c = docCfgOf(h); return `<div class="row between wrap" style="gap:10px;padding:8px 0;border-top:1px solid var(--border,#e5e7eb)"><div><b>${esc(h.name)}</b><div class="small muted">${esc(t.legalName)} · เลขผู้เสียภาษี ${esc(t.taxId || '-')} · ${t.vat ? 'จด VAT' : 'ไม่จด VAT'} · เอกสาร ${c.types.length} ประเภท</div></div>
        <div class="row" style="gap:6px"><button class="btn btn-outline btn-sm" data-ti="${h.id}"><i class="fa-solid fa-pen"></i> ข้อมูลผู้ออก</button><button class="btn btn-outline btn-sm" data-dc="${h.id}"><i class="fa-solid fa-sliders"></i> ปรับแต่งเอกสาร</button></div></div>`; }).join('')}</div></section>
    <div class="card sh-find"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="dc-q" placeholder="ค้นหาเลขการจอง หรือชื่อลูกค้า..." autocomplete="off"><span class="small muted" id="dc-n">${bks.length} รายการ</span></div>
    <section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>การจอง</th><th>ลูกค้า</th><th>เข้าพัก</th><th>ยอดรวม</th><th>ชำระ</th><th>ออกเอกสาร</th></tr></thead><tbody id="dc-body">${bks.map(b => `<tr data-q="${esc((b.id + ' ' + b.guest.firstName + ' ' + b.guest.lastName + ' ' + b.hotelName).toLowerCase())}">
      <td><b>${esc(b.id)}</b><div class="small muted">${esc(b.hotelName)}</div></td><td>${esc(b.guest.firstName)} ${esc(b.guest.lastName)}</td><td class="small">${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}</td><td>${money(b.price.total)}</td>
      <td>${b.payment.paid ? '<span class="green bold">ชำระแล้ว</span>' : '<span class="muted">ยังไม่ชำระ</span>'}</td>
      <td style="white-space:nowrap">${docCfgOf(DB.hotel(b.hotelId)).types.map(d => `<button class="btn btn-sm ${b.docs?.[d.id] ? 'btn-primary' : 'btn-outline'}" data-doc="${esc(d.id)}" data-b="${esc(b.id)}" title="${esc(d.th)}${b.docs?.[d.id] ? ' · ' + esc(b.docs[d.id].no) : ''}"><i class="fa-solid fa-file-lines"></i> ${esc(d.th)}</button>`).join(' ') || '<span class="small muted">ยังไม่มีประเภทเอกสาร — กด “ปรับแต่งเอกสาร”</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">ยังไม่มีการจอง</td></tr>'}</tbody></table></div></section>
    <p class="small muted">ปุ่มสีเข้ม = ออกเอกสารนั้นแล้ว กดเพื่อพิมพ์ซ้ำด้วยเลขที่เดิม · เพิ่ม ลบ หรือเปลี่ยนชื่อประเภทเอกสาร คำนำหน้าเลขที่ ข้อความท้ายเอกสาร สีและโลโก้ ได้ที่ “ปรับแต่งเอกสาร” · ข้อมูลนี้เป็นเครื่องมือช่วยออกเอกสาร กรุณาตรวจสอบกับนักบัญชีของคุณ</p>`;
  const q = $('#dc-q', main); q.oninput = () => { const t = q.value.trim().toLowerCase(); let n = 0; $$('#dc-body tr', main).forEach(r => { const ok = !t || (r.dataset.q || '').includes(t); r.style.display = ok ? '' : 'none'; if (ok) n++; }); $('#dc-n', main).textContent = n + ' รายการ'; };
  $('#dc-quote', main).onclick = () => quoteForm(() => boDocs(main));
  const qOf = k => { const [hid, no] = k.split('|'), h = DB.hotel(hid); return { h, q: (h?.quotes || []).find(x => x.no === no) }; };
  $$('[data-qe]', main).forEach(b => b.onclick = () => { const x = qOf(b.dataset.qe); if (x.q) quoteForm(() => boDocs(main), x); });
  $$('[data-qd]', main).forEach(b => b.onclick = async () => {
    const { h, q } = qOf(b.dataset.qd); if (!q) return;
    if (!(await confirmBox(`ลบใบเสนอราคา <b>${esc(q.no)}</b> (${esc(q.cust.name)})? ลบแล้วกู้คืนไม่ได้ และเลขที่นี้จะไม่ถูกนำกลับมาใช้`, 'ลบใบเสนอราคา'))) return;
    const hc = JSON.parse(JSON.stringify(h)); hc.quotes = (hc.quotes || []).filter(x => x.no !== q.no);
    DB.saveHotel(hc); DB.log('docs.quote.delete', `${q.no} · ${q.cust.name}`); toast('ลบใบเสนอราคาแล้ว'); boDocs(main);
  });
  $$('[data-qp]', main).forEach(b => b.onclick = () => { const [hid, no] = b.dataset.qp.split('|'), h = DB.hotel(hid), q = (h?.quotes || []).find(x => x.no === no); if (q) printQuote(q, h); });
  $$('[data-ti]', main).forEach(b => b.onclick = () => taxInfoModal(DB.hotel(b.dataset.ti), () => boDocs(main)));
  $$('[data-dc]', main).forEach(b => b.onclick = () => docCfgModal(DB.hotel(b.dataset.dc), () => boDocs(main)));
  $$('[data-doc]', main).forEach(b => b.onclick = () => { if (typeof prMarkDoc === 'function') prMarkDoc(); issueDoc(DB.booking(b.dataset.b), b.dataset.doc, () => boDocs(main)); });
}

// ================= ใบเสนอราคา (ออกก่อนมีการจอง — ไม่ผูกกับการจอง) =================
// เก็บที่ h.quotes (ล่าสุดก่อน เก็บ 50 ใบ) · เลขที่ QT-ปี-ลำดับ รันใน h.docSeq เหมือนเอกสารอื่น · ราคาในใบกรอกเอง ไม่กระทบห้องว่าง/ยอดจอง
function quoteHtml(q, h, o = {}) {
  const cfg = docCfgOf(h), t = taxInfoOf(h), E = x => esc(x == null ? '' : String(x)), ac = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : '#1a5fd0';
  const sub = r2(q.items.reduce((s, x) => s + x.qty * x.price, 0)), svcPct = +t.svc || 0, svc = svcPct ? r2(sub * svcPct / 100) : 0, vat = t.vat ? r2((sub + svc) * 0.07) : 0, total = r2(sub + svc + vat);
  const logoSrc = resortLogo(h), logo = cfg.logo && logoSrc ? `<img src="${E(logoSrc)}" alt="" style="max-height:56px;max-width:160px;object-fit:contain;margin-bottom:6px;display:block">` : '';
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบเสนอราคา ${E(q.no)}</title><style>
    body { font: 14px/1.5 'Sarabun', 'Noto Sans Thai', Tahoma, sans-serif; color: #111; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0; color: ${ac}; } .m { color: #666; font-size: 12px; } table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #bbb; padding: 7px 9px; vertical-align: top; } th { background: ${ac}; color: #fff; text-align: left; } td.r, th.r { text-align: right; }
    .top { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 3px solid ${ac}; } .box { border: 1px solid #bbb; padding: 10px 12px; margin-top: 12px; white-space: pre-line; }
    .sig { display: flex; justify-content: space-around; margin-top: 74px; text-align: center; } .sig div { width: 40%; border-top: 1px solid #333; padding-top: 6px; }
    @media print { body { padding: 0; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    <div class="top"><div>${logo}<b style="font-size:16px">${E(t.legalName)}</b><div>${E(t.address)}</div><div class="m">${t.taxId ? `เลขประจำตัวผู้เสียภาษี ${E(t.taxId)} · ` : ''}${E(t.branch)}${t.phone ? ' · โทร ' + E(t.phone) : ''}</div>${cfg.header ? `<div class="m">${E(cfg.header)}</div>` : ''}</div>
      <div style="text-align:right"><h1>ใบเสนอราคา</h1><div class="m">Quotation</div><div style="margin-top:8px">เลขที่: <b>${E(q.no)}</b></div><div>วันที่: ${E(fmtDate(q.at.slice(0, 10), false))}</div><div>ยืนราคาถึง: <b>${E(fmtDate(q.validUntil, false))}</b></div></div></div>
    <div class="box"><b>เสนอราคาให้:</b> ${E(q.cust.name)}${q.cust.taxId ? ` · เลขประจำตัวผู้เสียภาษี ${E(q.cust.taxId)}` : ''}${q.cust.address ? `\n${E(q.cust.address)}` : ''}${q.cust.phone ? `\n<span class="m">โทร ${E(q.cust.phone)}</span>` : ''}</div>
    ${q.items.length ? `<table><thead><tr><th style="width:40px">#</th><th>รายการ</th><th class="r">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead><tbody>
      ${q.items.map((x, i) => `<tr><td>${i + 1}</td><td>${E(x.name)}</td><td class="r">${x.qty}</td><td class="r">${fmt2(x.price)}</td><td class="r">${x.qty * x.price < 0 ? '-' : ''}${fmt2(Math.abs(x.qty * x.price))}</td></tr>`).join('')}
      ${svcPct || t.vat ? `<tr><td colspan="4" class="r">รวมเป็นเงิน</td><td class="r">${fmt2(sub)}</td></tr>${svcPct ? `<tr><td colspan="4" class="r">ค่าบริการ ${svcPct}%</td><td class="r">${fmt2(svc)}</td></tr>` : ''}${t.vat ? `<tr><td colspan="4" class="r">ภาษีมูลค่าเพิ่ม 7%</td><td class="r">${fmt2(vat)}</td></tr>` : ''}` : ''}
      <tr><td colspan="4" class="r"><b>จำนวนเงินรวมทั้งสิ้น</b></td><td class="r"><b>${fmt2(total)}</b></td></tr></tbody></table>
    <div class="box">(${bahtText(total)})</div>` : ""}
    ${q.note ? `<div class="box"><b>หมายเหตุ / เงื่อนไข:</b> ${E(q.note)}</div>` : ''}${cfg.footer ? `<div class="box">${E(cfg.footer)}</div>` : ''}
    <div class="sig"><div>${E(cfg.signer || t.legalName)}<br><span class="m">ผู้เสนอราคา</span></div><div>ลูกค้า<br><span class="m">ผู้อนุมัติ / ตกลงตามใบเสนอราคา</span></div></div>
    <div class="m" style="margin-top:18px">ออกโดย ${E(q.by || '')} · ${E(fmtDateTime(q.at))} · ใบเสนอราคานี้ไม่ใช่การยืนยันการจอง ห้องว่างเป็นไปตามจริง ณ วันที่ยืนยัน</div>
    ${o.preview ? '' : '<script>addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });<\/script>'}
  </body></html>`;
}
function printQuote(q, h) {
  const w = window.open('', '_blank');
  if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาตป๊อปอัปของเว็บนี้', 'err');
  w.document.open(); w.document.write(quoteHtml(q, h)); w.document.close();
}
function quoteForm(done, ex) { // ex = { h, q } เมื่อแก้ใบเดิม (เลขที่/วันที่ออกคงเดิม)
  const hotels = ex ? [ex.h] : DB.hotels(true), eq = ex?.q, rows = eq?.items?.length ? eq.items.map(x => ({ ...x })) : [{ name: '', qty: 1, price: 0 }];
  const m = openModal(`<h2><i class="fa-solid fa-file-invoice-dollar"></i> ${eq ? 'แก้ไขใบเสนอราคา ' + esc(eq.no) : 'ออกใบเสนอราคา'}</h2>
    <form id="qt-f" class="form-grid" novalidate style="margin-top:14px">
      <div class="fg full"><label>รีสอร์ทที่ออกเอกสาร</label><select name="hid" ${eq ? 'disabled' : ''}>${hotels.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select></div>
      <div class="fg full"><label>ชื่อลูกค้า / บริษัท <span class="req">*</span></label><input name="cname" value="${esc(eq?.cust.name || '')}"></div>
      <div class="fg"><label>เบอร์โทร</label><input name="cphone" value="${esc(eq?.cust.phone || '')}"></div><div class="fg"><label>เลขผู้เสียภาษี (ถ้ามี)</label><input name="ctax" maxlength="13" inputmode="numeric" value="${esc(eq?.cust.taxId || '')}"></div>
      <div class="fg full"><label>ที่อยู่ลูกค้า (ถ้ามี)</label><textarea name="caddr" rows="2">${esc(eq?.cust.address || '')}</textarea></div>
      <div class="fg full"><label>เพิ่มห้องพักอัตโนมัติ <span class="small muted">— เลือกห้อง วันที่ และจำนวนห้อง ระบบคำนวณจำนวนคืนให้ (แก้ราคาได้)</span></label>
        <div class="row wrap" style="gap:6px"><select name="room" style="flex:2;min-width:160px"></select><input name="ci" type="date" title="เช็คอิน"><input name="co" type="date" title="เช็คเอาต์"><input name="rq" type="number" min="1" value="1" style="width:70px" title="จำนวนห้อง"><button type="button" class="btn btn-outline btn-sm" id="qt-room"><i class="fa-solid fa-plus"></i> เพิ่ม</button></div></div>
      <div class="fg full"><label>รายการ <span class="small muted">(ไม่บังคับ)</span></label><div id="qt-rows"></div><button type="button" class="btn btn-outline btn-sm" id="qt-add"><i class="fa-solid fa-plus"></i> เพิ่มรายการ</button></div>
      <div class="fg"><label>${eq ? 'ยืนราคาถึงวันที่' : 'ยืนราคา (วัน)'}</label>${eq ? `<input name="until" type="date" value="${esc(eq.validUntil)}">` : '<input name="days" type="number" min="1" max="365" value="7">'}</div>
      <div class="fg full"><label>หมายเหตุ / เงื่อนไข</label><textarea name="note" rows="2" maxlength="500" placeholder="เช่น มัดจำ 30% เพื่อยืนยันการจอง">${esc(eq?.note || '')}</textarea></div>
    </form>
    <div class="row" style="justify-content:flex-end;gap:10px;margin-top:8px;position:sticky;bottom:0;background:var(--card,#fff);padding:10px 0"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="qt-go">${eq ? 'บันทึกการแก้ไข' : 'ออกใบเสนอราคา'}</button></div>`);
  const f = $('#qt-f', m).elements, hotel = () => DB.hotel(f.hid.value);
  const fillRooms = () => { f.room.innerHTML = (hotel()?.rooms || []).map(r => `<option value="${r.id}">${esc(r.name)} · ${money(r.price)}/คืน</option>`).join(''); };
  const readRows = () => $$('[data-r]', m).forEach(el => { const r = rows[+el.dataset.r]; r.name = $('[data-f=name]', el).value; r.qty = +$('[data-f=qty]', el).value || 1; r.price = +$('[data-f=price]', el).value || 0; });
  const drawRows = () => { $('#qt-rows', m).innerHTML = rows.map((r, i) => `<div class="row" data-r="${i}" style="gap:6px;margin-bottom:6px"><input data-f="name" value="${esc(r.name)}" placeholder="รายการ" style="flex:2"><input data-f="qty" type="number" min="1" value="${r.qty}" style="width:70px" title="จำนวน"><input data-f="price" type="number" step="0.01" value="${r.price}" style="width:100px" title="ราคา/หน่วย"><button type="button" class="btn btn-ghost btn-sm red" data-rd="${i}" aria-label="ลบ"><i class="fa-solid fa-trash"></i></button></div>`).join('');
    $$('[data-rd]', m).forEach(x => x.onclick = () => { readRows(); rows.splice(+x.dataset.rd, 1); if (!rows.length) rows.push({ name: '', qty: 1, price: 0 }); drawRows(); }); };
  f.hid.onchange = fillRooms; fillRooms(); drawRows(); if (eq) f.hid.value = ex.h.id;
  $('#qt-add', m).onclick = () => { readRows(); rows.push({ name: '', qty: 1, price: 0 }); drawRows(); };
  let roomSig = ''; // ห้อง/วันที่/จำนวนที่เพิ่มเข้ารายการไปแล้ว — กันเพิ่มซ้ำตอนกดออกใบ
  const roomPick = () => [f.hid.value, f.room.value, f.ci.value, f.co.value, f.rq.value].join('|');
  const addRoom = () => {
    const r = hotel()?.rooms.find(x => x.id === f.room.value), n = Math.round((new Date(f.co.value) - new Date(f.ci.value)) / 864e5), q = Math.max(1, Math.round(+f.rq.value) || 1);
    if (!r || !f.ci.value || !f.co.value || !(n > 0)) { toast('เลือกห้อง และวันเช็คอิน/เช็คเอาต์ให้ถูกต้อง', 'err'); return false; }
    readRows(); const row = { name: `ห้องพัก ${r.name} (${fmtDate(f.ci.value, false)} – ${fmtDate(f.co.value, false)} · ${q} ห้อง × ${n} คืน)`, qty: q * n, price: r.price };
    if (rows.length === 1 && !rows[0].name.trim() && !rows[0].price) rows[0] = row; else rows.push(row);
    drawRows(); roomSig = roomPick(); return true;
  };
  $('#qt-room', m).onclick = addRoom;
  $('#qt-go', m).onclick = () => {
    readRows(); const v = k => f[k].value.trim(), h = hotel(), t = taxInfoOf(h);
    if (!v('cname')) return toast('กรุณากรอกชื่อลูกค้า', 'err');
    // เลือกห้อง+วันที่ไว้แต่ยังไม่ได้กด "เพิ่ม" → ใส่เข้ารายการให้อัตโนมัติ
    if ((f.ci.value || f.co.value) && roomPick() !== roomSig) { if (!addRoom()) return; }
    if (v('ctax') && !/^\d{13}$/.test(v('ctax'))) return toast('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก', 'err');
    if (!t.address.trim()) return toast('กรุณากรอกที่อยู่ใน “ข้อมูลผู้ออก” ของรีสอร์ทนี้ก่อน', 'err');
    const items = rows.filter(r => r.name.trim() && r.price).map(r => ({ name: r.name.trim().slice(0, 160), qty: Math.max(1, Math.round(r.qty)), price: r2(r.price) }));
    const hc = JSON.parse(JSON.stringify(h)), yr = new Date().getFullYear(), key = 'QT' + yr, days = f.days ? Math.min(365, Math.max(1, Math.round(+v('days')) || 7)) : 7;
    const cust = { name: v('cname'), phone: v('cphone'), taxId: v('ctax'), address: v('caddr') };
    if (eq) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v('until'))) return toast('กรุณาเลือกวันที่ยืนราคา', 'err');
      const q = { ...eq, items, note: v('note'), cust, validUntil: v('until'), editedAt: new Date().toISOString(), editedBy: DB.currentUser()?.name || '' };
      hc.quotes = (hc.quotes || []).map(x => x.no === eq.no ? q : x);
      DB.saveHotel(hc); DB.log('docs.quote.edit', `${q.no} · ${q.cust.name}`);
      closeModal(); toast('บันทึกการแก้ไขแล้ว'); done?.(); return;
    }
    hc.docSeq = { ...(hc.docSeq || {}) }; hc.docSeq[key] = (hc.docSeq[key] || 0) + 1;
    const until = new Date(); until.setDate(until.getDate() + days);
    const q = { no: `QT-${yr}-${String(hc.docSeq[key]).padStart(4, '0')}`, at: new Date().toISOString(), by: DB.currentUser()?.name || '', validUntil: isoOf(until), items, note: v('note'), cust };
    hc.quotes = [q, ...(hc.quotes || [])].slice(0, 50);
    DB.saveHotel(hc); DB.log('docs.quote', `${q.no} · ${q.cust.name}`);
    closeModal(); printQuote(q, DB.hotel(h.id)); done?.();
  };
}

function taxInfoModal(h, done) {
  const t = taxInfoOf(h);
  const m = openModal(`<h2><i class="fa-solid fa-building"></i> ข้อมูลผู้ออกเอกสาร <span class="small muted">· ${esc(h.name)}</span></h2>
    <form id="ti-f" class="form-grid" novalidate style="margin-top:14px">
      <div class="fg full"><label>ชื่อผู้ออกเอกสาร <span class="small muted">— ค่าเริ่มต้นคือชื่อรีสอร์ท แก้เป็นชื่อนิติบุคคลได้ถ้าต้องการ</span></label><input name="legalName" value="${esc(t.legalName)}" placeholder="${esc(h.name)}"></div>
      <div class="fg"><label>เลขประจำตัวผู้เสียภาษี (13 หลัก)</label><input name="taxId" value="${esc(t.taxId)}" maxlength="13" inputmode="numeric"></div>
      <div class="fg"><label>สาขา</label><input name="branch" value="${esc(t.branch)}" placeholder="สำนักงานใหญ่ หรือ สาขา 00001"></div>
      <div class="fg full"><label>ที่อยู่ <span class="req">*</span></label><textarea name="address" rows="2">${esc(t.address || h.address || '')}</textarea></div>
      <div class="fg"><label>เบอร์โทร</label><input name="phone" value="${esc(t.phone)}"></div>
      <div class="fg"><label>ค่าบริการ Service Charge (%)</label><input name="svc" type="number" min="0" max="30" step="0.5" value="${+t.svc || 0}"><div class="small muted" style="margin-top:4px">0 = ไม่เก็บ · ที่เก็บทั่วไป 10% · ราคาที่ลูกค้าจ่ายถือเป็นราคารวมแล้ว ระบบแยกให้ในเอกสาร โดยคิด VAT ซ้อนบนยอดรวมค่าบริการ</div></div>
      <div class="fg full"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" name="vat" ${t.vat ? 'checked' : ''}> จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)</label>
        <div class="small muted" style="margin-top:4px">ราคาที่ลูกค้าจ่ายถือเป็นราคารวม VAT แล้ว · เอกสารประเภทที่ตั้งให้ “แยก VAT” จะออกได้เมื่อติ๊กข้อนี้</div></div>
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close><i class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button><button class="btn btn-primary" id="ti-save">บันทึก</button></div>`);
  $('#ti-save', m).onclick = () => {
    const f = $('#ti-f', m).elements, v = k => f[k].value.trim();
    if (!v('address')) return toast('กรุณากรอกที่อยู่', 'err');
    if (v('taxId') && !/^\d{13}$/.test(v('taxId'))) return toast('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก', 'err');
    if (f.vat.checked && !v('taxId')) return toast('รีสอร์ทที่จด VAT ต้องกรอกเลขผู้เสียภาษี', 'err');
    const c = JSON.parse(JSON.stringify(DB.hotel(h.id)));
    c.taxInfo = { legalName: v('legalName') || h.name, taxId: v('taxId'), branch: v('branch') || 'สำนักงานใหญ่', address: v('address'), phone: v('phone'), svc: Math.max(0, Math.min(30, +v('svc') || 0)), vat: f.vat.checked };
    DB.saveHotel(c); DB.log('docs.taxinfo', c.name); closeModal(); toast('บันทึกข้อมูลผู้ออกเอกสารแล้ว'); done?.();
  };
}

// ปรับแต่งเอกสาร: เพิ่ม/ลบ/แก้ประเภทเอกสารเอง + หน้าตาโดยรวม (สี โลโก้ ข้อความหัว/ท้าย)
function docCfgModal(h, done) {
  const cfg = docCfgOf(h), types = JSON.parse(JSON.stringify(cfg.types));
  const logoUrl = resortLogo(h); let sigUrl = cfg.sigUrl || ''; // โลโก้เดียวกับของรีสอร์ท (หน้าเว็บ · ใบทะเบียน · เอกสาร)
  const m = openModal(`<h2><i class="fa-solid fa-sliders"></i> ปรับแต่งเอกสาร <span class="small muted">· ${esc(h.name)}</span></h2>
    <p class="small muted" style="margin:4px 0 12px">สร้างประเภทเอกสารของคุณเอง (เช่น ใบมัดจำ ใบเสนอราคา ใบรับเงินสด) เปลี่ยนชื่อ ลบ หรือเพิ่มได้อิสระ — มีผลกับรีสอร์ทนี้เท่านั้น</p>
    <div class="card" style="padding:10px;margin:0 0 12px"><div class="row between wrap" style="gap:8px"><b><i class="fa-solid fa-eye"></i> ตัวอย่างเอกสาร <span class="small muted">· อัปเดตทันทีที่แก้ (ข้อมูลตัวอย่าง ไม่ใช่การจองจริง)</span></b><select id="dcg-pt" style="max-width:240px"></select></div>
      <iframe id="dcg-pv" title="ตัวอย่างเอกสาร" style="width:100%;height:520px;border:1px solid var(--border,#ddd);border-radius:8px;background:#fff;margin-top:8px"></iframe></div>
    <div id="dcg-list"></div>
    <div class="row wrap" style="gap:8px;margin:10px 0"><button type="button" class="btn btn-primary btn-sm" id="dcg-add"><i class="fa-solid fa-plus"></i> เพิ่มประเภทเอกสาร</button><button type="button" class="btn btn-ghost btn-sm" id="dcg-reset"><i class="fa-solid fa-rotate-left"></i> คืนค่าเริ่มต้น (3 ประเภท)</button></div>
    <form id="dcg-f" class="form-grid" novalidate style="margin-top:10px">
      <div class="fg"><label>สีหลักของเอกสาร</label><input name="accent" type="color" value="${esc(cfg.accent)}" style="height:42px"></div>
      <div class="fg full"><label class="row" style="gap:8px"><input type="checkbox" name="logo" ${cfg.logo ? 'checked' : ''}> แสดงโลโก้บนหัวเอกสาร</label>
        <div class="row" style="gap:12px;align-items:center;margin-top:6px"><span id="dcg-logo-prev" style="display:inline-flex;align-items:center;justify-content:center;width:120px;height:64px;border:1px dashed var(--border,#ccd);border-radius:8px;overflow:hidden"></span>
          <a class="btn btn-outline btn-sm" href="#/admin/payout" id="dcg-logo-go"><i class="fa-solid fa-image"></i> เปลี่ยนโลโก้</a></div>
        <div class="small muted" style="margin-top:4px">ใช้โลโก้รีสอร์ทอันเดียวกับทั้งระบบ — เปลี่ยนที่ “บัญชีรับเงิน › ข้อมูลรีสอร์ท” ครั้งเดียว เปลี่ยนทั้งเมนู หน้าเว็บ ใบทะเบียน และหัวเอกสาร</div></div>
      <div class="fg full"><label><i class="fa-solid fa-signature"></i> ลายเซ็นผู้มีอำนาจลงนาม <span class="small muted">— แสดงเหนือเส้นลายเซ็นด้านซ้ายของทุกเอกสาร</span></label>
        <div class="row" style="gap:12px;align-items:center;margin-top:6px"><span id="dcg-sig-prev" style="display:inline-flex;align-items:center;justify-content:center;width:160px;height:64px;border:1px dashed var(--border,#ccd);border-radius:8px;overflow:hidden;background:#fff"></span>
          <button type="button" class="btn btn-outline btn-sm" id="dcg-sig-up"><i class="fa-solid fa-camera"></i> อัปโหลดลายเซ็น</button><button type="button" class="btn btn-ghost btn-sm" id="dcg-sig-rm"><i class="fa-solid fa-trash"></i> ลบ</button></div>
        <div class="small muted" style="margin-top:4px">แนะนำรูปลายเซ็นพื้นหลังขาวหรือโปร่งใส (PNG) · ถ่ายหรือสแกนลายเซ็นบนกระดาษขาว</div></div>
      <div class="fg full"><label>ชื่อผู้ลงนาม / ตำแหน่ง (พิมพ์ใต้เส้นลายเซ็น)</label><input name="signer" value="${esc(cfg.signer || '')}" maxlength="120" placeholder="เช่น (นายสมชาย ใจดี) เจ้าของกิจการ"></div>
      <div class="fg full"><label>ข้อความใต้หัวเอกสาร (ทุกประเภท)</label><input name="header" value="${esc(cfg.header)}" maxlength="200" placeholder="เช่น โทร 081-xxx-xxxx · LINE @resort"></div>
      <div class="fg full"><label>ข้อความท้ายเอกสาร (ทุกประเภท)</label><textarea name="footer" rows="2" maxlength="500" placeholder="เช่น บัญชีโอน ธนาคาร... เลขที่... / ขอบคุณที่ใช้บริการ">${esc(cfg.footer)}</textarea></div>
    </form>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close><i class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button><button class="btn btn-primary" id="dcg-save">บันทึก</button></div>`, 'wide');
  const fld = (i, k, label, ph = '', attrs = '') => `<div class="fg"><label class="small">${label}</label><input data-k="${k}" value="${esc(types[i][k] || '')}" placeholder="${esc(ph)}" ${attrs}></div>`;
  const chk = (i, k, label) => `<label class="row small" style="gap:6px"><input type="checkbox" data-k="${k}" ${types[i][k] ? 'checked' : ''}> ${label}</label>`;
  let draw = () => {
    $('#dcg-list', m).innerHTML = types.map((d, i) => `<div class="card" data-i="${i}" style="margin:0 0 10px;padding:12px"><div class="row between"><b>${esc(d.th || 'ประเภทใหม่')}</b><button type="button" class="btn btn-sm btn-danger" data-del="${i}" title="ลบประเภทนี้"><i class="fa-solid fa-trash"></i></button></div>
      <div class="form-grid" style="margin-top:8px">${fld(i, 'th', 'ชื่อเอกสาร (ไทย) *')}${fld(i, 'en', 'ชื่อเอกสาร (อังกฤษ)', 'Invoice')}${fld(i, 'code', 'คำนำหน้าเลขที่ (A-Z 0-9)', 'INV', 'maxlength="6"')}
        ${fld(i, 'sigL', 'ป้ายลายเซ็นซ้าย', 'ผู้มีอำนาจลงนาม')}${fld(i, 'sigR', 'ป้ายลายเซ็นขวา', 'ผู้รับเอกสาร')}
        <div class="fg full"><label class="small">หมายเหตุในเอกสาร (ค่าเริ่มต้น — แก้เป็นรายใบได้ตอนออกเอกสาร)</label><textarea data-k="defNote" rows="2" maxlength="500" placeholder="เช่น ชำระเงินภายใน 3 วันหลังได้รับใบแจ้งหนี้">${esc(d.defNote || '')}</textarea></div>
        <div class="fg full"><label class="small">ข้อความท้ายเฉพาะเอกสารนี้ (เช่น เงื่อนไข การคืนมัดจำ)</label><textarea data-k="note" rows="2" maxlength="500">${esc(d.note || '')}</textarea></div></div>
      <div class="row wrap" style="gap:14px;margin-top:6px">${chk(i, 'vat', 'แยกยอดก่อนภาษี + VAT 7% (ต้องจด VAT)')}${chk(i, 'needPaid', 'ออกได้เมื่อชำระเงินแล้วเท่านั้น')}${chk(i, 'buyer', 'ถามข้อมูลผู้ซื้อ (ชื่อ/เลขภาษี/ที่อยู่)')}${chk(i, 'discLines', 'แสดงส่วนลดแยกบรรทัด')}</div></div>`).join('') || '<p class="muted small">ยังไม่มีประเภทเอกสาร — กด “เพิ่มประเภทเอกสาร”</p>';
    $$('[data-del]', m).forEach(b => b.onclick = () => { read(); types.splice(+b.dataset.del, 1); draw(); });
  };
  const read = () => $$('[data-i]', m).forEach(el => { const d = types[+el.dataset.i]; $$('[data-k]', el).forEach(i => { d[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; }); });
  // ตัวอย่างสด: ใช้ค่าที่กรอกอยู่ (ยังไม่ต้องกดบันทึก) กับการจองสมมุติ
  const preview = () => {
    read();
    const sel = $('#dcg-pt', m), keep = sel.value;
    sel.innerHTML = types.map(d => `<option value="${esc(d.id)}">${esc(d.th || 'ประเภทใหม่')}</option>`).join('');
    if (types.some(d => d.id === keep)) sel.value = keep;
    const d = types.find(x => x.id === sel.value), fr = $('#dcg-pv', m);
    if (!d) { fr.srcdoc = '<p style="font:14px sans-serif;padding:20px;color:#666">ยังไม่มีประเภทเอกสาร — กด “เพิ่มประเภทเอกสาร”</p>'; return; }
    const f = $('#dcg-f', m).elements, t0 = taxInfoOf(h), today = todayISO(), now = new Date().toISOString();
    const t = { ...t0, address: t0.address || '(ที่อยู่ — ตั้งที่ “ข้อมูลผู้ออก”)' };
    const b = { id: 'SD-SAMPLE', hotelName: h.name, roomName: 'ห้องตัวอย่าง', qty: 1, nights: 2, checkIn: today, checkOut: addDays(today, 2), guest: { firstName: 'สมชาย', lastName: 'ใจดี', email: 'sample@example.com', phone: '081-234-5678' },
      price: { orig: 3000, room: 2700, member: 0, coupon: 0, couponCode: '', tax: 0, total: 2700 }, payment: { method: 'promptpay', paid: true } };
    const doc = { no: `${(d.code || 'DOC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'DOC'}-${new Date().getFullYear()}-0001`, at: now, by: 'ตัวอย่าง', extra: [{ name: 'ค่าอาหารเช้า (ตัวอย่าง)', qty: 2, price: 150 }], note: d.defNote || '',
      ...(d.buyer ? { buyer: { name: 'บริษัท ตัวอย่าง จำกัด', taxId: '0105500000000', branch: 'สำนักงานใหญ่', address: '99 ถนนตัวอย่าง กรุงเทพฯ 10110' } } : {}) };
    // โหลดตัวอย่างใหม่แล้วเบราว์เซอร์อาจดึงโฟกัสไปที่กรอบตัวอย่าง ทำให้พิมพ์ต่อไม่ได้ — จำช่องที่กำลังพิมพ์และคืนโฟกัส/ตำแหน่งเคอร์เซอร์ให้
    const ae = document.activeElement, ss = ae?.selectionStart, se = ae?.selectionEnd, typing = ae && ae !== fr && m.contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName);
    fr.onload = () => { if (!typing) return; ae.focus({ preventScroll: true }); try { if (ss != null) ae.setSelectionRange(ss, se); } catch { /* ช่องชนิดที่ไม่มีเคอร์เซอร์ */ } };
    fr.srcdoc = docHtml(b, d.id, h, { preview: true, tax: t, doc, logoUrl, cfg: { types, sigUrl, signer: f.signer.value.trim(), accent: f.accent.value || '#1a5fd0', logo: f.logo.checked, header: f.header.value.trim(), footer: f.footer.value.trim() } });
  };
  const drawLogo = () => { const src = logoUrl; $('#dcg-logo-prev', m).innerHTML = src ? `<img src="${esc(src)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">` : '<span class="small muted">ยังไม่มีโลโก้</span>'; };
  $('#dcg-logo-go', m).onclick = () => closeModal();
  const drawSig = () => { $('#dcg-sig-prev', m).innerHTML = sigUrl ? `<img src="${esc(sigUrl)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">` : '<span class="small muted">ยังไม่มีลายเซ็น</span>'; $('#dcg-sig-rm', m).style.display = sigUrl ? '' : 'none'; };
  $('#dcg-sig-up', m).onclick = async () => {
    try { toast('เลือกรูปลายเซ็นจากเครื่อง...', 'info'); const url = await pickAndUploadImage(600); if (!url) return; sigUrl = url; drawSig(); pvSoon(); toast('อัปโหลดลายเซ็นแล้ว — กด “บันทึก” เพื่อใช้งาน'); }
    catch (e) { toast('อัปโหลดลายเซ็นไม่สำเร็จ: ' + e.message, 'err'); }
  };
  $('#dcg-sig-rm', m).onclick = () => { sigUrl = ''; drawSig(); pvSoon(); };
  let pvT; const pvSoon = () => { clearTimeout(pvT); pvT = setTimeout(preview, 500); };
  m.addEventListener('input', pvSoon); m.addEventListener('change', pvSoon);
  const draw0 = draw; draw = () => { draw0(); pvSoon(); };
  drawLogo(); drawSig(); draw();
  $('#dcg-add', m).onclick = () => { read(); types.push({ id: 'c' + Date.now().toString(36), th: '', en: '', code: 'DOC', vat: false, needPaid: false, buyer: false, discLines: true, sigL: 'ผู้มีอำนาจลงนาม', sigR: 'ผู้รับเอกสาร', note: '', defNote: '' }); draw(); $$('[data-i]', m).at(-1)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $('#dcg-reset', m).onclick = async () => { if (!(await confirmBox('คืนค่าเริ่มต้นเป็น ใบแจ้งหนี้ / ใบเสร็จรับเงิน / ใบกำกับภาษี? (เอกสารที่ออกไปแล้วไม่เปลี่ยน)', 'คืนค่า'))) return; types.splice(0, types.length, ...DOC_DEFAULT_TYPES()); draw(); };
  $('#dcg-save', m).onclick = () => {
    read();
    if (types.some(d => !d.th.trim())) return toast('กรุณาตั้งชื่อเอกสารไทยให้ครบทุกประเภท', 'err');
    types.forEach(d => { d.th = d.th.trim(); d.en = (d.en || '').trim(); d.code = (d.code || 'DOC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'DOC'; });
    const f = $('#dcg-f', m).elements, c = JSON.parse(JSON.stringify(DB.hotel(h.id)));
    c.docCfg = { types, sigUrl: sigUrl || undefined, signer: f.signer.value.trim(), accent: f.accent.value || '#1a5fd0', logo: f.logo.checked, header: f.header.value.trim(), footer: f.footer.value.trim() };
    DB.saveHotel(c); DB.log('docs.config', c.name); closeModal(); toast('บันทึกการปรับแต่งเอกสารแล้ว'); done?.();
  };
}

// ออกเอกสาร: เคยออกแล้ว = พิมพ์ซ้ำเลขเดิม · ยังไม่เคย = เปิดหน้าต่างกรอกผู้ซื้อ (ถ้าประเภทนี้ต้องการ) + รายการเพิ่มเอง + หมายเหตุ แล้วออกเลขที่
function issueDoc(b, typeId, done) {
  const h = DB.hotel(b.hotelId), t = taxInfoOf(h), d = docCfgOf(h).types.find(x => x.id === typeId);
  if (!d) return toast('ไม่พบประเภทเอกสารนี้', 'err');
  if (b.docs?.[typeId]) { printDoc(b, typeId, h); return; }
  if (!t.address.trim()) return toast('กรุณากรอกที่อยู่ใน “ข้อมูลผู้ออก” ของรีสอร์ทนี้ก่อน', 'err');
  if (d.vat && (!t.vat || !t.taxId)) return toast('เอกสารประเภทนี้แยก VAT — ต้องติ๊ก “จดทะเบียน VAT” และกรอกเลขผู้เสียภาษีที่ “ข้อมูลผู้ออกเอกสาร” ก่อน', 'err');
  if (d.needPaid && !b.payment.paid) return toast('เอกสารประเภทนี้ออกได้เมื่อรับชำระเงินแล้ว — ยืนยันการชำระเงินของการจองนี้ก่อน', 'err');
  const g = b.guest, rows = [];
  const m = openModal(`<h2><i class="fa-solid fa-file-lines"></i> ออก${esc(d.th)} <span class="small muted">· ${esc(b.id)}</span></h2>
    <form id="is-f" class="form-grid" novalidate style="margin-top:14px">
      ${d.buyer ? `<div class="fg full"><label>ชื่อผู้ซื้อ / บริษัท <span class="req">*</span></label><input name="bname" value="${esc(`${g.firstName} ${g.lastName}`)}"></div>
      <div class="fg"><label>เลขประจำตัวผู้เสียภาษี (ถ้ามี)</label><input name="btax" maxlength="13" inputmode="numeric"></div><div class="fg"><label>สาขา (ถ้ามี)</label><input name="bbranch"></div>
      <div class="fg full"><label>ที่อยู่ผู้ซื้อ <span class="req">*</span></label><textarea name="baddr" rows="2"></textarea></div>` : ''}
      <div class="fg full"><label>รายการเพิ่มเติม (ไม่บังคับ) <span class="small muted">— เช่น ค่าอาหาร ค่าเตียงเสริม ค่ามัดจำ · ใส่ราคาติดลบเพื่อเป็นส่วนลด</span></label><div id="is-rows"></div>
        <button type="button" class="btn btn-outline btn-sm" id="is-add"><i class="fa-solid fa-plus"></i> เพิ่มรายการ</button></div>
      <div class="fg full"><label>หมายเหตุในเอกสาร (ไม่บังคับ)</label><textarea name="note" rows="2" maxlength="500">${esc(d.defNote || '')}</textarea></div>
    </form>
    <div class="small muted" style="margin-top:8px">เมื่อออกแล้วจะได้เลขที่เอกสารทันที และแก้ไขไม่ได้ (พิมพ์ซ้ำได้) · ยอดเดิมของการจอง ${money(b.price.total)}</div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close><i class="fa-solid fa-arrow-left"></i> ย้อนกลับ</button><button class="btn btn-primary" id="is-go">ออก${esc(d.th)}</button></div>`);
  const drawRows = () => { $('#is-rows', m).innerHTML = rows.map((r, i) => `<div class="row" data-r="${i}" style="gap:6px;margin-bottom:6px"><input data-f="name" value="${esc(r.name)}" placeholder="รายการ" style="flex:2"><input data-f="qty" type="number" min="1" value="${r.qty}" style="width:70px" title="จำนวน"><input data-f="price" type="number" step="0.01" value="${r.price}" style="width:110px" title="ราคา/หน่วย"><button type="button" class="btn btn-sm btn-danger" data-rd="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('');
    $$('[data-rd]', m).forEach(x => x.onclick = () => { readRows(); rows.splice(+x.dataset.rd, 1); drawRows(); }); };
  const readRows = () => $$('[data-r]', m).forEach(el => { const r = rows[+el.dataset.r]; r.name = $('[data-f=name]', el).value; r.qty = +$('[data-f=qty]', el).value || 1; r.price = +$('[data-f=price]', el).value || 0; });
  $('#is-add', m).onclick = () => { readRows(); rows.push({ name: '', qty: 1, price: 0 }); drawRows(); };
  $('#is-go', m).onclick = () => {
    readRows(); const f = $('#is-f', m).elements, v = k => f[k]?.value.trim() || '';
    if (d.buyer && (!v('bname') || !v('baddr'))) return toast('กรุณากรอกชื่อและที่อยู่ผู้ซื้อ', 'err');
    if (v('btax') && !/^\d{13}$/.test(v('btax'))) return toast('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก', 'err');
    const extra = rows.filter(r => r.name.trim() && r.price).map(r => ({ name: r.name.trim().slice(0, 120), qty: Math.max(1, Math.round(r.qty)), price: r2(r.price) }));
    const hc = JSON.parse(JSON.stringify(DB.hotel(h.id))), yr = new Date().getFullYear(), key = d.code + yr;
    hc.docSeq = { ...(hc.docSeq || {}) }; hc.docSeq[key] = (hc.docSeq[key] || 0) + 1;
    const doc = { no: `${d.code}-${yr}-${String(hc.docSeq[key]).padStart(4, '0')}`, at: new Date().toISOString(), by: DB.currentUser()?.name || '', extra, note: v('note'),
      ...(d.buyer ? { buyer: { name: v('bname'), taxId: v('btax'), branch: v('bbranch'), address: v('baddr') } } : {}) };
    DB.saveHotel(hc); DB.updateBooking(b.id, { docs: { ...(b.docs || {}), [typeId]: doc } }); DB.log('docs.issue', `${doc.no} · ${b.id}`);
    closeModal(); printDoc(DB.booking(b.id), typeId, DB.hotel(h.id)); done?.();
  };
}

// สร้าง HTML ของเอกสาร — ใช้ทั้งตอนพิมพ์จริง และตัวอย่างในหน้า “ปรับแต่งเอกสาร” (o.preview = ไม่มีแถบพิมพ์/ไม่สั่งพิมพ์อัตโนมัติ)
function docHtml(b, typeId, h, o = {}) {
  const cfg = o.cfg || docCfgOf(h), d = cfg.types.find(x => x.id === typeId), t = o.tax || taxInfoOf(h), doc = o.doc || b.docs[typeId], P = b.price, E = x => esc(x == null ? '' : String(x));
  const buyer = doc.buyer || { name: `${b.guest.firstName} ${b.guest.lastName}`, address: '' }, ac = /^#[0-9a-f]{6}$/i.test(cfg.accent) ? cfg.accent : '#1a5fd0';
  const paid = b.payment.paid, extras = doc.extra || [], extraSum = r2(extras.reduce((s, x) => s + x.qty * x.price, 0)), folio = b.folio || [], folioTotal = r2(folio.reduce((s, x) => s + x.qty * x.price, 0)), total = r2(P.total + extraSum + folioTotal);
  // Service Charge + VAT คิดซ้อน: ราคารวม = ฐาน × (1 + SC%) × 1.07 → แยกฐาน / ค่าบริการ / VAT ให้ผลรวมเท่ายอดจริงเป๊ะ
  const svcPct = +t.svc || 0, k = (1 + svcPct / 100) * (d.vat ? 1.07 : 1), base = r2(total / k), svc = svcPct ? r2(base * svcPct / 100) : 0, vat = d.vat ? r2(total - base - svc) : 0;
  const nights = b.nights * b.qty, items = [[`ค่าห้องพัก ${E(b.roomName)} — ${E(b.hotelName)}<br><span class="m">${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)} · ${b.qty} ห้อง × ${b.nights} คืน</span>`, nights, P.orig / (nights || 1), P.orig]];
  if (d.discLines) {
    const disc = r2(P.orig - P.room); if (disc > 0) items.push(['ส่วนลดโปรโมชัน', '', '', -disc]);
    if (P.member) items.push(['ส่วนลดสมาชิก', '', '', -P.member]); if (P.coupon) items.push([`โค้ดส่วนลด ${E(P.couponCode)}`, '', '', -P.coupon]);
  } else { items[0][2] = P.room / (nights || 1); items[0][3] = P.room - (P.member || 0) - (P.coupon || 0); }
  if (P.tax) items.push(['ภาษีและค่าธรรมเนียม', '', '', P.tax]);
  folio.forEach(x => items.push([E(x.name), x.qty, x.price, x.qty * x.price]));
  extras.forEach(x => items.push([E(x.name), x.qty, x.price, x.qty * x.price]));
  const logoSrc = o.logoUrl !== undefined ? o.logoUrl : resortLogo(h), logo = cfg.logo && logoSrc ? `<img src="${E(logoSrc)}" alt="" style="max-height:56px;max-width:160px;object-fit:contain;margin-bottom:6px;display:block">` : '';
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${E(d.th)} ${E(doc.no)}</title><style>
    body { font: 14px/1.5 'Sarabun', 'Noto Sans Thai', Tahoma, sans-serif; color: #111; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 22px; margin: 0; color: ${ac}; } .m { color: #666; font-size: 12px; } table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #bbb; padding: 7px 9px; vertical-align: top; } th { background: ${ac}; color: #fff; text-align: left; } td.r, th.r { text-align: right; }
    .top { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 3px solid ${ac}; } .box { border: 1px solid #bbb; padding: 10px 12px; margin-top: 12px; white-space: pre-line; }
    .sig { display: flex; justify-content: space-around; margin-top: 74px; text-align: center; } .sig div { width: 40%; border-top: 1px solid #333; padding-top: 6px; }
    .noprint { margin-bottom: 14px; padding: 10px; background: #eef4ff; border-radius: 8px; } .noprint button { font: inherit; font-weight: 700; padding: 8px 16px; border: 0; border-radius: 8px; background: #1a5fd0; color: #fff; cursor: pointer; margin-left: 10px; }
    @media print { .noprint { display: none; } body { padding: 0; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    ${o.preview ? '' : '<div class="noprint">เลือก <b>พิมพ์</b> หรือเลือกปลายทางเป็น <b>บันทึกเป็น PDF</b> ในหน้าต่างพิมพ์ <button onclick="window.print()">พิมพ์ / บันทึก PDF</button></div>'}
    <div class="top"><div>${logo}<b style="font-size:16px">${E(t.legalName)}</b><div>${E(t.address)}</div><div class="m">${t.taxId ? `เลขประจำตัวผู้เสียภาษี ${E(t.taxId)} · ` : ''}${E(t.branch)}${t.phone ? ' · โทร ' + E(t.phone) : ''}</div>${cfg.header ? `<div class="m">${E(cfg.header)}</div>` : ''}</div>
      <div style="text-align:right"><h1>${E(d.th)}</h1>${d.en ? `<div class="m">${E(d.en)}</div>` : ''}<div style="margin-top:8px">เลขที่: <b>${E(doc.no)}</b></div><div>วันที่: ${E(fmtDate(doc.at.slice(0, 10), false))}</div><div class="m">อ้างอิงการจอง ${E(b.id)}</div></div></div>
    <div class="box"><b>${d.buyer ? 'ผู้ซื้อ' : 'ลูกค้า'}:</b> ${E(buyer.name)}${buyer.taxId ? ` · เลขประจำตัวผู้เสียภาษี ${E(buyer.taxId)}${buyer.branch ? ' (' + E(buyer.branch) + ')' : ''}` : ''}${buyer.address ? `\n${E(buyer.address)}` : ''}${!d.buyer ? `\n<span class="m">${E(b.guest.email)} · ${E(b.guest.phone)}</span>` : ''}</div>
    <table><thead><tr><th style="width:40px">#</th><th>รายการ</th><th class="r">จำนวน</th><th class="r">ราคา/หน่วย</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead><tbody>
      ${items.map((it, i) => `<tr><td>${i + 1}</td><td>${it[0]}</td><td class="r">${it[1]}</td><td class="r">${it[2] === '' ? '' : fmt2(it[2])}</td><td class="r">${it[3] < 0 ? '-' : ''}${fmt2(Math.abs(it[3]))}</td></tr>`).join('')}
      ${d.vat || svcPct ? `<tr><td colspan="4" class="r">มูลค่าก่อน${svcPct ? 'ค่าบริการและ' : ''}${d.vat ? 'ภาษีมูลค่าเพิ่ม' : ''}</td><td class="r">${fmt2(base)}</td></tr>${svcPct ? `<tr><td colspan="4" class="r">ค่าบริการ ${svcPct}%</td><td class="r">${fmt2(svc)}</td></tr>` : ''}${d.vat ? `<tr><td colspan="4" class="r">ภาษีมูลค่าเพิ่ม 7%</td><td class="r">${fmt2(vat)}</td></tr>` : ''}` : ''}
      <tr><td colspan="4" class="r"><b>จำนวนเงินรวมทั้งสิ้น</b></td><td class="r"><b>${fmt2(total)}</b></td></tr></tbody></table>
    <div class="box">(${bahtText(total)})</div>
    <div class="box">วิธีชำระ: ${E(PAY_TH[b.payment.method] || '')} · ${paid ? 'ชำระเงินแล้ว' : 'ยังไม่ได้รับชำระ'}${!t.vat ? '\n<span class="m">ผู้ประกอบการไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม</span>' : ''}</div>
    ${doc.note ? `<div class="box"><b>หมายเหตุ:</b> ${E(doc.note)}</div>` : ''}${d.note ? `<div class="box">${E(d.note)}</div>` : ''}${cfg.footer ? `<div class="box">${E(cfg.footer)}</div>` : ''}
    <div class="sig"><div>${cfg.sigUrl ? `<img src="${E(cfg.sigUrl)}" alt="" style="max-height:56px;max-width:180px;object-fit:contain;display:block;margin:-62px auto 6px">` : ''}${E(d.sigL || 'ผู้มีอำนาจลงนาม')}<br><span class="m">${E(cfg.signer || t.legalName)}</span></div><div>${E(d.sigR || 'ผู้รับเอกสาร')}</div></div>
    <div class="m" style="margin-top:18px">ออกโดย ${E(doc.by || '')} · ${E(fmtDateTime(doc.at))}</div>
    ${o.preview ? '' : '<script>addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });<\/script>'}
  </body></html>`;
  return html;
}
function printDoc(b, typeId, h) {
  const w = window.open('', '_blank');
  if (!w) return toast('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาตป๊อปอัปของเว็บนี้', 'err');
  w.document.open(); w.document.write(docHtml(b, typeId, h)); w.document.close();
}

// ================= ปรับแต่งเมนูด้านข้าง (เจ้าของเลือกเองว่าอะไรขึ้น/ไม่ขึ้น และเรียงลำดับ) =================
function boMenuSettings(main) {
  const u = DB.currentUser(), nav = navFor(portalRole(u));
  const groups = nav.map(g => ({ g: g.g, items: navArrange(g.items.filter(i => (!i[3] || can(i[3])) && (!i[5] || i[5]())), null, true) })).filter(g => g.items.length);
  const hid = new Set(navPref().hidden || []), shown = groups.flatMap(g => g.items).filter(i => !hid.has(i[0])).length;
  const save = (hidden, order) => { navSavePref({ hidden: [...hidden], order }); render(); };
  const flat = () => groups.flatMap(g => g.items.map(i => i[0]));
  main.innerHTML = pageHead('ปรับแต่งเมนูด้านข้าง', `เลือกเองว่าเมนูไหนแสดงหรือซ่อน และเรียงลำดับตามที่คุณใช้ · แสดงอยู่ ${shown} จาก ${groups.flatMap(g => g.items).length} เมนู · ตั้งค่านี้ใช้กับบัญชีของคุณบนเบราว์เซอร์นี้`, '<button class="btn btn-ghost" id="ms-reset"><i class="fa-solid fa-rotate-left"></i> คืนค่าเริ่มต้น</button>') +
    groups.map((g, gi) => `<section class="card"><div class="card-h"><h3>${esc(g.g)}</h3></div><div class="bo-list">${g.items.map((i, n) => `<div class="row between ms-row" draggable="true" data-row="${i[0]}" data-grp="${gi}" style="gap:10px;padding:8px 0;border-top:1px solid var(--border,#e5e7eb)">
      <div class="row" style="gap:10px"><i class="fa-solid fa-grip-vertical ms-grip" title="ลากเพื่อเรียงลำดับ"></i><i class="fa-solid ${i[1]}" style="width:20px;text-align:center"></i><span class="${hid.has(i[0]) ? 'muted' : ''}">${esc(i[2])}</span></div>
      <div class="row" style="gap:6px;align-items:center"><button class="btn btn-ghost btn-sm" data-mv="${i[0]}" data-d="-1" ${n === 0 ? 'disabled' : ''} title="เลื่อนขึ้น"><i class="fa-solid fa-arrow-up"></i></button><button class="btn btn-ghost btn-sm" data-mv="${i[0]}" data-d="1" ${n === g.items.length - 1 ? 'disabled' : ''} title="เลื่อนลง"><i class="fa-solid fa-arrow-down"></i></button>
        ${i[0] === 'menuset' ? '<span class="small muted" style="min-width:64px;text-align:right">แสดงเสมอ</span>' : `<label class="switch"><input type="checkbox" data-vis="${i[0]}" ${hid.has(i[0]) ? '' : 'checked'}><span></span></label>`}</div></div>`).join('')}</div></section>`).join('');
  $$('[data-vis]', main).forEach(c => c.onchange = () => { const h = new Set(navPref().hidden || []); c.checked ? h.delete(c.dataset.vis) : h.add(c.dataset.vis); save(h, navPref().order || flat()); });
  $$('[data-mv]', main).forEach(b => b.onclick = () => {
    const k = b.dataset.mv, d = +b.dataset.d, g = groups.find(x => x.items.some(i => i[0] === k)), ks = g.items.map(i => i[0]), i = ks.indexOf(k), j = i + d;
    if (j < 0 || j >= ks.length) return;
    [ks[i], ks[j]] = [ks[j], ks[i]]; g.items = ks.map(x => g.items.find(it => it[0] === x));
    save(new Set(navPref().hidden || []), flat());
  });
  // ลากเมาส์เพื่อเรียงลำดับ (ย้ายได้ภายในหมวดเดียวกัน) · ปุ่มลูกศรยังใช้ได้ โดยเฉพาะบนมือถือ
  let drag = null;
  const clearMark = () => $$('.ms-row', main).forEach(r => r.classList.remove('ms-over-t', 'ms-over-b', 'ms-drag'));
  $$('.ms-row', main).forEach(r => {
    r.addEventListener('dragstart', e => { drag = r.dataset.row; r.classList.add('ms-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', drag); } catch { /* บางเบราว์เซอร์ไม่รองรับ */ } });
    r.addEventListener('dragend', () => { drag = null; clearMark(); });
    r.addEventListener('dragover', e => {
      const from = drag && $(`.ms-row[data-row="${drag}"]`, main);
      if (!from || from.dataset.grp !== r.dataset.grp || from === r) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      const below = e.clientY > r.getBoundingClientRect().top + r.offsetHeight / 2;
      $$('.ms-row', main).forEach(x => x.classList.remove('ms-over-t', 'ms-over-b')); r.classList.add(below ? 'ms-over-b' : 'ms-over-t');
    });
    r.addEventListener('drop', e => {
      e.preventDefault();
      const from = drag && $(`.ms-row[data-row="${drag}"]`, main);
      if (!from || from.dataset.grp !== r.dataset.grp || from === r) return clearMark();
      const g = groups[+r.dataset.grp], below = e.clientY > r.getBoundingClientRect().top + r.offsetHeight / 2;
      const moved = g.items.find(i => i[0] === drag), rest = g.items.filter(i => i[0] !== drag), at = rest.findIndex(i => i[0] === r.dataset.row) + (below ? 1 : 0);
      rest.splice(at, 0, moved); g.items = rest;
      save(new Set(navPref().hidden || []), flat());
    });
  });
  $('#ms-reset', main).onclick = () => { navSavePref({}); render(); toast('คืนค่าเมนูเริ่มต้นแล้ว'); };
}

(function msStyle() {
  const st = document.createElement('style');
  st.textContent = `.ms-row{cursor:grab}.ms-row.ms-drag{opacity:.4}.ms-grip{width:16px;text-align:center;color:var(--muted,#94a3b8)}
.ms-row.ms-over-t{box-shadow:0 -3px 0 #38bdf8}.ms-row.ms-over-b{box-shadow:0 3px 0 #38bdf8}`;
  document.head.appendChild(st);
})();
