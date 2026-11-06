// ================= หลังบ้าน (owner / admin / dev) — เปลือก, เข้าสู่ระบบ, ส่วนที่ใช้ร่วมกัน =================
const PORTAL_INFO = {
  owner: { title: 'ระบบเจ้าของกิจการ', en: 'Operator Console', headline: 'จัดการทริป<br>รับจองได้ทุกวัน', blurb: 'ลงทริป กิจกรรม เรือ รถ ที่พัก ตั้งราคา ปิด/เปิดวัน รับสลิปและยืนยันการจองได้จากมือถือ', home: 'home',
    bullets: [['fa-ship', 'ลงทริปและตั้งราคาเอง'], ['fa-receipt', 'ตรวจสลิป ยืนยันการจอง'], ['fa-calendar-days', 'ปฏิทินที่ว่างรายวัน/รอบ']] },
  admin: { title: 'ระบบผู้ดูแลแพลตฟอร์ม', en: 'Platform Admin', headline: 'ดูแลทั้งแพลตฟอร์ม<br>ในที่เดียว', blurb: 'อนุมัติผู้ให้บริการ ดูการจองทุกร้าน จัดการโฆษณา โค้ดส่วนลด และแจ้งเหตุฉุกเฉิน', home: 'home',
    bullets: [['fa-handshake', 'อนุมัติผู้ให้บริการ'], ['fa-rectangle-ad', 'โฆษณาและโปรโมชั่น'], ['fa-bell', 'ศูนย์แจ้งเหตุ SOS']] },
  dev: { title: 'ระบบนักพัฒนา', en: 'Developer Console', headline: 'ดูแลระบบ<br>ให้ทำงานราบรื่น', blurb: 'สิทธิ์ผู้ใช้ สถานะระบบ error logs โหมดปิดปรับปรุง และสำรองข้อมูล', home: 'home',
    bullets: [['fa-microchip', 'สถานะระบบ'], ['fa-bug', 'Error logs'], ['fa-user-gear', 'กำหนดบทบาทผู้ใช้']] },
};
const BO_STATUS = { pending: ['รอยืนยัน', 'warn'], confirmed: ['ยืนยันแล้ว', 'ok'], completed: ['เสร็จสิ้น', 'ok'], cancelled: ['ยกเลิก', 'bad'] };
const boPill = s => `<span class="pill ${BO_STATUS[s]?.[1] || ''}">${BO_STATUS[s]?.[0] || s}</span>`;
const shortMoney = n => n >= 1e6 ? '฿' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '฿' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '฿' + Math.round(n);
const pageHead = (title, sub = '', actions = '') => `<div class="bo-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="bo-head-act">${actions}</div>` : ''}</div>`;
const kpi = (icon, tone, label, value, foot = '') => `<div class="kpi"><div class="kpi-top"><span class="kpi-ic ${tone}"><i class="fa-solid ${icon}"></i></span><span class="kpi-l">${label}</span></div><div class="kpi-v">${value}</div>${foot ? `<div class="kpi-f">${foot}</div>` : ''}</div>`;
const fg = (name, label, val = '', attrs = '', tag = 'input') => `<div class="fg"><label>${label}</label>${tag === 'textarea' ? `<textarea name="${name}" ${attrs}>${esc(val)}</textarea>` : `<input name="${name}" value="${esc(val)}" ${attrs}>`}</div>`;
const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '') || 'trip').slice(0, 40);
const bookingsOf = () => DB.bookings();
const payTotal = bks => bks.filter(b => ['confirmed', 'completed'].includes(b.status)).reduce((s, b) => s + b.total, 0);

// ---------- เมนู ----------
const ADMIN_NAV = [
  { g: 'ภาพรวม', items: [['home', 'fa-gauge', 'ภาพรวม'], ['bookings', 'fa-clipboard-list', 'การจองทั้งหมด'], ['sos', 'fa-bell', 'แจ้งเหตุ SOS']] },
  { g: 'จัดการ', items: [['partners', 'fa-handshake', 'ผู้ให้บริการ'], ['trips', 'fa-ship', 'ทริปทั้งหมด'], ['reviews', 'fa-star', 'รีวิว'], ['coupons', 'fa-ticket', 'โค้ดส่วนลด'], ['ads', 'fa-rectangle-ad', 'โฆษณา']] },
  { g: 'ระบบ', items: [['users', 'fa-users', 'ผู้ใช้'], ['settings', 'fa-sliders', 'ตั้งค่าเว็บ'], ['audit', 'fa-clock-rotate-left', 'ประวัติการทำงาน']] },
];
const DEV_NAV = [...ADMIN_NAV, { g: 'นักพัฒนา', items: [['system', 'fa-microchip', 'สถานะระบบ'], ['logs', 'fa-bug', 'Error logs'], ['backup', 'fa-database', 'สำรองข้อมูล']] }];
const OWNER_NAV = [
  { g: 'งานประจำวัน', items: [['home', 'fa-gauge', 'ภาพรวม'], ['bookings', 'fa-clipboard-list', 'การจอง'], ['calendar', 'fa-calendar-days', 'ปฏิทิน / ที่ว่าง']] },
  { g: 'ร้านของฉัน', items: [['trips', 'fa-ship', 'ทริปของฉัน'], ['coupons', 'fa-ticket', 'โค้ดส่วนลด'], ['reviews', 'fa-star', 'รีวิว']] },
  { g: 'บัญชี', items: [['payout', 'fa-building-columns', 'บัญชีรับเงิน'], ['biz', 'fa-store', 'ข้อมูลกิจการ']] },
];
const BO_PAGES = {
  home: (m, p) => (PORTAL === 'owner' ? ownHome : admHome)(m, p),
  bookings: (m, p) => boBookings(m, p),
  calendar: ownCalendar, trips: (m, p) => (PORTAL === 'owner' ? ownTrips : admTrips)(m, p), coupons: boCoupons, reviews: boReviews,
  payout: ownPayout, biz: ownBiz,
  sos: admSos, partners: admPartners, ads: admAds, users: admUsers, settings: admSettings, audit: admAudit,
  system: devSystem, logs: devLogs, backup: devBackup,
};

function boAlerts() {
  const bks = bookingsOf(), me = DB.currentUser(), list = [];
  const pend = bks.filter(b => b.status === 'pending'), slips = pend.filter(b => b.payment.slip && !b.payment.paid).length;
  if (slips) list.push(['fa-receipt', `สลิปรอตรวจ ${slips} รายการ`, '#/admin/bookings?st=pending']);
  const sos = isAdmin(me) ? DB.sos().filter(x => x.status === 'new').length : 0;
  const apps = isAdmin(me) ? DB.users().filter(u => u.role === 'owner' && u.ownerStatus === 'pending').length : 0;
  if (sos) list.push(['fa-bell', `แจ้งเหตุฉุกเฉินใหม่ ${sos} รายการ`, '#/admin/sos']);
  if (apps) list.push(['fa-handshake', `ผู้ให้บริการสมัครใหม่ ${apps} ราย`, '#/admin/partners']);
  if (me.role === 'owner') {
    const p = me.payout || {};
    if (!p.promptpayId && !(p.bankInfo || '').trim()) list.push(['fa-building-columns', 'ยังไม่ได้ตั้งบัญชีรับเงิน — ลูกค้าโอนออนไลน์ไม่ได้', '#/admin/payout']);
    if (!DB.trips(true).length) list.push(['fa-ship', 'ยังไม่มีทริป — เพิ่มทริปแรกของคุณ', '#/admin/trips?new=1']);
  }
  return { list, pend: pend.length, sos, apps };
}

function pageBackoffice(app, params, section) {
  const u = DB.currentUser();
  if (PORTAL === 'owner' && section === 'signup' && (!u || u.role === 'user' || (u.role === 'owner' && u.ownerStatus === 'rejected'))) return boOwnerSignup(app, u);
  const okRole = u && (PORTAL === 'owner' ? u.role === 'owner' : PORTAL === 'dev' ? u.role === 'dev' : isAdmin(u));
  if (!okRole) return boLogin(app, u);
  if (u.role === 'owner' && u.ownerStatus !== 'approved') return boOwnerPending(app, u);
  document.body.dataset.portal = PORTAL;
  const nav = u.role === 'owner' ? OWNER_NAV : u.role === 'dev' ? DEV_NAV : ADMIN_NAV, items = nav.flatMap(g => g.items);
  const item = items.find(i => i[0] === section);
  if (!item) return go('/admin/home', true);
  const R = ROLES[u.role], al = boAlerts();
  const badge = k => (k === 'bookings' ? al.pend : k === 'sos' ? al.sos : k === 'partners' ? al.apps : 0);
  const sideTop = $('#bo-side')?.scrollTop || 0;
  app.innerHTML = `<div class="bo">
    <aside class="bo-side" id="bo-side">
      <a href="#/admin/home" class="bo-brand"><span class="bo-logo"><img src="${esc(u.role === 'owner' && /^https:\/\//i.test(u.biz?.logo || '') ? u.biz.logo : 'assets/icon-192.png')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px"></span><div><b>${esc(u.role === 'owner' ? (u.biz?.name || 'ร้านของฉัน') : DB.settings().bizName)}</b><small>${PORTAL_INFO[PORTAL].en}</small></div></a>
      <div class="bo-me" style="--rc:${R.color}"><span class="bo-av" style="background:${R.color}">${esc((u.name || '?')[0])}</span><div><b>${esc(u.name)}</b><small><i class="fa-solid ${R.icon}"></i> ${R.label}</small></div></div>
      <nav class="bo-nav">${nav.map(g => `<div class="bo-g">${g.g}</div>${g.items.map(([k, ic, l]) => `<a href="#/admin/${k}" class="${k === section ? 'active' : ''}"><i class="fa-solid ${ic}"></i><span>${l}</span>${badge(k) ? `<em>${badge(k)}</em>` : ''}</a>`).join('')}`).join('')}</nav>
      <div class="bo-side-foot"><a href="index.html" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> ดูหน้าเว็บลูกค้า</a><a href="javascript:" id="bo-out"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</a></div>
    </aside><div class="bo-scrim" id="bo-scrim"></div>
    <div class="bo-body"><header class="bo-top"><button class="bo-ib bo-menu" id="bo-menu" aria-label="เมนู"><i class="fa-solid fa-bars"></i>${al.list.length ? `<span class="dot">${al.list.length}</span>` : ''}</button>
      <div class="bo-crumb"><span>${nav.find(g => g.items.includes(item)).g}</span><i class="fa-solid fa-chevron-right"></i><b>${item[2]}</b></div>
      <div class="bo-top-r"><div class="bo-pop-wrap"><button class="bo-ib" id="bo-bell" aria-label="แจ้งเตือน"><i class="fa-regular fa-bell"></i>${al.list.length ? `<span class="dot">${al.list.length}</span>` : ''}</button></div></div></header>
      ${DB.flags().maintenance ? '<div class="bo-banner warn"><i class="fa-solid fa-screwdriver-wrench"></i> เว็บลูกค้าอยู่ในโหมดปิดปรับปรุง</div>' : ''}
      <main class="bo-main" id="bo-main"></main></div></div>`;
  const side = $('#bo-side'); if (sideTop) side.scrollTop = sideTop;
  $('#bo-menu').onclick = () => { side.classList.add('open'); $('#bo-scrim').classList.add('open'); };
  $('#bo-scrim').onclick = () => { side.classList.remove('open'); $('#bo-scrim').classList.remove('open'); };
  $$('.bo-nav a', side).forEach(a => a.addEventListener('click', () => { side.classList.remove('open'); $('#bo-scrim').classList.remove('open'); }));
  $('#bo-out').onclick = async () => { await DB.logout(); render(); };
  $('#bo-bell').onclick = e => {
    e.stopPropagation(); const w = e.currentTarget.parentNode; if ($('.bo-pop', w)) return $('.bo-pop', w).remove();
    w.insertAdjacentHTML('beforeend', `<div class="bo-pop"><div class="bo-pop-h">การแจ้งเตือน</div>${al.list.length ? al.list.map(([ic, t, h]) => `<a class="bo-alert" href="${h}"><span class="kpi-ic warn"><i class="fa-solid ${ic}"></i></span>${t}</a>`).join('') : '<div class="bo-pop-empty">ไม่มีเรื่องค้าง 🎉</div>'}</div>`);
    setTimeout(() => document.addEventListener('click', () => $('.bo-pop', w)?.remove(), { once: true }));
  };
  BO_PAGES[section]($('#bo-main'), params);
}

// ---------- เข้าสู่ระบบ / สมัคร ----------
function loginArt(role) {
  const P = PORTAL_INFO[role], R = ROLES[role];
  return `<div class="bo-login-art"><div class="bo-brand"><span class="bo-logo"><img src="assets/icon-192.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px"></span><div><b>${esc(DB.settings().bizName)}</b><small>${P.en}</small></div></div>
    <div><div class="portal-tag"><i class="fa-solid ${R.icon}"></i> ${P.title}</div><h1>${P.headline}</h1><p>${P.blurb}</p><ul>${P.bullets.map(([ic, t]) => `<li><i class="fa-solid ${ic}"></i> ${t}</li>`).join('')}</ul></div>
    <small>© ${new Date().getFullYear()} ${esc(DB.settings().legalName)}</small></div>`;
}
function boLogin(app, current) {
  const role = PORTAL, P = PORTAL_INFO[role];
  const wrong = current && `คุณเข้าสู่ระบบเป็น <b>${esc(current.email)}</b> (${ROLES[current.role].label}) — หน้านี้สำหรับ${role === 'owner' ? 'เจ้าของกิจการ' : role === 'dev' ? 'นักพัฒนา' : 'ผู้ดูแลแพลตฟอร์ม'}เท่านั้น${role === 'owner' && current.role === 'user' ? ' · <a href="#/admin/signup">สมัครเป็นผู้ให้บริการ</a>' : ''}`;
  app.innerHTML = `<div class="bo-login" data-portal="${role}">${loginArt(role)}<div class="bo-login-form"><form id="bl-f" novalidate>
    <h2>เข้าสู่${P.title}</h2><p class="muted small" style="margin:4px 0 20px">${role === 'owner' ? 'สำหรับผู้ให้บริการที่ลงทะเบียนและได้รับอนุมัติแล้ว' : 'สำหรับทีมงานเท่านั้น'}</p>
    ${wrong ? `<div class="notice warn"><i class="fa-solid fa-circle-info"></i><div>${wrong}<br><a href="javascript:" id="bl-out">ออกจากระบบเพื่อใช้บัญชีอื่น</a></div></div>` : ''}
    <div class="fg"><label>อีเมล</label><input name="email" type="email" autocomplete="username"></div>
    <div class="fg" style="margin-top:14px"><label>รหัสผ่าน</label><input name="pass" type="password" autocomplete="current-password"></div>
    <div class="red small" id="bl-err" style="min-height:20px;margin-top:8px"></div>
    <button class="btn btn-primary btn-block btn-lg">เข้าสู่ระบบ</button>
    ${role === 'owner' ? '<a href="#/admin/signup" class="btn btn-outline btn-block" style="margin-top:10px"><i class="fa-solid fa-store"></i> ยังไม่มีบัญชี? ลงทะเบียนเป็นผู้ให้บริการ</a>' : ''}
    <p class="small muted" style="margin-top:16px"><a href="index.html">← กลับหน้าเว็บลูกค้า</a></p></form></div></div>`;
  $('#bl-out')?.addEventListener('click', async () => { await DB.logout(); render(); });
  $('#bl-f').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $('#bl-err'); err.textContent = '';
    const lock = +sessionStorage.getItem('bo_lock') || 0; if (lock > Date.now()) return err.textContent = `ใส่รหัสผิดหลายครั้ง — ลองใหม่ใน ${Math.ceil((lock - Date.now()) / 1000)} วินาที`;
    const btn = $('button.btn-primary', e.target); btn.disabled = true;
    try { await DB.login(f.email || '', f.pass || ''); sessionStorage.removeItem('bo_fail'); DB.log('auth.login', PORTAL); render(); }
    catch (ex) { btn.disabled = false; err.textContent = ex.message; const n = (+sessionStorage.getItem('bo_fail') || 0) + 1; sessionStorage.setItem('bo_fail', n); if (n >= 5) { sessionStorage.setItem('bo_lock', Date.now() + 60000); sessionStorage.setItem('bo_fail', 0); } }
  };
}
function boOwnerSignup(app, u) {
  const b = u?.biz || {};
  app.innerHTML = `<div class="bo-login" data-portal="owner">${loginArt('owner')}<div class="bo-login-form"><form id="su-f" novalidate style="max-width:520px">
    <h2>ลงทะเบียนเป็นผู้ให้บริการ</h2><p class="muted small" style="margin:4px 0 16px">กรอกข้อมูลกิจการ ทีมงานจะตรวจสอบและอนุมัติภายใน 1-2 วัน</p>
    ${u ? `<div class="notice info"><i class="fa-solid fa-user"></i><div>ใช้บัญชี <b>${esc(u.email)}</b></div></div>` : `<div class="form-grid" style="grid-template-columns:1fr 1fr">${fg('name', 'ชื่อผู้ติดต่อ *', '', 'maxlength="80"')}${fg('email', 'อีเมล *', '', 'type="email" autocomplete="email"')}</div>${fg('pass', 'รหัสผ่าน * (8 ตัวขึ้นไป ผสมตัวเลข)', '', 'type="password" autocomplete="new-password"')}`}
    <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-top:10px">${fg('bizname', 'ชื่อกิจการ / ร้าน *', b.name, 'maxlength="80"')}${fg('phone', 'เบอร์โทร *', b.phone || u?.phone || '', 'type="tel" maxlength="20"')}${fg('line', 'LINE ID', b.line, 'maxlength="60"')}${fg('facebook', 'ลิงก์ Facebook', b.facebook, 'maxlength="200" placeholder="https://facebook.com/..."')}</div>
    <div class="fg" style="margin-top:10px"><label>ประเภทบริการ</label><select name="kind">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${b.kind === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
    <label class="small" style="display:flex;gap:8px;margin-top:10px"><input type="checkbox" name="ok"><span>ฉันยอมรับ<a href="index.html#/terms" target="_blank">เงื่อนไขการใช้งาน</a>และรับรองว่าข้อมูลถูกต้อง</span></label>
    <div class="red small" id="su-err" style="min-height:20px;margin-top:6px"></div><button class="btn btn-primary btn-block btn-lg">ส่งใบสมัคร</button>
    <p class="small" style="margin-top:14px"><a href="#/admin">← มีบัญชีแล้ว เข้าสู่ระบบ</a></p></form></div></div>`;
  $('#su-f').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $('#su-err'); err.textContent = '';
    if (!u && (f.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(f.email) || f.pass.length < 8 || !/\d/.test(f.pass))) return err.textContent = 'กรุณากรอกชื่อ อีเมล และรหัสผ่าน (8 ตัวขึ้นไป มีตัวเลข) ให้ถูกต้อง';
    if (f.bizname.trim().length < 2 || !/^[0-9+\- ]{9,20}$/.test(f.phone.trim())) return err.textContent = 'กรุณากรอกชื่อกิจการและเบอร์โทรให้ถูกต้อง';
    if (!f.ok) return err.textContent = 'กรุณายอมรับเงื่อนไข';
    const btn = $('button.btn-primary', e.target); btn.disabled = true;
    try {
      if (!u) await DB.signup(f.name.trim(), f.email, f.pass, f.phone);
      await rpc('tour_apply_owner', { p_biz: { name: f.bizname.trim(), phone: f.phone.trim(), line: f.line.trim(), facebook: /^https:\/\//.test(f.facebook.trim()) ? f.facebook.trim() : '', kind: f.kind }, p_phone: f.phone.trim() });
      await DB.load(); go('/admin', true);
    } catch (ex) { btn.disabled = false; err.textContent = ex.message; }
  };
}
function boOwnerPending(app, u) {
  const rej = u.ownerStatus === 'rejected';
  app.innerHTML = `<div class="bo-login" data-portal="owner">${loginArt('owner')}<div class="bo-login-form"><div style="max-width:480px"><h2>${rej ? 'ใบสมัครไม่ผ่านการอนุมัติ' : 'รอการอนุมัติ'}</h2>
    <div class="notice ${rej ? 'warn' : 'info'}"><i class="fa-solid ${rej ? 'fa-circle-xmark' : 'fa-hourglass-half'}"></i><div>${rej ? 'กรุณาติดต่อทีมงาน หรือแก้ข้อมูลแล้วสมัครใหม่' : `ทีมงานกำลังตรวจสอบกิจการ <b>${esc(u.biz?.name || '')}</b> เมื่ออนุมัติแล้วจะเข้าใช้งานได้ทันที`}</div></div>
    <div class="row" style="gap:8px;margin-top:16px">${rej ? '<a href="#/admin/signup" class="btn btn-primary">แก้ไขใบสมัคร</a>' : '<button class="btn btn-primary" id="rf">ตรวจสอบสถานะอีกครั้ง</button>'}<button class="btn btn-ghost" id="lo">ออกจากระบบ</button></div></div></div></div>`;
  $('#lo').onclick = async () => { await DB.logout(); render(); };
  $('#rf')?.addEventListener('click', async () => { await DB.load(); render(); });
}

// ---------- แจ้งเตือนการจองใหม่ (เสียง + ข้อความ) ----------
function startBackofficePolling() {
  let known = new Set(DB.bookings().map(b => b.id)), busy = false;
  const beep = () => { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.15, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .6); o.start(); o.stop(c.currentTime + .6); } catch {} };
  setInterval(async () => {
    if (busy || document.hidden || !DB.currentUser() || !isStaff(DB.currentUser())) return; busy = true;
    try {
      await DB.refreshBookings();
      const fresh = DB.bookings().filter(b => !known.has(b.id));
      if (fresh.length) { fresh.forEach(b => known.add(b.id)); beep(); toast(`มีการจองใหม่ ${fresh.length} รายการ`, 'info'); if (!$('#modal') && /\/admin\/(home|bookings|calendar)?$/.test(location.hash.split('?')[0])) render(); }
    } catch {} finally { busy = false; }
  }, 30000);
}

// ================= การจอง (ใช้ร่วม owner/admin) =================
function boBookings(main, params) {
  const st = params.get('st') || 'all', q = (params.get('q') || '').toLowerCase(), from = params.get('from') || '', to = params.get('to') || '';
  const all = bookingsOf(), cnt = k => all.filter(b => k === 'all' || b.status === k).length;
  const list = all.filter(b => (st === 'all' || b.status === st) && (!q || [b.id, b.contact?.name, b.contact?.phone, b.tripName].join(' ').toLowerCase().includes(q)) && (!from || b.date >= from) && (!to || b.date <= to));
  const u = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); return '#/admin/bookings?' + p; };
  main.innerHTML = pageHead('การจอง', 'ตรวจสลิป ยืนยัน และติดตามการจอง', `<button class="btn btn-outline btn-sm" id="exp"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>`) +
    `<div class="tabs">${[['all', 'ทั้งหมด'], ['pending', 'รอยืนยัน'], ['confirmed', 'ยืนยันแล้ว'], ['completed', 'เสร็จสิ้น'], ['cancelled', 'ยกเลิก']].map(([k, l]) => `<a href="${u('st', k === 'all' ? '' : k)}" class="${st === k ? 'on' : ''}">${l} <em>${cnt(k)}</em></a>`).join('')}</div>
    <div class="filters"><div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="fq" value="${esc(params.get('q') || '')}" placeholder="ค้นหารหัสจอง / ชื่อ / เบอร์ / ทริป"></div><div class="f-date">เดินทาง <input type="date" id="ff" value="${from}"> – <input type="date" id="ft" value="${to}"></div></div>
    <div class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>รหัส</th><th>ทริป</th><th>วันเดินทาง</th><th>ลูกค้า</th><th>ยอด</th><th>ชำระ</th><th>สถานะ</th></tr></thead><tbody>
      ${list.map(b => `<tr class="click" data-b="${esc(b.id)}"><td><b>${esc(b.id)}</b><div class="small muted">${relTime(b.createdAt)}</div></td><td>${esc(b.tripName || '')}${b.owner_name ? '' : ''}</td><td>${fmtDate(b.date)}${b.time ? `<div class="small muted">${esc(b.time)}</div>` : ''}</td><td>${esc(b.contact?.name || '')}<div class="small muted">${esc(b.contact?.phone || '')} · ${b.qty} ที่</div></td><td><b>${money(b.total)}</b></td>
        <td>${b.payment.paid ? '<span class="pill ok">ชำระแล้ว</span>' : b.payment.slip ? '<span class="pill bad">สลิปรอตรวจ</span>' : `<span class="pill">${b.payment.method === 'onsite' ? 'จ่ายหน้างาน' : 'รอโอน'}</span>`}</td><td>${boPill(b.status)}</td></tr>`).join('') || '<tr><td colspan="7" class="bo-empty" style="text-align:center;padding:30px">ไม่มีรายการ</td></tr>'}</tbody></table></div></div>`;
  $('#fq').onchange = e => (location.hash = u('q', e.target.value.trim()));
  $('#ff').onchange = e => (location.hash = u('from', e.target.value)); $('#ft').onchange = e => (location.hash = u('to', e.target.value));
  $$('[data-b]', main).forEach(r => r.onclick = () => bookingModal(r.dataset.b));
  $('#exp').onclick = () => downloadFile('bookings.csv', ['รหัส,ทริป,วันเดินทาง,รอบ,ลูกค้า,เบอร์,จำนวน,ยอด,ชำระ,สถานะ,สร้างเมื่อ', ...list.map(b => [b.id, b.tripName, b.date, b.time, b.contact?.name, b.contact?.phone, b.qty, b.total, b.payment.paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ', BO_STATUS[b.status][0], b.createdAt].map(csvCell).join(','))].join('\n'), 'text/csv');
}
function bookingModal(id) {
  const b = DB.booking(id); if (!b) return;
  const t = DB.trip(b.tripId), me = DB.currentUser();
  const m = openModal(`<h2>${esc(b.id)} ${boPill(b.status)}</h2>
    <div class="bk-detail"><div><b>${esc(b.tripName || '')}</b><div>${fmtDate(b.date)}${b.time ? ' · ' + esc(b.time) : ''} · ${b.qty} ที่</div>
      ${(b.items || []).map(it => { const op = (t?.options || []).find(x => x.id === it.o); return op ? `<div class="small muted">${esc(op.name)} × ${it.a}${it.c ? ` + เด็ก ${it.c}` : ''}</div>` : ''; }).join('')}</div>
      <div><b>${esc(b.contact?.name)}</b> · <a href="${telUrl(b.contact?.phone)}">${esc(b.contact?.phone)}</a>${b.contact?.email ? ` · ${esc(b.contact.email)}` : ''}
        ${b.contact?.note ? `<div class="notice info" style="margin-top:6px"><i class="fa-regular fa-comment"></i><div>${esc(b.contact.note)}</div></div>` : ''}${b.pickup?.place ? `<div class="small"><i class="fa-solid fa-van-shuttle"></i> รับที่: ${esc(b.pickup.place)}</div>` : ''}</div>
      <div class="row between"><span>ยอดรวม${b.discount ? ` (ส่วนลด ${money(b.discount)}${b.coupon ? ' ' + esc(b.coupon) : ''})` : ''}</span><b style="font-size:20px">${money(b.total)}</b></div>
      <div>${b.payment.paid ? '<span class="pill ok">ชำระแล้ว</span>' : '<span class="pill">ยังไม่ได้ยืนยันการชำระ</span>'} <span class="small muted">${b.payment.method === 'onsite' ? 'จ่ายหน้างาน' : 'โอน/พร้อมเพย์'}</span></div>
      ${b.payment.slip ? `<div><div class="small muted">สลิป${b.payment.claimedAt ? ' · ' + fmtDateTime(b.payment.claimedAt) : ''}</div><a href="${esc(b.payment.slip)}" target="_blank"><img src="${esc(b.payment.slip)}" alt="slip" style="max-width:260px;max-height:340px;border-radius:8px;border:1px solid var(--bo-line)"></a></div>` : ''}
      <div class="fg"><label>บันทึกภายใน (ลูกค้าไม่เห็น)</label><textarea id="bk-note" rows="2">${esc(DB.note(b.id))}</textarea></div>
      <details><summary class="small muted">ประวัติ (${(b.log || []).length})</summary>${(b.log || []).map(l => `<div class="small">${fmtDateTime(l.at)} · ${esc(l.by)} · ${esc(l.text)}</div>`).join('')}</details></div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:14px">
      ${b.status === 'pending' ? `<button class="btn btn-primary" data-a="confirmed"><i class="fa-solid fa-check"></i> ${b.payment.slip ? 'สลิปถูกต้อง · ยืนยัน' : 'ยืนยันการจอง'}</button>` : ''}
      ${b.status === 'confirmed' ? `<button class="btn btn-primary" data-a="completed"><i class="fa-solid fa-flag-checkered"></i> ทริปเสร็จสิ้น</button>${!b.payment.paid ? '<button class="btn btn-outline" data-a="paid"><i class="fa-solid fa-sack-dollar"></i> รับเงินแล้ว</button>' : ''}` : ''}
      ${['pending', 'confirmed'].includes(b.status) ? '<button class="btn btn-ghost" data-a="cancelled" style="color:var(--bad)"><i class="fa-solid fa-xmark"></i> ปฏิเสธ / ยกเลิก</button>' : ''}
      <button class="btn btn-ghost" data-a="note">บันทึกโน้ต</button></div>`, 'wide');
  $$('[data-a]', m).forEach(btn => btn.onclick = async () => {
    const a = btn.dataset.a;
    try {
      if (a === 'note') await DB.setNote(id, $('#bk-note', m).value.trim());
      else if (a === 'paid') await DB.patchBooking(id, { payment: { ...b.payment, paid: true, paidAt: new Date().toISOString() } }, 'บันทึกว่ารับเงินแล้ว');
      else if (a === 'cancelled') { const why = await promptBox('ปฏิเสธ / ยกเลิกการจอง', 'เหตุผล (ลูกค้าจะเห็น)', '', true); if (why === null) return; await DB.setBookingStatus(id, 'cancelled', 'ยกเลิกโดยผู้ให้บริการ: ' + why); }
      else await DB.setBookingStatus(id, a, a === 'confirmed' ? 'ยืนยันการจอง' : 'ทริปเสร็จสิ้น');
      DB.log('booking.' + a, id); closeModal(); toast('บันทึกแล้ว'); render();
    } catch (e) { toast(e.message, 'err'); }
  });
}

// ================= เจ้าของ: ภาพรวม =================
function ownHome(main) {
  const me = DB.currentUser(), bks = bookingsOf(), today = todayISO(), ym = today.slice(0, 7);
  const pend = bks.filter(b => b.status === 'pending'), slips = pend.filter(b => b.payment.slip && !b.payment.paid);
  const todays = bks.filter(b => b.date === today && ['confirmed', 'pending'].includes(b.status)), month = bks.filter(b => b.date.startsWith(ym));
  const up = bks.filter(b => b.date >= today && ['confirmed', 'pending'].includes(b.status)).sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 8);
  const al = boAlerts();
  main.innerHTML = pageHead(`สวัสดี ${esc(me.name)}`, esc(me.biz?.name || '')) +
    (al.list.length ? al.list.map(([ic, t, h]) => `<a class="notice warn" href="${h}" style="display:flex;text-decoration:none"><i class="fa-solid ${ic}"></i><div>${t} →</div></a>`).join('') : '') +
    `<div class="kpi-grid k4">${kpi('fa-hourglass-half', 'warn', 'รอยืนยัน', pend.length, slips.length ? `สลิปรอตรวจ ${slips.length}` : '')}${kpi('fa-ship', 'info', 'ออกทริปวันนี้', todays.reduce((s, b) => s + b.qty, 0) + ' ที่', `${todays.length} การจอง`)}${kpi('fa-sack-dollar', 'ok', 'ยอดเดือนนี้ (ยืนยันแล้ว)', shortMoney(payTotal(month)), `${month.filter(b => b.status !== 'cancelled').length} การจอง`)}${kpi('fa-star', 'violet', 'คะแนนเฉลี่ย', (() => { const rs = DB.allReviews().filter(r => DB.trip(r.trip_id)?.ownerId === me.id); return rs.length ? (rs.reduce((s, r) => s + +r.score, 0) / rs.length).toFixed(1) : '-'; })())}</div>
    <div class="card"><div class="card-h"><h3><i class="fa-solid fa-calendar-check"></i> การจองที่กำลังจะถึง</h3><a href="#/admin/bookings">ดูทั้งหมด</a></div>
      ${up.length ? `<table class="tbl"><tbody>${up.map(b => `<tr class="click" data-b="${esc(b.id)}"><td>${fmtDate(b.date)}${b.time ? ' ' + esc(b.time) : ''}</td><td>${esc(b.tripName)}</td><td>${esc(b.contact?.name)} · ${b.qty} ที่</td><td>${boPill(b.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="bo-empty">ยังไม่มีการจองที่กำลังจะถึง</div>'}</div>`;
  $$('[data-b]', main).forEach(r => r.onclick = () => bookingModal(r.dataset.b));
}

// ================= เจ้าของ: ปฏิทิน / ที่ว่าง =================
function ownCalendar(main, params) {
  const trips = DB.trips(true); if (!trips.length) { main.innerHTML = pageHead('ปฏิทิน / ที่ว่าง') + '<div class="card bo-empty">ยังไม่มีทริป <a href="#/admin/trips?new=1">เพิ่มทริป</a></div>'; return; }
  const tid = params.get('t') || trips[0].id, t = DB.trip(tid) || trips[0];
  const ym = params.get('m') || todayISO().slice(0, 7), [Y, M] = ym.split('-').map(Number), first = new Date(Y, M - 1, 1), days = new Date(Y, M, 0).getDate();
  const bks = bookingsOf().filter(b => b.tripId === t.id && b.status !== 'cancelled');
  const shift = n => { const d = new Date(Y, M - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const cap = +t.dailyCap || 0;
  main.innerHTML = pageHead('ปฏิทิน / ที่ว่าง', 'กดวันที่เพื่อปิด/เปิดรับจอง · ตัวเลข = ที่จองแล้ว' + (cap ? ` / ${cap}` : ' (ไม่จำกัดจำนวน)'),
    `<select class="sel" id="ct">${trips.map(x => `<option value="${esc(x.id)}" ${x.id === t.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`) +
    `<div class="card"><div class="card-h"><button class="btn btn-ghost btn-sm" id="pm">‹</button><h3>${TH_MON[M - 1]} ${Y + 543}</h3><button class="btn btn-ghost btn-sm" id="nm">›</button></div>
    <div class="cal">${TH_DOW.map(d => `<div class="cal-h">${d}</div>`).join('')}${'<div></div>'.repeat(first.getDay())}${Array.from({ length: days }, (_, i) => {
      const d = `${ym}-${pad(i + 1)}`, taken = bks.filter(b => b.date === d).reduce((s, b) => s + b.qty, 0), closed = (t.closedDates || []).includes(d), past = d < todayISO();
      return `<button class="cal-d ${closed ? 'closed' : ''} ${past ? 'past' : ''} ${taken ? 'has' : ''} ${cap && taken >= cap ? 'full' : ''}" data-d="${d}"><span>${i + 1}</span>${closed ? '<small>ปิด</small>' : taken ? `<small>${taken}${cap ? '/' + cap : ''}</small>` : ''}</button>`; }).join('')}</div></div>
    <div class="card" id="dayinfo"><div class="muted small">เลือกวันที่เพื่อดูรายการจอง</div></div>`;
  const nav = (tt, mm) => (location.hash = `#/admin/calendar?t=${encodeURIComponent(tt)}&m=${mm}`);
  $('#ct').onchange = e => nav(e.target.value, ym); $('#pm').onclick = () => nav(t.id, shift(-1)); $('#nm').onclick = () => nav(t.id, shift(1));
  $$('.cal-d', main).forEach(b => b.onclick = () => {
    const d = b.dataset.d, closed = (t.closedDates || []).includes(d), dl = bks.filter(x => x.date === d);
    $('#dayinfo').innerHTML = `<div class="card-h"><h3>${fmtDate(d)}</h3><button class="btn btn-sm ${closed ? 'btn-primary' : 'btn-outline'}" id="tg">${closed ? 'เปิดรับจองวันนี้' : 'ปิดรับจองวันนี้'}</button></div>
      ${dl.length ? `<table class="tbl"><tbody>${dl.map(x => `<tr class="click" data-b="${esc(x.id)}"><td>${esc(x.time || '-')}</td><td>${esc(x.contact?.name)}</td><td>${x.qty} ที่</td><td>${boPill(x.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="muted small">ไม่มีการจอง</div>'}`;
    $$('#dayinfo [data-b]').forEach(r => r.onclick = () => bookingModal(r.dataset.b));
    $('#tg').onclick = async () => {
      const set = new Set(t.closedDates || []); closed ? set.delete(d) : set.add(d);
      try { await DB.saveTrip({ ...t, closedDates: [...set].sort() }); toast('บันทึกแล้ว'); render(); } catch {}
    };
  });
}

// ================= ทริป (เจ้าของ) =================
function ownTrips(main, params) {
  const list = DB.trips(true);
  main.innerHTML = pageHead('ทริปของฉัน', 'บริการที่แสดงบนหน้าเว็บลูกค้า', '<button class="btn btn-primary" id="nt"><i class="fa-solid fa-plus"></i> เพิ่มทริป</button>') +
    (list.length ? `<div class="card-grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${list.map(t => `<div class="h-card" data-t="${esc(t.id)}"><div class="img"><img src="${esc(tripImg(t))}" alt="" onerror="this.src='${DEFAULT_IMG}'">${t.active === false ? '<span class="badge-off" style="background:#64748b">ปิดอยู่</span>' : t.banned ? '<span class="badge-off">ถูกระงับ</span>' : ''}</div><div class="body"><div class="name">${esc(t.name)}</div><div class="loc">${catLabel(t.category)}</div><div class="price-box"><div class="per">เริ่มต้น</div><div class="price">${isFinite(lowest(t)) ? money(lowest(t)) : '-'}</div></div></div></div>`).join('')}</div>` : '<div class="card bo-empty"><i class="fa-solid fa-ship"></i><h3>ยังไม่มีทริป</h3><p class="muted">เพิ่มทริปแรกเพื่อเริ่มรับจอง</p></div>');
  $('#nt').onclick = () => tripEditor(null);
  $$('[data-t]', main).forEach(c => c.onclick = () => tripEditor(DB.trip(c.dataset.t)));
  if (params.get('new')) tripEditor(null);
}
function tripEditor(t0) {
  const me = DB.currentUser(), isNew = !t0;
  const t = t0 ? JSON.parse(JSON.stringify(t0)) : { id: '', category: 'activity', name: '', images: [], options: [{ id: uid('o'), name: 'มาตรฐาน', price: 1000, unit: 'คน' }], times: [], dailyCap: 0, active: true, closedDates: [] };
  const m = openModal('<div id="te"></div>', 'wide');
  const draw = () => {
    $('#te', m).innerHTML = `<h2>${isNew ? 'เพิ่มทริปใหม่' : 'แก้ไขทริป'}</h2><form id="tf" class="te-form" novalidate>
      <div class="form-grid" style="grid-template-columns:2fr 1fr">${fg('name', 'ชื่อทริป / บริการ *', t.name, 'maxlength="100"')}<div class="fg"><label>หมวดหมู่</label><select name="category">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${t.category === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div></div>
      ${fg('summary', 'คำโปรยสั้นๆ', t.summary, 'maxlength="160"')}${fg('desc', 'รายละเอียด', t.desc, 'rows="5" maxlength="4000"', 'textarea')}
      <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr">${fg('duration', 'ระยะเวลา', t.duration, 'placeholder="เช่น 4 ชั่วโมง"')}${fg('area', 'พื้นที่ / หาด', t.area)}${fg('languages', 'ภาษาที่บริการ', t.languages, 'placeholder="ไทย, English, 中文"')}</div>
      ${fg('meetPoint', 'จุดนัดพบ', t.meetPoint)}
      <h3>รูปภาพ <span class="small muted">(รูปแรกเป็นปก)</span></h3><div class="te-imgs">${(t.images || []).map((u, i) => `<span class="te-im"><img src="${esc(u)}" alt=""><button type="button" data-ri="${i}">×</button></span>`).join('')}<button type="button" class="te-add" id="addimg"><i class="fa-solid fa-camera"></i><span>เพิ่มรูป</span></button></div>
      <h3>ตัวเลือกและราคา</h3><div id="opts">${(t.options || []).map((o, i) => `<div class="te-opt" data-i="${i}"><input data-k="name" value="${esc(o.name)}" placeholder="ชื่อตัวเลือก เช่น ผู้ใหญ่ / เหมาลำ"><input data-k="price" type="number" min="0" value="${esc(o.price)}" placeholder="ราคา"><input data-k="childPrice" type="number" min="0" value="${esc(o.childPrice ?? '')}" placeholder="ราคาเด็ก (ถ้ามี)"><select data-k="unit">${PRICE_UNITS.map(x => `<option ${optUnit(o) === x ? 'selected' : ''}>${x}</option>`).join('')}</select><button type="button" data-ro="${i}" class="btn btn-ghost btn-sm" style="color:var(--bad)">ลบ</button></div>`).join('')}</div>
      <button type="button" class="btn btn-outline btn-sm" id="addopt">+ เพิ่มตัวเลือก</button>
      <div class="form-grid" style="grid-template-columns:1fr 1fr;margin-top:14px">${fg('times', 'รอบเวลา (คั่นด้วย , เว้นว่าง = ไม่มีรอบ)', (t.times || []).join(', '), 'placeholder="09:00, 13:00"')}${fg('dailyCap', 'จำนวนที่รับต่อวัน/รอบ (0 = ไม่จำกัด)', t.dailyCap || 0, 'type="number" min="0"')}</div>
      <div class="form-grid" style="grid-template-columns:1fr 1fr">${fg('includes', 'รวมในราคา (บรรทัดละข้อ)', (t.includes || []).join('\n'), 'rows="4"', 'textarea')}${fg('excludes', 'ไม่รวม (บรรทัดละข้อ)', (t.excludes || []).join('\n'), 'rows="4"', 'textarea')}</div>
      ${fg('cancelPolicy', 'เงื่อนไขการยกเลิก / เลื่อน', t.cancelPolicy, 'rows="3"', 'textarea')}
      <label class="small" style="display:flex;gap:8px;margin:8px 0"><input type="checkbox" name="pickup" ${t.pickup ? 'checked' : ''}> มีบริการรับ-ส่ง (ให้ลูกค้ากรอกจุดรับ)</label>
      <label class="small" style="display:flex;gap:8px;margin:8px 0"><input type="checkbox" name="active" ${t.active !== false ? 'checked' : ''}> เปิดให้จอง (แสดงบนหน้าเว็บ)</label>
      <div class="red small" id="te-err"></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><div>${isNew ? '' : '<button type="button" class="btn btn-ghost" id="del" style="color:var(--bad)">ลบทริป</button>'}</div><div class="row"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary">บันทึก</button></div></div></form>`;
    const f = $('#tf', m);
    $('#addimg', m).onclick = async () => {
      const file = await pickFile(); if (!file) return; const b = $('#addimg', m); b.disabled = true;
      try { sync(); t.images.push(await uploadImage(file)); draw(); } catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); b.disabled = false; }
    };
    $$('[data-ri]', m).forEach(b => b.onclick = () => { sync(); t.images.splice(+b.dataset.ri, 1); draw(); });
    $$('[data-ro]', m).forEach(b => b.onclick = () => { sync(); t.options.splice(+b.dataset.ro, 1); draw(); });
    $('#addopt', m).onclick = () => { sync(); t.options.push({ id: uid('o'), name: '', price: 0, unit: 'คน' }); draw(); };
    $('#del', m)?.addEventListener('click', async () => {
      if (!(await confirmBox('ลบทริปนี้? (หากมีการจองแล้วจะลบไม่ได้ ให้ปิดทริปแทน)'))) return;
      try { await DB.deleteTrip(t.id); closeModal(); toast('ลบแล้ว'); render(); } catch (e) { toast('ลบไม่ได้: ' + (e.message || ''), 'err'); }
    });
    f.onsubmit = async e => {
      e.preventDefault(); sync(); const err = $('#te-err', m); err.textContent = '';
      if (t.name.trim().length < 2) return err.textContent = 'กรุณากรอกชื่อทริป';
      if (!t.options.length || t.options.some(o => !o.name.trim() || !(+o.price >= 0))) return err.textContent = 'ตัวเลือกต้องมีชื่อและราคา';
      if (isNew) t.id = slug(t.name) + '-' + Math.random().toString(36).slice(2, 6);
      t.options = t.options.map(o => ({ ...o, price: +o.price, childPrice: o.childPrice === '' || o.childPrice == null ? undefined : +o.childPrice }));
      const btn = $('button.btn-primary', f); btn.disabled = true;
      try { await DB.saveTrip({ ...t, ownerId: isNew ? me.id : t0.ownerId }); DB.log('trip.save', t.id); closeModal(); toast('บันทึกแล้ว'); render(); } catch { btn.disabled = false; }
    };
    function sync() {
      const v = Object.fromEntries(new FormData(f));
      Object.assign(t, { name: v.name, category: v.category, summary: v.summary, desc: v.desc, duration: v.duration, area: v.area, languages: v.languages, meetPoint: v.meetPoint, cancelPolicy: v.cancelPolicy,
        times: v.times.split(',').map(s => s.trim()).filter(Boolean), dailyCap: +v.dailyCap || 0, includes: v.includes.split('\n').map(s => s.trim()).filter(Boolean), excludes: v.excludes.split('\n').map(s => s.trim()).filter(Boolean),
        pickup: !!v.pickup, active: !!v.active });
      $$('.te-opt', f).forEach(row => { const o = t.options[+row.dataset.i]; $$('[data-k]', row).forEach(i => (o[i.dataset.k] = i.value)); });
    }
  };
  draw();
}

// ================= โค้ดส่วนลด (owner = ของร้าน, admin = ของแพลตฟอร์ม) =================
function boCoupons(main) {
  const me = DB.currentUser(), list = DB.coupons().filter(c => me.role === 'owner' ? c.ownerId === me.id : true);
  main.innerHTML = pageHead('โค้ดส่วนลด', me.role === 'owner' ? 'ใช้ได้กับทริปของร้านคุณเท่านั้น' : 'โค้ดของแพลตฟอร์มใช้ได้ทุกร้าน', '<button class="btn btn-primary" id="nc"><i class="fa-solid fa-plus"></i> สร้างโค้ด</button>') +
    `<div class="card flush"><table class="tbl"><thead><tr><th>โค้ด</th><th>ส่วนลด</th><th>ขั้นต่ำ</th><th>ใช้แล้ว</th><th>หมดอายุ</th><th>สถานะ</th>${me.role !== 'owner' ? '<th>ขอบเขต</th>' : ''}</tr></thead><tbody>
    ${list.map(c => `<tr class="click" data-c="${esc(c.code)}"><td><b>${esc(c.code)}</b><div class="small muted">${esc(c.desc)}</div></td><td>${c.type === 'percent' ? c.value + '%' : money(c.value)}</td><td>${money(c.min)}</td><td>${c.used}${c.maxUses ? '/' + c.maxUses : ''}</td><td>${c.expires ? fmtDate(c.expires, false) : '-'}</td><td>${c.active ? '<span class="pill ok">เปิด</span>' : '<span class="pill">ปิด</span>'}</td>${me.role !== 'owner' ? `<td>${c.ownerId ? 'เฉพาะร้าน' : 'ทุกร้าน'}</td>` : ''}</tr>`).join('') || '<tr><td colspan="7" class="bo-empty" style="text-align:center;padding:24px">ยังไม่มีโค้ด</td></tr>'}</tbody></table></div>`;
  const edit = c0 => {
    const c = c0 || { code: '', type: 'percent', value: 10, min: 0, desc: '', active: true };
    const m = openModal(`<h2>${c0 ? 'แก้ไขโค้ด' : 'สร้างโค้ดส่วนลด'}</h2><form id="cf" class="form-grid" style="grid-template-columns:1fr 1fr">${fg('code', 'โค้ด *', c.code, c0 ? 'readonly' : 'maxlength="20" style="text-transform:uppercase"')}
      <div class="fg"><label>ประเภท</label><select name="type"><option value="percent" ${c.type === 'percent' ? 'selected' : ''}>เปอร์เซ็นต์ (%)</option><option value="fixed" ${c.type === 'fixed' ? 'selected' : ''}>จำนวนเงิน (฿)</option></select></div>
      ${fg('value', 'มูลค่า *', c.value, 'type="number" min="1"')}${fg('min', 'ยอดขั้นต่ำ', c.min, 'type="number" min="0"')}${fg('maxUses', 'จำกัดจำนวนครั้ง (เว้นว่าง = ไม่จำกัด)', c.maxUses || '', 'type="number" min="1"')}${fg('expires', 'หมดอายุ', c.expires || '', 'type="date"')}
      <div class="fg" style="grid-column:1/-1">${fg('desc', 'คำอธิบาย', c.desc)}</div>
      ${me.role !== 'owner' ? `<label class="small" style="grid-column:1/-1"><input type="checkbox" name="scope" ${c.ownerId ? 'disabled' : ''}> (โค้ดแพลตฟอร์ม ใช้ได้ทุกร้าน)</label>` : ''}
      <label class="small" style="grid-column:1/-1;display:flex;gap:8px"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}> เปิดใช้งาน</label><div class="red small" id="cf-err" style="grid-column:1/-1"></div>
      <div class="row" style="grid-column:1/-1;justify-content:space-between">${c0 ? '<button type="button" class="btn btn-ghost" id="cdel" style="color:var(--bad)">ลบ</button>' : '<span></span>'}<button class="btn btn-primary">บันทึก</button></div></form>`);
    $('#cdel', m)?.addEventListener('click', async () => { if (await confirmBox('ลบโค้ดนี้?')) { await DB.deleteCoupon(c.code); closeModal(); render(); } });
    $('#cf', m).onsubmit = async e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), err = $('#cf-err', m);
      if (!/^[A-Za-z0-9_-]{3,20}$/.test(f.code)) return err.textContent = 'โค้ดต้องเป็นตัวอักษร/ตัวเลข 3-20 ตัว';
      if (!(+f.value > 0) || (f.type === 'percent' && +f.value > 100)) return err.textContent = 'มูลค่าไม่ถูกต้อง';
      try { await DB.saveCoupon({ code: f.code, type: f.type, value: +f.value, min: +f.min || 0, desc: f.desc, active: !!f.active, maxUses: +f.maxUses || null, expires: f.expires || null, ownerId: c0 ? c0.ownerId : me.role === 'owner' ? me.id : null }); closeModal(); toast('บันทึกแล้ว'); render(); } catch {}
    };
  };
  $('#nc').onclick = () => edit(null); $$('[data-c]', main).forEach(r => r.onclick = () => edit(list.find(c => c.code === r.dataset.c)));
}

// ================= รีวิว =================
function boReviews(main) {
  const me = DB.currentUser(), mine = id => DB.trip(id)?.ownerId === me.id;
  const list = DB.allReviews().filter(r => me.role !== 'owner' || mine(r.trip_id));
  main.innerHTML = pageHead('รีวิวจากลูกค้า') + (list.length ? list.map(r => `<div class="card"><div class="row between"><div><b>${esc(r.name)}</b> ${starsHtml(r.score)} ${r.visible ? '' : '<span class="pill bad">ซ่อน</span>'}<div class="small muted">${esc(DB.trip(r.trip_id)?.name || '')} · ${relTime(r.created_at)}</div></div>
    <div class="row">${me.role === 'owner' ? `<button class="btn btn-outline btn-sm" data-rp="${r.id}">${r.reply ? 'แก้คำตอบ' : 'ตอบกลับ'}</button>` : `<button class="btn btn-outline btn-sm" data-hd="${r.id}">${r.visible ? 'ซ่อน' : 'แสดง'}</button>`}</div></div><p>${esc(r.comment || '')}</p>${r.reply ? `<div class="notice info"><i class="fa-solid fa-reply"></i><div>${esc(r.reply)}</div></div>` : ''}</div>`).join('') : '<div class="card bo-empty">ยังไม่มีรีวิว</div>');
  $$('[data-rp]', main).forEach(b => b.onclick = async () => { const r = list.find(x => x.id === b.dataset.rp), v = await promptBox('ตอบกลับรีวิว', 'ข้อความ (ลูกค้าทุกคนเห็น)', r.reply || '', true); if (v !== null) { await DB.replyReview(r.id, v.trim() || null); render(); } });
  $$('[data-hd]', main).forEach(b => b.onclick = async () => { const r = list.find(x => x.id === b.dataset.hd); await DB.setReviewVisible(r.id, !r.visible); DB.log('review.visible', r.id); render(); });
}

// ================= เจ้าของ: บัญชีรับเงิน / ข้อมูลกิจการ =================
function ownPayout(main) {
  const p = DB.currentUser().payout || {};
  main.innerHTML = pageHead('บัญชีรับเงิน', 'ลูกค้าจะเห็น QR พร้อมเพย์และข้อมูลนี้ตอนโอนเงิน') + `<form class="card" id="pf" style="max-width:560px">
    ${fg('promptpayId', 'หมายเลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)', p.promptpayId, 'inputmode="numeric" maxlength="17"')}${fg('promptpayName', 'ชื่อบัญชีพร้อมเพย์ (แสดงให้ลูกค้าตรวจก่อนโอน)', p.promptpayName, 'maxlength="80"')}
    ${fg('bankInfo', 'บัญชีธนาคาร (ถ้ามี)', p.bankInfo, 'rows="3" maxlength="300" placeholder="ธนาคาร / เลขบัญชี / ชื่อบัญชี"', 'textarea')}<div class="red small" id="pe"></div><button class="btn btn-primary">บันทึก</button></form>`;
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), id = f.promptpayId.replace(/\D/g, '');
    if (id && ![10, 13].includes(id.length)) return ($('#pe').textContent = 'พร้อมเพย์ต้องเป็นเบอร์ 10 หลัก หรือเลขบัตร 13 หลัก');
    await DB.saveMyProfile({ payout: { promptpayId: id, promptpayName: f.promptpayName.trim(), bankInfo: f.bankInfo.trim() } }); toast('บันทึกแล้ว'); render();
  };
}
function ownBiz(main) {
  const u = DB.currentUser(), b = u.biz || {};
  main.innerHTML = pageHead('ข้อมูลกิจการ', 'แสดงให้ลูกค้าเห็นในหน้าทริป') + `<form class="card" id="bf" style="max-width:560px">
    <div class="row" style="gap:14px;margin-bottom:12px"><img id="lg" src="${esc(b.logo || 'assets/icon-192.png')}" alt="" style="width:72px;height:72px;border-radius:14px;object-fit:cover;border:1px solid var(--bo-line)"><button type="button" class="btn btn-outline btn-sm" id="lgb">เปลี่ยนโลโก้</button></div>
    ${fg('name', 'ชื่อกิจการ', b.name, 'maxlength="80"')}${fg('phone', 'เบอร์โทร', b.phone || u.phone, 'type="tel" maxlength="20"')}${fg('line', 'LINE ID', b.line)}${fg('facebook', 'ลิงก์ Facebook', b.facebook, 'placeholder="https://facebook.com/..."')}<button class="btn btn-primary">บันทึก</button></form>`;
  let logo = b.logo || '';
  $('#lgb').onclick = async () => { const f = await pickFile(); if (!f) return; try { logo = await uploadImage(f); $('#lg').src = logo; } catch (e) { toast(e.message, 'err'); } };
  $('#bf').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); await DB.saveMyProfile({ biz: { ...b, name: f.name.trim(), phone: f.phone.trim(), line: f.line.trim(), facebook: /^https:\/\//.test(f.facebook.trim()) ? f.facebook.trim() : '', logo }, phone: f.phone.trim() }); toast('บันทึกแล้ว'); render(); };
}
