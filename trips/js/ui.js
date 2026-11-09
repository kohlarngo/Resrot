// ตัวช่วย UI ร่วมกันทุกหน้า (เว็บลูกค้า + หลังบ้าน)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '฿' + Math.round(+n || 0).toLocaleString('th-TH');
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoOf(d); };
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function fmtDate(iso, withDow = true) {
  if (!iso) return '';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (typeof LANG !== 'undefined' && LANG !== 'th') return d.toLocaleDateString(LANG === 'zh' ? 'zh-CN' : 'en-GB', { weekday: withDow ? 'short' : undefined, day: 'numeric', month: 'short', year: 'numeric' });
  return `${withDow ? TH_DOW[d.getDay()] + ' ' : ''}${d.getDate()} ${TH_MON[d.getMonth()]} ${d.getFullYear() + 543}`;
}
const fmtDateTime = iso => { const d = new Date(iso); return `${fmtDate(isoOf(d), false)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const relTime = iso => { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'เมื่อสักครู่' : s < 3600 ? `${Math.floor(s / 60)} นาทีที่แล้ว` : s < 86400 ? `${Math.floor(s / 3600)} ชม.ที่แล้ว` : `${Math.floor(s / 86400)} วันที่แล้ว`; };
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);
const isMobile = () => innerWidth <= 820;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const DEFAULT_IMG = 'images/hero.jpg';
const imgOr = (u, cat) => u || (cat && CATEGORY_IMG[cat]) || DEFAULT_IMG;
const CATEGORY_IMG = { boat: 'images/cat-speedboat.jpg', activity: 'images/cat-snorkel.jpg', package: 'images/pkg-2d1n.jpg', vehicle: 'images/cat-motorbike.jpg', stay: 'images/stay-de-anchor.jpg', food: 'images/hero.jpg' };
const tripImg = (t, i = 0) => (t.images || [])[i] || CATEGORY_IMG[t.category] || DEFAULT_IMG;
const starsHtml = n => `<span class="stars">${'<i class="fa-solid fa-star"></i>'.repeat(Math.round(n))}</span>`;
const scoreHtml = (s, c) => (+c ? `<span class="score"><b>${(+s).toFixed(1)}</b><span class="c">${T('รีวิว {0} รายการ', c)}</span></span>` : `<span class="small muted">${T('ยังไม่มีรีวิว')}</span>`);
const telUrl = n => 'tel:' + String(n || '').replace(/[^\d+]/g, '');
const socialUrl = (kind, v) => !v ? '' : /^https?:\/\//i.test(v) ? v : kind === 'line' ? `https://line.me/R/ti/p/${encodeURIComponent(v.startsWith('@') ? v : v)}` : `https://facebook.com/${encodeURIComponent(v)}`;

function toast(msg, type = 'ok') {
  const box = $('#toast'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast ' + type;
  el.innerHTML = `<i class="fa-solid ${type === 'ok' ? 'fa-circle-check' : type === 'err' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i>${esc(msg)}`;
  box.appendChild(el); setTimeout(() => el.remove(), 3600);
}
function openModal(html, cls = '') {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal ${cls}"><button class="modal-close" data-close aria-label="ปิด"><i class="fa-solid fa-xmark"></i></button>${html}</div>`;
  bg.addEventListener('mousedown', e => { if (e.target === bg || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(bg); document.body.style.overflow = 'hidden';
  return bg;
}
function closeModal() { $('#modal')?.remove(); document.body.style.overflow = ''; }
function confirmBox(msg, okText = 'ยืนยัน') {
  return new Promise(res => {
    const m = openModal(`<h2>${T('ยืนยัน')}</h2><p>${msg}</p><div class="row" style="justify-content:flex-end;margin-top:20px"><button class="btn btn-ghost" data-close>${T('ยกเลิก')}</button><button class="btn btn-primary" id="cf-ok">${okText}</button></div>`);
    m.querySelector('#cf-ok').onclick = () => { closeModal(); res(true); };
    m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) res(false); });
  });
}
function promptBox(title, label, value = '', multiline = false) {
  return new Promise(res => {
    const m = openModal(`<h2>${esc(title)}</h2><div class="fg"><label>${esc(label)}</label>${multiline ? `<textarea id="pb-v" rows="4">${esc(value)}</textarea>` : `<input id="pb-v" value="${esc(value)}">`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="pb-ok">ตกลง</button></div>`);
    $('#pb-v', m).focus();
    $('#pb-ok', m).onclick = () => { const v = $('#pb-v', m).value; closeModal(); res(v); };
    m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) res(null); });
  });
}
function downloadFile(name, content, type = 'text/plain') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + content], { type: type + ';charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

// ---------- ถ่ายภาพ/เลือกรูป → data URL หรือ URL ----------
function pickFile(accept = 'image/*') {
  return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); });
}

// ---------- หัวเว็บ / ท้ายเว็บลูกค้า ----------
const favs = () => LS.get('favs', []);
const toggleFav = id => { const f = favs(), i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.push(id); LS.set('favs', f); return i < 0; };
function headerHtml() {
  const u = DB.currentUser(), path = location.hash.slice(1).split('?')[0] || '/', s = DB.settings();
  const a = (href, label) => `<a href="#${href}" class="${path === href ? 'active' : ''}">${label}</a>`;
  return `<header class="header"><div class="container header-inner">
    <button class="back-btn" id="back-b" aria-label="${esc(T('ย้อนกลับ'))}"><i class="fa-solid fa-chevron-left"></i></button>
    <button class="menu-toggle" id="menu-t" aria-label="menu"><i class="fa-solid fa-bars"></i></button>
    <a href="#/" class="logo logo-img" aria-label="kohlarngo"><img src="assets/icon-192.png" alt="kohlarngo" width="56" height="56" style="width:56px;height:56px;object-fit:contain"><b class="brand-t">kohlarngo</b></a>
    <nav class="nav" id="nav">${[['#/c/stay', 'ที่พัก', 'fa-bed'], ['#/c/car', 'รถ/มอเตอร์ไซค์', 'fa-motorcycle'], ['#/search?cat=activity', 'กิจกรรมทางน้ำ', 'fa-person-swimming'], ['#/c/boat', 'เรือ/จอดเรือ', 'fa-ship'], ['#/search?cat=package', 'แพ็กเกจ', 'fa-suitcase-rolling'], ['#/search?cat=food', 'ร้านอาหาร', 'fa-utensils']].map(([k, l, i]) => `<a href="${k}"><i class="fa-solid ${i}"></i> ${T(l)}</a>`).join('')}${a('/my-bookings', T('การจองของฉัน'))}</nav>
    <div class="header-right">${langSwitcherHtml()}
      ${s.line ? `<a class="btn btn-ghost btn-sm" href="${esc(socialUrl('line', s.line))}" target="_blank" rel="noopener" aria-label="LINE"><i class="fa-brands fa-line" style="color:#06c755"></i></a>` : ''}
      ${u ? `<div class="user-chip" id="user-chip" style="cursor:pointer"><span class="avatar">${esc((u.name || '?')[0])}</span><span class="hide-m">${esc(u.name)}</span><i class="fa-solid fa-chevron-down small"></i></div>`
      : `<button class="btn btn-outline btn-sm" data-auth="login">${T('เข้าสู่ระบบ')}</button><button class="btn btn-primary btn-sm hide-m" data-auth="register">${T('สร้างบัญชี')}</button>`}
    </div></div></header>`;
}
function bindHeader() {
  $('#menu-t').onclick = () => $('#nav').classList.toggle('open');
  $('#back-b').onclick = () => { // หน้าย่อย: ย้อนหน้าเดิม (ไม่มีประวัติ → หน้าแรก) · หน้าแรก: กลับเว็บที่พัก
    const path = location.hash.slice(1).split('?')[0] || '/';
    if (path !== '/') return history.length > 1 ? history.back() : go('/');
    location.href = (window.KOHLARDGO_CONFIG || {}).HOTEL_SITE || '../';
  };
  bindLangSwitcher(); bindSosLinks($('#header'));
  $$('[data-auth]').forEach(b => b.onclick = () => authModal(b.dataset.auth));
  const chip = $('#user-chip');
  if (chip) chip.onclick = e => {
    e.stopPropagation();
    if ($('.dropdown', chip)) return $('.dropdown', chip).remove();
    const u = DB.currentUser(), dd = document.createElement('div'); dd.className = 'dropdown';
    dd.innerHTML = `<div style="padding:8px 12px" class="small muted">${esc(u.email)}</div>
      <a href="#/my-bookings"><i class="fa-solid fa-suitcase"></i> ${T('การจองของฉัน')}</a><a href="#/favorites"><i class="fa-regular fa-heart"></i> ${T('รายการโปรด')}</a><a href="#/profile"><i class="fa-regular fa-user"></i> ${T('ข้อมูลส่วนตัว')}</a>
      ${isStaff(u) ? `<a href="${u.role === 'owner' ? 'owner' : u.role === 'dev' ? 'dev' : 'admin'}.html"><i class="fa-solid fa-gauge"></i> หลังบ้าน</a>` : ''}
      <button id="logout"><i class="fa-solid fa-right-from-bracket"></i> ${T('ออกจากระบบ')}</button>`;
    chip.appendChild(dd);
    $('#logout', dd).onclick = async () => { await DB.logout(); toast(T('ออกจากระบบแล้ว')); render(); };
    setTimeout(() => document.addEventListener('click', () => dd.remove(), { once: true }));
  };
}
function footerHtml() {
  const s = DB.settings();
  return `<footer><div class="container"><div class="foot-grid">
    <div><h4>${T('ช่วยเหลือ')}</h4><a href="#/help">${T('ศูนย์ช่วยเหลือ')}</a><a href="#/terms">${T('เงื่อนไขการใช้งาน')}</a><a href="#/terms?t=privacy">${T('นโยบายความเป็นส่วนตัว')}</a></div>
    ${sosFooterHtml()}
    <div><h4>${T('หมวดหมู่')}</h4>${Object.entries(CATEGORIES).slice(0, 5).map(([k, v]) => `<a href="#/search?cat=${k}">${T(v.label)}</a>`).join('')}</div>
    <div><h4>${T('สำหรับผู้ให้บริการ')}</h4><a href="owner.html#/admin/signup">${T('ลงทะเบียนเป็นผู้ให้บริการ')}</a><a href="owner.html">${T('เข้าสู่ระบบ')} (owner)</a>
      ${s.phone ? `<a href="${telUrl(s.phone)}"><i class="fa-solid fa-phone"></i> ${esc(s.phone)}</a>` : ''}${s.line ? `<a href="${esc(socialUrl('line', s.line))}" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> LINE ${esc(s.line)}</a>` : ''}</div>
  </div><div class="foot-bottom"><span>© ${new Date().getFullYear()} ${esc(s.legalName)}</span></div></div></footer>`;
}

// ---------- ล็อกอิน / สมัครสมาชิก ----------
function authModal(mode = 'login', after) {
  const isLogin = mode === 'login';
  const m = openModal(`<h2>${isLogin ? T('เข้าสู่ระบบ') : T('สร้างบัญชี')}</h2>
    <div class="oauth-btns"><button type="button" class="oauth-btn" data-oauth="google"><i class="fa-brands fa-google"></i> Google</button><button type="button" class="oauth-btn fb" data-oauth="facebook"><i class="fa-brands fa-facebook"></i> Facebook</button></div>
    <div class="oauth-or"><span>email</span></div>
    <form id="auth-f" class="form-grid" style="grid-template-columns:1fr" novalidate>
      ${isLogin ? '' : `<div class="fg"><label>${T('ชื่อ-นามสกุล')}</label><input name="name" autocomplete="name" maxlength="80"></div><div class="fg"><label>${T('เบอร์โทรศัพท์')}</label><input name="phone" type="tel" autocomplete="tel" maxlength="20"></div>`}
      <div class="fg"><label>Email</label><input name="email" type="email" autocomplete="username"></div>
      <div class="fg"><label>Password</label><input name="pass" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="8"></div>
      ${isLogin ? '' : `<label class="small" style="display:flex;gap:8px"><input type="checkbox" name="ok"><span>ฉันยอมรับ <a href="#/terms" target="_blank">เงื่อนไขการใช้งาน</a> และมีอายุ 18 ปีขึ้นไป</span></label>`}
      <div class="red small" id="auth-err"></div><button class="btn btn-primary btn-block btn-lg">${isLogin ? T('เข้าสู่ระบบ') : T('สร้างบัญชี')}</button>
    </form>
    <p class="small" style="text-align:center;margin:16px 0 0"><a href="javascript:" id="sw">${isLogin ? T('สร้างบัญชี') : T('เข้าสู่ระบบ')}</a></p>`);
  $('#sw', m).onclick = () => authModal(isLogin ? 'register' : 'login', after);
  $$('[data-oauth]', m).forEach(b => b.onclick = () => DB.oauth(b.dataset.oauth).catch(e => ($('#auth-err', m).textContent = e.message)));
  $('#auth-f', m).onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), err = $('#auth-err', m); err.textContent = '';
    if (!/^\S+@\S+\.\S+$/.test((f.email || '').trim())) return err.textContent = 'รูปแบบอีเมลไม่ถูกต้อง';
    if ((f.pass || '').length < (isLogin ? 6 : 8)) return err.textContent = isLogin ? 'กรุณากรอกรหัสผ่าน' : 'รหัสผ่านอย่างน้อย 8 ตัวอักษร';
    if (!isLogin && (!f.name?.trim() || !f.ok)) return err.textContent = 'กรุณากรอกชื่อและยอมรับเงื่อนไข';
    const btn = $('button.btn-primary', e.target); btn.disabled = true;
    try { await (isLogin ? DB.login(f.email, f.pass) : DB.signup(f.name.trim(), f.email, f.pass, f.phone)); }
    catch (ex) { btn.disabled = false; return err.textContent = ex.message; }
    closeModal(); toast(`${DB.currentUser()?.name || ''}`); after ? after() : render();
  };
}
function requireLogin(cb) { if (DB.currentUser()) return cb(); authModal('login', cb); }
