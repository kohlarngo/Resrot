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
          <label class="switch big"><input type="checkbox" data-act="${h.id}" ${h.active !== false ? 'checked' : ''} ${h.banned ? 'disabled' : ''}><span></span>${h.banned ? 'ถูกแบน' : h.active !== false ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
        ${h.banned ? `<div class="small red" style="margin-top:6px"><i class="fa-solid fa-ban"></i> ถูกแบนโดยผู้ดูแลระบบ (${h.banned.until ? 'ถึง ' + fmtDateTime(h.banned.until) : 'ถาวร'})${h.banned.reason ? ` — ${esc(h.banned.reason)}` : ''} · ติดต่อทีมงานเพื่อขอปลดแบน</div>` : ''}<p class="small" style="margin:10px 0">${esc(h.description || '— ยังไม่มีคำอธิบาย —')}</p>
        <div class="sh-thumbs">${h.images.slice(0, 8).map(i => imgTag(i, 160)).join('')}${h.images.length > 8 ? `<span class="small muted">+${h.images.length - 8}</span>` : ''}</div>
        <div class="small" style="margin-top:8px"><i class="fa-solid fa-images"></i> สไลด์รูป: ${h.images.length < 2 ? '<span class="muted">ต้องมีรูปอย่างน้อย 2 รูป</span>' : h.slideshow?.on === false ? '<span class="muted">ปิดอยู่ (แสดงเป็นแกลเลอรี)</span>' : `<b>เปิด</b> · เปลี่ยนรูปทุก ${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))} วินาที`}</div>
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
      <div class="fg full slide-set"><label class="row" style="gap:8px;font-weight:700"><input type="checkbox" name="slide_on" ${h.slideshow?.on !== false ? 'checked' : ''}> <i class="fa-solid fa-images"></i> สไลด์รูปอัตโนมัติบนหน้ารีสอร์ท</label>
        <div class="row wrap" style="gap:8px;margin-top:8px;align-items:center"><span class="small">เปลี่ยนรูปทุก</span>
          <input name="slide_sec" type="range" min="2" max="15" step="1" value="${Math.min(15, Math.max(2, Math.round(+h.slideshow?.seconds || 4)))}" style="flex:1;min-width:140px;max-width:260px"><b id="sl-sec-v" style="min-width:64px"></b></div>
        <div class="small muted" style="margin-top:4px">ลูกค้าเอาเมาส์ชี้หรือแตะรูป สไลด์จะหยุดชั่วคราว · ต้องมีรูปอย่างน้อย 2 รูป</div></div>
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
  const secLbl = () => $('#sl-sec-v', m).textContent = f.elements.slide_sec.value + ' วินาที';
  f.elements.slide_sec.oninput = secLbl; secLbl();
  $('#sh-save', m).onclick = () => {
    const v = k => f.elements[k].value;
    if (!v('name').trim()) return toast('กรุณาใส่ชื่อรีสอร์ท', 'err');
    const sl = normSlug(v('slug'));
    if (sl && DB.hotels(true).some(x => x.id !== h.id && (x.slug === sl || x.id === sl))) return toast('ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น', 'err');
    Object.assign(h, { name: v('name').trim(), description: v('description'), images: imgs.length ? imgs : h.images, slug: sl || undefined,
      slideshow: { on: f.elements.slide_on.checked, seconds: Math.min(15, Math.max(2, Math.round(+v('slide_sec')) || 4)) },
      highlights: v('highlights').split('\n').map(s => s.trim()).filter(Boolean),
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
  main.innerHTML = pageHead('สไลด์ & รูปรีสอร์ท', `${hotels.length} รีสอร์ท · เปิด/ปิดสไลด์ ตั้งเวลา และจัดการรูปของรีสอร์ททุกแห่ง (เจ้าของรีสอร์ทยังแก้ของตัวเองได้เหมือนเดิม)`) + `
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> ตั้งค่าให้ทุกรีสอร์ทพร้อมกัน</h3></div>
      <div class="row wrap" style="gap:12px;align-items:center"><label class="row" style="gap:8px"><input type="checkbox" id="bulk-on" checked> เปิดสไลด์อัตโนมัติ</label>
        <span class="small">เปลี่ยนรูปทุก</span><input type="range" id="bulk-sec" min="2" max="15" step="1" value="4" style="width:200px"><b id="bulk-v" style="min-width:64px">4 วินาที</b>
        <button class="btn btn-primary btn-sm" id="bulk-go"><i class="fa-solid fa-check-double"></i> ใช้กับทุกรีสอร์ท</button></div></section>
    ${hotels.map(h => `<section class="card sh-card" data-h="${h.id}"><div class="sh-cover" style="aspect-ratio:21/6">${imgTag(h.images[0], 900, '', h.id)}<span class="im-badge">ภาพปก</span></div>
      <div class="sh-body"><div class="row between wrap" style="gap:10px"><div><h3 style="margin:0">${esc(h.name)}</h3><div class="small muted">เจ้าของ: ${esc(ownerName(h))} · ${h.images.length} รูป · ${h.rooms.length} ประเภทห้อง${h.active === false ? ' · <span class="red">ปิดการขาย</span>' : ''}</div></div>
          <div class="row wrap" style="gap:8px;align-items:center"><label class="row" style="gap:6px"><input type="checkbox" data-sl-on="${h.id}" ${h.slideshow?.on !== false ? 'checked' : ''} ${h.images.length < 2 ? 'disabled' : ''}> สไลด์</label>
            <input type="range" data-sl-sec="${h.id}" min="2" max="15" step="1" value="${sec(h)}" style="width:150px" ${h.images.length < 2 ? 'disabled' : ''}><b data-sl-v="${h.id}" style="min-width:64px">${sec(h)} วินาที</b></div></div>
        <div class="sh-thumbs" style="margin-top:10px">${h.images.slice(0, 8).map(i => imgTag(i, 160)).join('')}${h.images.length > 8 ? `<span class="small muted">+${h.images.length - 8}</span>` : ''}</div>
        <div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" data-deco="${h.id}"><i class="fa-solid fa-paintbrush"></i> จัดการรูป & ตกแต่งหน้า</button>
          <a class="btn btn-outline btn-sm" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้าเว็บ</a></div></div></section>`).join('') || '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">ยังไม่มีรีสอร์ทในระบบ</p></div></section>'}`;
  const save = (id, patch) => { const h = JSON.parse(JSON.stringify(DB.hotel(id))); h.slideshow = { on: h.slideshow?.on !== false, seconds: sec(h), ...patch }; DB.saveHotel(h); DB.log('hotel.slideshow', `${h.name} → ${h.slideshow.on ? 'เปิด ' + h.slideshow.seconds + ' วินาที' : 'ปิด'}`); };
  $$('[data-sl-on]', main).forEach(c => c.onchange = () => { save(c.dataset.slOn, { on: c.checked }); toast(c.checked ? 'เปิดสไลด์แล้ว' : 'ปิดสไลด์แล้ว'); });
  $$('[data-sl-sec]', main).forEach(r => {
    r.oninput = () => $(`[data-sl-v="${r.dataset.slSec}"]`, main).textContent = r.value + ' วินาที';
    r.onchange = () => { save(r.dataset.slSec, { seconds: +r.value }); toast(`ตั้งเวลาสไลด์ ${r.value} วินาทีแล้ว`); };
  });
  $$('[data-deco]', main).forEach(b => b.onclick = () => shopModal(JSON.parse(JSON.stringify(DB.hotel(b.dataset.deco))), () => boDevMedia(main)));
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
