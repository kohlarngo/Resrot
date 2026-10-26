// ---------- Utilities ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '฿' + Math.round(n).toLocaleString('th-TH');
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
function nightsList(a, b) { const out = []; let d = a; while (d < b) { out.push(d); d = addDays(d, 1); } return out; }
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const TH_MON_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
function fmtDate(iso, withDow = true) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return `${withDow ? TH_DOW[d.getDay()] + ' ' : ''}${d.getDate()} ${TH_MON[d.getMonth()]} ${d.getFullYear() + 543}`;
}
// ช่วงวันแบบสั้น: 28-30 ต.ค. · ข้ามเดือน: 30 ต.ค.-2 พ.ย.
function fmtRange(a, b) {
  const x = new Date(a + 'T00:00:00'), y = new Date(b + 'T00:00:00');
  return x.getMonth() === y.getMonth() ? `${x.getDate()}-${y.getDate()} ${TH_MON[y.getMonth()]}` : `${x.getDate()} ${TH_MON[x.getMonth()]}-${y.getDate()} ${TH_MON[y.getMonth()]}`;
}
const fmtDateTime = iso => { const d = new Date(iso); return `${fmtDate(isoOf(d), false)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function scoreWord(s) { return s >= 9 ? 'ยอดเยี่ยม' : s >= 8.5 ? 'ดีเยี่ยม' : s >= 8 ? 'ดีมาก' : s >= 7 ? 'ดี' : 'พอใช้'; }
const starsHtml = n => `<span class="stars">${'<i class="fa-solid fa-star"></i>'.repeat(n)}</span>`;
// ที่พักที่ยังไม่มีรีวิว ไม่แสดงคะแนน (ไม่มีป้าย "ที่พักใหม่")
const scoreHtml = (s, c) => !+s && !c ? '' : `<span class="score"><b>${(+s).toFixed(1)}</b><span><span class="w">${scoreWord(s)}</span>${c != null ? `<br><span class="c">${c.toLocaleString()} รีวิว</span>` : ''}</span></span>`;
const fallback = seed => `this.onerror=null;this.src='https://picsum.photos/seed/${seed}/800/600'`;
const imgTag = (id, w = 800, cls = '', seed = id) => `<img src="${imgUrl(id, w)}" class="${cls}" loading="lazy" alt="" onerror="${fallback(String(seed).replace(/[^a-z0-9]/gi, '').slice(-12))}">`;
// รีสอร์ทตัวอย่าง (DEMO / ฝึกใช้งาน): ใส่ลายน้ำ DEMO ทับรูปทุกที่ที่แสดงให้ลูกค้าเห็น กันเข้าใจผิดว่าเป็นที่พักจริง
// วางไว้ในกล่องรูปที่ position:relative (ตัวลายน้ำเต็มกล่อง ไม่รับคลิก)
const isDemoHotel = h => !!(h && (h.demo || h.practice));
const demoWm = h => isDemoHotel(h) ? '<span class="demo-wm" aria-hidden="true"><b>DEMO</b></span>' : '';
const demoBanner = h => isDemoHotel(h) ? '<div class="demo-banner"><i class="fa-solid fa-flask"></i> <b>DEMO</b> — รีสอร์ทตัวอย่างสำหรับทดลองระบบ รูปและข้อมูลทั้งหมดเป็นของปลอม ไม่ใช่ที่พักจริง · จองทดลองได้เพื่อฝึกใช้งาน (ไม่มีการเรียกเก็บเงินจริง)</div>' : '';
(function demoStyle() {
  const s = document.createElement('style');
  s.textContent = `.demo-wm{position:absolute;inset:0;z-index:3;pointer-events:none;display:grid;place-items:center;overflow:hidden}
.demo-wm b{transform:rotate(-24deg);font:900 clamp(26px,7vw,72px)/1 Arial,sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.55);-webkit-text-stroke:2px rgba(185,28,28,.55);text-shadow:0 2px 10px rgba(0,0,0,.35)}
.demo-wm::after{content:'ตัวอย่าง · ไม่ใช่ที่พักจริง';position:absolute;left:0;right:0;bottom:0;background:rgba(185,28,28,.88);color:#fff;font:700 11px/1.6 system-ui,sans-serif;text-align:center}
.demo-banner{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:.92rem}`;
  document.head.appendChild(s);
})();
const isMobile = () => innerWidth <= 820; // ตรงกับ breakpoint ใน style.css
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function toast(msg, type = 'ok') {
  const box = $('#toast');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>${esc(msg)}`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function openModal(html, cls = '') {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'modal';
  bg.innerHTML = `<div class="modal ${cls}"><button class="modal-close" data-close><i class="fa-solid fa-xmark"></i></button>${html}</div>`;
  bg.addEventListener('mousedown', e => { if (e.target === bg || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
  return bg;
}
function closeModal() { $('#modal')?.remove(); document.body.style.overflow = ''; }
// กันหน้าค้างเลื่อนไม่ได้บนมือถือ: ถ้าไม่มี modal/หน้าเต็มจอเหลืออยู่ ให้ปลดล็อกการเลื่อนของ body เสมอ
(() => {
  const sync = () => { const b = document.body; if (b && b.style.overflow === 'hidden' && !b.querySelector('#modal, .ck-screen, #adp')) b.style.overflow = ''; };
  const start = () => new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  document.body ? start() : document.addEventListener('DOMContentLoaded', start);
})();
function confirmBox(msg, okText = 'ยืนยัน') {
  return new Promise(res => {
    const m = openModal(`<h2>ยืนยันการทำรายการ</h2><p>${msg}</p><div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="cf-ok">${okText}</button></div>`);
    m.querySelector('#cf-ok').onclick = () => { closeModal(); res(true); };
    m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) res(false); });
  });
}

// ---------- Search state ----------
function defaultSearch() {
  const t = addDays(todayISO(), 1);
  return { q: '', checkIn: t, checkOut: addDays(t, 1), adults: 2, children: 0, childAges: [], rooms: 1 };
}
let S = (() => {
  const s = { ...defaultSearch(), ...LS.get('search', {}) };
  if (s.checkIn < todayISO() || s.checkOut <= s.checkIn) { const d = defaultSearch(); s.checkIn = d.checkIn; s.checkOut = d.checkOut; }
  return s;
})();
const saveSearch = () => LS.set('search', S);
const nights = () => Math.max(1, diffDays(S.checkIn, S.checkOut));
const guestsText = () => `ผู้ใหญ่ ${S.adults}${S.children ? `, เด็ก ${S.children}` : ''} · ${S.rooms} ห้อง`;
function searchQuery(extra = {}) {
  const p = new URLSearchParams({ q: S.q, in: S.checkIn, out: S.checkOut, a: S.adults, c: S.children, r: S.rooms, ...extra });
  return p.toString();
}
function readSearchFromParams(p) {
  if (p.has('q')) S.q = p.get('q');
  if (p.get('in') && p.get('in') >= todayISO()) S.checkIn = p.get('in');
  if (p.get('out') && p.get('out') > S.checkIn) S.checkOut = p.get('out'); else if (S.checkOut <= S.checkIn) S.checkOut = addDays(S.checkIn, 1);
  if (p.get('a')) S.adults = Math.max(1, +p.get('a'));
  if (p.has('c')) S.children = Math.max(0, +p.get('c'));
  if (p.get('r')) S.rooms = Math.max(1, +p.get('r'));
  saveSearch();
}

// ---------- Search box component ----------
function searchBoxHtml(mode = 'hero') {
  const fields = `
    <div class="field" data-pop="dest"><i class="fa-solid fa-magnifying-glass icon"></i>
      <input id="sb-q" placeholder="ระบุหาด ชื่อที่พัก หรือสิ่งที่ต้องการ เช่น สัตว์เลี้ยงเข้าพักได้ ติดทะเล เช่า จยย" value="${esc(S.q)}" autocomplete="off">
    </div>
    <div class="field date-field" data-pop="cal">
      <div><i class="fa-regular fa-calendar icon"></i><span class="lbl" data-edit="search.checkin">เช็คอิน</span><span class="val" id="sb-in">${fmtDate(S.checkIn)}</span></div>
      <div><span class="lbl" data-edit="search.checkout">เช็คเอาท์</span><span class="val" id="sb-out">${fmtDate(S.checkOut)}</span></div>
    </div>
    <div class="field" data-pop="guests"><i class="fa-regular fa-user icon"></i>
      <span class="lbl" data-edit="search.guests">ผู้เข้าพัก · ห้อง</span><span class="val" id="sb-g">${guestsText()}</span>
    </div>`;
  if (mode === 'mini') return `<div class="search-bar-mini"><div class="container"><div class="mini-grid sb-root" style="position:relative">${fields}<button class="btn btn-lg" id="sb-go"><span data-edit="search.btn">ค้นหา</span></button></div></div></div>`;
  return `
    <div class="search-card sb-root">
      <div class="search-grid" style="position:relative">${fields}</div>
      <button class="btn btn-primary search-btn" id="sb-go"><span data-edit="search.btn">ค้นหา</span></button>
    </div>`;
}

function bindSearchBox(root, onSearch) {
  const sb = $('.sb-root', root);
  if (!sb) return;
  let pop = null, popType = null, acIndex = -1, calOffset = 0, pickingOut = false;
  const q = $('#sb-q', sb);

  const close = () => { pop?.remove(); pop = null; popType = null; $$('.field', sb).forEach(f => f.classList.remove('focus')); };
  const refresh = () => {
    $('#sb-in', sb).textContent = fmtDate(S.checkIn);
    $('#sb-out', sb).textContent = S.checkOut ? fmtDate(S.checkOut) : 'เลือกวันที่';
    $('#sb-g', sb).textContent = guestsText();
  };
  const place = (field, el, right = false) => {
    if (isMobile()) return; // บนมือถือ popover เป็น bottom sheet ตาม CSS
    const fr = field.getBoundingClientRect(), sr = sb.getBoundingClientRect();
    el.style.top = (fr.bottom - sr.top + 8) + 'px';
    if (right) { el.style.right = (sr.right - fr.right) + 'px'; el.style.left = 'auto'; }
    else el.style.left = (fr.left - sr.left) + 'px';
  };
  const openPop = (type) => {
    if (popType === type) return;
    close();
    popType = type;
    const field = $(`[data-pop="${type}"]`, sb);
    field.classList.add('focus');
    pop = document.createElement('div');
    pop.className = 'popover' + (type === 'guests' ? ' guests-pop' : '');
    pop.addEventListener('mousedown', e => e.stopPropagation());
    sb.appendChild(pop);
    if (type === 'dest') { pop.style.minWidth = field.offsetWidth + 'px'; renderAc(); }
    if (type === 'cal') { pickingOut = false; renderCal(); }
    if (type === 'guests') renderGuests();
    place(field, pop, type === 'guests');
  };

  // Autocomplete
  function acItems() {
    const term = q.value.trim().toLowerCase();
    const hotels = DB.hotels();
    if (!term) return DESTINATIONS.map(d => ({ kind: 'city', t: d.name, s: `${d.en} · ${hotels.filter(h => h.city === d.name).length} ที่พัก`, v: d.name }));
    const out = [];
    DESTINATIONS.filter(d => d.name.includes(term) || d.en.toLowerCase().includes(term)).forEach(d => out.push({ kind: 'city', t: d.name, s: `เกาะล้าน · ชลบุรี`, v: d.name }));
    const areas = [...new Set(hotels.filter(h => h.area.toLowerCase().includes(term)).map(h => h.area + '|' + h.city))];
    areas.slice(0, 4).forEach(a => { const [ar, c] = a.split('|'); out.push({ kind: 'area', t: ar, s: `ย่าน · ${c}`, v: ar }); });
    hotels.filter(h => h.name.toLowerCase().includes(term)).slice(0, 6).forEach(h => out.push({ kind: 'hotel', t: h.name, s: `${h.type} · ${h.city}`, v: h.name, id: h.id }));
    // สิ่งที่ลูกค้าต้องการ (สัตว์เลี้ยง / ติดทะเล / เช่ามอเตอร์ไซค์ ...) — พิมพ์บางส่วนหรือพิมพ์ครบประโยคก็เจอ
    AMEN_WORDS.forEach(g => { const k = g[0][0], label = AMENITIES[k][1];
      if (label.toLowerCase().includes(term) || g.slice(1).some(w => w.includes(term) || term.includes(w))) out.push({ kind: 'feat', t: label, s: `สิ่งอำนวยความสะดวก · ${hotels.filter(h => g[0].some(x => h.amenities.includes(x))).length} ที่พัก`, v: g[1] }); });
    return out.slice(0, 10);
  }
  function renderAc() {
    const items = acItems();
    acIndex = Math.min(acIndex, items.length - 1);
    const icon = { city: 'fa-location-dot', area: 'fa-map-pin', hotel: 'fa-hotel', feat: 'fa-wand-magic-sparkles' };
    pop.innerHTML = `<div class="ac-list">${!q.value.trim() ? '<div class="ac-head">ชายหาดยอดนิยมบนเกาะล้าน</div>' : ''}${items.length ? items.map((it, i) => `<div class="ac-item ${i === acIndex ? 'active' : ''}" data-i="${i}"><i class="fa-solid ${icon[it.kind]}"></i><div><div class="t">${esc(it.t)}</div><div class="s">${esc(it.s)}</div></div></div>`).join('') : '<div class="ac-item muted">ไม่พบผลลัพธ์ — ลองคำค้นอื่น</div>'}</div>`;
    $$('.ac-item[data-i]', pop).forEach(el => el.onclick = () => pickAc(items[+el.dataset.i]));
  }
  function pickAc(it) {
    if (!it) return;
    if (it.kind === 'hotel') { close(); S.q = it.v; saveSearch(); go(`/hotel/${it.id}?${searchQuery()}`); return; }
    q.value = it.v; S.q = it.v; saveSearch();
    openPop('cal');
  }
  q.addEventListener('focus', () => openPop('dest'));
  q.addEventListener('input', () => { S.q = q.value; acIndex = -1; if (popType !== 'dest') openPop('dest'); else renderAc(); });
  q.addEventListener('keydown', e => {
    const items = acItems();
    if (e.key === 'ArrowDown') { acIndex = Math.min(items.length - 1, acIndex + 1); renderAc(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { acIndex = Math.max(0, acIndex - 1); renderAc(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (acIndex >= 0) pickAc(items[acIndex]); else { close(); doSearch(); } }
    else if (e.key === 'Escape') close();
  });

  // Calendar
  function monthHtml(y, m, first, last) {
    const start = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = todayISO();
    let cells = TH_DOW.map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < start; i++) cells += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${pad(m + 1)}-${pad(d)}`;
      const dow = new Date(y, m, d).getDay();
      const cls = ['cal-day'];
      if (iso < today) cls.push('past');
      if (dow === 0 || dow === 6) cls.push('weekend');
      if (iso === S.checkIn) cls.push('start');
      if (iso === S.checkOut) cls.push('end');
      if (S.checkOut && iso > S.checkIn && iso < S.checkOut) cls.push('in-range');
      cells += `<div class="${cls.join(' ')}" data-d="${iso}"><span>${d}</span></div>`;
    }
    return `<div class="cal-month"><div class="cal-head"><button data-nav="-1" ${first ? '' : 'style="visibility:hidden"'} ${calOffset <= 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button><span>${TH_MON_FULL[m]} ${y + 543}</span><button data-nav="1" ${last ? '' : 'style="visibility:hidden"'} ${calOffset >= 11 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button></div><div class="cal-grid">${cells}</div></div>`;
  }
  function renderCal() {
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
    const b = new Date(now.getFullYear(), now.getMonth() + calOffset + 1, 1);
    const n = S.checkOut ? diffDays(S.checkIn, S.checkOut) : 0;
    const months = monthHtml(a.getFullYear(), a.getMonth(), true, true);
    pop.innerHTML = `<div class="calendar">${months}</div>
      <div class="cal-foot"><span class="muted">${pickingOut ? 'เลือกวันเช็คเอาท์' : 'เลือกวันเช็คอิน'}${n ? ` · <b style="color:var(--text)">${n} คืน</b>` : ''}</span><span class="small muted"><span class="red">●</span> วันหยุดสุดสัปดาห์ราคาอาจสูงขึ้น</span></div>`;
    $$('[data-nav]', pop).forEach(b => b.onclick = () => { calOffset = Math.max(0, Math.min(11, calOffset + +b.dataset.nav)); renderCal(); });
    $$('.cal-day:not(.past)', pop).forEach(el => el.onclick = () => {
      const d = el.dataset.d;
      if (!pickingOut || d <= S.checkIn) { S.checkIn = d; S.checkOut = ''; pickingOut = true; }
      else {
        if (diffDays(S.checkIn, d) > 30) { toast('จองได้สูงสุด 30 คืนต่อครั้ง', 'err'); return; }
        S.checkOut = d; pickingOut = false; saveSearch(); refresh(); renderCal();
        setTimeout(() => openPop('guests'), 150); return;
      }
      refresh(); renderCal();
    });
  }

  // Guests
  function renderGuests() {
    const row = (k, t, s, min, max) => `<div class="g-row"><div><div class="t">${t}</div><div class="small muted">${s}</div></div><div class="counter"><button data-k="${k}" data-d="-1" ${S[k] <= min ? 'disabled' : ''}>−</button><b>${S[k]}</b><button data-k="${k}" data-d="1" ${S[k] >= max ? 'disabled' : ''}>+</button></div></div>`;
    pop.innerHTML = row('rooms', 'ห้อง', '', 1, Math.min(8, S.adults)) + row('adults', 'ผู้ใหญ่', 'อายุ 18 ปีขึ้นไป', Math.max(1, S.rooms), 30) + row('children', 'เด็ก', 'อายุ 0-17 ปี', 0, 10) +
      (S.children ? `<div class="small muted">อายุของเด็ก (ณ วันเช็คเอาท์)</div><div class="child-ages">${S.childAges.map((a, i) => `<select data-ci="${i}">${Array.from({ length: 18 }, (_, n) => `<option value="${n}" ${n === a ? 'selected' : ''}>${n < 1 ? 'ต่ำกว่า 1' : n} ปี</option>`).join('')}</select>`).join('')}</div>` : '') +
      `<button class="btn btn-primary btn-block" id="g-done" style="margin-top:8px">เสร็จสิ้น</button>`;
    $$('[data-k]', pop).forEach(b => b.onclick = () => {
      const k = b.dataset.k; S[k] += +b.dataset.d;
      if (k === 'children') { while (S.childAges.length < S.children) S.childAges.push(8); S.childAges.length = S.children; }
      if (S.adults < S.rooms) S.rooms = S.adults;
      saveSearch(); refresh(); renderGuests();
    });
    $$('[data-ci]', pop).forEach(s => s.onchange = () => { S.childAges[+s.dataset.ci] = +s.value; saveSearch(); });
    $('#g-done', pop).onclick = close;
  }

  $$('[data-pop]', sb).forEach(f => f.addEventListener('mousedown', e => {
    if (e.target.closest('.popover')) return;
    e.stopPropagation();
    const t = f.dataset.pop;
    if (t === 'dest') { setTimeout(() => q.focus()); openPop('dest'); }
    else if (popType === t) close(); else openPop(t);
  }));
  document.addEventListener('mousedown', function h(e) {
    if (!document.body.contains(sb)) { document.removeEventListener('mousedown', h); return; }
    if (!sb.contains(e.target)) { if (popType === 'cal' && !S.checkOut) { S.checkOut = addDays(S.checkIn, 1); saveSearch(); refresh(); } close(); }
  });


  function doSearch() {
    S.q = q.value.trim();
    if (!S.checkOut) S.checkOut = addDays(S.checkIn, 1);
    saveSearch(); close();
    if (onSearch) onSearch(); else go(`/search?${searchQuery()}`);
  }
  $('#sb-go', sb).onclick = doSearch;
}

// ---------- Layout ----------
function headerHtml() {
  const u = DB.currentUser();
  const path = location.hash.slice(1).split('?')[0] || '/';
  const a = (href, label) => `<a href="#${href}" class="${path === href ? 'active' : ''}">${label}</a>`;
  // หน้าของรีสอร์ทที่อัปโหลดโลโก้ไว้ → แสดงโลโก้ของรีสอร์ทนั้นแทนโลโก้รวม (โลโก้เดียวกับที่ใช้ในเอกสารและใบทะเบียน)
  const rh = (path.match(/^\/hotel\/([^/]+)/) || [])[1], rl = rh ? DB.hotel(decodeURIComponent(rh)) : null;
  const logoLink = rl?.logo
    ? `<a href="#/hotel/${esc(rl.slug || rl.id)}" class="logo logo-img" aria-label="${esc(rl.name)}"><img src="${esc(rl.logo)}" alt="${esc(rl.name)}" style="width:auto;height:auto;max-width:150px;max-height:60px;object-fit:contain"></a>`
    : `<a href="#/" class="logo logo-img" data-img-slot="logo" aria-label="kohlarngo"><img src="${esc(siteImgId('logo', 'assets/logo-800.jpg'))}" alt="kohlarngo" width="108" height="72"></a>`;
  return `<header class="header"><div class="container header-inner">
    <button class="menu-toggle" id="menu-t"><i class="fa-solid fa-bars"></i></button>
    ${logoLink}
    <nav class="nav" id="nav">
      ${a('/', 'หน้าแรก')}${a('/search', 'ค้นหาที่พัก')}${a('/deals', 'ดีลสุดคุ้ม')}${a('/my-bookings', 'การจองของฉัน')}${a('/favorites', 'รายการโปรด')}
    </nav>
    <div class="header-right">
      <button class="btn btn-ghost btn-sm hide-m" title="สกุลเงิน">THB ฿</button>
      ${langSwitcherHtml()}
      ${DB.settings().line ? `<a class="btn btn-ghost btn-sm" href="${esc(socialUrl('line', DB.settings().line))}" target="_blank" rel="noopener" aria-label="LINE"><i class="fa-brands fa-line" style="color:#06c755"></i></a>` : ''}
      ${u ? `<div class="user-chip" id="user-chip" style="cursor:pointer"><span class="avatar">${esc(u.name[0] || '?')}</span><span class="hide-m">${esc(u.name)}</span><i class="fa-solid fa-chevron-down small"></i></div>`
      : `<button class="btn btn-outline btn-sm" data-auth="login">เข้าสู่ระบบ</button><button class="btn btn-primary btn-sm hide-m" data-auth="register">สร้างบัญชี</button>`}
    </div></div></header>`;
}
function bindHeader() {
  $('#menu-t').onclick = () => $('#nav').classList.toggle('open');
  bindLangSwitcher();
  $$('[data-auth]').forEach(b => b.onclick = () => authModal(b.dataset.auth));
  const chip = $('#user-chip');
  if (chip) chip.onclick = e => {
    e.stopPropagation();
    if ($('.dropdown', chip)) return $('.dropdown', chip).remove();
    const u = DB.currentUser();
    const dd = document.createElement('div');
    dd.className = 'dropdown';
    dd.innerHTML = `<div style="padding:8px 12px" class="small muted">${esc(u.email)}</div>
      <a href="#/my-bookings"><i class="fa-solid fa-suitcase"></i> การจองของฉัน</a>
      <a href="#/favorites"><i class="fa-regular fa-heart"></i> รายการโปรด</a>
      <a href="#/profile"><i class="fa-regular fa-user"></i> ข้อมูลส่วนตัว</a>
      <button id="logout"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>`;
    chip.appendChild(dd);
    $('#logout', dd).onclick = async () => { await DB.logout(); toast('ออกจากระบบแล้ว'); render(); };
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }));
  };
}
// ขอตำแหน่ง GPS ครั้งเดียวต่อการกดปุ่ม แล้วล็อกปุ่มไว้ — กดซ้ำต้องยืนยันปลดล็อกก่อน (กันขอตำแหน่งถี่ / ย้ายหมุดโดยไม่ตั้งใจ)
function gpsOnce(btn, ok, fail, opts) {
  if (btn.dataset.gpsBusy) return;
  if (btn.dataset.gpsLock) {
    if (!confirm('ล็อกตำแหน่งไว้แล้ว — ต้องการปลดล็อกและขอตำแหน่งใหม่หรือไม่?')) return;
    delete btn.dataset.gpsLock; btn.innerHTML = btn.dataset.gpsLabel;
  }
  btn.dataset.gpsLabel = btn.innerHTML; btn.dataset.gpsBusy = '1'; btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังหาตำแหน่ง...';
  const done = () => { delete btn.dataset.gpsBusy; btn.disabled = false; };
  navigator.geolocation.getCurrentPosition(pos => {
    done(); btn.dataset.gpsLock = '1'; btn.innerHTML = '<i class="fa-solid fa-lock"></i> ล็อกตำแหน่งแล้ว (กดเพื่อปลดล็อก)'; ok(pos);
  }, e => { done(); btn.innerHTML = btn.dataset.gpsLabel; fail(e); }, opts);
}
function contactLinksHtml() {
  const s = DB.settings();
  const wait = '<span style="opacity:.7">รอกรอกเพิ่มเติม</span>';
  return (s.phone ? `<a href="tel:${esc(s.phone.replace(/[^\d+]/g, ''))}"><i class="fa-solid fa-phone"></i> ${esc(s.phone)}</a>` : `<span><i class="fa-solid fa-phone"></i> โทร: ${wait}</span>`)
    + (s.line ? `<a href="${esc(socialUrl('line', s.line))}" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> LINE ${esc(s.line)}</a>` : `<span><i class="fa-brands fa-line"></i> LINE: ${wait}</span>`)
    + (s.email ? `<a href="mailto:${esc(s.email)}"><i class="fa-solid fa-envelope"></i> ${esc(s.email)}</a>` : '');
}
function footerHtml() {
  return `<footer><div class="container"><div class="foot-grid">
    <div><h4 data-edit="footer.help.title">ช่วยเหลือ</h4><a href="#/help"><span data-edit="footer.help1">ศูนย์ช่วยเหลือ</span></a><a href="#/help"><span data-edit="footer.help2">คำถามที่พบบ่อย</span></a><a href="privacy.html"><span data-edit="footer.help3">นโยบายความเป็นส่วนตัว</span></a><a href="terms.html"><span data-edit="footer.help4">ข้อกำหนดการใช้งาน</span></a>${contactLinksHtml()}</div>
    ${sosFooterHtml()}
    <div><h4 data-edit="footer.dest.title">จุดหมายยอดนิยม</h4>${DESTINATIONS.slice(0, 5).map((d, i) => `<a href="#/search?q=${encodeURIComponent(d.name)}"><span data-edit="footer.dest${i}">ที่พัก${d.name}</span></a>`).join('')}</div>
    <div><h4 data-edit="footer.partner.title">พาร์ทเนอร์</h4><a href="owner.html#/admin/signup"><span data-edit="footer.partner1">ลงทะเบียนรีสอร์ทฟรี</span></a><a href="#/help"><span data-edit="footer.partner2">ร่วมเป็นพันธมิตร</span></a></div>
  </div><div class="foot-bottom"><span data-edit="footer.copy" data-edit-n="${new Date().getFullYear()}">© ${new Date().getFullYear()} kohlarngo — ระบบจองที่พักเกาะล้าน · ราคาทั้งหมดเป็นสกุลเงินบาท (THB)</span></div></div></footer>`;
}

// ---------- Auth modal ----------
function authModal(mode = 'login', after) {
  const isLogin = mode === 'login';
  const m = openModal(`
    <h2>${isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}</h2>
    <p class="muted small" style="margin:0 0 16px">${isLogin ? 'เข้าสู่ระบบเพื่อจัดการการจองและรับส่วนลดพิเศษสำหรับสมาชิก' : 'สมัครฟรี รับส่วนลดสมาชิกทันที'}</p>
    ${isLogin ? '' : `<div class="panel" style="padding:10px 12px;margin:0 0 14px">
      <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="auth-terms" style="margin-top:3px"><span class="terms-lbl">${TERMS_GUEST_LABEL}</span></label>
      <details id="auth-terms-box" style="margin-top:8px"><summary class="small" style="cursor:pointer;color:var(--primary)">อ่านเงื่อนไขทั้งหมด</summary>
        <div style="max-height:200px;overflow:auto;margin:8px 0;font-size:13px;border:1px solid var(--line,#e3e6ec);border-radius:8px;padding:4px 10px">${termsHtml('guest')}</div>
        <button type="button" class="btn btn-sm btn-primary" id="auth-terms-ok"><i class="fa-solid fa-check"></i> ยอมรับเงื่อนไข</button></details>
      <div class="small muted" id="auth-terms-hint" style="margin-top:6px">ติ๊กยอมรับเงื่อนไขก่อน จึงจะสมัครได้</div></div>`}
    ${isLogin ? `<p class="small muted" style="margin:0 0 12px">การดำเนินการต่อด้วย Google/Facebook ครั้งแรกถือเป็นการสมัครสมาชิก และยอมรับ<a href="#/terms" target="_blank" rel="noopener">เงื่อนไขการใช้งาน</a></p>` : ''}
    <div class="oauth-btns">
      <button type="button" class="oauth-btn" data-oauth="google"><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> ดำเนินการต่อด้วย Google</button>
      <button type="button" class="oauth-btn fb" data-oauth="facebook"><i class="fa-brands fa-facebook"></i> ดำเนินการต่อด้วย Facebook</button>
    </div>
    <div class="oauth-or"><span>หรือใช้อีเมล</span></div>
    <form id="auth-f" class="form-grid" style="grid-template-columns:1fr" novalidate>
      ${isLogin ? '' : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fg"><label>ชื่อจริง <span class="red">*</span></label><input name="first" autocomplete="given-name" maxlength="50"><span class="red small fe" data-fe="first"></span></div>
        <div class="fg"><label>นามสกุล <span class="red">*</span></label><input name="last" autocomplete="family-name" maxlength="50"><span class="red small fe" data-fe="last"></span></div></div>
      <div class="fg"><label>เบอร์โทรศัพท์ <span class="red">*</span></label><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="0812345678"><span class="small muted">ใช้ให้รีสอร์ทติดต่อเรื่องการจอง</span><span class="red small fe" data-fe="phone"></span></div>`}
      <div class="fg"><label>อีเมล${isLogin ? '' : ' <span class="red">*</span>'}</label><input name="email" type="email" autocomplete="${isLogin ? 'username' : 'email'}" required><span class="red small fe" data-fe="email"></span></div>
      <div class="fg"><label>รหัสผ่าน${isLogin ? '' : ' <span class="red">*</span>'}</label>
        <div style="position:relative"><input name="pass" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required minlength="${isLogin ? 6 : 8}" style="width:100%;padding-right:44px">
          <button type="button" id="pw-eye" class="btn btn-ghost btn-sm" style="position:absolute;right:2px;top:50%;transform:translateY(-50%)" aria-label="แสดง/ซ่อนรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div>
        ${isLogin ? '' : `<div id="pw-bar" style="height:5px;border-radius:3px;background:#e8ebf0;margin-top:6px;overflow:hidden"><i style="display:block;height:100%;width:0;transition:.2s"></i></div>
        <span class="small muted" id="pw-txt">อย่างน้อย 8 ตัวอักษร ผสมตัวอักษรและตัวเลข</span>`}<span class="red small fe" data-fe="pass"></span></div>
      ${isLogin ? '' : `<div class="fg"><label>ยืนยันรหัสผ่าน <span class="red">*</span></label><input name="pass2" type="password" autocomplete="new-password"><span class="red small fe" data-fe="pass2"></span></div>
      <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="age18" style="margin-top:3px"><span>ข้าพเจ้ามีอายุ 18 ปีบริบูรณ์ขึ้นไป (หรือบรรลุนิติภาวะตามกฎหมาย) <span class="red">*</span></span></label>
      <span class="red small fe" data-fe="age18"></span>
      <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="marketing" style="margin-top:3px"><span>รับข่าวสารโปรโมชั่นและส่วนลดทางอีเมล/โทรศัพท์ (ไม่บังคับ — ยกเลิกได้ทุกเมื่อ)</span></label>`}
      <div class="red small" id="auth-err"></div>
      <button class="btn btn-primary btn-block btn-lg">${isLogin ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}</button>
    </form>
    <p class="small" style="text-align:center;margin:16px 0 0">${isLogin ? 'ยังไม่มีบัญชี? <a href="javascript:" id="sw">สร้างบัญชี</a>' : 'มีบัญชีแล้ว? <a href="javascript:" id="sw">เข้าสู่ระบบ</a>'}</p>`);
  $('#sw', m).onclick = () => authModal(isLogin ? 'register' : 'login', after);
  if (!isLogin) { // ต้องยอมรับเงื่อนไขก่อน ปุ่มสมัครทุกแบบจึงจะกดได้
    const cb = $('#auth-terms', m), gated = () => $$('[data-oauth], #auth-f .btn-primary', m);
    const sync = () => { gated().forEach(x => x.disabled = !cb.checked); $('#auth-terms-hint', m).style.display = cb.checked ? 'none' : ''; };
    cb.onchange = sync; sync();
    $('#auth-terms-ok', m).onclick = () => { cb.checked = true; sync(); $('#auth-terms-box', m).open = false; };
  }
  $('#pw-eye', m).onclick = () => { const i = $('[name=pass]', m), show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#pw-eye i', m).className = show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'; };
  const pwScore = v => (v.length >= 8) + (/[a-zA-Z]/.test(v) && /\d/.test(v)) + (v.length >= 12 || /[^a-zA-Z0-9]/.test(v));
  if (!isLogin) $('[name=pass]', m).addEventListener('input', e => {
    const v = e.target.value, sc = v ? Math.max(1, pwScore(v)) : 0, bar = $('#pw-bar i', m);
    bar.style.width = [0, 34, 67, 100][sc] + '%'; bar.style.background = ['', '#e5484d', '#f5a623', '#2e9e5b'][sc];
    $('#pw-txt', m).textContent = v ? ['', 'รหัสผ่านอ่อน', 'พอใช้ — ลองเพิ่มความยาวหรือสัญลักษณ์', 'รหัสผ่านแข็งแรง'][sc] : 'อย่างน้อย 8 ตัวอักษร ผสมตัวอักษรและตัวเลข';
  });
  $$('[data-oauth]', m).forEach(b => b.onclick = async () => {
    const err = $('#auth-err', m); err.textContent = '';
    if (!isLogin && !$('#auth-terms', m).checked) return err.textContent = 'กรุณาติ๊กยอมรับเงื่อนไขการใช้งานก่อน';
    $$('[data-oauth]', m).forEach(x => x.disabled = true);
    const r = await DB.loginOAuth(b.dataset.oauth); // สำเร็จ = เบราว์เซอร์ถูกพาไปหน้าผู้ให้บริการ
    if (r.error) { $$('[data-oauth]', m).forEach(x => x.disabled = false); err.textContent = r.error; }
  });
  $('#auth-f', m).onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const err = $('#auth-err', m); err.textContent = '';
    $$('.fe', m).forEach(x => x.textContent = '');
    const bad = {}; // ข้อผิดพลาดแสดงใต้ช่องที่กรอกผิด
    if (!/^\S+@\S+\.\S+$/.test((f.email || '').trim())) bad.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (isLogin) { if ((f.pass || '').length < 6) bad.pass = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'; }
    else {
      if (!f.first?.trim()) bad.first = 'กรุณากรอกชื่อจริง';
      if (!f.last?.trim()) bad.last = 'กรุณากรอกนามสกุล';
      const digits = (f.phone || '').replace(/\D/g, '');
      if (digits.length < 9 || digits.length > 15 || !/^\+?[\d\s-]+$/.test((f.phone || '').trim())) bad.phone = 'กรุณากรอกเบอร์โทรให้ถูกต้อง (9-15 หลัก)';
      if ((f.pass || '').length < 8 || !/[a-zA-Z]/.test(f.pass) || !/\d/.test(f.pass)) bad.pass = 'รหัสผ่านอย่างน้อย 8 ตัว และต้องมีทั้งตัวอักษรและตัวเลข';
      else if (f.pass !== f.pass2) bad.pass2 = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
      if (!f.age18) bad.age18 = 'ต้องยืนยันว่ามีอายุ 18 ปีขึ้นไป';
    }
    const keys = Object.keys(bad);
    if (keys.length) { keys.forEach(k => { const el = $(`[data-fe=${k}]`, m); if (el) el.textContent = bad[k]; }); $(`[name=${keys[0]}]`, m)?.focus(); return; }
    if (!isLogin && !$('#auth-terms', m).checked) return err.textContent = 'กรุณาติ๊กยอมรับเงื่อนไขการใช้งานก่อน';
    const btn = $('button.btn-primary', e.target); btn.disabled = true;
    const r = await (isLogin ? DB.login(f.email, f.pass) : DB.register(`${f.first.trim()} ${f.last.trim()}`, f.email, f.pass, f.phone.trim(), !!f.marketing));
    btn.disabled = false;
    if (r.error) return err.textContent = r.error;
    closeModal(); toast(`ยินดีต้อนรับ ${r.user.name}`); after ? after() : render(); termsGate();
  };
}
// ลูกค้าที่ยังไม่เคยยอมรับเงื่อนไข (เช่น เข้าด้วย Google/Facebook ครั้งแรก) ต้องยอมรับก่อนใช้งานต่อ · ไม่ยอมรับ = ออกจากระบบ
function termsGate() {
  const u = DB.currentUser();
  if (!u || u.role !== 'user' || u.termsAt) return;
  let m = openModal(`<h2><i class="fa-solid fa-file-contract"></i> เงื่อนไขการใช้งาน</h2>
    <p class="muted small" style="margin:4px 0 10px">กรุณาอ่านและยอมรับเงื่อนไขก่อนใช้งานบัญชีนี้</p>
    <div style="max-height:46vh;overflow:auto;font-size:13px;border:1px solid var(--line,#e3e6ec);border-radius:8px;padding:4px 10px">${termsHtml('guest')}</div>
    <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin:12px 0"><input type="checkbox" id="tg-ok" style="margin-top:3px"><span class="terms-lbl">${TERMS_GUEST_LABEL}</span></label>
    <div class="red small" id="tg-err"></div>
    <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn btn-ghost" id="tg-no">ไม่ยอมรับ (ออกจากระบบ)</button><button class="btn btn-primary" id="tg-yes" disabled>ยอมรับและใช้งานต่อ</button></div>`);
  const c = m.cloneNode(true); m.replaceWith(c); m = c; // ปิดด้วยการคลิกพื้นหลังไม่ได้ ต้องเลือกยอมรับหรือออกจากระบบ
  m.querySelector('.modal-close')?.remove();
  const cb = m.querySelector('#tg-ok'), yes = m.querySelector('#tg-yes');
  cb.onchange = () => yes.disabled = !cb.checked;
  yes.onclick = async () => { yes.disabled = true; const r = await DB.acceptTerms(); if (r.error) { yes.disabled = false; m.querySelector('#tg-err').textContent = r.error; } else { closeModal(); toast('ขอบคุณที่ยอมรับเงื่อนไข'); } };
  m.querySelector('#tg-no').onclick = async () => { closeModal(); await DB.logout(); render(); toast('ออกจากระบบแล้ว — ต้องยอมรับเงื่อนไขจึงจะใช้งานบัญชีได้'); };
}
function requireLogin(cb) { if (DB.currentUser()) return cb(); authModal('login', cb); }
