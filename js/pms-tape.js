// ================= ผังห้อง (Tape chart): แถว = ห้อง · คอลัมน์ = วัน · ลากแถบการจองไปวางที่ห้องอื่นเพื่อจัดห้อง/ย้ายห้อง =================
// ใช้ข้อมูลเดียวกับ “ย้ายห้อง / อัปเกรด” ในหน้าการจอง (b.units, b.roomId, b.moves, b.folio) — ดู js/pms.js

const TP_LABW = 112, TP_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const tpLive = b => b.status !== 'cancelled' && !b.checkedOutAt;
const tpOverlap = (a, b) => a.checkIn < b.checkOut && a.checkOut > b.checkIn;

function boTape(main) {
  const hotels = DB.hotels(true);
  if (!hotels.length) { main.innerHTML = pageHead('ผังห้อง', '') + '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><p class="muted">เพิ่มรีสอร์ทก่อน</p></div></section>'; return; }
  const edit = can('bookings.edit') || can('frontdesk');
  const st = { hid: hotels[0].id, start: todayISO(), days: window.innerWidth < 700 ? 7 : 14 };
  const today = todayISO(), dw = () => (st.days > 30 ? 36 : 58);

  // ผังห้องเรียงยาวต่อกันทุกห้อง ไม่มีกรอบเลื่อนขึ้น-ลงซ้อนในหน้า — เลื่อนทั้งหน้าด้วยล้อเมาส์ได้เลย
  const fit = () => { const w = $('.tp-wrap', main); if (w) w.style.maxHeight = 'none'; };
  const draw = (keep = false) => {
    const keepX = keep ? main.querySelector('.tp-wrap')?.scrollLeft || 0 : 0;
    const h = DB.hotel(st.hid) || hotels[0], end = addDays(st.start, st.days);
    const days = Array.from({ length: st.days }, (_, i) => addDays(st.start, i));
    const bks = DB.bookings().filter(b => b.hotelId === h.id && tpLive(b) && b.checkIn < end && b.checkOut > st.start);
    const bar = (b, unit) => {
      const s = Math.max(0, diffDays(st.start, b.checkIn)), e = Math.min(st.days, diffDays(st.start, b.checkOut));
      const left = (b.checkIn < st.start ? 0 : s * dw() + dw() / 2), right = (b.checkOut > end ? st.days * dw() : e * dw() + dw() / 2);
      const cls = b.checkedInAt ? 'in' : (b.payment?.paid || b.status === 'confirmed') ? 'ok' : 'wait';
      return `<div class="tp-bar ${cls}" ${edit ? 'data-drag="1"' : ''} data-b="${esc(b.id)}" data-from="${unit || ''}" style="left:${left}px;width:${Math.max(24, right - left - 2)}px" title="${esc(guestName(b))} · ${b.qty} ห้อง · ${fmtDate(b.checkIn, false)}–${fmtDate(b.checkOut, false)}">${esc(guestName(b))}${b.qty > 1 ? ' ×' + b.qty : ''}</div>`;
    };
    const cells = `<div class="tp-cells">${days.map(d => `<i class="${d === today ? 'tp-today' : [0, 6].includes(new Date(d + 'T00:00:00').getDay()) ? 'tp-we' : ''}"></i>`).join('')}</div>`;
    const row = (label, rid, unit, inner, cls = '') => `<div class="tp-row ${cls}"><div class="tp-lab">${label}</div><div class="tp-track" data-r="${esc(rid)}" data-u="${unit == null ? '' : unit}">${cells}${inner}</div></div>`;

    const body = h.rooms.map(r => {
      const total = Math.min(+r.total || 0, 100), mine = bks.filter(b => b.roomId === r.id);
      const unassigned = mine.filter(b => !(b.units || []).length);
      let html = `<div class="tp-type">${esc(r.name)} <span class="small muted">· ${total} ห้อง</span></div>`;
      html += Array.from({ length: total }, (_, i) => i + 1).map(n => row(`ห้อง ${n}`, r.id, n, mine.filter(b => (b.units || []).includes(n)).map(b => bar(b, n)).join(''))).join('');
      html += unassigned.map(b => row('<span class="small muted">รอจัดห้อง</span>', r.id, null, bar(b, ''), 'tp-wait-row')).join('');
      if (edit) html += row('<span class="small muted">วางเพื่อถอดเลขห้อง</span>', r.id, null, '', 'tp-wait-row tp-drop-empty');
      return html;
    }).join('');

    main.innerHTML = pageHead('ผังห้อง', edit ? 'แตะที่ชื่อผู้จอง แล้วเลือก “ย้ายห้อง” หรือ “ย้ายวันที่พัก” · บนคอมพิวเตอร์ลากแถบไปวางได้เลย' : 'ดูผังห้องและการจองรายวัน') + `
      ${pmsHelp('tape', 'ผังห้อง ใช้ยังไง', ['แต่ละแถว = หนึ่งห้อง แต่ละแถบสี = หนึ่งการจอง (เขียว = ยืนยัน/ชำระแล้ว · ส้ม = รอตรวจสลิป · น้ำเงิน = กำลังพัก)', 'แตะที่แถบ (ชื่อผู้จอง) แล้วเลือก ย้ายห้อง หรือ ย้ายวันที่พัก — ไม่ต้องลาก · ถ้าใช้คอมพิวเตอร์ ลากแถบขึ้น-ลงเพื่อย้ายห้อง ลากซ้าย-ขวาเพื่อเลื่อนวันก็ได้', 'ถ้าย้ายห้องคนละประเภทหรือเลื่อนวัน ระบบจะเช็คห้องว่าง แล้วถามส่วนต่างราคาก่อนยืนยัน · แขกที่เข้าพักแล้วเลื่อนวันเข้าไม่ได้'])}
      <div class="row wrap" style="gap:8px;margin-bottom:10px;align-items:center">
        ${hotels.length > 1 ? `<select id="tp-h" style="max-width:240px">${hotels.map(x => `<option value="${esc(x.id)}" ${x.id === h.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
        <button class="btn btn-outline btn-sm" id="tp-prev"><i class="fa-solid fa-chevron-left"></i></button><button class="btn btn-outline btn-sm" id="tp-today">วันนี้</button><button class="btn btn-outline btn-sm" id="tp-next"><i class="fa-solid fa-chevron-right"></i></button>
        <label class="small muted" style="display:flex;align-items:center;gap:6px">ไปที่วันที่ <input type="date" id="tp-go" value="${st.start}" style="width:auto"></label>
        <select id="tp-d" style="width:auto">${[7, 14, 30, 60, 90].map(n => `<option value="${n}" ${n === st.days ? 'selected' : ''}>${n} วัน</option>`).join('')}</select>
      </div>
      <style>
        .tp-wrap{overflow:auto;scrollbar-width:auto;scrollbar-color:#9ca3af #eef0f3;cursor:grab;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:#fff;-webkit-overflow-scrolling:touch}
        .tp-in{min-width:${TP_LABW + st.days * dw()}px}
        .tp-head,.tp-row{display:flex}.tp-head{position:sticky;top:0;z-index:5;background:#fff}.tp-head .tp-lab{z-index:6}.tp-lab{flex:0 0 ${TP_LABW}px;position:sticky;left:0;z-index:3;background:#fff;padding:0 8px;display:flex;align-items:center;border-right:1px solid var(--border,#e5e7eb);font-size:13px}
        .tp-row{height:34px;border-top:1px solid #f0f1f3}.tp-track{position:relative;flex:1;height:100%}
        .tp-cells{position:absolute;inset:0;display:grid;grid-template-columns:repeat(${st.days},1fr);pointer-events:none}.tp-cells i{border-left:1px solid #f0f1f3}.tp-we{background:#fafafa}.tp-today{background:#fff7e0}
        .tp-dh{flex:1;display:grid;grid-template-columns:repeat(${st.days},1fr);text-align:center;font-size:${st.days > 30 ? 10 : 12}px}.tp-dh div{padding:4px 0;border-left:1px solid #f0f1f3}.tp-dh .t{background:#fff7e0;font-weight:700}
        .tp-type{padding:6px 10px;font-weight:700;background:#f6f7f9;border-top:1px solid var(--border,#e5e7eb);position:sticky;left:0}
        .tp-bar{position:absolute;top:4px;height:26px;line-height:26px;border-radius:8px;padding:0 8px;font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2;cursor:pointer;user-select:none}
        .tp-wrap::-webkit-scrollbar{height:14px}.tp-wrap::-webkit-scrollbar-track{background:#eef0f3;border-radius:7px}.tp-wrap::-webkit-scrollbar-thumb{background:#9ca3af;border-radius:7px;border:2px solid #eef0f3}.tp-wrap.tp-pan{cursor:grabbing;user-select:none}.tp-bar[data-drag]{cursor:pointer}@media (pointer:fine){.tp-bar[data-drag]{cursor:grab;touch-action:none}}.tp-bar.ok{background:#16a34a}.tp-bar.wait{background:#d97706}.tp-bar.in{background:#2563eb}
        .tp-row.tp-over{outline:2px solid #2563eb;outline-offset:-2px;background:#eff6ff}.tp-ghost{position:fixed;z-index:9999;pointer-events:none;opacity:.85;box-shadow:0 6px 18px rgba(0,0,0,.25)}
        .tp-wait-row{background:#fcfcfd}.tp-lab .small{font-size:11px;line-height:1.2}
      </style>
      <div class="tp-wrap"><div class="tp-in"><div class="tp-head"><div class="tp-lab"><b>ห้อง</b></div><div class="tp-dh">${days.map(d => `<div class="${d === today ? 't' : ''}">${TP_DOW[new Date(d + 'T00:00:00').getDay()]}<br>${+d.slice(8)}/${+d.slice(5, 7)}</div>`).join('')}</div></div>${body}</div></div>
      <p class="small muted" style="margin-top:8px">ไปวันอื่น: เลือก “ไปที่วันที่” ด้านบน · กด ‹ › เลื่อนทีละเดือน · ลากพื้นที่ว่างในผังเพื่อเลื่อน (มือถือใช้นิ้วปัด) · ลากแถบไปชิดขอบผังจะเลื่อนตามเอง</p>`;
    bind(h, bks);
    const w0 = $('.tp-wrap', main); if (w0 && keepX) w0.scrollLeft = keepX;
    fit(); $$('[data-help-x]', main).forEach(b => b.addEventListener('click', () => setTimeout(fit, 30)));
  };

  const bind = (h, bks) => {
    pmsHelpBind(main);
    $('#tp-h', main)?.addEventListener('change', e => { st.hid = e.target.value; draw(); });
    $('#tp-d', main).onchange = e => { st.days = +e.target.value; draw(); };
    const step = () => (st.days > 30 ? 30 : Math.max(1, st.days - 1));
    $('#tp-prev', main).onclick = () => { st.start = addDays(st.start, -step()); draw(); };
    $('#tp-next', main).onclick = () => { st.start = addDays(st.start, step()); draw(); };
    $('#tp-go', main).onchange = e => { if (e.target.value) { st.start = e.target.value; draw(); } };
    $('#tp-today', main).onclick = () => { st.start = todayISO(); draw(); };
    const wrap = $('.tp-wrap', main);
    wrap.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.button !== 0 || e.target.closest('.tp-bar, .tp-lab')) return;
      const x0 = e.clientX, s0 = wrap.scrollLeft; wrap.classList.add('tp-pan');
      const mv = ev => { wrap.scrollLeft = s0 - (ev.clientX - x0); };
      const up = () => { wrap.classList.remove('tp-pan'); document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    $$('.tp-bar', main).forEach(el => el.addEventListener('pointerdown', ev => {
      const b = DB.bookings().find(x => x.id === el.dataset.b); if (!b) return;
      if (!edit) return bookingDrawer(b.id, () => draw(true));
      if (ev.pointerType === 'touch') return; // มือถือ/แท็บเล็ต: ไม่ลาก ปัดเลื่อนผังได้ปกติ แล้วแตะที่ชื่อ (click ด้านล่าง) เพื่อเปิดเมนูย้าย
      const x0 = ev.clientX, y0 = ev.clientY, sc0 = wrap.scrollLeft; let ghost = null, over = null, lastX = x0, lastY = y0, timer = null;
      const shiftOf = x => (b.checkedInAt ? 0 : Math.round(((x - x0) + (wrap.scrollLeft - sc0)) / dw()));
      const paint = () => {
        if (!ghost) return;
        ghost.style.left = lastX - 20 + 'px'; ghost.style.top = lastY - 14 + 'px';
        const sh = shiftOf(lastX); ghost.textContent = sh ? `${guestName(b)} → ${fmtDate(addDays(b.checkIn, sh), false)}–${fmtDate(addDays(b.checkOut, sh), false)}` : guestName(b);
        const r = rowAt(lastX, lastY); if (r !== over) { over?.classList.remove('tp-over'); over = r; over?.classList.add('tp-over'); }
      };
      const edge = () => { const r = wrap.getBoundingClientRect(); if (lastX > r.right - 50) wrap.scrollLeft += 22; else if (lastX < r.left + TP_LABW + 40) wrap.scrollLeft -= 22; paint(); };
      const rowAt = (x, y) => document.elementsFromPoint(x, y).map(e => e.closest?.('.tp-track')).find(Boolean)?.closest('.tp-row') || null;
      const move = e => {
        if (!ghost && Math.hypot(e.clientX - x0, e.clientY - y0) < 6) return;
        if (!ghost) { ghost = el.cloneNode(true); ghost.className += ' tp-ghost'; ghost.style.cssText = `left:0;top:0;width:${el.offsetWidth}px`; document.body.appendChild(ghost); el.style.opacity = .35; timer = setInterval(edge, 40); }
        lastX = e.clientX; lastY = e.clientY; paint();
      };
      const up = e => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
        clearInterval(timer); const moved = !!ghost; ghost?.remove(); el.style.opacity = ''; over?.classList.remove('tp-over');
        if (!moved) return tpSheet(b, h, () => draw(true));
        const r = rowAt(e.clientX, e.clientY)?.querySelector('.tp-track'); if (!r) return;
        tpDrop(b, h, r.dataset.r, r.dataset.u === '' ? null : +r.dataset.u, el.dataset.from === '' ? null : +el.dataset.from, shiftOf(e.clientX), () => draw(true));
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
      ev.preventDefault();
    }));
    if (edit) $$('.tp-bar', main).forEach(el => el.addEventListener('click', ev => {
      if (ev.detail !== 0 && ev.pointerType !== 'touch') return; // เมาส์จัดการใน pointerup แล้ว
      const b = DB.bookings().find(x => x.id === el.dataset.b); if (b) tpSheet(b, h, () => draw(true));
    }));
  };
  draw();
}

// วางแถบลงแถว/เลื่อนวัน: ห้องเดียวกัน = จัดเลขห้อง · คนละประเภท = ย้ายห้อง · ลากซ้าย-ขวา = เลื่อนวัน (ถามยืนยัน + ส่วนต่างราคา)
function tpDrop(b, h, rid, unit, fromUnit, shift, done) {
  const by = DB.currentUser()?.name || '';
  const ci = shift ? addDays(b.checkIn, shift) : b.checkIn, co = shift ? addDays(b.checkOut, shift) : b.checkOut;
  const clash = n => DB.bookings().some(x => x.id !== b.id && x.roomId === rid && tpLive(x) && (x.units || []).includes(n) && x.checkIn < co && x.checkOut > ci);
  if (shift && ci < todayISO()) return toast('เลื่อนไปก่อนวันนี้ไม่ได้', 'err');
  if (unit != null && clash(unit)) return toast(`ห้อง ${unit} มีการจองอื่นอยู่ในช่วง ${fmtDate(ci, false)} – ${fmtDate(co, false)} — เลือกห้องอื่น`, 'err');
  const sameRoom = rid === b.roomId;
  if (!shift && sameRoom) {
    const cur = b.units || [];
    if (unit == null && fromUnit == null) return;
    const next = unit == null ? cur.filter(u => u !== fromUnit)
      : fromUnit != null ? [...cur.filter(u => u !== fromUnit), unit] : [...cur.filter(u => u !== unit), unit].slice(-Math.max(1, b.qty));
    DB.log('booking.unit', `${b.id} · ${(cur.join(',') || '-')} → ${(next.join(',') || '-')}`);
    DB.updateBooking(b.id, { units: next.sort((p, q) => p - q) });
    toast(unit == null ? 'เอาเลขห้องออกแล้ว' : `จัดห้อง ${unit} แล้ว`); return done?.();
  }
  const cur = h.rooms.find(r => r.id === b.roomId), to = h.rooms.find(r => r.id === rid); if (!cur || !to) return;
  const free = Math.max(0, to.total - DB.bookedCount(to.id, ci, co, b.id));
  if (free < b.qty) return toast(`${to.name} ว่างไม่พอในช่วง ${fmtDate(ci, false)} – ${fmtDate(co, false)} (ว่าง ${free} ห้อง)`, 'err');
  // เลขห้องที่จะใช้หลังย้าย: วางบนแถวห้อง = ห้องนั้น · ห้องเดิมไม่เปลี่ยนประเภท = ห้องที่เหลือต้องว่างในวันใหม่ด้วย
  let units = unit != null ? [unit] : [];
  if (sameRoom && shift && unit != null) {
    const keep = (b.units || []).filter(u => u !== fromUnit);
    if (keep.some(clash)) return toast('ห้องอื่นที่จัดให้การจองนี้ไม่ว่างในวันใหม่ — ย้ายทีละห้อง', 'err');
    units = [...keep, unit].sort((p, q) => p - q);
  }
  const oldQ = DB.quote(cur, b.checkIn, b.checkOut, b.qty).sub, newQ = DB.quote(to, ci, co, b.qty).sub, delta = Math.round(newQ - oldQ), diff = Math.max(0, delta);
  const rmsg = shift || !sameRoom ? restrictMsg(DB.hotel(h.id) || h, to.id, ci, co) : '';
  const lines = [
    shift ? `<div>วันที่: ${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)} <i class="fa-solid fa-arrow-right"></i> <b>${fmtDate(ci, false)} – ${fmtDate(co, false)}</b> <span class="small muted">(${shift > 0 ? '+' : ''}${shift} วัน)</span></div>` : '',
    !sameRoom ? `<div>ห้อง: ${esc(cur.name)} <i class="fa-solid fa-arrow-right"></i> <b>${esc(to.name)}${unit != null ? ' · ห้อง ' + unit : ''}</b></div>` : (unit != null ? `<div>เลขห้อง: <b>${unit}</b></div>` : ''),
  ].join('');
  const m = openModal(`<h2><i class="fa-solid fa-${shift ? 'calendar-days' : 'right-left'}"></i> ${shift ? (sameRoom ? 'เลื่อนวันเข้าพัก' : 'เลื่อนวันและย้ายห้อง') : 'ย้ายห้อง'}</h2>
    <p style="margin:6px 0 10px"><b>${esc(guestName(b))}</b> · ${b.qty} ห้อง</p><div class="small" style="line-height:1.7">${lines}</div>
    ${rmsg ? `<div class="notice warn" style="margin-top:10px"><i class="fa-solid fa-triangle-exclamation"></i><div>ติดกฎข้อจำกัดการขาย: ${esc(rmsg)}<br><span class="small">เจ้าของยังยืนยันได้ถ้าตกลงกับแขกแล้ว</span></div></div>` : ''}
    <p class="small muted" style="margin:10px 0 6px">ราคาตามปกติ: ${money(Math.round(oldQ))} → ${money(Math.round(newQ))} (${delta >= 0 ? 'ส่วนต่าง +' : 'ถูกลง '}${money(Math.abs(delta))})${delta < 0 ? ' · ระบบไม่คืนเงินอัตโนมัติ ถ้าจะคืนให้ทำเองแล้วจดโน้ต' : ''}</p>
    <div class="fg"><label>ส่วนต่างที่เรียกเก็บ (บาท) — 0 = ไม่เก็บเพิ่ม</label><input id="tp-fee" type="number" min="0" step="1" value="${diff}" inputmode="numeric"></div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="tp-go">ยืนยัน</button></div>`);
  $('#tp-go', m).onclick = () => {
    const fee = Math.max(0, +$('#tp-fee', m).value || 0); closeModal();
    const at = new Date().toISOString(), label = [shift && `${fmtDate(b.checkIn, false)}–${fmtDate(b.checkOut, false)} → ${fmtDate(ci, false)}–${fmtDate(co, false)}`, !sameRoom && `${b.roomName} → ${to.name}`].filter(Boolean);
    const rec = { at, from: shift ? `${fmtDate(b.checkIn, false)}–${fmtDate(b.checkOut, false)}` : b.roomName, to: shift ? `${fmtDate(ci, false)}–${fmtDate(co, false)}${!sameRoom ? ' · ' + to.name : ''}` : to.name, fee, by };
    DB.log(shift ? 'booking.shift' : 'booking.move', `${b.id} · ${label.join(' · ')} · ส่วนต่าง ${fee} (ผังห้อง)`);
    DB.updateBooking(b.id, { roomId: to.id, roomName: to.name, units, checkIn: ci, checkOut: co, moves: [...(b.moves || []), rec],
      ...(fee ? { folio: [...(b.folio || []), { id: 'f' + Date.now().toString(36), at, name: shift ? `ส่วนต่างเลื่อนวัน/ย้ายห้อง ${label.join(' · ')}` : `ส่วนต่างอัปเกรด ${b.roomName} → ${to.name}`, qty: 1, price: fee, by, paid: false }] } : {}) });
    toast(shift ? 'เลื่อนวันแล้ว' : 'ย้ายห้องแล้ว'); done?.();
  };
}

// แตะที่ชื่อผู้จอง → เมนูย้ายห้อง / ย้ายวันที่พัก (ไม่ต้องลาก ใช้ง่ายบนมือถือ) · ใช้ tpDrop เดิมตรวจห้องว่าง กฎขาย และส่วนต่างราคา
function tpSheet(b, h, done) {
  const live = tpLive(b);
  const m = openModal(`<h2>${esc(guestName(b))} ${stChip(b)}</h2>
    <div class="tl-detail"><div><small>ห้อง</small><b>${esc(b.roomName)}${(b.units || []).length ? ' · ห้อง ' + b.units.join(', ') : ''} × ${b.qty}</b></div>
      <div><small>เข้าพัก</small><b>${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)} (${b.nights} คืน)</b></div><div><small>ยอดรวม</small><b>${money(b.price.total)}</b></div></div>
    <div style="display:grid;gap:8px;margin-top:14px">
      ${live ? `<button class="btn btn-primary" id="ts-room"><i class="fa-solid fa-right-left"></i> ย้ายห้อง</button>
      <button class="btn btn-primary" id="ts-date" ${b.checkedInAt ? 'disabled title="แขกเข้าพักแล้ว เลื่อนวันเข้าไม่ได้"' : ''}><i class="fa-solid fa-calendar-days"></i> ย้ายวันที่พัก${b.checkedInAt ? ' <span class="small">(เข้าพักแล้ว)</span>' : ''}</button>` : ''}
      <button class="btn btn-outline" id="ts-more"><i class="fa-solid fa-circle-info"></i> รายละเอียด / ชำระเงิน</button>
      <button class="btn btn-ghost" data-close>ปิด</button></div>`);
  const fromUnit = (b.units || [])[0] ?? null;
  $('#ts-more', m).onclick = () => { closeModal(); bookingDrawer(b.id, done); };
  if (!live) return;
  $('#ts-room', m).onclick = () => {
    closeModal();
    const optsT = h.rooms.map(r => `<option value="${esc(r.id)}" ${r.id === b.roomId ? 'selected' : ''}>${esc(r.name)} · ว่าง ${Math.max(0, r.total - DB.bookedCount(r.id, b.checkIn, b.checkOut, b.id))} ห้อง</option>`).join('');
    const m2 = openModal(`<h2><i class="fa-solid fa-right-left"></i> ย้ายห้อง</h2><p style="margin:6px 0 10px"><b>${esc(guestName(b))}</b> · ${fmtDate(b.checkIn, false)} – ${fmtDate(b.checkOut, false)}</p>
      <div class="fg"><label>ประเภทห้อง</label><select id="tr-t">${optsT}</select></div>
      <div class="fg"><label>เลขห้อง</label><select id="tr-u"></select></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="tr-go">ถัดไป</button></div>`);
    const fillU = () => {
      const r = h.rooms.find(x => x.id === $('#tr-t', m2).value), n = Math.min(+r.total || 0, 100);
      const busy = u => DB.bookings().some(x => x.id !== b.id && x.roomId === r.id && tpLive(x) && (x.units || []).includes(u) && x.checkIn < b.checkOut && x.checkOut > b.checkIn);
      $('#tr-u', m2).innerHTML = '<option value="">ไม่ระบุเลขห้อง (รอจัดห้อง)</option>' + Array.from({ length: n }, (_, i) => i + 1).map(u => `<option value="${u}" ${busy(u) ? 'disabled' : ''} ${r.id === b.roomId && u === fromUnit ? 'selected' : ''}>ห้อง ${u}${busy(u) ? ' (ไม่ว่าง)' : ''}</option>`).join('');
    };
    fillU(); $('#tr-t', m2).onchange = fillU;
    $('#tr-go', m2).onclick = () => {
      const rid = $('#tr-t', m2).value, u = $('#tr-u', m2).value === '' ? null : +$('#tr-u', m2).value;
      if (rid === b.roomId && u === fromUnit) return toast('ยังไม่ได้เปลี่ยนห้อง', 'info');
      closeModal(); tpDrop(b, h, rid, u, fromUnit, 0, done);
    };
  };
  $('#ts-date', m)?.addEventListener('click', () => {
    closeModal();
    const m2 = openModal(`<h2><i class="fa-solid fa-calendar-days"></i> ย้ายวันที่พัก</h2><p style="margin:6px 0 10px"><b>${esc(guestName(b))}</b> · ${b.nights} คืน (จำนวนคืนเท่าเดิม)</p>
      <div class="fg"><label>วันเข้าพักใหม่</label><input type="date" id="td-ci" value="${b.checkIn}" min="${todayISO()}"></div>
      <div class="small muted" id="td-co" style="margin-top:6px"></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="td-go">ถัดไป</button></div>`);
    const show = () => { const v = $('#td-ci', m2).value; $('#td-co', m2).textContent = v ? `ออก ${fmtDate(addDays(v, b.nights))} · เลื่อน ${diffDays(b.checkIn, v) > 0 ? '+' : ''}${diffDays(b.checkIn, v)} วัน` : ''; };
    show(); $('#td-ci', m2).onchange = show;
    $('#td-go', m2).onclick = () => {
      const v = $('#td-ci', m2).value, sh = v ? diffDays(b.checkIn, v) : 0;
      if (!sh) return toast('ยังไม่ได้เลือกวันใหม่', 'info');
      closeModal(); tpDrop(b, h, b.roomId, fromUnit, fromUnit, sh, done);
    };
  });
}

// หน้าเดียวรวม “ผังห้อง” + “ตารางห้องว่าง / ปิดห้อง” เป็นแท็บ · มือถือเริ่มที่ปฏิทินรายเดือน (ใช้ง่ายกว่า) · ?tab=month|tape กำหนดแท็บจากลิงก์
function boBoard(main) {
  const canTape = can('bookings.view'), canCal = can('inventory');
  if (!canTape && !canCal) { main.innerHTML = '<div class="bo-empty"><i class="fa-solid fa-lock"></i><h3>ไม่มีสิทธิ์เข้าถึงหน้านี้</h3></div>'; return; }
  let tab = /[?&]tab=(month|tape)/.exec(location.hash)?.[1] || window.__boardTab || (window.innerWidth < 700 ? 'month' : 'tape');
  if (tab === 'tape' && !canTape) tab = 'month';
  if (tab === 'month' && !canCal) tab = 'tape';
  window.__boardTab = tab;
  main.innerHTML = `${canTape && canCal ? `<div class="tabs-line" id="bd-tabs" style="margin-bottom:10px"><button data-t="month" class="${tab === 'month' ? 'active' : ''}"><i class="fa-regular fa-calendar"></i> ปฏิทิน · ปิดห้อง</button><button data-t="tape" class="${tab === 'tape' ? 'active' : ''}"><i class="fa-solid fa-table-cells-large"></i> ผังห้อง · ย้ายห้อง</button></div>` : ''}<div id="bd-host"></div>`;
  $$('#bd-tabs [data-t]', main).forEach(b => b.onclick = () => { window.__boardTab = b.dataset.t; try { history.replaceState(null, '', '#/admin/tape?tab=' + b.dataset.t); } catch { /* ไม่เป็นไร */ } boBoard(main); });
  (tab === 'tape' ? boTape : admCalendar)($('#bd-host', main));
}
const boCalRedirect = () => { location.replace('#/admin/tape?tab=month'); };
