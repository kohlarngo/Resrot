// ================= ระบบหลังบ้าน (Back Office) =================
// แพลตฟอร์มกลาง: เจ้าของรีสอร์ท (owner.html) จัดการรีสอร์ทของตัวเอง · ผู้ดูแลแพลตฟอร์ม (admin.html) ดูแลทั้งระบบ
// สิทธิ์กำหนดใน ROLE_PERMS (store.js) และถูกบังคับที่ฐานข้อมูลด้วย RLS — ข้อมูลของเจ้าของแต่ละรายแยกกันที่ฐานข้อมูล

// [key, icon, label, permission, render] — แต่ละบทบาทมีเมนูของตัวเอง
const BO_NAV_BY_ROLE = {
  // เมนูเจ้าของรีสอร์ท: เรียงตามลำดับที่ใช้จริง ใช้ภาษาง่ายๆ — รายการที่ 6 (ถ้ามี) = เงื่อนไขการแสดงในเมนู
  // โครงสร้างแบบ kohlardgo: แท็บหลักมีแค่ 4 อัน (การจอง · ห้องพัก · หน้ารีสอร์ท · ตารางห้องว่าง) ที่เหลือรวมไว้ในกลุ่มเดียว
  owner: [
    { g: 'งานประจำวัน', items: [
      ['bookings', 'fa-calendar-check', 'การจอง', 'bookings.view', () => boOwnerBookings],
      ['allbookings', 'fa-table-list', 'รายการจองทั้งหมด / ส่งออก CSV', 'bookings.view', () => boBookings],
      ['frontdesk', 'fa-bell-concierge', 'แขกเข้า-ออกวันนี้', 'frontdesk', () => boFrontdesk],
      ['approvals', 'fa-clipboard-check', 'ตรวจสลิป (มุมมองการ์ด)', 'frontdesk', () => boApprovals],
      ['calendar', 'fa-table-cells', 'ตารางห้องว่าง / ปิดห้อง', 'inventory', () => admCalendar],
      ['channels', 'fa-arrows-rotate', 'จองจากช่องทางอื่น', 'inventory', () => boChannels],
      ['today', 'fa-sun', 'ภาพรวมวันนี้', 'ops.view', () => boToday],
      ['links', 'fa-link', 'ลิงก์ส่งลูกค้า', 'hotels.edit', () => boLinks],
    ] },
    { g: 'ตั้งค่ารีสอร์ท', items: [
      ['rooms', 'fa-bed', 'ห้องพัก', 'hotels.edit', () => boRoomsPage],
      ['shop', 'fa-store', 'หน้ารีสอร์ท', 'hotels.edit', () => boShopPage],
      ['coupons', 'fa-ticket', 'โค้ดส่วนลด', 'coupons.edit', () => admCoupons],
      ['payout', 'fa-building-columns', 'บัญชีรับเงิน', 'payout.edit', () => boPayout],
      ['notify', 'fa-bell', 'การแจ้งเตือน', 'team.manage', () => boNotify],
      ['team', 'fa-user-group', 'พนักงานของฉัน', 'team.manage', () => boMyTeam],
    ] },
    { g: 'ยอดขาย & รายงาน', items: [
      ['overview', 'fa-chart-line', 'ยอดขายภาพรวม', 'exec.view', () => boOverview],
      ['reports', 'fa-file-invoice-dollar', 'รายงานการเงิน', 'reports.view', () => boReports],
      ['properties', 'fa-ranking-star', 'เทียบผลงานแต่ละรีสอร์ท', 'exec.view', () => boProperties, () => DB.hotels(true).length > 1],
    ] },
    { g: 'ลูกค้า & รีวิว', items: [
      ['customers', 'fa-users', 'รายชื่อลูกค้า', 'customers.view', () => boCustomers],
      ['reviews', 'fa-star', 'รีวิวจากลูกค้า', 'reviews.view', () => boReviews],
    ] },
    { g: 'อื่นๆ', items: [
      ['hotels', 'fa-hotel', 'ฟอร์มที่พักแบบเต็ม', 'hotels.edit', () => admHotels, () => false],
      ['closure', 'fa-screwdriver-wrench', 'ปิดรีสอร์ท & ปรับปรุง', 'hotels.edit', () => boClosure],
    ] },
  ],
  // แอดมินแพลตฟอร์ม: โครงสร้างแบบ kohlardgo — แท็บหลัก การจอง · ที่พัก · เจ้าของรีสอร์ท แล้วค่อยเป็นภาพรวม/ช่วยเหลือ
  admin: [
    { g: 'จัดการ', items: [
      ['bookings', 'fa-calendar-check', 'การจองทั้งหมด', 'bookings.view', () => boBookings],
      ['hotels', 'fa-hotel', 'ที่พักทั้งหมด', 'hotels.edit', () => admHotels],
      ['partners', 'fa-handshake', 'เจ้าของรีสอร์ท', 'partners.manage', () => boPartners],
      ['coupons', 'fa-ticket', 'โค้ดส่วนลด', 'coupons.edit', () => admCoupons],
    ] },
    { g: 'ภาพรวม & รายงาน', items: [
      ['overview', 'fa-chart-line', 'ภาพรวมแพลตฟอร์ม', 'exec.view', () => boOverview],
      ['properties', 'fa-ranking-star', 'ผลงานทุกรีสอร์ท', 'exec.view', () => boProperties],
      ['reports', 'fa-file-invoice-dollar', 'รายงานการเงิน', 'reports.view', () => boReports],
    ] },
    { g: 'ช่วยเหลือ (Support)', items: [
      ['customers', 'fa-users', 'ลูกค้า', 'customers.view', () => boCustomers],
      ['reviews', 'fa-star', 'รีวิว', 'reviews.view', () => boReviews],
      ['sos', 'fa-bell', 'แจ้งเหตุฉุกเฉิน', 'sos.manage', () => admSos],
    ] },
    { g: 'ระบบ', items: [
      ['tools', 'fa-box-archive', 'สำรอง & กู้คืน', 'data.backup', () => boTools],
    ] },
  ],
  // นักพัฒนา: ตั้งค่าเว็บไซต์ + เครื่องมือเทคนิค
  dev: [
    { g: 'รีสอร์ททุกแห่ง', items: [
      ['media', 'fa-images', 'สไลด์ & รูปรีสอร์ท', 'hotels.media', () => boDevMedia],
      ['devrooms', 'fa-bed', 'ห้อง & รูปห้อง', 'hotels.media', () => boRoomsPage],
      ['content', 'fa-pen-to-square', 'แก้หน้าเว็บ (ข้อความ / สี / รูป)', 'hotels.media', () => boDevContent],
      ['siteimg', 'fa-image', 'รูปทั้งเว็บ (โลโก้ แบนเนอร์ ชายหาด)', 'hotels.media', () => boDevSiteImages],
      ['checkins', 'fa-id-card', 'ทะเบียนผู้เข้าพัก (ดูอย่างเดียว)', 'checkin.view', () => boCheckins],
      ['ads', 'fa-bullhorn', 'โฆษณา', 'ads.manage', () => admAds],
    ] },
    { g: 'เทคนิค', items: [
      ['system', 'fa-microchip', 'สถานะระบบ', 'dev.console', () => boSystem],
      ['logs', 'fa-bug', 'Error logs', 'dev.console', () => boLogs],
      ['data', 'fa-database', 'ข้อมูลดิบ (Data)', 'dev.console', () => boData],
      ['flags', 'fa-toggle-on', 'ฟีเจอร์ & โหมดปิดปรับปรุง', 'flags.edit', () => boFlags],
    ] },
    { g: 'ทีม & เว็บไซต์', items: [
      ['staff', 'fa-users-gear', 'ทีมผู้ดูแล & นักพัฒนา', 'staff.manage', () => boStaff],
      ['audit', 'fa-clock-rotate-left', 'บันทึกการใช้งาน (Audit log)', 'audit.view', () => boAudit],
      ['settings', 'fa-gear', 'ตั้งค่าเว็บไซต์', 'settings.business', () => boSettings],
    ] },
  ],
};
const navFor = role => BO_NAV_BY_ROLE[role] || [];
const BO_PROFILE = ['profile', 'fa-user-gear', 'บัญชีของฉัน', null, () => boProfile];

// ---------- helpers ----------
const BO_ST = { ...STATUS_TH, inhouse: 'กำลังเข้าพัก' };
function boStatus(b) {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.checkedOutAt) return 'completed';
  if (b.checkedInAt) return 'inhouse';
  return bookingStatus(b);
}
const stChip = b => { const s = boStatus(b); return `<span class="status ${s}">${BO_ST[s]}</span>` + (b.cancelReq?.status === 'pending' && s !== 'cancelled' ? ' <span class="pill vip">ขอยกเลิก</span>' : ''); };
const payChip = b => b.payment.paid ? '<span class="pill ok"><i class="fa-solid fa-circle-check"></i> ชำระแล้ว</span>' : b.status === 'cancelled' ? '<span class="pill">—</span>' : b.payment.claimedAt ? '<span class="pill vip"><i class="fa-solid fa-hourglass-half"></i> ลูกค้าแจ้งโอนแล้ว</span>' : '<span class="pill bad"><i class="fa-solid fa-clock"></i> ค้างชำระ</span>';
const netRev = b => b.price.total - (b.price.tax || 0);
const guestName = b => `${b.guest.firstName} ${b.guest.lastName}`.trim();
const roleBadge = r => { const x = ROLES[r] || ROLES.user; return `<span class="role-badge" style="color:${x.color};background:${x.bg}"><i class="fa-solid ${x.icon}"></i> ${x.label}</span>`; };
const shortMoney = n => n >= 1e6 ? '฿' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '฿' + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : '฿' + Math.round(n);
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';
const totalRooms = () => DB.hotels(true).reduce((s, h) => s + h.rooms.reduce((a, r) => a + +r.total, 0), 0);
const relTime = iso => { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'เมื่อสักครู่' : s < 3600 ? `${Math.floor(s / 60)} นาทีที่แล้ว` : s < 86400 ? `${Math.floor(s / 3600)} ชม.ที่แล้ว` : s < 86400 * 7 ? `${Math.floor(s / 86400)} วันที่แล้ว` : fmtDateTime(iso); };
function pageHead(title, sub = '', actions = '') {
  return `<div class="bo-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="bo-head-act">${actions}</div>` : ''}</div>`;
}
function deltaHtml(cur, prev, invert = false) {
  if (!prev) return '<span class="delta flat">ไม่มีข้อมูลเทียบ</span>';
  const d = (cur - prev) / prev, up = d >= 0, flat = Math.abs(d) < 0.005;
  return `<span class="delta ${flat ? 'flat' : (up !== invert) ? 'up' : 'down'}"><i class="fa-solid fa-arrow-${flat ? 'right' : up ? 'up' : 'down'}"></i> ${Math.abs(d * 100).toFixed(1)}% <span>เทียบช่วงก่อน</span></span>`;
}
const kpi = (icon, tone, label, value, foot = '') => `<div class="kpi"><div class="kpi-top"><span class="kpi-ic ${tone}"><i class="fa-solid ${icon}"></i></span><span class="kpi-l">${label}</span></div><div class="kpi-v">${value}</div>${foot ? `<div class="kpi-f">${foot}</div>` : ''}</div>`;
function downloadFile(name, content, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const toCsv = rows => '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const deny = () => toast('คุณไม่มีสิทธิ์ทำรายการนี้', 'err');
function promptBox(title, label, okText = 'ยืนยัน', required = true) {
  return new Promise(res => {
    let done = false;
    const m = openModal(`<h2>${title}</h2><div class="fg" style="margin-top:12px"><label>${label}</label><textarea id="pb-v" rows="3"></textarea></div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="pb-ok">${okText}</button></div>`);
    $('#pb-v', m).focus();
    $('#pb-ok', m).onclick = () => { const v = $('#pb-v', m).value.trim(); if (required && !v) return toast('กรุณากรอกข้อมูล', 'err'); done = true; closeModal(); res(v); };
    m.addEventListener('mousedown', e => { if (!done && (e.target === m || e.target.closest('[data-close]'))) res(null); });
  });
}

// ================= Shell =================
function pageAdmin(app, params, section) {
  const u = DB.currentUser();
  document.body.dataset.portal = PORTAL || '';
  // สมัครเป็นเจ้าของรีสอร์ท (ยังไม่มีบัญชี / บัญชีลูกค้า / ใบสมัครไม่ผ่าน)
  if (PORTAL === 'owner' && section === 'signup' && (!u || u.role === 'user' || (u.role === 'owner' && u.ownerStatus === 'rejected'))) return boOwnerSignup(app, u);
  if (!isStaff(u) || (PORTAL && portalRole(u) !== PORTAL)) return boLogin(app, u);
  if (u.role === 'owner' && u.ownerStatus !== 'approved') return boOwnerPending(app, u);
  const nav = navFor(portalRole(u));
  const items = nav.flatMap(g => g.items);
  const allowed = items.filter(i => can(i[3]));
  const item = section === 'profile' ? BO_PROFILE : items.find(i => i[0] === section);
  const home = PORTAL_INFO[portalRole(u)].home;
  if (!item) return go('/admin/' + (allowed.some(i => i[0] === home) ? home : allowed[0]?.[0] || 'profile'), true);
  const group = nav.find(g => g.items.includes(item))?.g || 'บัญชี';
  const r = ROLES[u.role];
  const alerts = boAlerts();
  const menuBadge = alerts.sos + alerts.arrivals + alerts.approvals + alerts.apps + alerts.svc; // จุดแดงบนปุ่มเมนูมือถือ: มีงานค้างในเมนูด้านใน (ตัวเลขเท่ากับป้ายแดงข้างเมนู)
  const sideTop = $('#bo-side')?.scrollTop || 0; // จำตำแหน่งเลื่อนของเมนูด้านข้าง
  app.innerHTML = `<div class="bo">
    <aside class="bo-side" id="bo-side">
      <a href="#/admin" class="bo-brand"><span class="bo-logo"><img src="${esc(siteImgId('icon', 'assets/icon-192.png'))}" alt=""></span><div><b>${esc(u.role === 'owner' ? (u.biz?.resortName || u.name) : DB.settings().bizName)}</b><small>${PORTAL_INFO[portalRole(u)].title} · v${APP_VERSION}</small></div></a>
      <div class="bo-me" style="--rc:${r.color}"><span class="bo-av" style="background:${r.color}">${esc(u.name[0] || '?')}</span><div><b>${esc(u.name)}</b><small><i class="fa-solid ${r.icon}"></i> ${r.label}</small></div></div>
      <nav class="bo-nav">${nav.map(g => { const its = g.items.filter(i => can(i[3]) && (!i[5] || i[5]() || i[0] === item[0])); return its.length ? `<div class="bo-g">${g.g}</div>${its.map(([k, ic, l]) => `<a href="#/admin/${k}" class="${k === item[0] ? 'active' : ''}"><i class="fa-solid ${ic}"></i><span>${l}</span>${k === 'sos' && alerts.sos ? `<em>${alerts.sos}</em>` : k === 'frontdesk' && alerts.arrivals ? `<em>${alerts.arrivals}</em>` : k === 'approvals' && alerts.approvals ? `<em>${alerts.approvals}</em>` : k === 'partners' && alerts.apps ? `<em>${alerts.apps}</em>` : k === 'media' && alerts.svc ? `<em>${alerts.svc}</em>` : ''}</a>`).join('')}` : ''; }).join('')}</nav>
    </aside>
    <div class="bo-scrim" id="bo-scrim"></div>
    <div class="bo-body">
      <header class="bo-top">
        <button class="bo-ib bo-menu" id="bo-menu" aria-label="เมนู"><i class="fa-solid fa-bars"></i>${menuBadge ? `<span class="dot">${menuBadge > 99 ? '99+' : menuBadge}</span>` : ''}</button>
        <div class="bo-crumb"><span>${group}</span><i class="fa-solid fa-chevron-right"></i><b>${item[2]}</b></div>
        ${can('bookings.view') ? `<div class="bo-search"><i class="fa-solid fa-magnifying-glass"></i><input id="bo-q" placeholder="ค้นหารหัสจอง / ชื่อแขก / เบอร์โทร" autocomplete="off"><div class="bo-sres" id="bo-sres"></div></div>` : '<div style="flex:1"></div>'}
        <div class="bo-top-r">
          <div class="bo-pop-wrap"><button class="bo-ib" id="bo-bell" aria-label="การแจ้งเตือน"><i class="fa-regular fa-bell"></i>${alerts.list.length ? `<span class="dot">${alerts.list.length}</span>` : ''}</button></div>
          <div class="bo-pop-wrap"><button class="bo-user" id="bo-user"><span class="bo-av sm" style="background:${r.color}">${esc(u.name[0] || '?')}</span><span class="hide-m">${esc(u.name)}</span><i class="fa-solid fa-chevron-down small"></i></button></div>
        </div>
      </header>
      ${DB.flags().maintenance ? '<div class="bo-banner warn"><i class="fa-solid fa-screwdriver-wrench"></i> เว็บไซต์ลูกค้าอยู่ในโหมดปิดปรับปรุง — ลูกค้าจะไม่สามารถจองได้</div>' : ''}
      <main class="bo-main" id="bo-main"></main>
    </div></div>`;
  const main = $('#bo-main');
  const side = $('#bo-side'); if (side && sideTop) side.scrollTop = sideTop;
  if (item[3] && !can(item[3])) main.innerHTML = `<div class="bo-empty"><i class="fa-solid fa-lock"></i><h3>ไม่มีสิทธิ์เข้าถึงหน้านี้</h3><p class="muted">บทบาท "${r.label}" ไม่มีสิทธิ์ "${PERMS[item[3]]}"</p><a class="btn btn-primary" href="#/admin">กลับหน้าหลัก</a></div>`;
  else item[4]()(main, params);
  bindShell(alerts);
}

function boAlerts() {
  const today = todayISO(), bks = DB.bookings().filter(b => b.status !== 'cancelled');
  const list = [];
  let approvals = 0, arrivals = 0, apps = 0;
  // เจ้าของรีสอร์ท: งานที่ต้องตัดสินใจ
  if (can('frontdesk')) {
    const pend = bks.filter(b => b.status === 'pending');
    approvals = pend.filter(readyToApprove).length;
    const slips = pend.filter(b => b.payment.slip && !b.payment.paid).length;
    if (slips) list.push(['fa-receipt', 'bad', `ลูกค้าส่งสลิปแล้ว รอตรวจ ${slips} รายการ`, '#/admin/approvals']);
    const atHotel = pend.filter(b => !b.payment.slip && b.payment.method === 'hotel').length;
    if (atHotel) list.push(['fa-clipboard-check', 'warn', `การจองชำระที่ที่พัก รออนุมัติ ${atHotel} รายการ`, '#/admin/approvals']);
    arrivals = bks.filter(b => b.checkIn === today && b.status === 'confirmed' && !b.checkedInAt).length;
    if (arrivals) list.push(['fa-plane-arrival', 'warn', `แขกรอเช็คอินวันนี้ ${arrivals} รายการ`, '#/admin/frontdesk']);
    const deps = bks.filter(b => b.checkedInAt && !b.checkedOutAt && b.checkOut <= today).length;
    if (deps) list.push(['fa-door-open', 'warn', `แขกครบกำหนดเช็คเอาท์ ${deps} รายการ`, '#/admin/frontdesk?tab=departures']);
  }
  if (can('payout.edit')) {
    const p = DB.currentUser().payout || {};
    if (!isPromptpayId(p.promptpayId) && !(p.bankInfo || '').trim()) list.push(['fa-building-columns', 'warn', 'ยังไม่ได้ตั้งค่าบัญชีรับเงิน — ลูกค้าโอนเงินออนไลน์ไม่ได้', '#/admin/payout']);
  }
  // ผู้ดูแลแพลตฟอร์ม: ใบสมัครใหม่ และเจ้าของรีสอร์ทที่ตอบช้า
  if (can('partners.manage')) {
    apps = DB.users().filter(u => u.role === 'owner' && u.ownerStatus === 'pending' && u.active !== false).length;
    if (apps) list.push(['fa-handshake', 'bad', `รีสอร์ทสมัครใหม่ รออนุมัติ ${apps} ราย`, '#/admin/partners']);
    const stale = bks.filter(b => b.status === 'pending' && b.payment.slip && Date.now() - new Date(b.payment.claimedAt) > 24 * 36e5).length;
    if (stale) list.push(['fa-user-clock', 'warn', `สลิปที่เจ้าของรีสอร์ทยังไม่ตรวจเกิน 24 ชม. ${stale} รายการ`, '#/admin/bookings?st=pending']);
  }
  const sos = can('sos.manage') ? DB.sos().filter(x => x.status === 'new').length : 0;
  if (sos) list.push(['fa-bell', 'bad', `แจ้งเหตุฉุกเฉินใหม่ ${sos} รายการ`, '#/admin/sos']);
  if (can('dev.console')) {
    const errs = DB.errors().filter(e => Date.now() - new Date(e.at) < 864e5).length;
    if (errs) list.push(['fa-bug', 'bad', `พบ error ใน 24 ชม. ${errs} รายการ`, '#/admin/logs']);
  }
  if (can('staff.manage')) {
    const fails = DB.audit().filter(a => a.action === 'auth.fail' && Date.now() - new Date(a.at) < 864e5).length;
    if (fails >= 3) list.push(['fa-shield-halved', 'bad', `มีการใส่รหัสผ่านผิด ${fails} ครั้งใน 24 ชม.`, '#/admin/audit']);
  }
  const svc = can('hotels.media') ? DB.serviceRequests().length : 0;
  if (svc) list.push(['fa-arrows-rotate', 'bad', `รีสอร์ทขอใช้ซิงก์ iCal (Plus) ${svc} รายการ`, '#/admin/media']);
  return { list, sos, arrivals, approvals, apps, svc };
}

function bindShell(alerts) {
  const side = $('#bo-side'), scrim = $('#bo-scrim');
  $('#bo-menu').onclick = () => { side.classList.add('open'); scrim.classList.add('open'); };
  scrim.onclick = () => { side.classList.remove('open'); scrim.classList.remove('open'); };
  const popup = (btn, html) => {
    const wrap = btn.parentElement;
    if ($('.bo-pop', wrap)) return $('.bo-pop', wrap).remove();
    $$('.bo-pop').forEach(p => p.remove());
    const p = document.createElement('div'); p.className = 'bo-pop'; p.innerHTML = html; wrap.appendChild(p);
    p.addEventListener('click', e => e.stopPropagation());
    setTimeout(() => document.addEventListener('click', () => p.remove(), { once: true }));
    return p;
  };
  $('#bo-bell').onclick = e => popup(e.currentTarget, `<div class="bo-pop-h">การแจ้งเตือน</div>${alerts.list.length ? alerts.list.map(([ic, t, l, h]) => `<a href="${h}" class="bo-alert"><span class="kpi-ic ${t}"><i class="fa-solid ${ic}"></i></span>${l}</a>`).join('') : '<div class="bo-pop-empty"><i class="fa-regular fa-circle-check"></i> ไม่มีรายการที่ต้องดำเนินการ</div>'}`);
  $('#bo-user').onclick = e => {
    const u = DB.currentUser();
    const p = popup(e.currentTarget, `<div class="bo-pop-h">${esc(u.email)}<div style="margin-top:6px">${roleBadge(u.role)}</div></div>
      <a href="#/admin/profile"><i class="fa-solid fa-user-gear"></i> บัญชีของฉัน</a>
      <a href="${siteUrl()}" target="_blank" rel="noopener"><i class="fa-solid fa-globe"></i> เปิดหน้าเว็บ</a>
      <button id="bo-out" class="red"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button>`);
    $('#bo-out', p).onclick = async () => { await DB.logout(); toast('ออกจากระบบแล้ว'); go('/admin'); };
  };
  const q = $('#bo-q');
  if (q) {
    const res = $('#bo-sres');
    const find = () => {
      const t = q.value.trim().toLowerCase();
      if (!t) return (res.innerHTML = '', res.classList.remove('open'));
      const hits = DB.bookings().filter(b => [b.id, guestName(b), b.guest.email, b.guest.phone].join(' ').toLowerCase().includes(t)).slice(0, 7);
      res.innerHTML = hits.length ? hits.map(b => `<button data-sid="${b.id}"><b>${b.id}</b><span>${esc(guestName(b))} · ${esc(b.hotelName)}</span>${stChip(b)}</button>`).join('') + `<a href="#/admin/bookings?q=${encodeURIComponent(q.value.trim())}">ดูผลลัพธ์ทั้งหมดในหน้าการจอง →</a>` : '<div class="bo-pop-empty">ไม่พบการจอง</div>';
      res.classList.add('open');
      $$('[data-sid]', res).forEach(b => b.onmousedown = e => { e.preventDefault(); res.classList.remove('open'); bookingDrawer(b.dataset.sid); });
    };
    q.oninput = debounce(find, 150);
    q.onfocus = find;
    q.onblur = () => setTimeout(() => res.classList.remove('open'), 150);
    q.onkeydown = e => { if (e.key === 'Enter') { const first = $('[data-sid]', res); if (first) { res.classList.remove('open'); bookingDrawer(first.dataset.sid); } } if (e.key === 'Escape') q.blur(); };
  }
}

// ================= Login =================
// ข้อมูลของแต่ละหน้าหลังบ้าน (owner.html / admin.html)
const PORTAL_INFO = {
  owner: { title: 'ระบบเจ้าของรีสอร์ท', en: 'Resort Owner', home: 'bookings', headline: 'จัดการรีสอร์ทของคุณ<br>ฟรี ครบในที่เดียว', blurb: 'ลงห้องพัก ตั้งราคา ตรวจสลิป และอนุมัติการจองเอง — ลูกค้าโอนเงินเข้าบัญชีคุณโดยตรง',
    bullets: [['fa-clipboard-check', 'ตรวจสลิปโอนเงิน แล้วกดอนุมัติ / ปฏิเสธการจอง'], ['fa-hotel', 'จัดการรูป ห้อง ราคา และจำนวนห้องว่าง'], ['fa-qrcode', 'รับเงินผ่านพร้อมเพย์ / บัญชีของคุณเอง'], ['fa-chart-line', 'ดูยอดขาย อัตราเข้าพัก และรายงาน']] },
  admin: { title: 'ระบบผู้ดูแลแพลตฟอร์ม', en: 'Platform Admin', home: 'overview', headline: 'ดูแลแพลตฟอร์ม<br>และพาร์ทเนอร์ทั้งหมด', blurb: 'อนุมัติรีสอร์ทใหม่ ดูภาพรวมทั้งระบบ และช่วยเหลือเจ้าของรีสอร์ทกับลูกค้า',
    bullets: [['fa-handshake', 'อนุมัติ / ระงับเจ้าของรีสอร์ทที่สมัครเข้ามา'], ['fa-chart-line', 'ภาพรวมการจองและยอดขายทั้งแพลตฟอร์ม'], ['fa-life-ring', 'ช่วยแก้ปัญหาการจองให้ลูกค้าและเจ้าของรีสอร์ท'], ['fa-box-archive', 'สำรอง & กู้คืนข้อมูล']] },
  dev: { title: 'ระบบนักพัฒนา', en: 'Developer Console', home: 'media', headline: 'ดูแลระบบ<br>ให้ทำงานราบรื่น', blurb: 'จัดการทีมงาน สถานะระบบ error logs ข้อมูลดิบ โหมดปิดปรับปรุง และตั้งค่าเว็บไซต์',
    bullets: [['fa-microchip', 'สถานะระบบ & ตรวจความถูกต้องของข้อมูล'], ['fa-bug', 'Error logs จากผู้ใช้ทุกเครื่อง'], ['fa-users-gear', 'เพิ่ม / ระงับ / รีเซ็ตรหัสทีมผู้ดูแลและนักพัฒนา'], ['fa-gear', 'ตั้งค่าเว็บไซต์ โหมดปิดปรับปรุง และประกาศ']] },
};
const portalLink = role => `<a href="${portalUrl(role)}">${PORTAL_INFO[role].title} (${role}.html)</a>`;
function loginArt(role) {
  const P = PORTAL_INFO[role], R = ROLES[role];
  return `<div class="bo-login-art">
      <div class="bo-brand"><span class="bo-logo"><img src="${esc(siteImgId('icon', 'assets/icon-192.png'))}" alt=""></span><div><b>${esc(DB.settings().bizName)}</b><small>${P.en}</small></div></div>
      <img class="bo-login-logo" src="${esc(siteImgId('logo', 'assets/logo-800.jpg'))}" alt="kohlarngo — ชมรมรีสอร์ท & ที่พัก เกาะล้าน" width="320" height="213">
      <div><div class="portal-tag"><i class="fa-solid ${R.icon}"></i> ${P.title}</div><h1>${P.headline}</h1><p>${P.blurb}</p>
        <ul>${P.bullets.map(([ic, t]) => `<li><i class="fa-solid ${ic}"></i> ${t}</li>`).join('')}</ul></div>
      <small>© ${new Date().getFullYear()} ${esc(DB.settings().legalName)}</small>
    </div>`;
}
function boLogin(app, current) {
  const role = PORTAL || 'admin', P = PORTAL_INFO[role], R = ROLES[role];
  // เข้าสู่ระบบอยู่แล้วแต่เป็นบทบาทอื่น → แนะนำหน้าที่ถูกต้อง
  const wrong = current && (isStaff(current)
    ? `คุณเข้าสู่ระบบเป็น <b>${esc(current.email)}</b> (${ROLES[current.role].label}) — หน้านี้สำหรับ${R.label}เท่านั้น`
    : `คุณเข้าสู่ระบบเป็น <b>${esc(current.email)}</b> (ลูกค้า)${role === 'owner' ? ` — <a href="#/admin/signup">สมัครเป็นเจ้าของรีสอร์ทด้วยบัญชีนี้</a>` : ' ซึ่งไม่มีสิทธิ์เข้าหลังบ้าน'}`);
  app.innerHTML = `<div class="bo-login">${loginArt(role)}
    <div class="bo-login-form"><form id="bl-f" novalidate>
      <h2>เข้าสู่${P.title}</h2><p class="muted small" style="margin:4px 0 20px">${role === 'owner' ? 'สำหรับเจ้าของรีสอร์ทที่ลงทะเบียนกับแพลตฟอร์มแล้ว' : role === 'dev' ? 'สำหรับทีมนักพัฒนาเท่านั้น' : 'สำหรับทีมผู้ดูแลแพลตฟอร์มเท่านั้น'}</p>
      ${wrong ? `<div class="notice warn"><i class="fa-solid fa-circle-info"></i><div>${wrong}<br><a href="javascript:" id="bl-out">ออกจากระบบเพื่อใช้บัญชีอื่น</a></div></div>` : ''}
      <div class="fg"><label>อีเมล</label><input name="email" type="email" autocomplete="username" placeholder="name@company.com"></div>
      <div class="fg" style="margin-top:14px"><label>รหัสผ่าน</label><div class="pw-wrap"><input name="pass" type="password" autocomplete="current-password"><button type="button" id="bl-eye" aria-label="แสดงรหัสผ่าน"><i class="fa-regular fa-eye"></i></button></div></div>
      <div class="red small" id="bl-err" style="min-height:20px;margin-top:8px"></div>
      <button class="btn btn-primary btn-block btn-lg">เข้าสู่ระบบ</button>
      ${role === 'owner' ? '<a href="#/admin/signup" class="btn btn-outline btn-block" style="margin-top:10px"><i class="fa-solid fa-store"></i> ยังไม่มีบัญชี? ลงทะเบียนรีสอร์ทฟรี</a>' : ''}
    </form></div></div>`;
  const f = $('#bl-f'), err = $('#bl-err');
  $('#bl-eye').onclick = () => { const i = $('[name=pass]', f); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('#bl-out')?.addEventListener('click', async () => { await DB.logout(); render(); });
  const attempt = async (email, pass) => {
    const lock = +sessionStorage.getItem('bo_lock') || 0;
    if (lock > Date.now()) return err.textContent = `ใส่รหัสผิดหลายครั้ง — ลองใหม่ใน ${Math.ceil((lock - Date.now()) / 1000)} วินาที`;
    const btn = $('button.btn-primary', f); btn.disabled = true; err.textContent = '';
    const r = await DB.login(email, pass);
    btn.disabled = false;
    if (r.error) {
      const n = (+sessionStorage.getItem('bo_fail') || 0) + 1;
      sessionStorage.setItem('bo_fail', n);
      if (n >= 5) { sessionStorage.setItem('bo_lock', Date.now() + 60000); sessionStorage.setItem('bo_fail', 0); }
      return err.textContent = r.error;
    }
    sessionStorage.removeItem('bo_fail');
    if (PORTAL && portalRole(r.user) !== PORTAL) return go('/admin', true); // บทบาทไม่ตรงกับหน้านี้ — หน้าเข้าสู่ระบบจะแนะนำหน้าที่ถูกต้อง
    toast(`ยินดีต้อนรับ ${r.user.name}`); go('/admin', true);
  };
  f.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)); if (!v.email || !v.pass) return err.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน'; attempt(v.email, v.pass); };
}

// ---- ตำแหน่ง GPS / โซน / บัตรประชาชน (ใช้ตอนสมัครเจ้าของรีสอร์ท) ----
const geoKm = (a, b) => { const R = 6371, rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2)); };
// หาโซน (หาด/ย่าน) ที่ใกล้พิกัดที่สุดให้อัตโนมัติ
const nearestZone = (lat, lng) => DESTINATIONS.map(d => ({ d, km: geoKm({ lat, lng }, d) })).sort((a, b) => a.km - b.km)[0];
const KOH_LARN = { latMin: 12.88, latMax: 12.96, lngMin: 100.74, lngMax: 100.82 };
const onKohLarn = (lat, lng) => lat >= KOH_LARN.latMin && lat <= KOH_LARN.latMax && lng >= KOH_LARN.lngMin && lng <= KOH_LARN.lngMax;
// อ่านพิกัดจากลิงก์ Google Maps หรือข้อความ "lat,lng"
function parseLatLng(s) {
  s = decodeURIComponent(String(s || '')).trim();
  const pats = [/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, /^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/];
  for (const re of pats) { const m = s.match(re); if (m) return { lat: +m[1], lng: +m[2] }; }
  return null;
}
// เลขบัตรประชาชนไทย 13 หลัก (ตรวจเลขหลักสุดท้าย)
function validThaiId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  let s = 0; for (let i = 0; i < 12; i++) s += +id[i] * (13 - i);
  return (11 - (s % 11)) % 10 === +id[12];
}
const maskId = id => id ? String(id).replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, 'x-xxxx-xxxxx-$4-$5') : '';

// ดูรูปบัตรประชาชนของผู้สมัคร (bucket ส่วนตัว — ลิงก์ชั่วคราว 10 นาที)
async function showIdCard(path) {
  const m = openModal(`<h2><i class="fa-solid fa-id-card"></i> รูปบัตรประชาชน</h2><div id="idc-body" class="center" style="min-height:120px;margin-top:10px"><i class="fa-solid fa-spinner fa-spin"></i></div><p class="small muted" style="margin-top:8px">ข้อมูลส่วนบุคคล — ใช้ตรวจสอบตัวตนเท่านั้น ห้ามเผยแพร่</p><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn btn-ghost" data-close>ปิด</button></div>`);
  const url = await DB.idCardUrl(path);
  $('#idc-body', m).innerHTML = url ? `<img src="${esc(url)}" alt="บัตรประชาชน" style="max-width:100%;border-radius:8px">` : '<span class="red">เปิดรูปไม่ได้</span>';
}

// ลงทะเบียนรีสอร์ท (owner.html#/admin/signup) — สมัครฟรี แล้วรอผู้ดูแลแพลตฟอร์มอนุมัติ
function boOwnerSignup(app, current) {
  if (!boOwnerSignup.accepted) return boOwnerTermsGate(app, current);
  return boOwnerSignupForm(app, current);
}
// ขั้นที่ 1: อ่านและยอมรับเงื่อนไขสมาชิกก่อน จึงจะเห็นฟอร์มสมัคร
function boOwnerTermsGate(app, current) {
  app.innerHTML = `<div class="bo-login">${loginArt('owner')}
    <div class="bo-login-form"><div style="max-width:620px;width:100%">
      <h2>เงื่อนไขการสมัครรีสอร์ทสมาชิก</h2><p class="muted small" style="margin:4px 0 12px">กรุณาอ่านเงื่อนไขก่อนลงทะเบียน (ขั้นที่ 1 จาก 2)</p>
      <div style="max-height:52vh;overflow:auto;border:1px solid var(--bo-line);border-radius:10px;padding:4px 12px;font-size:14px">${termsHtml('partner')}</div>
      <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-top:14px"><input type="checkbox" id="tg-ok" style="margin-top:3px"><span>${TERMS_PARTNER_LABEL}</span></label>
      <div class="red small" id="tg-err" style="min-height:20px;margin-top:6px"></div>
      <button class="btn btn-primary btn-block btn-lg" id="tg-go">ยอมรับและดำเนินการต่อ</button>
      <a href="#/admin" class="small muted" style="display:block;text-align:center;margin-top:12px">มีบัญชีแล้ว? เข้าสู่ระบบ</a>
    </div></div></div>`;
  $('#tg-go').onclick = () => { if (!$('#tg-ok').checked) return $('#tg-err').textContent = 'กรุณาติ๊กยอมรับเงื่อนไขสมาชิกก่อนดำเนินการต่อ'; boOwnerSignup.accepted = new Date().toISOString(); boOwnerSignupForm(app, current); };
}
function boOwnerSignupForm(app, current) {
  const b = current?.biz || {};
  const fg = (k, l, v = '', attrs = '', full = false) => `<div class="fg ${full ? 'full' : ''}"><label>${l}</label><input name="${k}" value="${esc(v)}" ${attrs}></div>`;
  app.innerHTML = `<div class="bo-login">${loginArt('owner')}
    <div class="bo-login-form"><form id="su-f" novalidate style="max-width:520px">
      <h2>ลงทะเบียนรีสอร์ทฟรี</h2><div class="small" style="color:#0a8f3c;margin-top:2px"><i class="fa-solid fa-circle-check"></i> ยอมรับเงื่อนไขสมาชิกแล้ว (ขั้นที่ 2 จาก 2)</div><p class="muted small" style="margin:4px 0 16px">กรอกข้อมูลรีสอร์ท — ทีมงานแพลตฟอร์มจะตรวจสอบและอนุมัติให้เปิดขายห้องพัก</p>
      ${current?.ownerStatus === 'rejected' ? `<div class="notice warn"><i class="fa-solid fa-circle-info"></i><div>ใบสมัครก่อนหน้าไม่ผ่าน${current.ownerNote ? `: ${esc(current.ownerNote)}` : ''} — แก้ไขแล้วส่งใหม่ได้</div></div>` : ''}
      <div class="form-grid">
        ${fg('resortName', 'ชื่อรีสอร์ท / ที่พัก <span class="req">*</span>', b.resortName, 'maxlength="100"', true)}
        ${fg('name', 'ชื่อ-นามสกุลเจ้าของ <span class="req">*</span>', current?.name || '', 'maxlength="100"')}
        ${fg('phone', 'เบอร์โทร <span class="req">*</span>', b.phone || current?.phone || '', 'type="tel" maxlength="20"')}
        ${fg('line', 'LINE ID', b.line, 'maxlength="60"')}
        ${fg('rooms', 'จำนวนห้องโดยประมาณ', b.rooms, 'maxlength="20"')}
        <div class="fg full"><label>ตำแหน่งรีสอร์ท (GPS) <span class="req">*</span></label>
          <div class="row wrap" style="gap:8px"><button type="button" class="btn btn-outline btn-sm" id="su-gps"><i class="fa-solid fa-location-crosshairs"></i> ใช้ตำแหน่งปัจจุบันของฉัน</button></div>
          <input id="su-map" placeholder="หรือวางลิงก์ Google Maps / พิกัด เช่น 12.9225, 100.7902" style="margin-top:8px">
          <input type="hidden" name="lat" value="${esc(b.lat ?? '')}"><input type="hidden" name="lng" value="${esc(b.lng ?? '')}"><input type="hidden" name="location" value="${esc(b.location || '')}">
          <div class="small" id="su-zone" style="margin-top:6px"></div></div>
        ${fg('idNumber', 'เลขบัตรประชาชนเจ้าของ (13 หลัก) <span class="req">*</span>', '', 'inputmode="numeric" maxlength="13" autocomplete="off" placeholder="x-xxxx-xxxxx-xx-x"')}
        <div class="fg"><label>รูปบัตรประชาชน (ถ่ายหน้าบัตร) <span class="req">*</span></label><input type="file" name="idPhoto" accept="image/*"></div>
        <div class="full small muted"><i class="fa-solid fa-lock"></i> ใช้ยืนยันตัวตนเจ้าของเท่านั้น เก็บเป็นความลับ เฉพาะทีมงานแพลตฟอร์มที่ตรวจสอบใบสมัครเห็นได้ ไม่แสดงต่อลูกค้า</div>
        <div class="fg full"><label>รายละเอียดเพิ่มเติม</label><textarea name="note" rows="2" maxlength="1000" placeholder="เช่น ลิงก์ Facebook / Google Maps ของรีสอร์ท">${esc(b.note || '')}</textarea></div>
        ${current ? `<div class="full small muted">ส่งใบสมัครด้วยบัญชี <b>${esc(current.email)}</b></div>` : `
        ${fg('email', 'อีเมล (ใช้เข้าสู่ระบบ) <span class="req">*</span>', '', 'type="email" autocomplete="username"')}
        ${fg('pass', 'ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว) <span class="req">*</span>', '', 'type="password" autocomplete="new-password"')}`}
      </div>
      <div class="red small" id="su-err" style="min-height:20px;margin-top:8px"></div>
      <button class="btn btn-primary btn-block btn-lg">ส่งใบสมัคร</button>
      <a href="#/admin" class="small muted" style="display:block;text-align:center;margin-top:12px">มีบัญชีแล้ว? เข้าสู่ระบบ</a>
    </form></div></div>`;
  const f = $('#su-f'), err = $('#su-err');
  // GPS → ระบบหาโซน (หาด / ย่าน) ให้เอง ไม่ต้องกรอก
  const showZone = () => {
    const lat = parseFloat(f.lat.value), lng = parseFloat(f.lng.value), z = $('#su-zone');
    if (isNaN(lat) || isNaN(lng)) { z.innerHTML = '<span class="muted">ยังไม่ได้เลือกตำแหน่ง</span>'; return; }
    if (!onKohLarn(lat, lng)) { f.location.value = ''; z.innerHTML = `<span class="red"><i class="fa-solid fa-triangle-exclamation"></i> พิกัด ${lat.toFixed(5)}, ${lng.toFixed(5)} อยู่นอกเกาะล้าน — ตรวจสอบอีกครั้ง</span>`; return; }
    const { d, km } = nearestZone(lat, lng); f.location.value = d.name;
    z.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#0a8f3c"></i> ตรวจพบโซน: <b>${esc(d.name)}</b> <span class="muted">(พิกัด ${lat.toFixed(5)}, ${lng.toFixed(5)} · ห่างจุดกลางโซน ${km.toFixed(1)} กม.)</span> · <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener">ดูบนแผนที่</a>`;
  };
  const setLL = (lat, lng) => { f.lat.value = (+lat).toFixed(6); f.lng.value = (+lng).toFixed(6); showZone(); };
  $('#su-gps').onclick = () => {
    if (!navigator.geolocation) return err.textContent = 'เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง — วางลิงก์ Google Maps แทน';
    err.textContent = '';
    gpsOnce($('#su-gps'), pos => setLL(pos.coords.latitude, pos.coords.longitude), () => err.textContent = 'หาตำแหน่งไม่ได้ — อนุญาตการเข้าถึงตำแหน่ง หรือวางลิงก์ Google Maps แทน', { enableHighAccuracy: true, timeout: 15000 });
  };
  $('#su-map').oninput = e => { const r = parseLatLng(e.target.value); if (r) setLL(r.lat, r.lng); else if (e.target.value.trim()) $('#su-zone').innerHTML = '<span class="muted">อ่านพิกัดไม่ได้ — ใช้ลิงก์ที่มีพิกัด (ไม่ใช่ลิงก์ย่อ maps.app.goo.gl) หรือกดปุ่ม "ใช้ตำแหน่งปัจจุบัน"</span>'; };
  showZone();
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    const lat = parseFloat(v.lat), lng = parseFloat(v.lng), idFile = f.idPhoto.files[0];
    if (!boOwnerSignup.accepted) return boOwnerSignup(app, current);
    if (isNaN(lat) || isNaN(lng)) return err.textContent = 'กรุณาระบุตำแหน่ง GPS ของรีสอร์ท';
    if (!onKohLarn(lat, lng)) return err.textContent = 'ตำแหน่งอยู่นอกเกาะล้าน — ตรวจสอบพิกัดอีกครั้ง';
    v.idNumber = String(v.idNumber || '').replace(/\D/g, '');
    if (!validThaiId(v.idNumber)) return err.textContent = 'เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)';
    if (!idFile) return err.textContent = 'กรุณาแนบรูปบัตรประชาชน';
    if (!v.resortName.trim() || !v.name.trim()) return err.textContent = 'กรุณากรอกชื่อรีสอร์ทและชื่อเจ้าของ';
    if (v.phone.replace(/\D/g, '').length < 9) return err.textContent = 'กรุณากรอกเบอร์โทรที่ติดต่อได้';
    const btn = $('button.btn-primary', f); btn.disabled = true; err.textContent = '';
    try {
      if (!current) {
        if (!/^\S+@\S+\.\S+$/.test(v.email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
        if ((v.pass || '').length < 8) throw new Error('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
        const r = await DB.register(v.name, v.email, v.pass, v.phone);
        if (r.error) throw new Error(r.error === 'อีเมลนี้ถูกใช้งานแล้ว' ? 'อีเมลนี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบก่อน แล้วกด "สมัครเป็นเจ้าของรีสอร์ทด้วยบัญชีนี้"' : r.error);
      }
      await DB.applyOwner({ resortName: v.resortName, name: v.name, phone: v.phone, line: v.line, rooms: v.rooms, location: v.location, lat, lng, idNumber: v.idNumber, note: v.note, terms: true }, idFile);
      toast('ส่งใบสมัครแล้ว — รอทีมงานอนุมัติ'); go('/admin', true);
    } catch (x) { err.textContent = x.message; btn.disabled = false; }
  };
}

// เจ้าของที่ยังไม่ได้รับอนุมัติ (รออนุมัติ / ไม่ผ่าน)
function boOwnerPending(app, u) {
  const b = u.biz || {}, rejected = u.ownerStatus === 'rejected';
  app.innerHTML = `<div class="bo-login">${loginArt('owner')}
    <div class="bo-login-form"><div style="max-width:480px">
      <div class="pending-badge ${rejected ? 'bad' : ''}"><i class="fa-solid ${rejected ? 'fa-circle-xmark' : 'fa-hourglass-half'}"></i></div>
      <h2>${rejected ? 'ใบสมัครยังไม่ผ่านการอนุมัติ' : 'ได้รับใบสมัครแล้ว — รออนุมัติ'}</h2>
      <p class="muted">${rejected ? (u.ownerNote ? `เหตุผล: <b>${esc(u.ownerNote)}</b><br>` : '') + 'แก้ไขข้อมูลแล้วส่งใหม่ได้' : 'ทีมงานแพลตฟอร์มจะตรวจสอบข้อมูลและติดต่อกลับโดยเร็ว เมื่อได้รับอนุมัติคุณจะเริ่มลงห้องพักและรับจองได้ทันที'}</p>
      <div class="cred"><div><span>รีสอร์ท</span><b>${esc(b.resortName || '-')}</b></div><div><span>ผู้สมัคร</span><b>${esc(u.name)} · ${esc(b.phone || u.phone || '')}</b></div><div><span>อีเมล</span><b>${esc(u.email)}</b></div><div><span>ส่งเมื่อ</span><b>${u.appliedAt ? fmtDateTime(u.appliedAt) : '-'}</b></div></div>
      <div class="row wrap" style="margin-top:16px">${rejected ? '<a class="btn btn-primary" href="#/admin/signup"><i class="fa-solid fa-pen"></i> แก้ไขและส่งใหม่</a>' : '<button class="btn btn-outline" id="pd-refresh"><i class="fa-solid fa-rotate"></i> ตรวจสอบสถานะ</button>'}
        <button class="btn btn-ghost" id="pd-out"><i class="fa-solid fa-right-from-bracket"></i> ออกจากระบบ</button></div>
      <p class="small muted" style="margin-top:16px">ติดต่อทีมงาน: ${esc(DB.settings().phone)} · LINE ${esc(DB.settings().line)}</p>
    </div></div></div>`;
  $('#pd-out').onclick = async () => { await DB.logout(); render(); };
  $('#pd-refresh')?.addEventListener('click', async () => { await DB.load(); render(); });
}

// ================= Booking drawer & actions =================
// ส่วน "คำขอยกเลิก" ในลิ้นชักการจอง: ธนาคาร/เลขบัญชี/ชื่อบัญชีที่ลูกค้าแจ้งไว้รับเงินคืน
function cancelReqSecHtml(b) {
  const c = b.cancelReq; if (!c) return '';
  const chip = { pending: '<span class="pill vip">รอคุณยืนยัน</span>', approved: b.refundedAt ? '<span class="pill ok">โอนคืนแล้ว</span>' : '<span class="pill vip">ยืนยันแล้ว — รอโอนคืน</span>', rejected: '<span class="pill">ปฏิเสธแล้ว</span>' }[c.status] || '';
  const row = (l, v) => `<div class="dl"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="dr-sec"><h4><i class="fa-solid fa-rotate-left"></i> คำขอยกเลิก ${chip}</h4>
    <div class="small muted" style="margin-bottom:6px">ลูกค้าขอเมื่อ ${fmtDateTime(c.at)} · ยอดที่ต้องโอนคืน <b>${money(b.refund || b.price.total)}</b></div>
    ${row('ธนาคาร', esc(c.bank))}${row('เลขบัญชี', esc(c.account))}${row('ชื่อบัญชี', esc(c.name))}
    ${c.reason ? row('เหตุผลที่ปฏิเสธ', esc(c.reason)) : ''}${b.refundedAt ? row('โอนคืนเมื่อ', fmtDateTime(b.refundedAt)) : ''}</div>`;
}
async function bkAction(id, act, refresh = () => render()) {
  const b = DB.booking(id);
  if (!b) return false;
  const u = DB.currentUser(), now = new Date().toISOString();
  let patch = null, log = '', msg = '';
  if (act === 'pay' || act === 'confirm') {
    if (!can('bookings.edit')) return deny();
    patch = act === 'pay' ? { payment: { ...b.payment, paid: true, paidAt: now, paidBy: u.name }, status: b.status === 'pending' ? 'confirmed' : b.status } : { status: 'confirmed', confirmedAt: now };
    log = 'booking.' + act; msg = act === 'pay' ? 'บันทึกการรับชำระเงินแล้ว' : 'ยืนยันการจองแล้ว';
  } else if (act === 'approve') {
    if (!can('bookings.edit')) return deny();
    const online = PAY_ONLINE.includes(b.payment.method);
    if (online && !b.payment.paid && !b.payment.slip && !(await confirmBox(`การจอง ${b.id} <b>ยังไม่มีสลิป</b><br>ยืนยันว่าได้รับเงิน ${money(b.price.total)} เข้าบัญชีแล้ว?`, 'ได้รับเงินแล้ว — อนุมัติ'))) return false;
    patch = { status: 'confirmed', confirmedAt: now, approvedBy: u.name };
    if (online && !b.payment.paid) patch.payment = { ...b.payment, paid: true, paidAt: now, paidBy: u.name };
    log = 'booking.approve'; msg = 'อนุมัติการจองแล้ว';
  } else if (act === 'reject') {
    if (!can('bookings.edit')) return deny();
    const reason = await promptBox(`ปฏิเสธการจอง ${b.id}`, 'เหตุผล (ลูกค้าจะเห็นข้อความนี้) เช่น ยอดเงินไม่ตรง / ห้องไม่ว่างแล้ว', 'ปฏิเสธการจอง');
    if (reason == null) return false;
    patch = { status: 'cancelled', cancelledAt: now, cancelReason: reason, cancelledBy: u.name, rejected: true };
    log = 'booking.reject'; msg = 'ปฏิเสธการจองแล้ว';
  } else if (act === 'checkin') {
    if (!can('frontdesk')) return deny();
    if (typeof ckEnsure === 'function' && !(await ckEnsure(b))) return false; // ลงทะเบียนผู้เข้าพัก (ถ่ายรูปบัตร + เซ็นบนจอ) ก่อนเช็คอิน — ข้ามได้
    patch = { checkedInAt: now, checkedInBy: u.name, status: 'confirmed' };
    if (!b.payment.paid) {
      if (!(await confirmBox(`การจอง ${b.id} ยังค้างชำระ <b>${money(b.price.total)}</b> (${PAY_TH[b.payment.method]})<br>รับชำระเงินแล้วเช็คอินเลยหรือไม่?`, 'รับเงิน & เช็คอิน'))) return false;
      patch.payment = { ...b.payment, paid: true, paidAt: now, paidBy: u.name };
    }
    log = 'booking.checkin'; msg = `เช็คอิน ${guestName(b)} แล้ว`;
  } else if (act === 'checkout') {
    if (!can('frontdesk')) return deny();
    patch = { checkedOutAt: now, checkedOutBy: u.name, completedAt: now };
    log = 'booking.checkout'; msg = `เช็คเอาท์ ${guestName(b)} แล้ว`;
  } else if (act === 'cancel') {
    if (!can('bookings.edit')) return deny();
    const reason = await promptBox(`ยกเลิกการจอง ${b.id}`, 'เหตุผลการยกเลิก (บันทึกไว้ในประวัติ)', 'ยืนยันยกเลิก');
    if (reason == null) return false;
    patch = { status: 'cancelled', cancelledAt: now, cancelReason: reason, cancelledBy: u.name };
    log = 'booking.cancel'; msg = 'ยกเลิกการจองแล้ว';
  } else if (act === 'cancelok') {
    if (!can('bookings.edit')) return deny();
    const c = b.cancelReq; if (!c || c.status !== 'pending') return false;
    if (!(await confirmBox(`ยืนยันยกเลิก <b>${b.id}</b> และโอนเงินคืน <b>${money(b.price.total)}</b><br>${esc(c.bank)} · ${esc(c.account)} · ${esc(c.name)}<br><span class="small muted">หลังโอนแล้วกด "บันทึกว่าโอนคืนแล้ว" ในรายการจอง</span>`, 'ยืนยันยกเลิก'))) return false;
    patch = { status: 'cancelled', cancelledAt: now, cancelledBy: u.name, cancelReason: 'ลูกค้าขอยกเลิกล่วงหน้า', refund: b.price.total, cancelReq: { ...c, status: 'approved', decidedAt: now, decidedBy: u.name } };
    log = 'booking.cancel.approve'; msg = 'ยืนยันการยกเลิกแล้ว — โอนเงินคืนลูกค้าตามบัญชีที่แจ้ง';
  } else if (act === 'cancelno') {
    if (!can('bookings.edit')) return deny();
    const c = b.cancelReq; if (!c || c.status !== 'pending') return false;
    const reason = await promptBox(`ปฏิเสธคำขอยกเลิก ${b.id}`, 'เหตุผล (ลูกค้าจะเห็นข้อความนี้)', 'ปฏิเสธคำขอ');
    if (reason == null) return false;
    patch = { cancelReq: { ...c, status: 'rejected', decidedAt: now, decidedBy: u.name, reason } };
    log = 'booking.cancel.reject'; msg = 'ปฏิเสธคำขอยกเลิกแล้ว';
  } else if (act === 'refunded') {
    if (!can('bookings.edit')) return deny();
    if (!(await confirmBox(`บันทึกว่าโอนเงินคืน <b>${money(b.refund || b.price.total)}</b> ให้ลูกค้าของ <b>${b.id}</b> แล้ว?`, 'โอนแล้ว'))) return false;
    patch = { refundedAt: now, refundedBy: u.name };
    log = 'booking.refunded'; msg = 'บันทึกการโอนเงินคืนแล้ว';
  } else if (act === 'delete') {
    if (!can('bookings.delete')) return deny();
    if (!(await confirmBox(`ลบการจอง <b>${b.id}</b> ถาวร? ข้อมูลจะไม่สามารถกู้คืนได้ (แนะนำให้ "ยกเลิก" แทน)`, 'ลบถาวร'))) return false;
    DB.deleteBooking(id); DB.log('booking.delete', `${b.id} · ${guestName(b)} · ${money(b.price.total)}`); toast('ลบการจองแล้ว'); refresh();
    return false;
  } else return false;
  DB.updateBooking(id, patch);
  DB.log(log, `${b.id} · ${guestName(b)}${patch.cancelReason ? ' · ' + patch.cancelReason : ''}`);
  toast(msg); refresh();
  return true;
}

// ใบยืนยันการจอง (Voucher) ในหลังบ้าน — หน้าลูกค้าต้องใช้ PIN และอยู่คนละเว็บ เจ้าของเปิดไม่ได้ จึงแสดงเป็นหน้าต่างจากข้อมูลที่เจ้าของเห็นอยู่แล้ว
function bookingVoucher(b, back) {
  const m = openModal(`${voucherHtml(b, bookingStatus(b))}
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-ghost" id="vc-back">กลับ</button><button class="btn btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึก PDF</button></div>`, 'wide');
  $('#vc-back', m).onclick = back;
}
function bookingDrawer(id, refresh = () => render()) {
  const b = DB.booking(id);
  if (!b) return toast('ไม่พบการจอง', 'err');
  const s = boStatus(b), today = todayISO(), p = b.price;
  const acts = [];
  if (can('frontdesk') && s === 'confirmed' && b.checkIn <= today && b.checkOut >= today) acts.push(['checkin', 'fa-right-to-bracket', 'เช็คอิน', 'btn-primary']);
  if (can('frontdesk') && s === 'inhouse') acts.push(['checkout', 'fa-right-from-bracket', 'เช็คเอาท์', 'btn-primary']);
  if (can('bookings.edit') && b.status === 'pending') { acts.push(['approve', 'fa-check', 'อนุมัติการจอง', 'btn-primary']); acts.push(['reject', 'fa-xmark', 'ปฏิเสธ', 'btn-danger']); }
  if (can('bookings.edit') && b.status === 'confirmed' && !b.payment.paid && !b.checkedOutAt) acts.push(['pay', 'fa-money-bill-wave', 'รับชำระเงิน', acts.length ? 'btn-outline' : 'btn-primary']);
  if (can('bookings.edit') && b.cancelReq?.status === 'pending' && b.status !== 'cancelled') { acts.unshift(['cancelok', 'fa-check', 'ยืนยันยกเลิก & คืนเงิน', 'btn-primary']); acts.push(['cancelno', 'fa-xmark', 'ปฏิเสธคำขอยกเลิก', 'btn-danger']); }
  if (can('bookings.edit') && b.status === 'cancelled' && b.cancelReq?.status === 'approved' && !b.refundedAt) acts.unshift(['refunded', 'fa-money-bill-wave', 'บันทึกว่าโอนคืนแล้ว', 'btn-primary']);
  if (can('bookings.edit') && s === 'confirmed') acts.push(['cancel', 'fa-ban', 'ยกเลิก', 'btn-danger']);
  if (can('bookings.delete')) acts.push(['delete', 'fa-trash', 'ลบ', 'btn-ghost red']);
  const tl = [[b.createdAt, 'fa-plus', 'สร้างการจอง', PAY_TH[b.payment.method]], [b.payment.claimedAt, 'fa-receipt', b.payment.slip ? 'ลูกค้าส่งสลิป' : 'ลูกค้าแจ้งชำระเงิน', PAY_TH[b.payment.method]], [b.payment.paidAt, 'fa-money-bill', 'รับชำระเงิน', b.payment.paidBy], [b.confirmedAt, 'fa-check', 'อนุมัติการจอง', b.approvedBy || ''], [b.checkedInAt, 'fa-right-to-bracket', 'เช็คอิน', b.checkedInBy], [b.checkedOutAt, 'fa-right-from-bracket', 'เช็คเอาท์', b.checkedOutBy], [b.cancelReq?.at, 'fa-rotate-left', 'ลูกค้าขอยกเลิก', ''], [b.refundedAt, 'fa-money-bill-wave', 'โอนเงินคืนแล้ว', b.refundedBy], [b.cancelledAt, 'fa-ban', 'ยกเลิก', [b.cancelledBy, b.cancelReason].filter(Boolean).join(' — ')]]
    .filter(x => x[0]).sort((a, c) => a[0] < c[0] ? -1 : 1);
  const notes = b.notes || [];
  const req = [...(b.guest.requests || []), b.guest.note].filter(Boolean);
  const row = (l, v) => `<div class="dl"><span>${l}</span><b>${v}</b></div>`;
  const m = openModal(`
    <div class="dr-head"><div class="small muted">การจอง</div><h2>${b.id}</h2><div class="row wrap" style="gap:8px">${stChip(b)} ${payChip(b)}</div></div>
    <div class="dr-acts">${acts.map(([k, ic, l, c]) => `<button class="btn btn-sm ${c}" data-dact="${k}"><i class="fa-solid ${ic}"></i> ${l}</button>`).join('')}<button class="btn btn-sm btn-ghost" id="dr-voucher"><i class="fa-solid fa-print"></i> ดูใบยืนยันการจอง</button></div>
    ${b.payment.slip ? `<div class="dr-sec"><h4><i class="fa-solid fa-receipt"></i> สลิปโอนเงิน <span class="muted small">ส่งเมื่อ ${fmtDateTime(b.payment.claimedAt)}</span></h4><div class="slip-full" data-slip="${esc(b.payment.slip)}"><i class="fa-solid fa-spinner fa-spin"></i></div>
      <div class="small muted" style="margin-top:6px">ยอดที่ต้องได้รับ <b>${money(b.price.total)}</b>${b.payment.payTo ? ` → พร้อมเพย์ ${esc(fmtPromptpay(b.payment.payTo))}` : ''} · อ้างอิง ${b.id}</div></div>` : ''}
    ${cancelReqSecHtml(b)}
    <div class="dr-sec"><h4><i class="fa-regular fa-user"></i> ผู้เข้าพัก</h4>
      ${row('ชื่อ', esc(guestName(b)))}${row('อีเมล', `<a href="mailto:${esc(b.guest.email)}">${esc(b.guest.email)}</a>`)}${row('โทร', `<a href="tel:${esc(b.guest.phone)}">${esc(b.guest.phone)}</a>`)}
      ${row('จำนวน', `ผู้ใหญ่ ${b.adults}${b.children ? ` · เด็ก ${b.children}` : ''}`)}${req.length ? row('คำขอพิเศษ', esc(req.join(', '))) : ''}</div>
    ${(can('frontdesk') || isAdmin(DB.currentUser())) && b.status !== 'cancelled' ? '<div class="dr-sec" id="ck-sec"></div>' : ''}
    <div class="dr-sec"><h4><i class="fa-solid fa-hotel"></i> การเข้าพัก</h4>
      ${row('ที่พัก', esc(b.hotelName))}${row('ห้อง', `${b.qty} × ${esc(b.roomName)}`)}${row('เช็คอิน', fmtDate(b.checkIn))}${row('เช็คเอาท์', fmtDate(b.checkOut))}${row('จำนวนคืน', b.nights + ' คืน')}</div>
    <div class="dr-sec"><h4><i class="fa-solid fa-receipt"></i> ค่าใช้จ่าย</h4>
      ${row('ราคาห้องปกติ', money(p.orig))}${p.orig > p.room ? row('ส่วนลดโปรโมชั่น', '<span class="green">−' + money(p.orig - p.room) + '</span>') : ''}${p.member ? row('ส่วนลดสมาชิก', '<span class="green">−' + money(p.member) + '</span>') : ''}${p.coupon ? row(`คูปอง ${esc(p.couponCode || '')}`, '<span class="green">−' + money(p.coupon) + '</span>') : ''}
      ${p.tax ? row('ค่าบริการ + VAT', money(p.tax)) : ''}<div class="dl total"><span>ยอดรวม</span><b>${money(p.total)}</b></div>${row('วิธีชำระ', PAY_TH[b.payment.method] + (b.payment.last4 ? ` •••• ${b.payment.last4}` : ''))}</div>
    <div class="dr-sec"><h4><i class="fa-solid fa-clock-rotate-left"></i> ประวัติ</h4><ol class="tl">${tl.map(([at, ic, l, by]) => `<li><i class="fa-solid ${ic}"></i><div><b>${l}</b>${by ? ` <span class="muted">· ${esc(by)}</span>` : ''}<div class="small muted">${fmtDateTime(at)}</div></div></li>`).join('')}</ol></div>
    <div class="dr-sec"><h4><i class="fa-regular fa-note-sticky"></i> โน้ตภายใน <span class="muted small">(ลูกค้าไม่เห็น)</span></h4>
      ${notes.length ? notes.map(n => `<div class="note"><div>${esc(n.text)}</div><small>${esc(n.by)} · ${fmtDateTime(n.at)}</small></div>`).join('') : '<p class="small muted">ยังไม่มีโน้ต</p>'}
      ${can('bookings.edit') || can('frontdesk') ? '<form id="dr-note" class="row" style="margin-top:8px"><input placeholder="เพิ่มโน้ต เช่น แขกขอเตียงเสริม" style="flex:1"><button class="btn btn-sm btn-outline">บันทึก</button></form>' : ''}</div>`, 'drawer');
  $$('[data-dact]', m).forEach(btn => btn.onclick = async () => { if (await bkAction(id, btn.dataset.dact, refresh)) bookingDrawer(id, refresh); });
  $('#dr-voucher', m).onclick = () => bookingVoucher(b, () => bookingDrawer(id, refresh));
  loadSlips(m);
  if (typeof ckDrawer === 'function') ckDrawer(m, b);
  const nf = $('#dr-note', m);
  if (nf) nf.onsubmit = e => {
    e.preventDefault();
    const t = $('input', nf).value.trim(); if (!t) return;
    DB.updateBooking(id, { notes: [...notes, { at: new Date().toISOString(), by: DB.currentUser().name, text: t }] });
    DB.log('booking.note', `${b.id} · ${t}`); toast('บันทึกโน้ตแล้ว'); bookingDrawer(id, refresh);
  };
}

function bkRows(list, opts = {}) {
  if (!list.length) return `<div class="bo-empty sm"><i class="fa-regular fa-calendar"></i><p class="muted">${opts.empty || 'ไม่มีรายการ'}</p></div>`;
  return `<div class="bo-list">${list.map(b => `<div class="bo-li" data-bk="${b.id}"><span class="bo-av sm">${esc(b.guest.firstName[0] || '?')}</span><div class="grow"><b>${esc(guestName(b))}</b><div class="small muted">${esc(b.hotelName)} · ${b.qty}× ${esc(b.roomName)} · ${b.nights} คืน</div></div><div class="bo-li-r">${opts.right ? opts.right(b) : stChip(b)}</div></div>`).join('')}</div>`;
}
function bindBk(root, refresh = () => render()) {
  $$('[data-bk]', root).forEach(el => el.onclick = e => { if (e.target.closest('[data-qa]')) return; bookingDrawer(el.dataset.bk, refresh); });
  $$('[data-qa]', root).forEach(btn => btn.onclick = e => { e.stopPropagation(); bkAction(btn.dataset.id, btn.dataset.qa, refresh); });
}
const qaBtn = (b, act, label, cls = 'btn-primary') => `<button class="btn btn-sm ${cls}" data-qa="${act}" data-id="${b.id}">${label}</button>`;

// ================= เจ้าของรีสอร์ท: อนุมัติการจอง & ตรวจสลิป =================
// ลูกค้าโอนเงินเข้าบัญชีเจ้าของโดยตรงแล้วแนบสลิป — เจ้าของตรวจยอดในแอปธนาคาร แล้วกดอนุมัติ / ปฏิเสธ
const PAY_ONLINE = ['promptpay', 'bank'];
const awaitingPayment = () => DB.bookings().filter(b => b.status === 'pending' && !b.payment.paid && PAY_ONLINE.includes(b.payment.method));
const readyToApprove = b => b.status === 'pending' && (b.payment.slip || b.payment.method === 'hotel' || b.payment.paid);
// โหลดรูปสลิปจาก bucket ส่วนตัวด้วยลิงก์ชั่วคราว
function loadSlips(root) {
  $$('[data-slip]', root).forEach(async el => {
    const url = await DB.slipUrl(el.dataset.slip);
    if (!url) { el.innerHTML = '<span class="small muted">โหลดสลิปไม่ได้</span>'; return; }
    el.innerHTML = `<img src="${url}" alt="สลิปโอนเงิน">`;
    el.onclick = e => { e.stopPropagation(); window.open(url, '_blank', 'noopener'); };
  });
}
function boApprovals(main) {
  const today = todayISO(), pend = DB.bookings().filter(b => b.status === 'pending');
  const slips = pend.filter(b => b.payment.slip).sort((a, b) => a.payment.claimedAt < b.payment.claimedAt ? -1 : 1);
  const atHotel = pend.filter(b => !b.payment.slip && b.payment.method === 'hotel').sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
  const noSlip = pend.filter(b => !b.payment.slip && PAY_ONLINE.includes(b.payment.method)).sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
  const done = DB.bookings().filter(b => b.confirmedAt && isoOf(new Date(b.confirmedAt)) === today);
  const sum = l => l.reduce((s, b) => s + b.price.total, 0);
  const card = b => `<div class="pay-card ${b.payment.slip ? 'claimed' : ''}" data-bk="${b.id}">
      ${b.payment.slip ? `<div class="slip-thumb" data-slip="${esc(b.payment.slip)}" title="ดูสลิปขนาดเต็ม"><i class="fa-solid fa-spinner fa-spin"></i></div>` : ''}
      <div class="pay-amt">${money(b.price.total)}<small>${PAY_TH[b.payment.method]}</small></div>
      <div class="grow"><b>${esc(guestName(b))}</b> <span class="small muted">· อ้างอิง ${b.id}</span>
        <div class="small muted">${esc(b.hotelName)} · ${b.qty}× ${esc(b.roomName)} · ${fmtDate(b.checkIn, false)} → ${fmtDate(b.checkOut, false)}</div>
        <div class="small" style="margin-top:4px">${b.payment.slip ? `<span class="pill vip"><i class="fa-solid fa-receipt"></i> ส่งสลิป ${relTime(b.payment.claimedAt)}</span>` : `<span class="pill">จองเมื่อ ${relTime(b.createdAt)}</span>`} <a href="tel:${esc(b.guest.phone)}" onclick="event.stopPropagation()"><i class="fa-solid fa-phone"></i> ${esc(b.guest.phone)}</a></div></div>
      <div class="pay-act">${qaBtn(b, 'approve', '<i class="fa-solid fa-check"></i> อนุมัติ')}${qaBtn(b, 'reject', 'ปฏิเสธ', 'btn-ghost red')}</div></div>`;
  const list = (l, empty) => l.length ? `<div class="pay-list">${l.map(card).join('')}</div>` : `<div class="bo-empty sm"><i class="fa-regular fa-circle-check"></i><p class="muted">${empty}</p></div>`;
  main.innerHTML = pageHead('ตรวจสลิป & อนุมัติการจอง', 'เปิดแอปธนาคาร → ตรวจว่ายอดเข้าตรงกับสลิป → กด "อนุมัติ" · ถ้ายอดไม่ตรงหรือห้องไม่ว่าง กด "ปฏิเสธ" พร้อมเหตุผล (ลูกค้าจะเห็น)') + `
    <div class="kpi-grid k4">
      ${kpi('fa-receipt', 'warn', 'ส่งสลิปแล้ว รอตรวจ', slips.length, money(sum(slips)))}
      ${kpi('fa-hotel', 'info', 'ชำระที่ที่พัก รออนุมัติ', atHotel.length, money(sum(atHotel)))}
      ${kpi('fa-clock', 'violet', 'ยังไม่ส่งสลิป', noSlip.length, money(sum(noSlip)))}
      ${kpi('fa-circle-check', 'ok', 'อนุมัติแล้ววันนี้', done.length, money(sum(done)))}
    </div>
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-receipt"></i> ลูกค้าส่งสลิปแล้ว — ตรวจยอดแล้วอนุมัติ</h3><span class="small muted">คลิกรูปสลิปเพื่อดูขนาดเต็ม</span></div>${list(slips, 'ไม่มีสลิปรอตรวจ')}</section>
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-hotel"></i> ชำระที่ที่พัก — รอยืนยันห้อง</h3></div>${list(atHotel, 'ไม่มีรายการ')}</section>
    <section class="card"><div class="card-h"><h3><i class="fa-solid fa-clock"></i> จองแล้วแต่ยังไม่ส่งสลิป</h3><span class="small muted">ห้องถูกกันไว้ — โทรติดตาม หรือปฏิเสธเพื่อปล่อยห้องคืน</span></div>${list(noSlip, 'ไม่มีรายการค้าง')}</section>`;
  bindBk(main);
  loadSlips(main);
}

// ================= เจ้าของรีสอร์ท: บัญชีรับเงิน & ข้อมูลรีสอร์ท =================
function boPayout(main, params) {
  const u = DB.currentUser(), b = u.biz || {}, p = u.payout || {};
  const maskNum = s => String(s ?? '').replace(/\d[\d\s-]{5,}\d/g, m => { const d = m.replace(/\D/g, ''); return '•'.repeat(Math.max(0, d.length - 4)) + d.slice(-4); });
  const fg = (k, l, v, attrs = '', full = false) => `<div class="fg ${full ? 'full' : ''}"><label>${l}</label><input name="${k}" value="${esc(v ?? '')}" ${attrs}></div>`;
  let shown = false;
  const sum = () => {
    const pid = p.promptpayId ? (shown ? fmtPromptpay(p.promptpayId) : maskNum(p.promptpayId)) : '';
    const row = (l, v) => `<div class="dl"><span>${l}</span><b style="text-align:right;white-space:pre-wrap">${v || '<span class="muted">ยังไม่ได้ตั้งค่า</span>'}</b></div>`;
    return row('พร้อมเพย์', esc(pid)) + row('ชื่อบัญชีพร้อมเพย์', esc(p.promptpayName || '')) + row('บัญชีธนาคาร', esc(shown ? (p.bankInfo || '') : maskNum(p.bankInfo || '')));
  };
  main.innerHTML = pageHead('บัญชีรับเงิน', 'ลูกค้าโอนเงินเข้าบัญชีของคุณโดยตรง — แพลตฟอร์มไม่ได้ถือเงินแทน') + `
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-qrcode"></i> บัญชีรับเงิน</h3><button type="button" class="btn btn-ghost btn-sm" id="po-eye"><i class="fa-regular fa-eye"></i> แสดงเลขเต็ม</button></div>
        <div id="po-sum">${sum()}</div>
        <div class="row wrap" style="gap:8px;margin-top:14px"><button type="button" class="btn btn-primary" id="po-edit"><i class="fa-solid fa-pen"></i> เปลี่ยนบัญชีรับเงิน</button></div>
        <div class="notice info" style="margin-top:12px"><i class="fa-solid fa-shield-halved"></i><div>เพื่อความปลอดภัย การเปลี่ยนบัญชีต้องยืนยันด้วย <b>รหัส OTP ทางอีเมล</b> และรหัสผ่าน (ถ้าบัญชีมี) · ระบบจะแจ้งเตือนคุณทาง Telegram / แจ้งเตือนมือถือทุกครั้งที่มีการเปลี่ยน</div></div>
        <h4 style="margin:16px 0 6px"><i class="fa-solid fa-clock-rotate-left"></i> ประวัติการเปลี่ยนบัญชี</h4><div id="po-hist" class="small muted">กำลังโหลด...</div></section>
      <form id="po-f"><section class="card"><div class="card-h"><h3><i class="fa-solid fa-store"></i> ข้อมูลรีสอร์ท (แสดงให้ลูกค้า)</h3></div><div class="form-grid">
        ${fg('resortName', 'ชื่อรีสอร์ท / ชื่อที่แสดง', b.resortName, 'maxlength="100"', true)}
        ${fg('phone', 'เบอร์ติดต่อ', b.phone, 'type="tel" maxlength="20"')}${fg('line', 'LINE', b.line, 'maxlength="60"')}
        ${fg('facebook', 'ลิงก์ Facebook เพจ (https://...)', b.facebook, 'type="url" maxlength="200" placeholder="https://facebook.com/ชื่อเพจ"', true)}
        ${fg('targetMonthly', 'เป้ายอดขายต่อเดือน (฿)', b.targetMonthly || '', 'type="number" min="0" step="1000"', true)}</div>
        <p class="small muted" style="margin-top:12px">ลูกค้าเห็นชื่อ เบอร์ LINE และลิงก์ Facebook นี้ในใบยืนยันการจอง เพื่อติดต่อคุณโดยตรง</p>
        <div class="save-bar"><button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลรีสอร์ท</button></div></section></form>
    </div>`;
  $('#po-eye').onclick = e => { shown = !shown; $('#po-sum').innerHTML = sum(); e.currentTarget.innerHTML = shown ? '<i class="fa-regular fa-eye-slash"></i> ซ่อนเลข' : '<i class="fa-regular fa-eye"></i> แสดงเลขเต็ม'; };
  supa.from('sd_payout_history').select('*').eq('owner_id', u.id).order('at', { ascending: false }).limit(10).then(r => {
    const h = r.data || [];
    $('#po-hist').innerHTML = h.length ? h.map(x => `<div style="padding:6px 0;border-top:1px solid var(--bo-line)">${fmtDateTime(x.at)} · พร้อมเพย์ ${esc(x.old_masked?.promptpayId || '-')} → <b>${esc(x.new_masked?.promptpayId || '-')}</b>${x.old_masked?.bankInfo !== x.new_masked?.bankInfo ? ' · แก้บัญชีธนาคาร' : ''}</div>`).join('') : 'ยังไม่เคยเปลี่ยนบัญชีผ่านระบบ';
  });
  const fo = params?.get('focus'); if (fo) { boClearParams(); setTimeout(() => fo === 'promptpayId' ? $('#po-edit')?.click() : boFocus($('#po-f'), `[name="${fo}"]`), 250); }

  // เรียก Edge Function sd-payout (ยืนยันตัวตนฝั่งเซิร์ฟเวอร์) — คืน { data } หรือ { error }
  const call = async body => {
    const r = await supa.functions.invoke('sd-payout', { body });
    if (!r.error) return { data: r.data };
    let msg = r.error.message; try { msg = (await r.error.context.json()).error || msg; } catch { /* ใช้ข้อความเดิม */ }
    return { error: msg };
  };
  $('#po-edit').onclick = async () => {
    const info = (await call({ action: 'info' })).data || { hasPassword: false, email: '' };
    const m = openModal(`<h2><i class="fa-solid fa-pen"></i> เปลี่ยนบัญชีรับเงิน</h2><form id="pe-f" class="form-grid" style="margin-top:12px" novalidate>
      ${fg('promptpayId', 'หมายเลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลข 13 หลัก)', p.promptpayId, 'inputmode="numeric" maxlength="13" placeholder="0812345678" autocomplete="off"', true)}
      ${fg('promptpayName', 'ชื่อบัญชีพร้อมเพย์ (ให้ลูกค้าตรวจก่อนโอน)', p.promptpayName, 'maxlength="80"', true)}
      <div class="fg full"><label>บัญชีธนาคาร (เว้นว่าง = ไม่รับโอนเข้าบัญชีธนาคาร)</label><textarea name="bankInfo" rows="3" maxlength="300" placeholder="ธนาคาร... เลขที่บัญชี... ชื่อบัญชี...">${esc(p.bankInfo || '')}</textarea></div>
      <div class="fg full" style="border-top:1px solid var(--bo-line);padding-top:12px"><label><i class="fa-solid fa-shield-halved"></i> ยืนยันตัวตนก่อนบันทึก</label>
        <div class="row wrap" style="gap:8px;align-items:center"><button type="button" class="btn btn-outline btn-sm" id="pe-otp"><i class="fa-regular fa-envelope"></i> ส่งรหัส OTP ไปที่ ${esc(info.email || 'อีเมลของคุณ')}</button><span class="small muted" id="pe-otp-s"></span></div></div>
      <div class="fg"><label>รหัส OTP จากอีเมล</label><input name="otp" inputmode="numeric" maxlength="10" autocomplete="one-time-code" placeholder="••••••"></div>
      ${info.hasPassword ? '<div class="fg"><label>รหัสผ่านของบัญชีนี้</label><input name="password" type="password" autocomplete="current-password"></div>' : ''}
      <div class="full row" style="justify-content:flex-end;gap:8px"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary"><i class="fa-solid fa-lock"></i> ยืนยันและบันทึก</button></div></form>`);
    const f = $('#pe-f', m), st = $('#pe-otp-s', m);
    $('#pe-otp', m).onclick = async e => {
      const btn = e.currentTarget; btn.disabled = true; st.textContent = 'กำลังส่ง...';
      const r = await call({ action: 'send-otp' });
      if (r.error) { btn.disabled = false; st.textContent = ''; return toast(r.error, 'err'); }
      st.textContent = 'ส่งรหัสแล้ว — ตรวจอีเมล (รวมถึงกล่องสแปม)'; setTimeout(() => { btn.disabled = false; }, 60000);
    };
    f.onsubmit = async e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(f)), pid = v.promptpayId.replace(/\D/g, '');
      if (pid && !isPromptpayId(pid)) return toast('หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลข 13 หลัก', 'err');
      if (!v.otp.trim()) return toast('กรอกรหัส OTP จากอีเมล (กด "ส่งรหัส OTP" ก่อน)', 'err');
      if (info.hasPassword && !v.password) return toast('กรอกรหัสผ่านของบัญชีนี้', 'err');
      const btn = f.querySelector('button:not([type=button])'); btn.disabled = true;
      const r = await call({ action: 'save', otp: v.otp, password: v.password, payout: { promptpayId: pid, promptpayName: v.promptpayName.trim(), bankInfo: v.bankInfo.trim() } });
      if (r.error) { btn.disabled = false; return toast(r.error, 'err'); }
      closeModal(); toast(r.data?.unchanged ? 'ไม่มีการเปลี่ยนแปลง' : 'เปลี่ยนบัญชีรับเงินแล้ว — ส่งแจ้งเตือนให้คุณแล้ว'); DB.load().then(render);
    };
  };

  $('#po-f').onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    if (!v.resortName.trim()) return toast('กรุณากรอกชื่อรีสอร์ท', 'err');
    const fb = v.facebook.trim();
    if (fb && !/^https:\/\/\S+$/i.test(fb)) return toast('ลิงก์ Facebook ต้องขึ้นต้นด้วย https:// เช่น https://facebook.com/ชื่อเพจ', 'err');
    DB.saveBusiness({ resortName: v.resortName.trim(), phone: v.phone.trim(), line: v.line.trim(), facebook: fb, targetMonthly: Math.max(0, +v.targetMonthly || 0) });
    DB.log('payout.save', 'ข้อมูลรีสอร์ท');
    toast('บันทึกแล้ว'); setTimeout(() => DB.load().then(render), 600);
  };
}

// ================= ผู้ดูแลแพลตฟอร์ม: เจ้าของรีสอร์ท (อนุมัติ / ระงับ) =================
function boPartners(main, params) {
  const tab = params.get('tab') || 'pending';
  const owners = DB.users().filter(u => u.role === 'owner');
  const groups = {
    pending: ['fa-hourglass-half', 'รออนุมัติ', owners.filter(u => u.ownerStatus === 'pending' && u.active !== false)],
    approved: ['fa-circle-check', 'อนุมัติแล้ว', owners.filter(u => u.ownerStatus === 'approved' && u.active !== false)],
    rejected: ['fa-circle-xmark', 'ไม่ผ่าน', owners.filter(u => u.ownerStatus === 'rejected' && u.active !== false)],
    suspended: ['fa-user-slash', 'ระงับ', owners.filter(u => u.active === false)],
  };
  const list = groups[tab][2].sort((a, b) => (b.appliedAt || b.createdAt) < (a.appliedAt || a.createdAt) ? -1 : 1);
  const stats = u => {
    const hs = DB.hotels(true).filter(h => h.ownerId === u.id), ids = new Set(hs.map(h => h.id));
    const bks = DB.bookings().filter(b => ids.has(b.hotelId) && b.status !== 'cancelled');
    const p = u.payout || {};
    return { hs, n: bks.length, gmv: bks.reduce((s, b) => s + b.price.total, 0), pending: bks.filter(b => b.status === 'pending').length, payout: isPromptpayId(p.promptpayId) || (p.bankInfo || '').trim() };
  };
  const card = u => {
    const b = u.biz || {}, s = stats(u);
    const acts = u.active === false ? `<button class="btn btn-sm btn-outline" data-pact="activate" data-id="${u.id}"><i class="fa-solid fa-user-check"></i> เปิดใช้งาน</button>`
      : u.ownerStatus === 'pending' ? `<button class="btn btn-sm btn-primary" data-pact="approve" data-id="${u.id}"><i class="fa-solid fa-check"></i> อนุมัติ</button><button class="btn btn-sm btn-ghost red" data-pact="reject" data-id="${u.id}">ไม่อนุมัติ</button>`
      : u.ownerStatus === 'rejected' ? `<button class="btn btn-sm btn-outline" data-pact="approve" data-id="${u.id}"><i class="fa-solid fa-check"></i> อนุมัติ</button>`
      : `<button class="btn btn-sm btn-ghost red" data-pact="suspend" data-id="${u.id}"><i class="fa-solid fa-user-slash"></i> ระงับ</button>`;
    return `<div class="partner-card"><div class="row between wrap" style="gap:10px"><div><b style="font-size:16px">${esc(b.resortName || '(ไม่ระบุชื่อรีสอร์ท)')}</b>
        <div class="small muted">${esc(u.name)} · ${esc(u.email)}${b.phone ? ` · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>` : ''}${b.line ? ` · LINE ${esc(b.line)}` : ''}</div></div><div class="row" style="gap:6px">${acts}</div></div>
      <div class="partner-meta small">${b.location ? `<span><i class="fa-solid fa-location-dot"></i> ${esc(b.location)}</span>` : ''}${b.rooms ? `<span><i class="fa-solid fa-bed"></i> ~${esc(b.rooms)} ห้อง</span>` : ''}<span><i class="fa-regular fa-clock"></i> สมัคร ${u.appliedAt ? relTime(u.appliedAt) : relTime(u.createdAt)}</span></div>
      ${b.lat != null ? `<div class="small" style="margin-top:6px"><i class="fa-solid fa-location-crosshairs"></i> GPS ${(+b.lat).toFixed(5)}, ${(+b.lng).toFixed(5)} · <a href="https://www.google.com/maps?q=${b.lat},${b.lng}" target="_blank" rel="noopener">ดูแผนที่</a></div>` : ''}
      ${b.termsAt ? `<div class="small" style="margin-top:4px"><i class="fa-solid fa-file-signature"></i> ยอมรับเงื่อนไขสมาชิกเมื่อ ${fmtDateTime(b.termsAt)}</div>` : ''}
      ${b.idNumber ? `<div class="small" style="margin-top:4px"><i class="fa-solid fa-id-card"></i> บัตรประชาชน ${esc(maskId(b.idNumber))} ${b.idPhoto ? `<button class="btn btn-sm btn-outline" data-idcard="${esc(b.idPhoto)}" style="margin-left:6px"><i class="fa-solid fa-image"></i> ดูรูปบัตร</button>` : '<span class="red">ไม่มีรูปบัตร</span>'}</div>` : ''}
      ${b.note ? `<div class="small" style="margin-top:6px;white-space:pre-line">${esc(b.note)}</div>` : ''}
      ${u.ownerNote ? `<div class="small red" style="margin-top:6px">หมายเหตุ: ${esc(u.ownerNote)}</div>` : ''}
      ${u.ownerStatus === 'approved' ? `<div class="mini-stats" style="margin-top:10px"><div><span>ที่พัก</span><b>${s.hs.length} แห่ง</b></div><div><span>การจอง</span><b>${s.n}</b></div><div><span>ยอดจองรวม</span><b>${money(s.gmv)}</b></div><div><span>รออนุมัติ</span><b class="${s.pending ? 'red' : ''}">${s.pending}</b></div></div>
        ${s.payout ? '' : '<div class="small" style="margin-top:6px"><span class="pill bad">ยังไม่ตั้งค่าบัญชีรับเงิน</span></div>'}` : ''}</div>`;
  };
  main.innerHTML = pageHead('เจ้าของรีสอร์ท', `${owners.length} ราย · อนุมัติแล้ว ${groups.approved[2].length} · รออนุมัติ ${groups.pending[2].length}`, `<a class="btn btn-outline btn-sm" href="${portalUrl('owner', '#/admin/signup')}" target="_blank" rel="noopener"><i class="fa-solid fa-link"></i> ลิงก์สมัคร</a>`) + `
    <div class="tabs">${Object.entries(groups).map(([k, [ic, l, arr]]) => `<a href="#/admin/partners?tab=${k}" class="${k === tab ? 'on' : ''}"><i class="fa-solid ${ic}"></i> ${l} <em>${arr.length}</em></a>`).join('')}</div>
    ${list.length ? `<div class="partner-list">${list.map(card).join('')}</div>` : `<section class="card"><div class="bo-empty sm"><i class="fa-solid fa-handshake"></i><p class="muted">ไม่มีรายการ${groups[tab][1]}</p></div></section>`}`;
  $$('[data-idcard]', main).forEach(btn => btn.onclick = () => showIdCard(btn.dataset.idcard));
  $$('[data-pact]', main).forEach(btn => btn.onclick = async () => {
    const u = owners.find(x => x.id === btn.dataset.id), name = u.biz?.resortName || u.name, act = btn.dataset.pact;
    try {
      if (act === 'approve') {
        if (!(await confirmBox(`อนุมัติ <b>${esc(name)}</b> ให้เปิดขายห้องพักบนแพลตฟอร์ม?`, 'อนุมัติ'))) return;
        await DB.setOwnerStatus(u.id, 'approved'); DB.log('partner.approve', `${name} · ${u.email}`); toast('อนุมัติแล้ว');
      } else if (act === 'reject') {
        const note = await promptBox(`ไม่อนุมัติ ${esc(name)}`, 'เหตุผล (ผู้สมัครจะเห็นข้อความนี้)', 'ไม่อนุมัติ');
        if (note == null) return;
        await DB.setOwnerStatus(u.id, 'rejected', note); DB.log('partner.reject', `${name} · ${note}`); toast('บันทึกแล้ว');
      } else {
        const suspend = act === 'suspend';
        if (!(await confirmBox(suspend ? `ระงับ <b>${esc(name)}</b>? ที่พักทั้งหมดของเจ้าของรายนี้จะหายจากหน้าเว็บ และเข้าสู่ระบบไม่ได้` : `เปิดใช้งาน <b>${esc(name)}</b> อีกครั้ง?`, suspend ? 'ระงับ' : 'เปิดใช้งาน'))) return;
        DB.updateUser(u.id, { active: !suspend }); DB.log(suspend ? 'partner.suspend' : 'partner.activate', `${name} · ${u.email}`); toast('อัปเดตแล้ว');
        await new Promise(r => setTimeout(r, 600)); await DB.load();
      }
      render();
    } catch (e) { toast(e.message, 'err'); }
  });
}

// ================= Owner: ผลงานแต่ละที่พัก =================
function hotelPerf(from, to) {
  const days = diffDays(from, to) + 1, bks = DB.bookings();
  return DB.hotels(true).map(h => {
    const rooms = h.rooms.reduce((s, r) => s + +r.total, 0);
    let rn = 0, rev = 0;
    bks.filter(b => b.hotelId === h.id && b.status !== 'cancelled').forEach(b => {
      const per = netRev(b) / (b.nights || 1);
      nightsList(b.checkIn, b.checkOut).forEach(d => { if (d >= from && d <= to) { rn += b.qty; rev += per; } });
    });
    const sales = bks.filter(b => { const d = isoOf(new Date(b.createdAt)); return b.hotelId === h.id && d >= from && d <= to; });
    const ok = sales.filter(b => b.status !== 'cancelled');
    return { h, rooms, rn, rev, occ: rooms ? rn / (rooms * days) : 0, adr: rn ? rev / rn : 0, revpar: rooms ? rev / (rooms * days) : 0,
      count: ok.length, gross: ok.reduce((s, b) => s + b.price.total, 0), cancel: sales.length ? (sales.length - ok.length) / sales.length : 0 };
  });
}
function boProperties(main, params) {
  const pk = PERIODS[params.get('p')] ? params.get('p') : '30';
  const R = periodRange(pk), rows = hotelPerf(R.from, R.to).sort((a, b) => b.gross - a.gross || b.rev - a.rev);
  const live = rows.filter(r => r.h.active !== false);
  const T = rows.reduce((a, r) => ({ gross: a.gross + r.gross, rn: a.rn + r.rn, rooms: a.rooms + r.rooms, rev: a.rev + r.rev }), { gross: 0, rn: 0, rooms: 0, rev: 0 });
  const best = live[0], low = live.slice().sort((a, b) => a.occ - b.occ)[0];
  const bar = v => `<div class="occ"><div class="track"><span style="width:${Math.min(100, v * 100)}%"></span></div><span>${pct(v, 0)}</span></div>`;
  const ins = [];
  if (best?.gross) ins.push(['fa-trophy', `<b>${esc(best.h.name)}</b> ทำยอดขายสูงสุด ${money(best.gross)} (${pct(best.gross / (T.gross || 1), 0)} ของทั้งหมด)`]);
  live.filter(r => r.occ < 0.2).slice(0, 3).forEach(r => ins.push(['fa-lightbulb', `<b>${esc(r.h.name)}</b> อัตราเข้าพักเพียง ${pct(r.occ, 0)} — พิจารณาให้แอดมินลดราคาหรือสร้างโค้ดส่วนลด`]));
  live.filter(r => r.cancel > 0.2 && r.count >= 3).forEach(r => ins.push(['fa-triangle-exclamation', `<b>${esc(r.h.name)}</b> อัตรายกเลิกสูง ${pct(r.cancel, 0)}`]));
  main.innerHTML = pageHead('ผลงานแต่ละที่พัก', `เปรียบเทียบผลงาน ${fmtDate(R.from, false)} – ${fmtDate(R.to, false)} · รายได้เข้าพักคิดตามคืนที่เข้าพัก ไม่รวมภาษี/ค่าบริการ`,
    `<div class="seg">${Object.entries(PERIODS).map(([k, l]) => `<a href="#/admin/properties?p=${k}" class="${k === pk ? 'on' : ''}">${l}</a>`).join('')}</div><button class="btn btn-outline btn-sm" id="pp-csv"><i class="fa-solid fa-file-csv"></i> CSV</button>`) + `
    <div class="kpi-grid k4">
      ${kpi('fa-hotel', 'info', 'ที่พักที่เปิดขาย', `${live.length}<small>/${rows.length}</small>`, `${T.rooms.toLocaleString()} ห้อง`)}
      ${kpi('fa-sack-dollar', 'ok', 'ยอดขายรวม', money(T.gross), `${rows.reduce((s, r) => s + r.count, 0)} การจอง`)}
      ${kpi('fa-trophy', 'warn', 'ขายดีที่สุด', best?.gross ? esc(best.h.name) : '-', best?.gross ? money(best.gross) : 'ยังไม่มียอดขาย')}
      ${kpi('fa-bed', 'bad', 'อัตราเข้าพักต่ำสุด', low ? esc(low.h.name) : '-', low ? pct(low.occ) : '')}
    </div>
    ${ins.length ? `<section class="card"><div class="card-h"><h3>ข้อสังเกต</h3></div><ul class="insights">${ins.map(([ic, t]) => `<li><i class="fa-solid ${ic}"></i><span>${t}</span></li>`).join('')}</ul></section>` : ''}
    <section class="card flush"><div class="table-scroll"><table class="tbl num"><thead><tr><th>ที่พัก</th><th>ห้อง</th><th>ยอดขาย</th><th>การจอง</th><th>Room-nights</th><th style="min-width:130px">อัตราเข้าพัก</th><th>ADR</th><th>RevPAR</th><th>ยกเลิก</th><th>รีวิว</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td><b>${i + 1}. ${esc(r.h.name)}</b><div class="small muted">${esc(r.h.type)} · ${esc(r.h.city)}${r.h.active === false ? ' · <span class="red">ปิดขาย</span>' : ''}</div></td>
        <td>${r.rooms}</td><td><b>${r.gross ? money(r.gross) : '-'}</b></td><td>${r.count || '-'}</td><td>${r.rn || '-'}</td><td>${bar(r.occ)}</td>
        <td>${r.adr ? money(r.adr) : '-'}</td><td>${r.revpar ? money(r.revpar) : '-'}</td><td class="${r.cancel > 0.2 ? 'red' : ''}">${r.count || r.cancel ? pct(r.cancel, 0) : '-'}</td><td>${r.h.rating} <span class="small muted">(${r.h.reviews.toLocaleString()})</span></td></tr>`).join('')}
    </tbody></table></div></section>`;
  $('#pp-csv').onclick = () => {
    downloadFile(`properties-${R.from}-${R.to}.csv`, toCsv([['ที่พัก', 'ห้อง', 'ยอดขาย', 'การจอง', 'Room-nights', 'อัตราเข้าพัก', 'ADR', 'RevPAR', 'อัตรายกเลิก', 'คะแนนรีวิว'],
      ...rows.map(r => [r.h.name, r.rooms, r.gross, r.count, r.rn, (r.occ * 100).toFixed(1) + '%', Math.round(r.adr), Math.round(r.revpar), (r.cancel * 100).toFixed(1) + '%', r.h.rating])]), 'text/csv;charset=utf-8');
    DB.log('report.export', `ผลงานที่พัก ${R.from} – ${R.to}`);
  };
}

// ================= Owner: Overview =================
const PERIODS = { '7': '7 วัน', '30': '30 วัน', '90': '90 วัน', mtd: 'เดือนนี้', ytd: 'ปีนี้' };
function periodRange(k) {
  const to = todayISO(), d = new Date();
  const from = k === 'mtd' ? isoOf(new Date(d.getFullYear(), d.getMonth(), 1)) : k === 'ytd' ? isoOf(new Date(d.getFullYear(), 0, 1)) : addDays(to, -(+k - 1));
  const len = diffDays(from, to) + 1;
  return { from, to, prevFrom: addDays(from, -len), prevTo: addDays(from, -1), len };
}
function periodStats(from, to) {
  const bks = DB.bookings();
  const sales = bks.filter(b => { const d = isoOf(new Date(b.createdAt)); return d >= from && d <= to; });
  const sold = sales.filter(b => b.status !== 'cancelled');
  let roomNights = 0, stayRev = 0;
  bks.forEach(b => {
    if (b.status === 'cancelled') return;
    const perNight = netRev(b) / (b.nights || 1);
    nightsList(b.checkIn, b.checkOut).forEach(d => { if (d >= from && d <= to) { roomNights += b.qty; stayRev += perNight; } });
  });
  const inv = totalRooms() * (diffDays(from, to) + 1);
  const avg = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0;
  return {
    sold, count: sold.length, all: sales.length, revenue: sold.reduce((s, b) => s + b.price.total, 0),
    cancelRate: sales.length ? (sales.length - sold.length) / sales.length : 0,
    roomNights, stayRev, adr: roomNights ? stayRev / roomNights : 0, occ: inv ? roomNights / inv : 0, revpar: inv ? stayRev / inv : 0,
    lead: avg(sold, b => Math.max(0, diffDays(isoOf(new Date(b.createdAt)), b.checkIn))), los: avg(sold, b => b.nights),
  };
}
function boOverview(main, params) {
  const pk = PERIODS[params.get('p')] ? params.get('p') : '30';
  const R = periodRange(pk), cur = periodStats(R.from, R.to), prev = periodStats(R.prevFrom, R.prevTo);
  const set = DB.settings();
  const now = new Date(), mStart = isoOf(new Date(now.getFullYear(), now.getMonth(), 1));
  const mtd = periodStats(mStart, todayISO()).revenue, target = DB.currentUser().role === 'owner' ? +(DB.currentUser().biz?.targetMonthly || 0) : +set.targetMonthly || 0;
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), forecast = mtd / now.getDate() * dim;
  // daily series
  const days = nightsList(R.from, addDays(R.to, 1));
  const byDay = Object.fromEntries(days.map(d => [d, 0]));
  cur.sold.forEach(b => { const d = isoOf(new Date(b.createdAt)); if (d in byDay) byDay[d] += b.price.total; });
  // by hotel & payment
  const byHotel = {}; cur.sold.forEach(b => { byHotel[b.hotelName] = (byHotel[b.hotelName] || 0) + b.price.total; });
  const top = Object.entries(byHotel).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const payKeys = ['card', 'promptpay', 'bank', 'hotel'];
  const byPay = payKeys.map(k => cur.sold.filter(b => b.payment.method === k).reduce((s, b) => s + b.price.total, 0));
  const payTotal = byPay.reduce((a, b) => a + b, 0);
  const unpaid = DB.bookings().filter(b => b.status !== 'cancelled' && !b.payment.paid);
  const unpaidSum = unpaid.reduce((s, b) => s + b.price.total, 0);
  // insights
  const ins = [];
  if (prev.revenue) ins.push([cur.revenue >= prev.revenue ? 'up' : 'down', `ยอดขาย${cur.revenue >= prev.revenue ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs((cur.revenue - prev.revenue) / prev.revenue * 100).toFixed(1)}% เมื่อเทียบกับ ${R.len} วันก่อนหน้า`]);
  if (top[0]) ins.push(['star', `<b>${esc(top[0][0])}</b> ทำยอดขายสูงสุด ${money(top[0][1])} (${pct(top[0][1] / (cur.revenue || 1), 0)} ของทั้งหมด)`]);
  if (unpaid.length) ins.push(['warn', `มียอดค้างรับ ${money(unpaidSum)} จาก ${unpaid.length} การจอง — <a href="#/admin/reports">ดูรายงานลูกหนี้</a>`]);
  if (cur.cancelRate > 0.15) ins.push(['warn', `อัตรายกเลิกสูง ${pct(cur.cancelRate)} — ลองตรวจสอบนโยบายยกเลิกฟรี`]);
  if (cur.occ < 0.3 && cur.roomNights) ins.push(['idea', `อัตราเข้าพัก ${pct(cur.occ)} ยังต่ำ — พิจารณาสร้างโค้ดส่วนลดช่วงวันธรรมดา`]);
  if (!cur.all) ins.push(['idea', 'ยังไม่มีการจองในช่วงนี้ — นักพัฒนาสร้างข้อมูลตัวอย่างได้ที่ "สำรอง & กู้คืน"']);
  const insIc = { up: 'fa-arrow-trend-up green', down: 'fa-arrow-trend-down red', star: 'fa-trophy', warn: 'fa-triangle-exclamation', idea: 'fa-lightbulb' };

  main.innerHTML = pageHead(`สวัสดี ${esc(DB.currentUser().name)}`, `ภาพรวมธุรกิจ ${fmtDate(R.from, false)} – ${fmtDate(R.to, false)}`,
    `<div class="seg">${Object.entries(PERIODS).map(([k, l]) => `<a href="#/admin/overview?p=${k}" class="${k === pk ? 'on' : ''}">${l}</a>`).join('')}</div>`) + `
    <div class="kpi-grid">
      ${kpi('fa-sack-dollar', 'ok', 'ยอดขาย (Gross)', money(cur.revenue), deltaHtml(cur.revenue, prev.revenue))}
      ${kpi('fa-calendar-check', 'info', 'การจอง', cur.count.toLocaleString(), deltaHtml(cur.count, prev.count))}
      ${kpi('fa-bed', 'violet', 'อัตราเข้าพัก (Occupancy)', pct(cur.occ), deltaHtml(cur.occ, prev.occ))}
      ${kpi('fa-tag', 'warn', 'ADR ราคาเฉลี่ย/ห้อง/คืน', money(cur.adr), deltaHtml(cur.adr, prev.adr))}
      ${kpi('fa-chart-column', 'info', 'RevPAR', money(cur.revpar), deltaHtml(cur.revpar, prev.revpar))}
      ${kpi('fa-ban', 'bad', 'อัตรายกเลิก', pct(cur.cancelRate), deltaHtml(cur.cancelRate, prev.cancelRate, true))}
    </div>
    <div class="bo-grid g-2-1">
      <section class="card"><div class="card-h"><h3>ยอดขายรายวัน</h3><span class="muted small">ตามวันที่จอง · รวมภาษีและค่าบริการ</span></div><div id="ov-line" class="chart"></div></section>
      <section class="card"><div class="card-h"><h3>เป้าหมายเดือนนี้</h3><span class="muted small">${TH_MON_FULL[now.getMonth()]}</span></div>
        <div class="target"><div class="kpi-v">${money(mtd)}</div><div class="muted small">จากเป้า ${money(target)}</div>
          <div class="meter"><span style="width:${Math.min(100, target ? mtd / target * 100 : 0)}%"></span><i style="left:${Math.min(100, target ? forecast / target * 100 : 0)}%" title="คาดการณ์สิ้นเดือน"></i></div>
          <div class="row between small"><span>${target ? pct(mtd / target, 0) : '-'} ของเป้า</span><span class="muted">คาดการณ์สิ้นเดือน <b>${money(forecast)}</b></span></div></div>
        <div class="mini-stats"><div><span>ระยะจองล่วงหน้าเฉลี่ย</span><b>${cur.lead.toFixed(1)} วัน</b></div><div><span>จำนวนคืนเฉลี่ย</span><b>${cur.los.toFixed(1)} คืน</b></div><div><span>Room-nights ที่ขาย</span><b>${cur.roomNights.toLocaleString()}</b></div><div><span>ยอดค้างรับ</span><b class="${unpaidSum ? 'red' : ''}">${money(unpaidSum)}</b></div></div>
      </section>
    </div>
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3>ยอดขายตามที่พัก</h3><a class="small" href="#/admin/properties">เทียบผลงานทุกที่พัก →</a></div>
        ${top.length ? `<div class="hbars">${top.map(([n, v]) => `<div class="hbar" title="${esc(n)}: ${money(v)}"><div class="row between small"><span>${esc(n)}</span><b>${money(v)}</b></div><div class="track"><span style="width:${v / top[0][1] * 100}%"></span></div></div>`).join('')}</div>` : '<p class="muted small">ยังไม่มีข้อมูล</p>'}</section>
      <section class="card"><div class="card-h"><h3>ช่องทางการชำระเงิน</h3></div>
        ${payTotal ? `<div class="stack">${byPay.map((v, i) => v ? `<span class="s${i + 1}" style="flex:${v}" title="${PAY_TH[payKeys[i]]}: ${money(v)}"></span>` : '').join('')}</div>
        <div class="legend">${payKeys.map((k, i) => `<div><i class="sw s${i + 1}"></i><span>${PAY_TH[k]}</span><b>${money(byPay[i])}</b><em>${pct(byPay[i] / payTotal, 0)}</em></div>`).join('')}</div>` : '<p class="muted small">ยังไม่มีข้อมูล</p>'}
        <div class="card-h" style="margin-top:22px"><h3>ข้อสังเกตอัตโนมัติ</h3></div>
        <ul class="insights">${ins.map(([t, x]) => `<li><i class="fa-solid ${insIc[t]}"></i><span>${x}</span></li>`).join('')}</ul></section>
    </div>`;
  lineChart($('#ov-line'), days.map(d => ({ d, v: byDay[d] })));
}

function niceMax(v) { const p = 10 ** Math.floor(Math.log10(v)); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function lineChart(el, pts) {
  const W = Math.max(300, el.clientWidth), H = 240, P = { l: 52, r: 14, t: 14, b: 28 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b, max = niceMax(Math.max(1, ...pts.map(p => p.v)));
  const X = i => P.l + (pts.length < 2 ? iw / 2 : i * iw / (pts.length - 1)), Y = v => P.t + ih - v / max * ih;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 70))));
  const dlabel = d => { const x = new Date(d + 'T00:00:00'); return `${x.getDate()} ${TH_MON[x.getMonth()]}`; };
  el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="กราฟยอดขายรายวัน">
    ${[0, 1, 2, 3, 4].map(i => { const v = max * i / 4, y = Y(v); return `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" class="grid"/><text x="${P.l - 8}" y="${y + 4}" text-anchor="end" class="ax">${shortMoney(v)}</text>`; }).join('')}
    ${pts.map((p, i) => i % step === 0 ? `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="ax">${dlabel(p.d)}</text>` : '').join('')}
    <path d="${line}L${X(pts.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z" class="area"/><path d="${line}" class="ln"/>
    <line class="xh" y1="${P.t}" y2="${P.t + ih}" style="display:none"/><circle class="hdot" r="5" style="display:none"/>
    <rect x="${P.l}" y="${P.t}" width="${iw}" height="${ih}" fill="transparent" class="hit"/></svg><div class="tip"></div>`;
  const svg = $('svg', el), tip = $('.tip', el), xh = $('.xh', el), dot = $('.hdot', el);
  const show = e => {
    const r = svg.getBoundingClientRect(), mx = e.clientX - r.left;
    const i = Math.max(0, Math.min(pts.length - 1, Math.round(pts.length < 2 ? 0 : (mx - P.l) / iw * (pts.length - 1))));
    const x = X(i), y = Y(pts[i].v);
    xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.display = '';
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.style.display = '';
    tip.innerHTML = `<span>${fmtDate(pts[i].d)}</span><b>${money(pts[i].v)}</b>`;
    tip.style.display = 'block';
    tip.style.left = Math.min(W - tip.offsetWidth - 4, Math.max(4, x - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(0, y - 58) + 'px';
  };
  const hide = () => { xh.style.display = dot.style.display = 'none'; tip.style.display = 'none'; };
  $('.hit', el).addEventListener('mousemove', show);
  $('.hit', el).addEventListener('touchstart', e => show(e.touches[0]), { passive: true });
  $('.hit', el).addEventListener('mouseleave', hide);
}

// ================= Owner: Reports =================
function boReports(main, params) {
  const bks = DB.bookings();
  const years = [...new Set([new Date().getFullYear(), ...bks.map(b => +b.checkIn.slice(0, 4))])].sort((a, b) => b - a);
  const y = +params.get('y') || years[0];
  const inYear = bks.filter(b => +b.checkIn.slice(0, 4) === y);
  const disc = b => b.price.orig - b.price.room + (b.price.member || 0) + (b.price.coupon || 0);
  const months = TH_MON.map((m, i) => {
    const mb = inYear.filter(b => +b.checkIn.slice(5, 7) === i + 1), ok = mb.filter(b => b.status !== 'cancelled');
    return { m, count: ok.length, cancel: mb.length - ok.length, nights: ok.reduce((s, b) => s + b.nights * b.qty, 0), gross: ok.reduce((s, b) => s + b.price.orig, 0), disc: ok.reduce((s, b) => s + disc(b), 0), tax: ok.reduce((s, b) => s + b.price.tax, 0), total: ok.reduce((s, b) => s + b.price.total, 0), paid: ok.filter(b => b.payment.paid).reduce((s, b) => s + b.price.total, 0) };
  });
  const T = months.reduce((a, r) => { Object.keys(r).forEach(k => k !== 'm' && (a[k] = (a[k] || 0) + r[k])); return a; }, {});
  const byHotel = {};
  inYear.filter(b => b.status !== 'cancelled').forEach(b => { const h = byHotel[b.hotelName] ||= { n: 0, nights: 0, total: 0 }; h.n++; h.nights += b.nights * b.qty; h.total += b.price.total; });
  const hotels = Object.entries(byHotel).sort((a, b) => b[1].total - a[1].total);
  const ar = bks.filter(b => b.status !== 'cancelled' && !b.payment.paid).sort((a, b) => a.checkIn < b.checkIn ? -1 : 1);
  const n = v => v ? money(v) : '<span class="muted">-</span>';
  main.innerHTML = pageHead('รายงานการเงิน', 'รับรู้รายได้ตามเดือนที่เข้าพัก (เช็คอิน) · ไม่รวมการจองที่ยกเลิก',
    `<select id="rp-y" class="sel">${years.map(x => `<option value="${x}" ${x === y ? 'selected' : ''}>ปี ${x + 543}</option>`).join('')}</select>
     <button class="btn btn-outline btn-sm" id="rp-csv"><i class="fa-solid fa-file-csv"></i> CSV</button><button class="btn btn-outline btn-sm" onclick="print()"><i class="fa-solid fa-print"></i> พิมพ์</button>`) + `
    <div class="kpi-grid k4">
      ${kpi('fa-coins', 'ok', `รายได้รวมปี ${y + 543}`, money(T.total))}
      ${kpi('fa-building-columns', 'info', 'รายได้สุทธิ (ก่อนภาษี/บริการ)', money(T.total - T.tax))}
      ${kpi('fa-percent', 'warn', 'ส่วนลดที่ให้ไป', money(T.disc), T.gross ? `${pct(T.disc / T.gross)} ของราคาเต็ม` : '')}
      ${kpi('fa-hand-holding-dollar', 'bad', 'ยอดค้างรับทั้งหมด', money(ar.reduce((s, b) => s + b.price.total, 0)), `${ar.length} การจอง`)}
    </div>
    <section class="card flush"><div class="card-h pad"><h3>สรุปรายเดือน</h3></div><div class="table-scroll"><table class="tbl num">
      <thead><tr><th>เดือน</th><th>การจอง</th><th>ยกเลิก</th><th>Room-nights</th><th>ราคาเต็ม</th><th>ส่วนลด</th><th>ค่าบริการ+VAT</th><th>รายได้รวม</th><th>รับชำระแล้ว</th></tr></thead>
      <tbody>${months.map(r => `<tr><td>${r.m}</td><td>${r.count || '-'}</td><td>${r.cancel || '-'}</td><td>${r.nights || '-'}</td><td>${n(r.gross)}</td><td>${r.disc ? '−' + money(r.disc) : '-'}</td><td>${n(r.tax)}</td><td><b>${n(r.total)}</b></td><td>${n(r.paid)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>รวม</td><td>${T.count}</td><td>${T.cancel}</td><td>${T.nights}</td><td>${money(T.gross)}</td><td>−${money(T.disc)}</td><td>${money(T.tax)}</td><td>${money(T.total)}</td><td>${money(T.paid)}</td></tr></tfoot></table></div></section>
    <div class="bo-grid g-1-1">
      <section class="card flush"><div class="card-h pad"><h3>แยกตามที่พัก</h3></div><div class="table-scroll"><table class="tbl num"><thead><tr><th>ที่พัก</th><th>การจอง</th><th>Room-nights</th><th>รายได้</th><th>สัดส่วน</th></tr></thead>
        <tbody>${hotels.length ? hotels.map(([h, v]) => `<tr><td>${esc(h)}</td><td>${v.n}</td><td>${v.nights}</td><td><b>${money(v.total)}</b></td><td>${pct(v.total / T.total)}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">ไม่มีข้อมูล</td></tr>'}</tbody></table></div></section>
      <section class="card flush"><div class="card-h pad"><h3>ลูกหนี้ / ยอดค้างชำระ</h3><span class="small muted">${ar.length} รายการ</span></div><div class="table-scroll" style="max-height:420px"><table class="tbl"><thead><tr><th>รหัส</th><th>แขก</th><th>เช็คอิน</th><th>ช่องทาง</th><th style="text-align:right">ยอด</th></tr></thead>
        <tbody>${ar.length ? ar.map(b => `<tr data-bk="${b.id}" class="click"><td><b>${b.id}</b></td><td>${esc(guestName(b))}</td><td class="small ${b.checkIn < todayISO() ? 'red' : ''}">${fmtDate(b.checkIn, false)}</td><td class="small">${PAY_TH[b.payment.method]}</td><td style="text-align:right"><b>${money(b.price.total)}</b></td></tr>`).join('') : '<tr><td colspan="5" class="muted">ไม่มียอดค้างชำระ 🎉</td></tr>'}</tbody></table></div></section>
    </div>`;
  bindBk(main);
  $('#rp-y').onchange = e => go(`/admin/reports?y=${e.target.value}`);
  $('#rp-csv').onclick = () => {
    const rows = [['เดือน', 'การจอง', 'ยกเลิก', 'Room-nights', 'ราคาเต็ม', 'ส่วนลด', 'ค่าบริการ+VAT', 'รายได้รวม', 'รับชำระแล้ว'], ...months.map(r => [`${r.m} ${y + 543}`, r.count, r.cancel, r.nights, r.gross, r.disc, r.tax, r.total, r.paid]), ['รวม', T.count, T.cancel, T.nights, T.gross, T.disc, T.tax, T.total, T.paid]];
    downloadFile(`report-${y}.csv`, toCsv(rows), 'text/csv;charset=utf-8'); DB.log('report.export', `รายงานปี ${y}`);
  };
}

// ================= ผู้ดูแลแพลตฟอร์ม: ทีมผู้ดูแล & สิทธิ์ =================
// เจ้าของรีสอร์ทจัดการที่หน้า "เจ้าของรีสอร์ท" — หน้านี้สำหรับบัญชีผู้ดูแลแพลตฟอร์มเท่านั้น
function boStaff(main) {
  const me = DB.currentUser();
  const staff = DB.users().filter(u => u.role === 'admin' || u.role === 'dev').sort((a, b) => a.role < b.role ? -1 : 1);
  const activeAdmins = staff.filter(u => u.role === 'admin' && u.active !== false).length;
  main.innerHTML = pageHead('ทีมผู้ดูแล & นักพัฒนา', `${staff.length} บัญชี · เจ้าของรีสอร์ทจัดการได้ที่หน้า "เจ้าของรีสอร์ท"`, '<button class="btn btn-primary" id="st-add"><i class="fa-solid fa-user-plus"></i> เพิ่มทีมงาน</button>') + `
    <section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>ทีมงาน</th><th>บทบาท</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>
      ${staff.map(u => `<tr><td><div class="row" style="gap:10px"><span class="bo-av sm" style="background:${ROLES[u.role].color}">${esc(u.name[0] || '?')}</span><div><b>${esc(u.name)}</b>${u.id === me.id ? ' <span class="pill">คุณ</span>' : ''}<div class="small muted">${esc(u.email)}${u.phone ? ' · ' + esc(u.phone) : ''}</div></div></div></td>
        <td>${roleBadge(u.role)}${u.role === 'admin' && Array.isArray(u.perms) ? `<div class="small muted" title="${esc(u.perms.map(k => PERMS[k] || k).join(', '))}">สิทธิ์เฉพาะ ${u.perms.length}/${ROLE_PERMS.admin.length}</div>` : ''}</td><td>${u.active === false ? '<span class="pill bad">ระงับ</span>' : '<span class="pill ok">ใช้งาน</span>'}</td>
        <td class="small muted">${u.lastLogin ? relTime(u.lastLogin) : 'ยังไม่เคยเข้าใช้'}</td>
        <td style="text-align:right;white-space:nowrap">${u.id === me.id ? '<a class="btn btn-sm btn-ghost" href="#/admin/profile">แก้ไขโปรไฟล์</a>' : `<button class="btn btn-sm btn-outline" data-se="${u.id}"><i class="fa-solid fa-pen"></i> แก้ไข</button> <button class="btn btn-sm btn-ghost" data-spw="${u.id}" title="รีเซ็ตรหัสผ่าน"><i class="fa-solid fa-key"></i></button> <button class="btn btn-sm btn-ghost" data-ssus="${u.id}" title="${u.active === false ? 'เปิดใช้งาน' : 'ระงับ'}"><i class="fa-solid ${u.active === false ? 'fa-user-check' : 'fa-user-slash'}"></i></button> <button class="btn btn-sm btn-ghost red" data-sdel="${u.id}" title="ลบ"><i class="fa-solid fa-trash"></i></button>`}</td></tr>`).join('')}
    </tbody></table></div></section>
    <section class="card flush"><div class="card-h pad"><h3>ตารางสิทธิ์ตามบทบาท</h3><span class="small muted">บังคับที่ฐานข้อมูล — เจ้าของรีสอร์ทเห็นเฉพาะข้อมูลของรีสอร์ทตัวเอง</span></div><div class="table-scroll"><table class="tbl matrix"><thead><tr><th>สิทธิ์</th>${STAFF_ROLES.map(r => `<th>${ROLES[r].label}</th>`).join('')}</tr></thead><tbody>
      ${Object.entries(PERMS).filter(([k]) => STAFF_ROLES.some(r => ROLE_PERMS[r].includes(k))).map(([k, l]) => `<tr><td>${l}<div class="small muted mono">${k}</div></td>${STAFF_ROLES.map(r => `<td>${ROLE_PERMS[r].includes(k) ? '<i class="fa-solid fa-circle-check green" aria-label="มีสิทธิ์"></i>' : '<i class="fa-solid fa-minus muted" aria-label="ไม่มีสิทธิ์"></i>'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div></section>`;
  const guardLast = u => u.role === 'admin' && u.active !== false && activeAdmins <= 1;
  $('#st-add').onclick = () => staffForm(null);
  $$('[data-se]', main).forEach(b => b.onclick = () => staffForm(DB.users().find(u => u.id === b.dataset.se)));
  $$('[data-spw]', main).forEach(b => b.onclick = async () => {
    const u = DB.users().find(x => x.id === b.dataset.spw), pw = genPassword();
    if (!(await confirmBox(`ตั้งรหัสผ่านใหม่ให้ <b>${esc(u.name)}</b>?`, 'รีเซ็ตรหัสผ่าน'))) return;
    const r = await DB.staffAdmin('resetpw', { id: u.id, password: pw });
    if (r.error) return toast(r.error, 'err');
    DB.log('staff.resetpw', u.email);
    showCredential(u.email, pw, 'รีเซ็ตรหัสผ่านแล้ว', u.role);
  });
  $$('[data-ssus]', main).forEach(b => b.onclick = async () => {
    const u = DB.users().find(x => x.id === b.dataset.ssus), suspend = u.active !== false;
    if (suspend && guardLast(u)) return toast('ต้องมีผู้ดูแลแพลตฟอร์มที่ใช้งานได้อย่างน้อย 1 คน', 'err');
    if (!(await confirmBox(`${suspend ? 'ระงับ' : 'เปิดใช้งาน'}บัญชี <b>${esc(u.name)}</b>?`, suspend ? 'ระงับบัญชี' : 'เปิดใช้งาน'))) return;
    DB.updateUser(u.id, { active: !suspend }); DB.log(suspend ? 'staff.suspend' : 'staff.activate', u.email); toast('อัปเดตแล้ว'); render();
  });
  $$('[data-sdel]', main).forEach(b => b.onclick = async () => {
    const u = DB.users().find(x => x.id === b.dataset.sdel);
    if (guardLast(u)) return toast('ต้องมีผู้ดูแลแพลตฟอร์มที่ใช้งานได้อย่างน้อย 1 คน', 'err');
    if (!(await confirmBox(`ลบ <b>${esc(u.name)}</b> (${esc(u.email)}) ออกจากทีมผู้ดูแล? สิทธิ์ทั้งหมดจะถูกยกเลิกทันที`, 'ลบออกจากทีม'))) return;
    const r = await DB.staffAdmin('delete', { id: u.id });
    if (r.error) return toast(r.error, 'err');
    DB.log('staff.delete', u.email); toast('ลบออกจากทีมแล้ว'); render();
  });
}
function genPassword() { const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const a = crypto.getRandomValues(new Uint32Array(10)); a.forEach(n => s += c[n % c.length]); return s; }
function showCredential(email, pw, title, role) {
  const url = new URL(portalUrl(role), location.href).href; // ลิงก์หน้าหลังบ้านของบทบาทนั้น
  const m = openModal(`<h2>${title}</h2><p class="small muted">ส่งข้อมูลนี้ผ่านช่องทางที่ปลอดภัย — รหัสผ่านจะแสดงเพียงครั้งเดียว</p>
    <div class="cred"><div><span>อีเมล</span><b>${esc(email)}</b></div><div><span>รหัสผ่าน</span><b class="mono">${esc(pw)}</b></div><div><span>ลิงก์</span><b>${esc(url)}</b></div></div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn btn-outline" id="cr-copy"><i class="fa-regular fa-copy"></i> คัดลอก</button><button class="btn btn-primary" data-close>เสร็จสิ้น</button></div>`);
  $('#cr-copy', m).onclick = () => { copyText(`เข้าสู่ระบบหลังบ้าน ${url}\nอีเมล: ${email}\nรหัสผ่าน: ${pw}`); toast('คัดลอกแล้ว'); };
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) render(); });
}
function staffForm(u) {
  const isNew = !u, pw = genPassword();
  const m = openModal(`<h2>${isNew ? 'เพิ่มทีมงาน' : 'แก้ไขทีมงาน'}</h2>
    <form id="sf" class="form-grid" style="margin-top:14px" novalidate>
      <div class="fg full"><label>ชื่อ-นามสกุล <span class="req">*</span></label><input name="name" value="${esc(u?.name || '')}"></div>
      <div class="fg"><label>อีเมล <span class="req">*</span></label><input name="email" type="email" value="${esc(u?.email || '')}" ${isNew ? '' : 'disabled'}></div>
      <div class="fg"><label>เบอร์โทร</label><input name="phone" value="${esc(u?.phone || '')}"></div>
      ${isNew ? `<div class="fg full"><label>บทบาท</label><div class="role-pick">${['admin', 'dev'].map(r => `<label style="--rc:${ROLES[r].color};--rb:${ROLES[r].bg}"><input type="radio" name="role" value="${r}" ${r === 'admin' ? 'checked' : ''}><i class="fa-solid ${ROLES[r].icon}"></i><b>${ROLES[r].label}</b><small>${r === 'admin' ? 'อนุมัติรีสอร์ท · ภาพรวม · ช่วยเหลือ' : 'ตั้งค่าเว็บ · สถานะระบบ · logs'}</small></label>`).join('')}</div></div>
      <div class="fg full"><label>รหัสผ่านเริ่มต้น</label><div class="pw-wrap"><input name="pass" value="${pw}" class="mono"><button type="button" id="sf-gen" title="สุ่มใหม่"><i class="fa-solid fa-rotate"></i></button></div><div class="small muted" style="margin-top:4px">เพิ่มเฉพาะคนที่ไว้ใจ — ผู้ดูแลแพลตฟอร์มเห็นข้อมูลการจองและลูกค้าทั้งระบบ</div></div>` : ''}
      ${isNew || u.role === 'admin' ? `<div class="fg full" id="sf-perms"><label>สิทธิ์การใช้งาน (เฉพาะผู้ดูแลแพลตฟอร์ม)</label>
        <div class="row wrap" style="gap:8px;margin-bottom:6px"><button type="button" class="btn btn-sm btn-outline" id="sp-all">เลือกทั้งหมด</button><button type="button" class="btn btn-sm btn-ghost" id="sp-none">ล้างทั้งหมด</button></div>
        <div class="perm-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 14px">${ROLE_PERMS.admin.map(k => `<label class="small perm-opt"><input type="checkbox" name="perm" value="${k}" ${userPerms(u || { role: 'admin' }).includes(k) ? 'checked' : ''}><span>${esc(PERMS[k] || k)}<span class="muted mono" style="display:block;font-size:11px">${k}</span></span></label>`).join('')}</div>
        <div class="small muted" style="margin-top:4px">ติ๊กเฉพาะสิ่งที่คนนี้ทำได้ — ให้สิทธิ์เกินกว่าบทบาทผู้ดูแลแพลตฟอร์มไม่ได้</div></div>` : ''}
      <div class="full row" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary">บันทึก</button></div></form>`);
  const permsOf = () => { const p = $$('input[name=perm]:checked', m).map(i => i.value); return p.length === ROLE_PERMS.admin.length ? null : p; }; // เลือกครบ = ตามบทบาท
  $('#sp-all', m)?.addEventListener('click', () => $$('input[name=perm]', m).forEach(i => i.checked = true));
  $('#sp-none', m)?.addEventListener('click', () => $$('input[name=perm]', m).forEach(i => i.checked = false));
  $$('input[name=role]', m).forEach(r => r.onchange = () => { const b = $('#sf-perms', m); if (b) b.style.display = $('input[name=role]:checked', m).value === 'admin' ? '' : 'none'; });
  $('#sf-gen', m)?.addEventListener('click', () => $('[name=pass]', m).value = genPassword());
  $('#sf', m).onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if (!v.name.trim()) return toast('กรุณากรอกชื่อ', 'err');
    if (!isNew) {
      DB.updateUser(u.id, { name: v.name.trim(), phone: v.phone.trim(), ...(u.role === 'admin' ? { perms: permsOf() } : {}) });
      DB.log('staff.edit', u.email); closeModal(); toast('บันทึกแล้ว'); return render();
    }
    const email = v.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('รูปแบบอีเมลไม่ถูกต้อง', 'err');
    if ((v.pass || '').length < 8) return toast('รหัสผ่านอย่างน้อย 8 ตัวอักษร', 'err');
    const btn = $('button.btn-primary', e.target); btn.disabled = true;
    const role = v.role === 'dev' ? 'dev' : 'admin';
    const r = await DB.staffAdmin('create', { email, password: v.pass, name: v.name.trim(), phone: v.phone.trim(), role });
    btn.disabled = false;
    if (r.error) return toast(r.error, 'err');
    if (role === 'admin') { const pr = permsOf(); if (pr) DB.updateUser(r.id, { perms: pr }); }
    DB.log('staff.add', `${email} · ${ROLES[role].label}`);
    showCredential(email, v.pass, 'เพิ่มทีมงานเรียบร้อย', role);
  };
}

// ================= Ops: Today =================
function boToday(main) {
  const today = todayISO(), bks = DB.bookings().filter(b => b.status !== 'cancelled');
  const arr = bks.filter(b => b.checkIn === today), dep = bks.filter(b => b.checkOut === today);
  const inh = bks.filter(b => b.checkIn <= today && b.checkOut > today);
  const rooms = totalRooms(), occRooms = inh.reduce((s, b) => s + b.qty, 0);
  const pending = bks.filter(b => b.status === 'pending').sort((a, c) => (readyToApprove(c) - readyToApprove(a)) || (a.createdAt < c.createdAt ? -1 : 1));
  const newToday = DB.bookings().filter(b => isoOf(new Date(b.createdAt)) === today);
  const hotels = DB.hotels(true).map(h => { const tot = h.rooms.reduce((s, r) => s + +r.total, 0); const used = inh.filter(b => b.hotelId === h.id).reduce((s, b) => s + b.qty, 0); return [h.name, used, tot]; }).filter(x => x[1]).sort((a, b) => b[1] / b[2] - a[1] / a[2]).slice(0, 8);
  const d = new Date();
  const u = DB.currentUser(), isOwner = u.role === 'owner', myHotels = DB.hotels(true);
  // ปุ่มลัด + ขั้นตอนเริ่มต้น + คำอธิบายการทำงาน (เฉพาะเจ้าของรีสอร์ท)
  let hint = '';
  if (isOwner) {
    const tile = (ic, cls, t, s, attrs) => `<${attrs.startsWith('href') ? 'a' : 'button'} class="qa-tile ${cls}" ${attrs}><i class="fa-solid ${ic}"></i><b>${t}</b><small>${s}</small></${attrs.startsWith('href') ? 'a' : 'button'}>`;
    const tiles = [
      can('frontdesk') && tile('fa-clipboard-check', pending.filter(readyToApprove).length ? 'hot' : '', 'ตรวจสลิป & อนุมัติ', pending.length ? `มี ${pending.length} รายการรอคุณ` : 'ไม่มีรายการค้าง', 'href="#/admin/approvals"'),
      can('inventory') && myHotels.length && tile('fa-ban', '', 'ปิดห้อง (ขายทางอื่นแล้ว)', 'กันลูกค้าจองซ้ำ', 'data-qa-do="block"'),
      can('inventory') && tile('fa-table-cells', '', 'ดูตารางห้องว่าง', 'ใครจอง ห้องไหนว่าง', 'href="#/admin/calendar"'),
      can('hotels.edit') && myHotels.length && tile('fa-share-nodes', '', 'แชร์โปรโมต', 'Facebook · TikTok · LINE', 'data-qa-do="share"'),
      can('hotels.edit') && tile('fa-pen-to-square', '', 'แก้ห้อง รูป & ราคา', 'ปรับราคา ห้อง รูป', 'href="#/admin/hotels"'),
    ].filter(Boolean);
    const po = u.payout || {};
    const steps = [
      [myHotels.some(h => h.rooms.length), 'เพิ่มรีสอร์ทและห้องพัก', 'ใส่ชื่อ รูป ห้อง ราคา และจำนวนห้อง', '#/admin/hotels'],
      [isPromptpayId(po.promptpayId) || !!(po.bankInfo || '').trim(), 'ตั้งบัญชีรับเงิน', 'ใส่พร้อมเพย์หรือเลขบัญชี เพื่อให้ลูกค้าโอนเงินให้คุณได้', '#/admin/payout'],
      [myHotels.some(h => Object.keys(h.social || {}).length), 'ใส่ลิงก์ Facebook / TikTok / LINE ของรีสอร์ท', 'ใช้แสดงในหน้ารีสอร์ทและข้อความโปรโมต', '#/admin/hotels'],
    ];
    const todo = steps.filter(s => !s[0]).length;
    let howHidden = false; try { howHidden = localStorage.getItem('sd_howto_hidden') === '1'; } catch {}
    hint = `<div class="qa-grid">${tiles.join('')}</div>
      ${todo ? `<section class="card checklist"><div class="card-h"><h3><i class="fa-solid fa-list-check"></i> เริ่มต้นใช้งาน — เหลืออีก ${todo} ขั้นตอน</h3><span class="small muted">${steps.length - todo}/${steps.length} เสร็จแล้ว</span></div>
        ${steps.map(([ok, t, s, h], i) => `<a class="ck-step ${ok ? 'done' : ''}" href="${h}"><span class="ck-n">${ok ? '<i class="fa-solid fa-check"></i>' : i + 1}</span><div><b>${t}</b><small>${s}</small></div>${ok ? '' : '<i class="fa-solid fa-chevron-right muted"></i>'}</a>`).join('')}</section>` : ''}
      ${howHidden ? '' : `<section class="card howto"><div class="card-h"><h3><i class="fa-solid fa-circle-question"></i> ระบบนี้ทำงานยังไง?</h3><button class="btn btn-ghost btn-sm" id="howto-hide">ซ่อน</button></div>
        <ol><li><b>ลูกค้าจองบนเว็บ</b> แล้วโอนเงินเข้าบัญชีของคุณ พร้อมแนบสลิป</li>
          <li><b>คุณเช็คยอดในแอปธนาคาร</b> แล้วกด "อนุมัติ" ที่เมนู <a href="#/admin/approvals">ตรวจสลิป & อนุมัติการจอง</a></li>
          <li><b>ถึงวันเข้าพัก</b> กด "เช็คอิน" ที่ <a href="#/admin/frontdesk">แขกเข้า-ออกวันนี้</a> (วันกลับกด "เช็คเอาท์")</li>
          <li><b>ขายห้องทางอื่นไปแล้ว</b> (โทร, LINE, เว็บอื่น) กด "ปิดห้อง" เพื่อไม่ให้ลูกค้าบนเว็บจองซ้ำ</li></ol></section>`}`;
  }
  main.innerHTML = pageHead(isOwner ? 'หน้าหลัก' : 'งานวันนี้', `${fmtDate(today)} · สวัสดี${d.getHours() < 12 ? 'ตอนเช้า' : d.getHours() < 17 ? 'ตอนบ่าย' : 'ตอนเย็น'} ${esc(u.name)}`, !isOwner && can('frontdesk') ? '<a class="btn btn-primary" href="#/admin/frontdesk"><i class="fa-solid fa-bell-concierge"></i> แขกเข้า-ออก</a>' : '') + hint + `
    <div class="kpi-grid">
      ${kpi('fa-plane-arrival', 'warn', 'เช็คอินวันนี้', `${arr.filter(b => b.checkedInAt).length}<small>/${arr.length}</small>`, 'เช็คอินแล้ว / ทั้งหมด')}
      ${kpi('fa-door-open', 'info', 'เช็คเอาท์วันนี้', `${dep.filter(b => b.checkedOutAt).length}<small>/${dep.length}</small>`, 'เช็คเอาท์แล้ว / ทั้งหมด')}
      ${kpi('fa-bed', 'violet', 'ห้องมีแขกคืนนี้', `${occRooms}<small>/${rooms}</small>`, `อัตราเข้าพัก ${pct(rooms ? occRooms / rooms : 0)}`)}
      ${kpi('fa-clipboard-check', 'bad', 'รออนุมัติ', pending.length, `${pending.filter(readyToApprove).length} รายการพร้อมตรวจ`)}
      ${kpi('fa-cart-plus', 'ok', 'จองใหม่วันนี้', newToday.length, money(newToday.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price.total, 0)))}
    </div>
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-plane-arrival"></i> แขกเข้าวันนี้</h3><span class="small muted">${arr.length} รายการ</span></div>
        ${bkRows(arr, { empty: 'ไม่มีแขกเช็คอินวันนี้', right: b => b.checkedInAt ? '<span class="pill ok">เช็คอินแล้ว</span>' : can('frontdesk') ? qaBtn(b, 'checkin', 'เช็คอิน') : stChip(b) })}</section>
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-door-open"></i> แขกออกวันนี้</h3><span class="small muted">${dep.length} รายการ</span></div>
        ${bkRows(dep, { empty: 'ไม่มีแขกเช็คเอาท์วันนี้', right: b => b.checkedOutAt ? '<span class="pill ok">ออกแล้ว</span>' : b.checkedInAt && can('frontdesk') ? qaBtn(b, 'checkout', 'เช็คเอาท์') : stChip(b) })}</section>
    </div>
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-clipboard-check"></i> รออนุมัติ</h3><a class="small" href="#/admin/approvals">ตรวจสลิป & อนุมัติ →</a></div>
        ${bkRows(pending.slice(0, 6), { empty: 'ไม่มีการจองรออนุมัติ', right: b => `<span class="small ${readyToApprove(b) ? 'green' : 'muted'} hide-m">${b.payment.slip ? 'มีสลิป' : b.payment.method === 'hotel' ? 'จ่ายที่พัก' : 'ยังไม่ส่งสลิป'}</span> <b>${money(b.price.total)}</b>` })}</section>
      <section class="card"><div class="card-h"><h3>ห้องมีแขกคืนนี้ตามที่พัก</h3></div>
        ${hotels.length ? `<div class="hbars">${hotels.map(([n, u, t]) => `<div class="hbar"><div class="row between small"><span>${esc(n)}</span><b>${u}/${t} ห้อง</b></div><div class="track"><span style="width:${u / t * 100}%"></span></div></div>`).join('')}</div>` : '<p class="muted small">คืนนี้ยังไม่มีแขกเข้าพัก</p>'}</section>
    </div>
    <section class="card"><div class="card-h"><h3>การจองล่าสุด</h3><a class="small" href="#/admin/bookings">ทั้งหมด →</a></div>${bkRows(DB.bookings().slice(0, 6), { right: b => `<span class="small muted hide-m">${relTime(b.createdAt)}</span> ${stChip(b)}` })}</section>`;
  bindBk(main);
  $('#howto-hide', main)?.addEventListener('click', () => { try { localStorage.setItem('sd_howto_hidden', '1'); } catch {} boToday(main); });
  $$('[data-qa-do]', main).forEach(b => b.onclick = () => pickHotel(b.dataset.qaDo === 'block' ? 'ปิดห้องของรีสอร์ทไหน?' : 'แชร์โปรโมตรีสอร์ทไหน?', h => b.dataset.qaDo === 'block' ? blockRoomsModal(h, {}, () => boToday(main)) : sharePromo(h)));
}
// เลือกรีสอร์ท (ถ้ามีแห่งเดียวข้ามขั้นนี้) แล้วทำต่อ
function pickHotel(title, cb) {
  const list = DB.hotels(true);
  if (!list.length) return toast('ยังไม่มีที่พัก — เพิ่มรีสอร์ทก่อน', 'err');
  if (list.length === 1) return cb(list[0]);
  const m = openModal(`<h2>${title}</h2><div style="margin-top:12px">${list.map(h => `<button class="btn btn-outline btn-block" style="justify-content:flex-start;margin-bottom:8px" data-pick="${h.id}">${esc(h.name)}</button>`).join('')}</div>`);
  $$('[data-pick]', m).forEach(b => b.onclick = () => { closeModal(); cb(DB.hotel(b.dataset.pick)); });
}

// ================= Ops: Front desk =================
function boFrontdesk(main, params) {
  const tab = params.get('tab') || 'arrivals', date = params.get('d') || todayISO();
  const bks = DB.bookings().filter(b => b.status !== 'cancelled');
  const sets = {
    arrivals: ['fa-plane-arrival', 'แขกเข้า', bks.filter(b => b.checkIn === date)],
    inhouse: ['fa-bed', 'กำลังเข้าพัก', bks.filter(b => b.checkedInAt && !b.checkedOutAt)],
    departures: ['fa-door-open', 'แขกออก', bks.filter(b => b.checkOut === date || (b.checkedInAt && !b.checkedOutAt && b.checkOut < date))],
  };
  const list = sets[tab][2].sort((a, b) => a.hotelName.localeCompare(b.hotelName, 'th'));
  const q = (t, d = date) => `#/admin/frontdesk?tab=${t}&d=${d}`;
  const action = b => {
    if (tab === 'arrivals') return b.checkedInAt ? `<span class="pill ok">เช็คอิน ${fmtDateTime(b.checkedInAt).slice(-5)}</span>` : b.checkIn > todayISO() ? '<span class="pill">ยังไม่ถึงวัน</span>' : qaBtn(b, 'checkin', '<i class="fa-solid fa-right-to-bracket"></i> เช็คอิน');
    if (b.checkedOutAt) return '<span class="pill ok">ออกแล้ว</span>';
    return b.checkedInAt ? qaBtn(b, 'checkout', '<i class="fa-solid fa-right-from-bracket"></i> เช็คเอาท์') : '<span class="pill">ยังไม่เช็คอิน</span>';
  };
  main.innerHTML = pageHead('แขกเข้า-ออก (เช็คอิน / เช็คเอาท์)', 'แขกมาถึงกดเช็คอิน แขกกลับกดเช็คเอาท์ · คลิกที่รายการเพื่อดูรายละเอียด เพิ่มโน้ต หรือรับเงินสด',
    `<a class="btn btn-ghost btn-sm" href="${q(tab, addDays(date, -1))}"><i class="fa-solid fa-chevron-left"></i></a><input type="date" id="fd-d" class="sel" value="${date}"><a class="btn btn-ghost btn-sm" href="${q(tab, addDays(date, 1))}"><i class="fa-solid fa-chevron-right"></i></a>${date !== todayISO() ? `<a class="btn btn-outline btn-sm" href="${q(tab, todayISO())}">วันนี้</a>` : ''}`) + `
    <div class="tabs">${Object.entries(sets).map(([k, [ic, l, arr]]) => `<a href="${q(k)}" class="${k === tab ? 'on' : ''}"><i class="fa-solid ${ic}"></i> ${l} <em>${arr.length}</em></a>`).join('')}</div>
    <section class="card flush">${list.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>แขก</th><th>ที่พัก / ห้อง</th><th>เข้าพัก</th><th>การชำระ</th><th>โน้ต</th><th style="text-align:right">ดำเนินการ</th></tr></thead><tbody>
      ${list.map(b => `<tr data-bk="${b.id}" class="click"><td><b>${esc(guestName(b))}</b><div class="small muted">${b.id} · <a href="tel:${esc(b.guest.phone)}" onclick="event.stopPropagation()">${esc(b.guest.phone)}</a></div></td>
        <td>${esc(b.hotelName)}<div class="small muted">${b.qty}× ${esc(b.roomName)} · ${b.adults + b.children} คน</div></td>
        <td class="small">${fmtDate(b.checkIn, false)} → ${fmtDate(b.checkOut, false)}<div class="muted">${b.nights} คืน${b.checkOut < todayISO() && !b.checkedOutAt ? ' · <span class="red">เกินกำหนดออก</span>' : ''}</div></td>
        <td>${payChip(b)}<div class="small muted">${money(b.price.total)}</div></td>
        <td class="small muted" style="max-width:200px">${esc([...(b.guest.requests || []), ...(b.notes || []).map(n => n.text)].join(' · ')) || '-'}</td>
        <td style="text-align:right;white-space:nowrap">${can('frontdesk') ? action(b) : stChip(b)}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="bo-empty sm"><i class="fa-solid ${sets[tab][0]}"></i><p class="muted">ไม่มีรายการ${sets[tab][1]}${tab !== 'inhouse' ? ' วันที่ ' + fmtDate(date, false) : ''}</p></div>`}</section>`;
  $('#fd-d').onchange = e => e.target.value && go(`/admin/frontdesk?tab=${tab}&d=${e.target.value}`);
  bindBk(main);
}

// ================= Ops: Bookings =================
function boBookings(main, params) {
  const f = { q: params.get('q') || '', st: params.get('st') || '', hotel: '', pay: '', from: '', to: '', page: 1 };
  const PER = 15;
  main.innerHTML = pageHead('รายการจองทั้งหมด', 'ค้นหา กรอง และจัดการการจองทั้งหมด', `<button class="btn btn-outline btn-sm" id="bk-csv"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>`) + `
    <div class="filters">
      <div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="bk-q" placeholder="รหัส / ชื่อ / อีเมล / เบอร์" value="${esc(f.q)}"></div>
      <select id="bk-h" class="sel"><option value="">ทุกที่พัก</option>${DB.hotels(true).map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select>
      <select id="bk-p" class="sel"><option value="">การชำระทั้งหมด</option><option value="paid">ชำระแล้ว</option><option value="unpaid">ค้างชำระ</option></select>
      <label class="f-date">เช็คอินตั้งแต่ <input type="date" id="bk-from" class="sel"></label><label class="f-date">ถึง <input type="date" id="bk-to" class="sel"></label>
      <button class="btn btn-ghost btn-sm" id="bk-clear">ล้างตัวกรอง</button>
    </div>
    <div class="tabs" id="bk-tabs"></div><section class="card flush" id="bk-list"></section>`;
  const base = () => DB.bookings().filter(b => {
    const t = f.q.toLowerCase();
    if (t && ![b.id, guestName(b), b.guest.email, b.guest.phone].join(' ').toLowerCase().includes(t)) return false;
    if (f.hotel && b.hotelId !== f.hotel) return false;
    if (f.pay && (f.pay === 'paid') !== !!b.payment.paid) return false;
    if (f.from && b.checkIn < f.from) return false;
    if (f.to && b.checkIn > f.to) return false;
    return true;
  });
  const filtered = () => base().filter(b => !f.st || boStatus(b) === f.st);
  const draw = () => {
    const all = base(), list = filtered(), pages = Math.max(1, Math.ceil(list.length / PER));
    f.page = Math.min(f.page, pages);
    const cnt = k => all.filter(b => boStatus(b) === k).length;
    $('#bk-tabs').innerHTML = [['', 'ทั้งหมด', all.length], ...['pending', 'confirmed', 'inhouse', 'completed', 'cancelled'].map(k => [k, BO_ST[k], cnt(k)])].map(([k, l, n]) => `<a href="javascript:" data-tab="${k}" class="${f.st === k ? 'on' : ''}">${l} <em>${n}</em></a>`).join('');
    $$('[data-tab]', main).forEach(a => a.onclick = () => { f.st = a.dataset.tab; f.page = 1; draw(); });
    const rows = list.slice((f.page - 1) * PER, f.page * PER);
    const sum = list.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price.total, 0);
    $('#bk-list').innerHTML = !list.length ? '<div class="bo-empty sm"><i class="fa-solid fa-inbox"></i><p class="muted">ไม่พบการจองตามเงื่อนไข</p></div>' : `<div class="table-scroll"><table class="tbl"><thead><tr><th>รหัส</th><th>ผู้เข้าพัก</th><th>ที่พัก / ห้อง</th><th>วันเข้าพัก</th><th style="text-align:right">ยอดรวม</th><th>การชำระ</th><th>สถานะ</th></tr></thead><tbody>
      ${rows.map(b => `<tr data-bk="${b.id}" class="click"><td><b>${b.id}</b><div class="small muted">${fmtDateTime(b.createdAt)}</div></td>
        <td>${esc(guestName(b))}<div class="small muted">${esc(b.guest.phone)}</div></td>
        <td>${esc(b.hotelName)}<div class="small muted">${b.qty}× ${esc(b.roomName)}</div></td>
        <td class="small">${fmtDate(b.checkIn, false)} →<br>${fmtDate(b.checkOut, false)} · ${b.nights} คืน</td>
        <td style="text-align:right"><b>${money(b.price.total)}</b>${b.price.couponCode ? `<div class="small muted">${esc(b.price.couponCode)}</div>` : ''}</td>
        <td>${payChip(b)}<div class="small muted">${PAY_TH[b.payment.method]}</div></td><td>${stChip(b)}</td></tr>`).join('')}</tbody></table></div>
      <div class="pager"><span class="small muted">${list.length} รายการ · ยอดรวม (ไม่รวมยกเลิก) <b>${money(sum)}</b></span><div class="row" style="gap:4px"><button class="btn btn-sm btn-ghost" data-pg="-1" ${f.page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button><span class="small">หน้า ${f.page} / ${pages}</span><button class="btn btn-sm btn-ghost" data-pg="1" ${f.page >= pages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button></div></div>`;
    $$('[data-pg]', main).forEach(b => b.onclick = () => { f.page += +b.dataset.pg; draw(); });
    bindBk($('#bk-list'), draw);
  };
  $('#bk-q').oninput = debounce(e => { f.q = e.target.value.trim(); f.page = 1; draw(); }, 200);
  [['#bk-h', 'hotel'], ['#bk-p', 'pay'], ['#bk-from', 'from'], ['#bk-to', 'to']].forEach(([s, k]) => $(s).onchange = e => { f[k] = e.target.value; f.page = 1; draw(); });
  $('#bk-clear').onclick = () => { Object.assign(f, { q: '', st: '', hotel: '', pay: '', from: '', to: '', page: 1 }); ['#bk-q', '#bk-h', '#bk-p', '#bk-from', '#bk-to'].forEach(s => $(s).value = ''); draw(); };
  $('#bk-csv').onclick = () => {
    const rows = [['รหัส', 'วันที่จอง', 'ชื่อ', 'อีเมล', 'โทร', 'ที่พัก', 'ห้อง', 'จำนวน', 'เช็คอิน', 'เช็คเอาท์', 'คืน', 'ยอดรวม', 'ภาษี/บริการ', 'คูปอง', 'วิธีชำระ', 'ชำระแล้ว', 'สถานะ']];
    filtered().forEach(b => rows.push([b.id, b.createdAt, guestName(b), b.guest.email, b.guest.phone, b.hotelName, b.roomName, b.qty, b.checkIn, b.checkOut, b.nights, b.price.total, b.price.tax, b.price.couponCode || '', PAY_TH[b.payment.method], b.payment.paid ? 'Y' : 'N', BO_ST[boStatus(b)]]));
    downloadFile(`bookings-${todayISO()}.csv`, toCsv(rows), 'text/csv;charset=utf-8'); DB.log('booking.export', `${rows.length - 1} รายการ`);
  };
  draw();
}

// ปิดห้อง: ลูกค้ามาจากช่องทางอื่น (เว็บอื่น โทร LINE walk-in) หรือปิดซ่อม → ตัดห้องออกจากระบบทันที กันลูกค้าบนเว็บจองซ้ำ
const BLOCK_CHANNELS = ['Agoda', 'Booking.com', 'Traveloka', 'Trip.com', 'Airbnb', 'โทรศัพท์ / LINE', 'หน้าเคาน์เตอร์', 'ปิดห้อง'];
function blockRoomsModal(h, preset, done) {
  if (!h?.rooms?.length) return toast('ที่พักนี้ยังไม่มีห้องพัก', 'err');
  const ci0 = preset.date || todayISO(), room0 = h.rooms.find(r => r.id === preset.roomId) || h.rooms[0];
  const m = openModal(`<h2><i class="fa-solid fa-ban"></i> ปิดห้อง / บันทึกการจองช่องทางอื่น</h2>
    <p class="muted small" style="margin:4px 0 12px">${esc(h.name)} — เลือกห้องและวันที่ที่ไม่ต้องการให้ลูกค้าบนเว็บจอง (เช่น มีลูกค้าจอง Agoda / Booking.com / โทรศัพท์แล้ว)</p>
    <form id="bl-f" class="form-grid" novalidate>
      <div class="fg full"><label>จองมาจากช่องทางไหน</label><select name="channel">${BLOCK_CHANNELS.map(c => `<option value="${esc(c)}" ${c === (preset.channel || 'ปิดห้อง') ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="fg full"><label>ประเภทห้อง</label><select name="roomId">${h.rooms.map(r => `<option value="${r.id}" ${r.id === room0.id ? 'selected' : ''}>${esc(r.name)} (${r.total} ห้อง)</option>`).join('')}</select></div>
      <div class="fg"><label>เข้าพัก</label><input name="checkIn" type="date" value="${ci0}"></div>
      <div class="fg"><label>เช็คเอาท์</label><input name="checkOut" type="date" value="${addDays(ci0, 1)}"></div>
      <div class="fg"><label>จำนวนห้อง</label><input name="qty" type="number" min="1" value="1"></div>
      <div class="fg"><label>ชื่อลูกค้า (ไม่บังคับ)</label><input name="guestName" placeholder="เช่น คุณสมชาย"></div>
      <div class="fg"><label>เบอร์โทร (ไม่บังคับ)</label><input name="phone" type="tel"></div>
      <div class="fg full"><label>เลขที่จอง / หมายเหตุ</label><input name="note" placeholder="เช่น เลขที่จอง Agoda 12345"></div>
    </form>
    <div class="notice info" id="bl-hint" style="margin-top:8px"></div>
    <div class="red small" id="bl-err" style="margin-top:6px"></div>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="bl-go"><i class="fa-solid fa-ban"></i> ปิดห้อง</button></div>`);
  const f = $('#bl-f', m), val = n => f.elements[n].value;
  const hint = () => {
    const r = h.rooms.find(x => x.id === val('roomId')), ci = val('checkIn'), co = val('checkOut');
    const ok = r && ci && co && co > ci;
    $('#bl-hint', m).innerHTML = ok ? `<i class="fa-solid fa-circle-info"></i><div>ช่วง ${fmtDate(ci, false)} – ${fmtDate(co, false)} (${diffDays(ci, co)} คืน) ห้องว่างน้อยที่สุด <b>${DB.available(r, ci, co)}</b> จาก ${r.total} ห้อง</div>` : '<i class="fa-solid fa-triangle-exclamation"></i><div>เลือกวันเช็คเอาท์หลังวันเข้าพัก</div>';
    if (ok) f.elements.qty.max = Math.max(1, DB.available(r, ci, co));
  };
  f.addEventListener('input', hint); hint();
  $('#bl-go', m).onclick = async () => {
    const err = $('#bl-err', m); err.textContent = '';
    const r = h.rooms.find(x => x.id === val('roomId')), ci = val('checkIn'), co = val('checkOut'), qty = Math.floor(+val('qty'));
    if (!ci || !co || co <= ci) return err.textContent = 'วันที่ไม่ถูกต้อง — เช็คเอาท์ต้องหลังวันเข้าพัก';
    if (!(qty >= 1)) return err.textContent = 'ใส่จำนวนห้องอย่างน้อย 1 ห้อง';
    const free = DB.available(r, ci, co);
    if (qty > free) return err.textContent = `ช่วงนี้เหลือห้องว่างแค่ ${free} ห้อง — ปิดได้ไม่เกินนี้`;
    const btn = $('#bl-go', m); btn.disabled = true;
    try {
      await DB.blockRooms({ hotelId: h.id, roomId: r.id, checkIn: ci, checkOut: co, qty, channel: val('channel') || 'ปิดห้อง', guestName: val('guestName'), phone: val('phone'), note: val('note') });
      DB.log('booking.block', `${h.name} · ${r.name} × ${qty} · ${ci} → ${co}`);
      closeModal(); toast(`ปิดห้อง ${qty} ห้อง (${fmtDate(ci, false)} – ${fmtDate(co, false)}) แล้ว`); done?.();
    } catch (e) { btn.disabled = false; err.textContent = e.message; }
  };
}

// ================= Inventory calendar =================
function admCalendar(main) {
  const hotels = DB.hotels(true);
  let hid = hotels[0]?.id, start = todayISO();
  if (!hotels.length) { main.innerHTML = pageHead('ตารางห้องว่าง', '') + '<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีที่พัก</h3></div></section>'; return; }
  let span = 14;
  const MAX_DAYS = 180, clampStart = () => { const lim = addDays(todayISO(), Math.max(0, MAX_DAYS - span)); if (start > lim) start = lim; };
  const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5);
  main.innerHTML = pageHead('ตารางห้องว่าง & ผู้จอง', 'ดูว่าห้องไหนว่าง ใครจอง วันไหนถึงวันไหน — แถบสีคือผู้เข้าพัก คลิกเพื่อดูรายละเอียด · คลิกช่องว่างเพื่อปิดห้อง', `<button class="btn btn-add-room" id="c-block"><i class="fa-solid fa-ban"></i> ปิดห้อง</button><select id="c-h" class="sel">${hotels.map(h => `<option value="${h.id}">${esc(h.name)}</option>`).join('')}</select>
    <select id="c-span" class="sel"><option value="7">7 วัน</option><option value="14" selected>14 วัน</option><option value="30">30 วัน</option><option value="60">60 วัน</option><option value="90">90 วัน</option><option value="180">180 วัน</option></select>
    <button class="btn btn-ghost btn-sm" id="c-prev"><i class="fa-solid fa-chevron-left"></i></button><button class="btn btn-outline btn-sm" id="c-today">วันนี้</button><button class="btn btn-ghost btn-sm" id="c-next"><i class="fa-solid fa-chevron-right"></i></button>`) + `
    <div id="c-sum" class="tl-sum"></div>
    <section class="card flush tl-card" id="c-grid"></section>
    <div class="legend inline"><div><i class="sw tl-pending"></i>รออนุมัติ</div><div><i class="sw tl-confirmed"></i>ยืนยันแล้ว</div><div><i class="sw tl-inhouse"></i>กำลังเข้าพัก</div><div><i class="sw tl-completed"></i>เช็คเอาท์แล้ว</div><div><i class="sw tl-ext"></i>ปิดห้อง</div><div><i class="sw" style="background:#e6f6ec"></i>ว่างมาก</div><div><i class="sw" style="background:#fff4e5"></i>เหลือ ≤ 2</div><div><i class="sw" style="background:#fdecec"></i>เต็ม</div></div>`;
  const draw = () => {
    const h = DB.hotel(hid); if (!h) return;
    const today = todayISO(), days = Array.from({ length: span }, (_, i) => addDays(start, i)), end = addDays(start, span);
    const all = DB.bookings().filter(b => b.hotelId === h.id && b.status !== 'cancelled');
    // สรุปวันนี้
    const tot = h.rooms.reduce((s, r) => s + +r.total, 0), used = h.rooms.reduce((s, r) => s + DB.bookedCount(r.id, today, addDays(today, 1)), 0);
    const ins = all.filter(b => b.checkIn === today), outs = all.filter(b => b.checkOut === today), pend = all.filter(b => boStatus(b) === 'pending');
    $('#c-sum').innerHTML = [['fa-door-open', 'ok', 'ห้องว่างวันนี้', `${Math.max(0, tot - used)} / ${tot}`], ['fa-right-to-bracket', 'info', 'เช็คอินวันนี้', `${ins.length} การจอง`], ['fa-right-from-bracket', 'info', 'เช็คเอาท์วันนี้', `${outs.length} การจอง`], ['fa-hourglass-half', pend.length ? 'warn' : 'ok', 'รออนุมัติ', `${pend.length} การจอง`]]
      .map(([ic, c, l, v]) => `<div class="tl-tile ${c}"><i class="fa-solid ${ic}"></i><div><small>${l}</small><b>${v}</b></div></div>`).join('');
    const col = i => `grid-column:${i + 2}`;
    const head = `<div class="tl-row tl-head" style="--n:${span}"><div class="tl-name">${esc(h.name)}</div>${days.map((d, i) => { const dt = new Date(d + 'T00:00:00'); return `<div class="tl-day ${dt.getDay() % 6 === 0 ? 'we' : ''} ${d === today ? 'td' : ''}" style="${col(i)}">${TH_DOW[dt.getDay()]}<b>${dt.getDate()}</b><small>${dt.getMonth() + 1}/${String(dt.getFullYear()).slice(2)}</small></div>`; }).join('')}</div>`;
    const body = h.rooms.map(r => {
      // จัดแต่ละการจองลงห้องที่ 1..N (qty หลายห้อง = หลายแถว)
      const units = [], list = all.filter(b => b.roomId === r.id).sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.checkOut.localeCompare(b.checkOut));
      list.forEach(b => { for (let q = 0; q < b.qty; q++) { let u = units.find(x => x.free <= b.checkIn); if (!u) { u = { free: '', bks: [] }; units.push(u); } u.bks.push(b); u.free = b.checkOut; } });
      while (units.length < r.total) units.push({ free: '', bks: [] });
      const avail = days.map(d => r.total - DB.bookedCount(r.id, d, addDays(d, 1)));
      const summary = `<div class="tl-row tl-room" style="--n:${span}"><div class="tl-name"><b>${esc(r.name)}</b><small>${money(r.price)}/คืน · ${r.total} ห้อง</small></div>${avail.map((a, i) => `<div class="tl-av ${a <= 0 ? 'full' : a <= 2 ? 'low' : 'ok'}" style="${col(i)}" title="${fmtDate(days[i])}: ว่าง ${a} จาก ${r.total} ห้อง">${a <= 0 ? 'เต็ม' : 'ว่าง ' + a}</div>`).join('')}</div>`;
      const rows = units.map((u, ui) => `<div class="tl-row tl-unit ${ui >= r.total ? 'over' : ''}" style="--n:${span}"><div class="tl-name small">${ui >= r.total ? '<span class="red">เกินจำนวน</span>' : 'ห้อง ' + (ui + 1)}</div>
        ${days.map((d, i) => `<div class="tl-c ${d === today ? 'td' : ''} ${new Date(d + 'T00:00:00').getDay() % 6 === 0 ? 'we' : ''}" style="${col(i)}" data-room="${r.id}" data-day="${d}" title="คลิกเพื่อปิดห้อง"></div>`).join('')}
        ${u.bks.filter(b => b.checkOut > start && b.checkIn < end).map(b => {
          const s = Math.max(0, dayDiff(b.checkIn, start)), e = Math.min(span, dayDiff(b.checkOut, start)), st = boStatus(b);
          const ext = b.source === 'external';
          return `<button class="tl-bar tl-${ext ? 'ext' : st} ${b.checkIn < start ? 'cl' : ''} ${b.checkOut > end ? 'cr' : ''}" style="grid-column:${s + 2} / ${e + 2}" data-bk="${b.id}" title="${ext ? 'ปิดห้อง · ' : ''}${esc(guestName(b))} · ${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)}">${ext ? '<i class="fa-solid fa-ban"></i> ' : ''}<b>${esc(guestName(b))}</b>${e - s > 1 ? `<small>${ext && b.channel && b.channel !== guestName(b) ? esc(b.channel) + ' · ' : ''}${b.nights} คืน${b.qty > 1 ? ' · ' + b.qty + ' ห้อง' : ''}</small>` : ''}</button>`;
        }).join('')}</div>`).join('');
      return summary + rows;
    }).join('');
    $('#c-grid').innerHTML = `<div class="tl-scroll"><div class="tl" style="--n:${span}">${head}${body}</div></div>`;
    // ลากเมาส์เพื่อเลื่อนตารางซ้าย-ขวา (ลากเกิน 5px ไม่นับเป็นคลิก)
    const sc = $('.tl-scroll', $('#c-grid')); let drag = null;
    sc.onpointerdown = e => { if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, l: sc.scrollLeft, moved: false }; };
    sc.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) { drag.moved = true; sc.classList.add('dragging'); } if (drag.moved) sc.scrollLeft = drag.l - dx; };
    const endDrag = () => { if (drag?.moved) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; sc.addEventListener('click', stop, { capture: true, once: true }); } drag = null; sc.classList.remove('dragging'); };
    sc.onpointerup = endDrag; sc.onpointerleave = endDrag;
    $$('.tl-c[data-day]', $('#c-grid')).forEach(el => el.onclick = () => blockRoomsModal(h, { roomId: el.dataset.room, date: el.dataset.day }, draw));
    $$('[data-bk]', $('#c-grid')).forEach(el => el.onclick = () => {
      const b = DB.booking(el.dataset.bk); if (!b) return;
      if (b.source === 'external') { // ปิดห้อง → ดูรายละเอียด + เปิดห้องคืน
        const m = openModal(`<h2><i class="fa-solid fa-ban"></i> ${esc(guestName(b))} <span class="status completed">ปิดห้อง</span></h2>
          <div class="tl-detail"><div><small>ห้อง</small><b>${esc(b.roomName)} × ${b.qty}</b></div><div><small>วันที่ปิด</small><b>${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)} (${b.nights} คืน)</b></div>
          ${b.guest.phone ? `<div><small>โทร</small><b>${esc(b.guest.phone)}</b></div>` : ''}${b.guest.note ? `<div><small>หมายเหตุ</small><b>${esc(b.guest.note)}</b></div>` : ''}</div>
          <p class="small muted" style="margin:12px 0 0">ห้องช่วงนี้ถูกนับเป็น "ไม่ว่าง" ลูกค้าบนเว็บจะจองซ้ำไม่ได้ · ถ้าลูกค้ายกเลิก กด "เปิดห้องคืน" เพื่อให้ขายได้อีกครั้ง</p>
          <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" data-close>ปิด</button><button class="btn btn-danger" id="ext-release"><i class="fa-solid fa-lock-open"></i> เปิดห้องคืน</button></div>`);
        $('#ext-release', m).onclick = () => {
          DB.updateBooking(b.id, { status: 'cancelled', cancelledBy: 'เจ้าของ (เปิดห้องคืน)', cancelledAt: new Date().toISOString() });
          DB.log('booking.release', `${b.id} · ${b.roomName} × ${b.qty} · ${b.checkIn} → ${b.checkOut}`); closeModal(); toast('เปิดห้องคืนแล้ว — ลูกค้าจองห้องนี้ได้อีกครั้ง'); draw();
        };
        return;
      }
      const m = openModal(`<h2>${esc(guestName(b))} ${stChip(b)}</h2>
        <div class="tl-detail"><div><small>ห้อง</small><b>${esc(b.roomName)} × ${b.qty}</b></div><div><small>เข้าพัก</small><b>${fmtDate(b.checkIn)} – ${fmtDate(b.checkOut)} (${b.nights} คืน)</b></div>
        <div><small>โทร</small><b><a href="tel:${esc(b.guest.phone)}">${esc(b.guest.phone || '-')}</a></b></div><div><small>ผู้เข้าพัก</small><b>${b.adults} ผู้ใหญ่${b.children ? ` + ${b.children} เด็ก` : ''}</b></div>
        <div><small>ยอดรวม</small><b>${money(b.price.total)}</b></div><div><small>การชำระเงิน</small><b>${payChip(b)}</b></div></div>
        <div class="small muted" style="margin-top:10px">รหัสจอง ${esc(b.id)}</div>
        <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn btn-ghost" data-close>ปิด</button>${b.status === 'pending' ? '<a class="btn btn-primary" href="#/admin/approvals">ไปตรวจสลิป & อนุมัติ</a>' : '<button class="btn btn-primary" id="cal-detail">รายละเอียดการจอง</button>'}</div>`);
      const det = $('#cal-detail', m); if (det) det.onclick = () => bookingDrawer(b.id, draw);
    });
  };
  $('#c-h').onchange = e => { hid = e.target.value; draw(); };
  $('#c-block').onclick = () => blockRoomsModal(DB.hotel(hid), {}, draw);
  $('#c-span').onchange = e => { span = +e.target.value; clampStart(); draw(); };
  $('#c-prev').onclick = () => { start = addDays(start, -Math.min(span, 7)); draw(); };
  $('#c-next').onclick = () => { start = addDays(start, Math.min(span, 7)); clampStart(); draw(); };
  $('#c-today').onclick = () => { start = todayISO(); draw(); };
  draw();
}

// ================= Hotels =================
// เจ้าของรีสอร์ท: หน้า "รีสอร์ทของฉัน" — แสดงเป็นการ์ดของรีสอร์ทตัวเอง (ส่วนใหญ่มีแห่งเดียว)
function ownerResorts(main) {
  const list = DB.hotels(true);
  const card = h => `<section class="card resort-card">
    <div class="resort-top">${imgTag(h.images[0], 600, '', h.id)}
      <div class="grow"><div class="row between wrap" style="gap:10px"><h2 style="margin:0">${esc(h.name)}</h2>
          <label class="switch big"><input type="checkbox" data-act="${h.id}" ${h.active !== false ? 'checked' : ''} ${h.banned ? 'disabled' : ''}><span></span>${h.banned ? 'ถูกแบน' : h.active !== false ? 'เปิดขาย' : 'ปิดการขาย'}</label></div>
        <div class="small muted">${esc(h.type)} · ${esc(h.area)}, ${esc(h.city)}</div>${h.banned ? `<div class="small red" style="margin-top:6px"><i class="fa-solid fa-ban"></i> ถูกแบนโดยผู้ดูแลระบบ (${h.banned.until ? 'ถึง ' + fmtDateTime(h.banned.until) : 'ถาวร'})${h.banned.reason ? ` — ${esc(h.banned.reason)}` : ''} · ติดต่อทีมงานเพื่อขอปลดแบน</div>` : ''}
        <div class="row wrap small" style="gap:16px;margin-top:10px">${h.reviews ? `<span><i class="fa-solid fa-star" style="color:#f5a623"></i> ${h.rating} · ${h.reviews.toLocaleString()} รีวิว</span>` : '<span class="muted"><i class="fa-regular fa-star"></i> ยังไม่มีรีวิว</span>'}
          <span><i class="fa-regular fa-images"></i> ${h.images.length} รูป</span><span><i class="fa-solid fa-ferry"></i> ${h.distance} กม. จากท่าเรือหน้าบ้าน</span><span><i class="fa-solid fa-door-open"></i> ${h.rooms.reduce((s, r) => s + +r.total, 0)} ห้อง</span></div>
        <div class="row wrap" style="gap:8px;margin-top:14px"><button class="btn btn-primary btn-sm" data-edit="${h.id}"><i class="fa-solid fa-pen"></i> แก้ไขข้อมูล รูป ห้อง & ราคา</button>
          <button class="btn btn-outline btn-sm" data-share="${h.id}"><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต</button>
          <a class="btn btn-ghost btn-sm" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i> ดูหน้าเว็บ</a></div></div></div>
    <div class="table-scroll"><table class="tbl" style="margin-top:16px"><thead><tr><th>ประเภทห้อง</th><th>ราคา/คืน</th><th>ส่วนลด</th><th>จำนวนห้อง</th><th>พักได้</th><th>เงื่อนไข</th></tr></thead><tbody>
      ${h.rooms.map(r => `<tr><td><b>${esc(r.name)}</b><div class="small muted">${esc(r.bed)} · ${r.size} ตร.ม. · ${esc(r.view)}</div></td><td><b>${money(r.price)}</b></td><td>${r.discount ? r.discount + '%' : '-'}</td><td>${r.total} ห้อง</td><td>${r.maxGuests} คน</td>
        <td class="small">${[r.breakfast && 'อาหารเช้า', r.freeCancel && 'ยกเลิกฟรี', r.payAtHotel && 'จ่ายที่พักได้'].filter(Boolean).join(' · ') || '-'}</td></tr>`).join('')}</tbody></table></div></section>`;
  main.innerHTML = pageHead('ห้องพัก รูป & ราคา', list.length ? 'แก้ไขข้อมูล รูป ห้องพัก ราคา และจำนวนห้องได้ที่ปุ่ม "แก้ไข" · ปิดการขายชั่วคราวได้ที่สวิตช์' : 'ยังไม่มีที่พัก — เพิ่มรีสอร์ทของคุณเพื่อเริ่มรับจอง',
    `${list.length ? '<button class="btn btn-add-room" data-roomadd><i class="fa-solid fa-bed"></i> เพิ่มห้องพัก</button>' : ''}<button class="btn ${list.length ? 'btn-outline' : 'btn-primary'}" data-hadd><i class="fa-solid fa-plus"></i> ${list.length ? 'เพิ่มรีสอร์ทอีกแห่ง' : 'เพิ่มรีสอร์ทของคุณ'}</button>`) +
    (list.length ? list.map(card).join('') : `<section class="card"><div class="bo-empty"><i class="fa-solid fa-hotel"></i><h3>ยังไม่มีรีสอร์ท</h3><p class="muted">เพิ่มข้อมูลรีสอร์ท รูป ห้องพัก และราคา แล้วลูกค้าจะจองได้ทันที</p><button class="btn btn-primary" data-hadd>เพิ่มรีสอร์ทของคุณ</button></div></section>`);
  $$('[data-hadd]', main).forEach(b => b.onclick = () => hotelForm(null, () => ownerResorts(main)));
  $$('[data-roomadd]', main).forEach(b => b.onclick = () => addRoomFlow(() => ownerResorts(main)));
  $$('[data-edit]', main).forEach(b => b.onclick = () => hotelForm(DB.hotel(b.dataset.edit), () => ownerResorts(main)));
  $$('[data-share]', main).forEach(b => b.onclick = () => sharePromo(DB.hotel(b.dataset.share)));
  $$('[data-act]', main).forEach(c => c.onchange = () => { const h = DB.hotel(c.dataset.act); h.active = c.checked; DB.saveHotel(h); DB.log('hotel.toggle', `${h.name} → ${c.checked ? 'เปิดขาย' : 'ปิด'}`); toast(c.checked ? 'เปิดขายแล้ว' : 'ปิดการขายแล้ว'); ownerResorts(main); });
}
function admHotels(main) {
  if (!isAdmin(DB.currentUser())) return ownerResorts(main);
  const list = DB.hotels(true);
  const admin = isAdmin(DB.currentUser()), ownerName = id => { const o = DB.users().find(u => u.id === id); return o ? (o.biz?.resortName || o.name) : 'แพลตฟอร์ม'; };
  main.innerHTML = pageHead(admin ? 'ที่พักทั้งหมด' : 'ที่พัก ห้อง รูป & ราคา', `${list.length} แห่ง · ${list.reduce((s, h) => s + h.rooms.reduce((a, r) => a + +r.total, 0), 0)} ห้อง${admin ? ' · ทุกเจ้าของรีสอร์ท' : ''}`) + `
    <section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th></th><th>ชื่อที่พัก</th>${admin ? '<th>เจ้าของ</th>' : ''}<th>หาด/ย่าน</th><th>ดาว</th><th>คะแนน</th><th>ห้อง</th><th>ราคาเริ่มต้น</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${list.map(h => `<tr><td>${imgTag(h.images[0], 120, '', h.id)}</td><td><b>${esc(h.name)}</b><div class="small muted">${esc(h.type)} · ${esc(h.area)}</div></td>${admin ? `<td class="small">${esc(ownerName(h.ownerId))}</td>` : ''}<td>${esc(h.city)}</td><td>${h.stars}★</td><td>${h.rating}</td>
      <td>${h.rooms.length} ประเภท / ${h.rooms.reduce((s, r) => s + +r.total, 0)} ห้อง</td><td>${money(Math.min(...h.rooms.map(r => r.price)))}</td>
      <td>${h.banned ? `<span class="pill bad"><i class="fa-solid fa-ban"></i> ถูกแบน</span><div class="small muted" style="margin-top:4px">โดย ${esc(h.banned.byName || '-')}<br>${h.banned.at ? fmtDateTime(h.banned.at) : ''}<br><b>ระยะเวลา: ${banUntilText(h.banned)}</b>${h.banned.reason ? `<br>เหตุผล: ${esc(h.banned.reason)}` : ''}</div>` : `<label class="switch" title="เจ้าของรีสอร์ทเป็นผู้เปิด-ปิดเอง" style="opacity:.85"><input type="checkbox" ${h.active !== false ? 'checked' : ''} disabled><span></span>${h.active !== false ? 'เปิดขาย' : 'ปิด'}</label><div class="small muted" style="margin-top:2px">เจ้าของเป็นผู้ตั้ง</div>`}</td>
      <td style="white-space:nowrap;text-align:right"><button class="btn btn-sm btn-primary" data-detail="${h.id}"><i class="fa-solid fa-circle-info"></i> รายละเอียด</button> ${h.banned ? `<button class="btn btn-sm btn-outline" data-unban="${h.id}"><i class="fa-solid fa-unlock"></i> ปลดแบน</button>` : `<button class="btn btn-sm btn-ghost red" data-ban="${h.id}"><i class="fa-solid fa-ban"></i> แบน</button>`} <button class="btn btn-sm btn-outline" data-edit="${h.id}"><i class="fa-solid fa-pen"></i> แก้ไข</button> <button class="btn btn-sm btn-ghost" data-share="${h.id}" title="แชร์โปรโมต"><i class="fa-solid fa-share-nodes"></i></button> <a class="btn btn-sm btn-ghost" href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener" title="ดูหน้าเว็บ"><i class="fa-solid fa-eye"></i></a> <button class="btn btn-sm btn-ghost red" data-hdel="${h.id}" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')}
    </tbody></table></div></section>`;
  $$('[data-edit]', main).forEach(b => b.onclick = () => hotelForm(DB.hotel(b.dataset.edit), () => admHotels(main)));
  $$('[data-share]', main).forEach(b => b.onclick = () => sharePromo(DB.hotel(b.dataset.share)));
  $$('[data-detail]', main).forEach(b => b.onclick = () => hotelDetailModal(DB.hotel(b.dataset.detail), () => admHotels(main)));
  $$('[data-ban]', main).forEach(b => b.onclick = () => banHotel(DB.hotel(b.dataset.ban), () => admHotels(main)));
  $$('[data-unban]', main).forEach(b => b.onclick = () => unbanHotel(DB.hotel(b.dataset.unban), () => admHotels(main)));
  $$('[data-hdel]', main).forEach(b => b.onclick = async () => {
    const h = DB.hotel(b.dataset.hdel);
    if (DB.bookings().some(x => x.hotelId === h.id && x.status !== 'cancelled' && x.checkOut >= todayISO())) return toast('ไม่สามารถลบได้ เนื่องจากมีการจองที่ยังไม่สิ้นสุด — ปิดการขายแทน', 'err');
    if (await confirmBox(`ลบ "${esc(h.name)}" ถาวร?`, 'ลบ')) { DB.deleteHotel(h.id); DB.log('hotel.delete', h.name); toast('ลบที่พักแล้ว'); admHotels(main); }
  });
}

const banUntilText = b => b?.until ? `ถึง ${fmtDateTime(b.until)}` : 'ถาวร';
// ผู้ดูแลแพลตฟอร์ม: แบน / ปลดแบนรีสอร์ท — บันทึกว่าใครแบน เมื่อไหร่ เหตุผลอะไร (เจ้าของแก้เองไม่ได้ ถูกบังคับที่ฐานข้อมูล)
async function banHotel(h, done) {
  if (!isAdmin(DB.currentUser())) return deny();
  const opts = [[1, '1 วัน'], [3, '3 วัน'], [7, '7 วัน'], [15, '15 วัน'], [30, '30 วัน'], [90, '90 วัน'], [180, '180 วัน'], [0, 'ถาวร (จนกว่าแอดมินปลดแบน)']];
  const m = openModal(`<h2><i class="fa-solid fa-ban"></i> แบนรีสอร์ท "${esc(h.name)}"</h2>
    <div class="fg" style="margin-top:12px"><label>ระยะเวลาที่แบน</label><select id="bn-days">${opts.map(([d, l]) => `<option value="${d}" ${d === 7 ? 'selected' : ''}>${l}</option>`).join('')}</select><div class="small muted" id="bn-end" style="margin-top:4px"></div></div>
    <div class="fg"><label>เหตุผล (เจ้าของรีสอร์ทจะเห็นข้อความนี้)</label><textarea id="bn-reason" rows="3"></textarea></div>
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-danger" id="bn-ok"><i class="fa-solid fa-ban"></i> แบนรีสอร์ท</button></div>`);
  const endAt = () => { const d = +$('#bn-days', m).value; return d ? new Date(Date.now() + d * 864e5).toISOString() : null; };
  const drawEnd = () => { const e = endAt(); $('#bn-end', m).textContent = e ? `แบนถึง ${fmtDateTime(e)} แล้วระบบปลดให้อัตโนมัติ` : 'แบนถาวร — ต้องให้แอดมินกดปลดแบนเอง'; };
  $('#bn-days', m).onchange = drawEnd; drawEnd();
  $('#bn-ok', m).onclick = async () => {
    const reason = $('#bn-reason', m).value.trim();
    if (!reason) return toast('กรุณากรอกเหตุผล', 'err');
    const u = DB.currentUser(), until = endAt();
    h.banned = { at: new Date().toISOString(), byId: u.id, byName: u.name || u.email, reason, until, prevActive: h.active !== false };
    h.active = false;
    closeModal();
    await DB.saveHotel(h); DB.log('hotel.ban', `${h.name} · ${banUntilText(h.banned)} · เหตุผล: ${reason}`); toast('แบนรีสอร์ทแล้ว — ถูกซ่อนจากหน้าเว็บลูกค้า'); done?.();
  };
}
async function unbanHotel(h, done) {
  if (!isAdmin(DB.currentUser())) return deny();
  if (!(await confirmBox(`ปลดแบน <b>${esc(h.name)}</b>? รีสอร์ทจะกลับไปเป็นสถานะเดิมที่เจ้าของตั้งไว้`, 'ปลดแบน'))) return;
  h.active = h.banned?.prevActive !== false; delete h.banned;
  await DB.saveHotel(h); DB.log('hotel.unban', h.name); toast('ปลดแบนแล้ว'); done?.();
}

// รายละเอียดรีสอร์ทแบบเต็ม + ข้อมูลใบสมัครของเจ้าของ (สำหรับผู้ดูแลแพลตฟอร์ม)
function hotelDetailModal(h) {
  const o = DB.users().find(u => u.id === h.ownerId), b = o?.biz || {}, p = o?.payout || {};
  const row = (l, v) => v ? `<div><small>${l}</small><b>${v}</b></div>` : '';
  const stMap = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ไม่ผ่าน' };
  const bks = DB.bookings().filter(x => x.hotelId === h.id && x.status !== 'cancelled');
  const soc = Object.entries(SOCIALS).filter(([k]) => h.social?.[k]).map(([k, c]) => `<span><i class="${c.icon}" style="color:${c.color}"></i> ${esc(h.social[k])}</span>`).join(' ');
  const dm = openModal(`<h2><i class="fa-solid fa-hotel"></i> ${esc(h.name)} ${h.banned ? '<span class="pill bad"><i class="fa-solid fa-ban"></i> ถูกแบน</span>' : h.active === false ? '<span class="pill">เจ้าของปิดขาย</span>' : '<span class="pill ok">เปิดขาย</span>'}</h2>
    ${h.banned ? `<div class="small red" style="margin:8px 0"><b>แบนโดย:</b> ${esc(h.banned.byName || '-')} · ${h.banned.at ? fmtDateTime(h.banned.at) : ''} · <b>${banUntilText(h.banned)}</b>${h.banned.reason ? `<br><b>เหตุผล:</b> ${esc(h.banned.reason)}` : ''}</div>` : ''}
    <div class="sh-thumbs" style="margin:10px 0">${h.images.slice(0, 6).map(i => imgTag(i, 160)).join('')}</div>
    <h4 style="margin:12px 0 6px">ข้อมูลรีสอร์ท</h4>
    <div class="tl-detail">${row('ประเภท', esc(h.type))}${row('ที่ตั้ง', esc([h.area, h.city].filter(Boolean).join(', ')))}${row('ดาว / คะแนน', `${h.stars}★ · ${h.rating || '-'} (${h.reviews || 0} รีวิว)`)}${row('เช็คอิน–เช็คเอาท์', `${esc(h.checkIn)} – ${esc(h.checkOut)}`)}${row('ระยะจากท่าเรือ', h.distance != null ? h.distance + ' กม.' : '')}${row('ลิงก์รีสอร์ท', `<a href="${siteUrl('#/hotel/' + (h.slug || h.id))}" target="_blank" rel="noopener">เปิดหน้าเว็บ</a>`)}${row('โซเชียล', soc)}${row('การจองทั้งหมด', bks.length + ' รายการ · ' + money(bks.reduce((s, x) => s + x.price.total, 0)))}</div>
    ${h.description ? `<p class="small" style="margin:8px 0;white-space:pre-line">${esc(h.description)}</p>` : ''}
    <h4 style="margin:12px 0 6px">ห้องพัก (${h.rooms.length} ประเภท)</h4>
    <div class="table-scroll"><table class="tbl"><thead><tr><th>ห้อง</th><th>ขนาด/เตียง</th><th>จำนวน</th><th>ราคา/คืน</th></tr></thead><tbody>${h.rooms.map(r => `<tr><td><b>${esc(r.name)}</b></td><td class="small">${esc(r.size || '')} ${esc(r.bed || '')}</td><td>${r.total} ห้อง</td><td>${money(r.price)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">ยังไม่มีห้อง</td></tr>'}</tbody></table></div>
    <h4 style="margin:14px 0 6px"><i class="fa-solid fa-id-card"></i> ข้อมูลการสมัครของเจ้าของ</h4>
    ${o ? `<div class="tl-detail">${row('ชื่อรีสอร์ทที่สมัคร', esc(b.resortName || '-'))}${row('ผู้สมัคร', esc(o.name))}${row('อีเมล', esc(o.email))}${row('โทร', esc(b.phone || o.phone || '-'))}${row('LINE', esc(b.line))}${row('ที่ตั้ง', esc(b.location))}${row('จำนวนห้องโดยประมาณ', esc(b.rooms))}${row('สถานะใบสมัคร', stMap[o.ownerStatus] || esc(o.ownerStatus || '-'))}${row('สมัครเมื่อ', o.appliedAt ? fmtDateTime(o.appliedAt) : '')}${row('GPS ที่สมัคร', b.lat != null ? `<a href="https://www.google.com/maps?q=${b.lat},${b.lng}" target="_blank" rel="noopener">${(+b.lat).toFixed(5)}, ${(+b.lng).toFixed(5)}</a>` : '')}${row('บัตรประชาชน', b.idNumber ? `${esc(maskId(b.idNumber))} ${b.idPhoto ? `<button class="btn btn-sm btn-outline" data-idcard="${esc(b.idPhoto)}">ดูรูป</button>` : ''}` : '')}${row('บัญชีรับเงิน', isPromptpayId(p.promptpayId) || (p.bankInfo || '').trim() ? 'ตั้งค่าแล้ว' : '<span class="red">ยังไม่ได้ตั้งค่า</span>')}</div>
      ${b.note ? `<div class="small" style="margin-top:6px;white-space:pre-line"><b>ข้อความจากผู้สมัคร:</b> ${esc(b.note)}</div>` : ''}${o.ownerNote ? `<div class="small red" style="margin-top:6px">หมายเหตุ: ${esc(o.ownerNote)}</div>` : ''}` : '<p class="small muted">รีสอร์ทของแพลตฟอร์มเอง (ไม่มีเจ้าของรีสอร์ท)</p>'}
    <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn btn-ghost" data-close>ปิด</button></div>`, 'wide');
  $$('[data-idcard]', dm).forEach(btn => btn.onclick = () => showIdCard(btn.dataset.idcard));
}

// แชร์โปรโมต: สร้างข้อความ + ลิงก์ประจำรีสอร์ท ส่งเข้า Facebook / TikTok / Instagram / LINE
function sharePromo(h) {
  let ch = 'facebook', extra = '', trip = null;
  const tdy = todayISO();
  const m = openModal(`<h2><i class="fa-solid fa-share-nodes"></i> แชร์โปรโมต — ${esc(h.name)}</h2>
    <p class="muted small" style="margin:4px 0 12px">ข้อความมีลิงก์ประจำรีสอร์ท ลูกค้ากดแล้วจองผ่านเราได้ทันที · แก้ข้อความก่อนส่งได้</p>
    <div class="row wrap" style="gap:8px">${Object.entries(SOCIALS).map(([k, c]) => `<button type="button" class="btn btn-sm" data-ch="${k}"><i class="${c.icon}"></i> ${c.label}</button>`).join('')}</div>
    <div class="fg" style="margin-top:12px"><label>กำหนดวันเข้าพักในลิงก์ (ไม่บังคับ) <span class="small muted">— ลูกค้าเปิดลิงก์แล้วเห็นราคา/ห้องว่างของวันนั้นเลย ไม่ต้องเลือกวันเอง เหมาะกับคนที่ไม่คุ้นกับการจอง</span></label>
      <div class="row wrap" style="gap:8px"><input type="date" id="sp-in" min="${tdy}" style="max-width:160px" title="เช็คอิน"><span class="muted">ถึง</span><input type="date" id="sp-out" min="${tdy}" style="max-width:160px" title="เช็คเอาท์"><input type="number" id="sp-a" min="1" max="20" value="2" style="max-width:80px" title="ผู้ใหญ่"><span class="small muted">คน</span><input type="number" id="sp-r" min="1" max="10" value="1" style="max-width:80px" title="จำนวนห้อง"><span class="small muted">ห้อง</span></div>
      <div class="small" id="sp-trip-note" style="margin-top:4px"></div></div>
    <div class="fg"><label>โปรโมชันเพิ่มเติม (ไม่บังคับ)</label><input id="sp-extra" placeholder="เช่น 🔥 จองวันนี้ลด 10% ถึงสิ้นเดือน"></div>
    <div class="fg"><label>ข้อความ</label><textarea id="sp-text" rows="9"></textarea></div>
    <div class="fg"><label>ลิงก์ประจำรีสอร์ท</label><div class="row" style="gap:8px"><input id="sp-link" readonly style="flex:1"><button type="button" class="btn btn-outline btn-sm" id="sp-copylink"><i class="fa-regular fa-copy"></i> คัดลอกลิงก์</button></div></div>
    <div class="row wrap" style="gap:8px;margin-top:6px"><button type="button" class="btn btn-primary" id="sp-copy"><i class="fa-regular fa-copy"></i> คัดลอกข้อความ</button><button type="button" class="btn btn-outline" id="sp-open"></button></div>
    <div class="small muted" id="sp-note" style="margin-top:10px"></div>`, 'wide');
  const t = $('#sp-text', m);
  const draw = () => {
    const i = $('#sp-in', m).value, o = $('#sp-out', m).value;
    trip = i && o && o > i ? { in: i, out: o, a: Math.max(1, +$('#sp-a', m).value || 2), r: Math.max(1, +$('#sp-r', m).value || 1) } : null;
    $('#sp-trip-note', m).innerHTML = trip ? `<span class="green"><i class="fa-solid fa-check"></i> ลิงก์จะเปิดที่ ${fmtDate(i)} – ${fmtDate(o)} · ${diffDays(i, o)} คืน · ${trip.a} คน ${trip.r} ห้อง</span>` : (i || o ? '<span class="muted">เลือกเช็คอินและเช็คเอาท์ให้ครบ (เช็คเอาท์ต้องหลังเช็คอิน)</span>' : '');
    t.value = promoText(h, ch, extra, trip);
    $('#sp-link', m).value = resortLink(h, ch, trip);
    $$('[data-ch]', m).forEach(b => { const on = b.dataset.ch === ch; b.classList.toggle('btn-primary', on); b.classList.toggle('btn-outline', !on); });
    const has = !!socialUrl(ch, h.social?.[ch]);
    $('#sp-open', m).innerHTML = ch === 'facebook' ? '<i class="fa-brands fa-facebook"></i> แชร์ขึ้น Facebook' : ch === 'line' ? '<i class="fa-brands fa-line"></i> ส่งเข้า LINE' : `<i class="${SOCIALS[ch].icon}"></i> คัดลอก & เปิด ${SOCIALS[ch].label}${has ? '' : ' (ยังไม่ได้ใส่ลิงก์โปรไฟล์)'}`;
    $('#sp-note', m).textContent = ch === 'tiktok' || ch === 'instagram' ? `${SOCIALS[ch].label} ไม่รองรับการโพสต์จากเว็บ — ระบบคัดลอกข้อความให้ แล้ววางในแคปชัน (ใส่ลิงก์ที่ไบโอหรือสติกเกอร์ลิงก์)` : ch === 'facebook' ? 'เปิดหน้าต่างแชร์ของ Facebook พร้อมลิงก์ — ข้อความถูกคัดลอกไว้แล้ว กด Ctrl+V วางในช่องโพสต์ได้' : 'เลือกห้องแชทหรือกลุ่ม LINE ที่ต้องการส่งในหน้าต่างที่เปิดขึ้น';
  };
  $$('[data-ch]', m).forEach(b => b.onclick = () => { ch = b.dataset.ch; draw(); });
  $('#sp-extra', m).oninput = e => { extra = e.target.value.trim(); draw(); };
  $('#sp-in', m).onchange = () => { const i = $('#sp-in', m).value, o = $('#sp-out', m); if (i && (!o.value || o.value <= i)) o.value = addDays(i, 1); o.min = i ? addDays(i, 1) : tdy; draw(); };
  ['#sp-out', '#sp-a', '#sp-r'].forEach(s => $(s, m).onchange = draw);
  $('#sp-copy', m).onclick = () => { copyText(t.value); toast('คัดลอกข้อความแล้ว'); };
  $('#sp-copylink', m).onclick = () => { copyText($('#sp-link', m).value); toast('คัดลอกลิงก์แล้ว'); };
  $('#sp-open', m).onclick = () => {
    if (ch === 'facebook') { copyText(t.value); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resortLink(h, ch, trip))}`, '_blank', 'noopener'); }
    else if (ch === 'line') window.open(`https://line.me/R/share?text=${encodeURIComponent(t.value)}`, '_blank', 'noopener');
    else { copyText(t.value); toast('คัดลอกข้อความแล้ว — วางในโพสต์ของคุณ'); const u = socialUrl(ch, h.social?.[ch]); if (u) window.open(u, '_blank', 'noopener'); }
  };
  draw();
}

// ปุ่ม "เพิ่มห้องพัก" ด้านบน: เลือกรีสอร์ท (ถ้ามีหลายแห่ง) แล้วเปิดฟอร์มเลื่อนไปที่ส่วนห้องพักให้เลย
function addRoomFlow(done) {
  const list = DB.hotels(true);
  if (!list.length) return toast('ยังไม่มีที่พัก — เพิ่มรีสอร์ทก่อน', 'err');
  if (list.length === 1) return hotelForm(list[0], done, { focusRooms: true });
  const m = openModal(`<h2><i class="fa-solid fa-bed"></i> เพิ่มห้องพักให้รีสอร์ทไหน?</h2><div class="bo-list" style="margin-top:12px">${list.map(h => `<button class="btn btn-outline btn-block" style="justify-content:flex-start;margin-bottom:8px" data-pick="${h.id}">${esc(h.name)} <span class="small muted">· ${h.rooms.length} ประเภท</span></button>`).join('')}</div>`);
  $$('[data-pick]', m).forEach(b => b.onclick = () => { closeModal(); hotelForm(DB.hotel(b.dataset.pick), done, { focusRooms: true }); });
}

function hotelForm(h, done, opts = {}) {
  const isNew = !h;
  const ob = isAdmin(DB.currentUser()) ? {} : DB.currentUser()?.biz || {}, oz = ob.lat != null ? nearestZone(+ob.lat, +ob.lng).d : DESTINATIONS[0]; // ค่าเริ่มต้นจากพิกัดที่สมัครไว้
  h = h ? JSON.parse(JSON.stringify(h)) : { id: 'h' + Date.now(), ownerId: isAdmin(DB.currentUser()) ? null : DB.currentUser().id, name: '', type: 'รีสอร์ท', stars: 0, city: oz.name, area: '', lat: ob.lat != null ? +ob.lat : oz.lat, lng: ob.lng != null ? +ob.lng : oz.lng, rating: 0, reviews: 0, images: [IMG.pool1, IMG.room1, IMG.ext1], amenities: ['wifi', 'ac'], rooms: [], distance: 1, description: '', checkIn: '14:00', checkOut: '12:00', highlights: ['ทำเลดี', 'คุ้มค่าเงิน', 'Wi-Fi ฟรี'], houseRules: DEFAULT_HOUSE_RULES, active: true };
  const HIDDEN_AMEN = ['ev', 'frontdesk', 'shuttle', 'sunset', 'parking']; // ไม่ให้เลือกในฟอร์ม (ค่าเดิมที่บันทึกไว้ยังคงอยู่)
  const BED_OPTIONS = [...new Set(Object.values(ROOM_TEMPLATES).map(t => t.bed))];
  const roomRow = (r, i) => `<div class="room-edit" data-ri="${i}"><div class="row between"><b>ห้อง #${i + 1}</b><button type="button" class="btn btn-sm btn-danger" data-rdel="${i}"><i class="fa-solid fa-trash"></i></button></div>
    <div class="form-grid" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
      <div class="fg" style="grid-column:span 2"><label>ชื่อห้อง</label><input data-rf="name" value="${esc(r.name)}"></div>
      <div class="fg"><label>ราคา/คืน (฿)</label><input data-rf="price" type="number" value="${r.price}"></div>
      <div class="fg"><label>จำนวนห้อง</label><input data-rf="total" type="number" value="${r.total}"></div>
      <div class="fg"><label>พักได้ (คน)</label><input data-rf="maxGuests" type="number" value="${r.maxGuests}"></div>
      <div class="fg"><label>ขนาด (ตร.ม.)</label><input data-rf="size" type="number" value="${r.size}"></div>
      <div class="fg" style="grid-column:span 2"><label>เตียง</label><select data-rf="bed">${[...new Set([...BED_OPTIONS, r.bed].filter(Boolean))].map(b => `<option ${b === r.bed ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      <div class="fg" style="grid-column:span 2"><label>URL รูปห้อง</label><input data-rf="img" value="${esc(r.img)}"></div>
    </div>
    <div class="row wrap small" style="margin-top:8px">${[['breakfast', 'รวมอาหารเช้า'], ['freeCancel', 'ยกเลิกฟรี'], ['payAtHotel', 'ชำระที่ที่พัก']].map(([k, l]) => `<label class="row" style="gap:6px"><input type="checkbox" data-rf="${k}" ${r[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>`;
  const m = openModal(`<h2>${isNew ? 'เพิ่มที่พักใหม่' : 'แก้ไขที่พัก'}</h2>
    <form id="hf" novalidate>
      <div class="form-grid" style="margin-top:14px">
        <div class="fg full"><label>ชื่อที่พัก <span class="req">*</span></label><input name="name" value="${esc(h.name)}"></div>
        <div class="fg"><label>ประเภท</label><select name="type">${['โรงแรม', 'รีสอร์ท', 'วิลล่า', 'บังกะโล', 'เกสต์เฮาส์', 'โฮสเทล', 'แกลมปิ้ง'].map(t => `<option ${h.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="fg"><label>หาด / ย่าน</label><select name="city">${DESTINATIONS.map(d => `<option ${h.city === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
        <div class="fg full"><label>ตำแหน่งที่พัก — คลิกบนแผนที่ หรือลากหมุดไปที่รีสอร์ท <span class="req">*</span></label><div id="h-map" class="pick-map"></div>
          <div class="row between wrap small" style="margin-top:6px;gap:8px"><span class="muted"><i class="fa-solid fa-location-dot"></i> <span id="h-coord"></span></span><button type="button" class="btn btn-ghost btn-sm" id="h-gps"><i class="fa-solid fa-location-crosshairs"></i> ใช้ตำแหน่งปัจจุบันของฉัน</button></div></div>
        <div class="fg"><label>ระยะจากท่าเรือหน้าบ้าน (กม.)</label><input name="distance" type="number" step="0.1" min="0" value="${h.distance}"><div class="small muted" style="margin-top:4px">คำนวณให้อัตโนมัติเมื่อปักหมุด (แก้ได้)</div></div>
        <div class="fg"><label>เวลาเช็คอิน</label><input name="checkIn" value="${h.checkIn}"></div>
        <div class="fg"><label>เวลาเช็คเอาท์</label><input name="checkOut" value="${h.checkOut}"></div>
        ${isAdmin(DB.currentUser()) ? `<div class="fg full"><label>ลิงก์ประจำรีสอร์ท (ชื่อสั้น a-z 0-9 -)</label><input name="slug" value="${esc(h.slug || '')}" placeholder="เช่น sea-view-lan" maxlength="40"><div class="small muted" style="margin-top:4px">ลูกค้ากดลิงก์นี้แล้วจองผ่านเราได้ทันที: <code id="slug-prev"></code><button type="button" class="btn btn-outline btn-sm" id="slug-copy" style="margin-left:6px"><i class="fa-regular fa-copy"></i> คัดลอก</button></div></div>` : ''}
        <div class="fg full"><label>ช่องทางโซเชียลของรีสอร์ท (แสดงหน้าเว็บ และใส่ในข้อความโปรโมต)</label>
          <div class="form-grid" style="margin-top:6px">${Object.entries(SOCIALS).map(([k, c]) => `<div class="fg"><label><i class="${c.icon}" style="color:${c.color}"></i> ${c.label}</label><input name="soc_${k}" value="${esc(h.social?.[k] || '')}" placeholder="${esc(c.ph)}"></div>`).join('')}</div></div>
        <div class="fg full"><label>คำอธิบาย</label><textarea name="description" rows="3">${esc(h.description)}</textarea></div>
        <div class="fg full"><label>จุดเด่น (คั่นด้วยบรรทัดใหม่)</label><textarea name="highlights" rows="3">${esc(h.highlights.join('\n'))}</textarea></div>
        <div class="fg full"><label>รูปภาพ (URL หรือ Unsplash photo id — บรรทัดละ 1 รูป)</label><textarea name="images" rows="3">${esc(h.images.join('\n'))}</textarea>
          <div class="row small" style="margin-top:6px"><label class="btn btn-outline btn-sm" style="cursor:pointer"><i class="fa-solid fa-upload"></i> อัปโหลดรูปจากเครื่อง<input type="file" id="h-up" accept="image/*" multiple hidden></label><span class="muted">รูปจะถูกย่อแล้วอัปโหลดขึ้นระบบ (Supabase Storage)</span></div></div>
        <div class="fg full"><label>สิ่งอำนวยความสะดวก</label><div class="row wrap small">${Object.entries(AMENITIES).filter(([k]) => !HIDDEN_AMEN.includes(k)).map(([k, [ic, l]]) => `<label class="row" style="gap:6px;min-width:170px"><input type="checkbox" name="amen" value="${k}" ${h.amenities.includes(k) ? 'checked' : ''}> <i class="fa-solid ${ic} muted"></i> ${l}</label>`).join('')}${h.amenities.filter(a => a.startsWith('x:')).map(a => `<label class="row" style="gap:6px;min-width:170px"><input type="checkbox" name="amen" value="${esc(a)}" checked> <i class="fa-solid fa-circle-check muted"></i> ${esc(a.slice(2))}</label>`).join('')}<span id="amen-custom" class="row wrap" style="gap:6px;width:100%"></span></div>
          <div class="row" style="gap:8px;margin-top:8px"><input id="amen-new" maxlength="40" placeholder="พิมพ์สิ่งอำนวยความสะดวกเพิ่มเอง เช่น ร้านนวด" style="flex:1"><button type="button" class="btn btn-outline btn-sm" id="amen-add"><i class="fa-solid fa-plus"></i> เพิ่ม</button></div></div>
      </div>
      <div style="margin:20px 0 10px"><h3 style="margin:0 0 8px">ประเภทห้องพัก</h3>
        <div class="small muted" style="margin-bottom:6px">กดไอคอนเพื่อเพิ่มห้องตามประเภท หรือกด "เพิ่มห้อง" เพื่อเพิ่มห้องเปล่า (แก้ชื่อ ราคา จำนวนได้ภายหลัง)</div>
        <div class="row wrap" style="gap:8px"><button type="button" class="btn btn-primary btn-sm" id="r-addblank"><i class="fa-solid fa-plus"></i> เพิ่มห้อง</button>${Object.entries(ROOM_TEMPLATES).map(([k, t]) => `<button type="button" class="btn btn-outline btn-sm" data-radd="${k}" title="เพิ่ม ${esc(t.name)}"><i class="fa-solid ${ROOM_ICONS[k]}"></i> ${esc(t.name.replace(/^ห้อง/, ''))}</button>`).join('')}</div></div>
      <div id="r-list"></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary">บันทึก</button></div>
    </form>`, 'wide');
  const readRooms = () => $$('[data-ri]', m).forEach(el => {
    const r = h.rooms[+el.dataset.ri];
    $$('[data-rf]', el).forEach(i => { const k = i.dataset.rf; r[k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
  });
  const drawRooms = () => {
    $('#r-list', m).innerHTML = h.rooms.map(roomRow).join('') || '<p class="muted small">ยังไม่มีห้องพัก — กดปุ่ม "เพิ่มห้อง" ด้านบน</p>';
    $$('[data-rdel]', m).forEach(b => b.onclick = () => { readRooms(); h.rooms.splice(+b.dataset.rdel, 1); drawRooms(); });
  };
  drawRooms();
  if (opts.focusRooms) setTimeout(() => $('#r-list', m).scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  if ($('[name=slug]', m)) { const slugPrev = () => $('#slug-prev', m).textContent = resortLink({ id: h.id, slug: normSlug($('[name=slug]', m).value) });
    $('[name=slug]', m).oninput = slugPrev; slugPrev(); $('#slug-copy', m).onclick = () => { copyText($('#slug-prev', m).textContent); toast('คัดลอกลิงก์แล้ว'); }; }
  // แผนที่เลือกตำแหน่ง (แทนการพิมพ์ละติจูด / ลองจิจูด)
  const pos = { lat: +h.lat, lng: +h.lng }, PIER = DESTINATIONS[0];
  const kmFrom = (a, b) => { const R = 6371, rad = x => x * Math.PI / 180, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    return 2 * R * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2)); };
  let map = null, pin = null;
  const showCoord = () => $('#h-coord', m).textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
  const setPos = (lat, lng, pan) => {
    pos.lat = +lat.toFixed(6); pos.lng = +lng.toFixed(6);
    pin?.setLatLng([pos.lat, pos.lng]); if (pan) map?.setView([pos.lat, pos.lng], 16);
    $('[name=distance]', m).value = kmFrom(PIER, pos).toFixed(1); showCoord();
    const z = onKohLarn(pos.lat, pos.lng) && nearestZone(pos.lat, pos.lng); if (z) $('[name=city]', m).value = z.d.name; // โซน (หาด/ย่าน) ตามตำแหน่งหมุดอัตโนมัติ
  };
  showCoord();
  if (window.L) {
    map = L.map($('#h-map', m), { scrollWheelZoom: false }).setView([pos.lat, pos.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    pin = L.marker([pos.lat, pos.lng], { draggable: true, icon: L.divIcon({ className: '', html: '<div class="sos-pin pick-pin"><i class="fa-solid fa-location-dot"></i></div>', iconSize: [36, 36], iconAnchor: [18, 34] }) }).addTo(map);
    pin.on('dragend', () => { const p = pin.getLatLng(); setPos(p.lat, p.lng); });
    map.on('click', e => setPos(e.latlng.lat, e.latlng.lng));
    setTimeout(() => map.invalidateSize(), 250);
    // เปลี่ยนหาด → เลื่อนแผนที่ไปหาดนั้น (ยังต้องคลิกปักหมุดเอง)
    $('[name=city]', m).addEventListener('change', e => { const d = DESTINATIONS.find(x => x.name === e.target.value); if (d) map.setView([d.lat, d.lng], 16); });
  } else $('#h-map', m).innerHTML = '<div class="muted small" style="padding:20px">โหลดแผนที่ไม่ได้ — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</div>';
  $('#h-gps', m).onclick = () => {
    if (!navigator.geolocation) return toast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง', 'err');
    gpsOnce($('#h-gps', m), p => { setPos(p.coords.latitude, p.coords.longitude, true); toast('ปักหมุดที่ตำแหน่งปัจจุบันแล้ว'); }, () => toast('ระบุตำแหน่งไม่ได้ — กรุณาอนุญาตการเข้าถึงตำแหน่ง', 'err'), { enableHighAccuracy: true, timeout: 10000 });
  };
  $$('[data-radd]', m).forEach(b => b.onclick = () => {
    readRooms(); const t = ROOM_TEMPLATES[b.dataset.radd];
    h.rooms.push({ id: `${h.id}-r${Date.now() % 100000}`, name: t.name, size: t.size, bed: t.bed, maxGuests: t.maxGuests, view: t.view, img: t.img, total: 5, price: Math.round(1600 * t.mult / 50) * 50, discount: 0, breakfast: t.mult >= 1.25, freeCancel: true, payAtHotel: false });
    drawRooms(); $$('[data-ri]', m).at(-1)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  const addAmen = () => { const inp = $('#amen-new', m), t = inp.value.trim().slice(0, 40); if (!t) return;
    const key = 'x:' + t;
    if ($$('[name=amen]', m).some(c => c.value === key || (AMENITIES[c.value]?.[1] === t))) { inp.value = ''; return toast('มีรายการนี้อยู่แล้ว', 'err'); }
    const lb = document.createElement('label'); lb.className = 'row'; lb.style.cssText = 'gap:6px;min-width:170px';
    lb.innerHTML = `<input type="checkbox" name="amen" checked> <i class="fa-solid fa-circle-check muted"></i> <span></span>`;
    $('input', lb).value = key; $('span', lb).textContent = t; $('#amen-custom', m).before(lb); inp.value = ''; };
  $('#amen-add', m).onclick = addAmen;
  $('#amen-new', m).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addAmen(); } };
  $('#r-addblank', m).onclick = () => {
    readRooms(); const t = ROOM_TEMPLATES.standard;
    h.rooms.push({ id: `${h.id}-r${Date.now() % 100000}`, name: '', size: 0, bed: t.bed, maxGuests: 2, view: '', img: t.img, total: 1, price: 0, discount: 0, breakfast: false, freeCancel: true, payAtHotel: false });
    drawRooms(); $$('[data-ri]', m).at(-1)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  $('#h-up', m).onchange = async e => {
    const ta = $('[name=images]', m), files = [...e.target.files];
    toast(`กำลังอัปโหลด ${files.length} รูป...`, 'info');
    try {
      for (const file of files) { const url = await uploadImage(await resizeImage(file, 1600)); ta.value = (ta.value.trim() + '\n' + url).trim(); }
      toast(`เพิ่ม ${files.length} รูปแล้ว`);
    } catch (err) { toast('อัปโหลดรูปไม่สำเร็จ: ' + err.message, 'err'); }
    e.target.value = '';
  };
  $('#hf', m).onsubmit = e => {
    e.preventDefault();
    readRooms();
    const f = new FormData(e.target);
    const v = Object.fromEntries(f);
    if (!v.name.trim()) return toast('กรุณากรอกชื่อที่พัก', 'err');
    const sl = 'slug' in v ? normSlug(v.slug) : h.slug;
    if (sl && DB.hotels(true).some(x => x.id !== h.id && (x.slug === sl || x.id === sl))) return toast('ชื่อลิงก์นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น', 'err');
    if (!h.rooms.length) return toast('กรุณาเพิ่มห้องพักอย่างน้อย 1 ประเภท', 'err');
    if (h.rooms.some(r => !r.name.trim() || r.price <= 0 || r.total < 1 || r.maxGuests < 1)) return toast('ข้อมูลห้องไม่ครบ (ชื่อ ราคา จำนวนห้อง จำนวนคน)', 'err');
    Object.assign(h, {
      name: v.name.trim(), type: v.type, city: v.city, area: (h.area || '').trim() || v.city, lat: pos.lat, lng: pos.lng, distance: Math.max(0, +v.distance || 0),
      checkIn: v.checkIn, checkOut: v.checkOut, description: v.description,
      highlights: v.highlights.split('\n').map(s => s.trim()).filter(Boolean),
      images: v.images.split('\n').map(s => s.trim()).filter(Boolean),
      amenities: f.getAll('amen'),
      slug: sl || undefined,
      social: Object.fromEntries(Object.keys(SOCIALS).map(k => [k, (v['soc_' + k] || '').trim()]).filter(([, x]) => x)),
    });
    if (!h.images.length) h.images = [IMG.pool1];
    h.address = `${h.area}, ${h.city}, เกาะล้าน จ.ชลบุรี`;
    DB.saveHotel(h);
    DB.log('hotel.save', `${isNew ? 'เพิ่ม' : 'แก้ไข'} ${h.name}`);
    closeModal(); toast(isNew ? 'เพิ่มที่พักแล้ว' : 'บันทึกการแก้ไขแล้ว'); done();
  };
}
function resizeImage(file, max) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => res(b), 'image/jpeg', 0.82); URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

// ================= Coupons =================
function admCoupons(main) {
  const list = DB.coupons(), bks = DB.bookings().filter(b => b.status !== 'cancelled');
  const admin = isAdmin(DB.currentUser()), ownerName = id => { if (!id) return 'ทุกรีสอร์ท (แพลตฟอร์ม)'; const o = DB.users().find(u => u.id === id); return o ? (o.biz?.resortName || o.name) : '-'; };
  main.innerHTML = pageHead('โค้ดส่วนลด', `${list.filter(c => c.active).length} โค้ดที่ใช้งานอยู่ · ${admin ? 'โค้ดที่แพลตฟอร์มสร้างใช้ได้ทุกรีสอร์ท' : 'ใช้ได้เฉพาะที่พักของคุณ ส่วนลดหักจากยอดที่คุณได้รับ'}`, '<button class="btn btn-primary" id="c-add"><i class="fa-solid fa-plus"></i> เพิ่มโค้ด</button>') + `
    <section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>รูป</th><th>โค้ด</th>${admin ? '<th>ใช้กับ</th>' : ''}<th>ส่วนลด</th><th>ยอดขั้นต่ำ</th><th>คำอธิบาย</th><th>ใช้ไปแล้ว</th><th>ส่วนลดรวม</th><th>สถานะ</th><th></th></tr></thead><tbody>
    ${list.map((c, i) => { const used = bks.filter(b => b.price.couponCode === c.code); return `<tr><td style="white-space:nowrap">${c.image ? `<img src="${esc(c.image)}" alt="" style="width:64px;height:44px;object-fit:cover;border-radius:6px;vertical-align:middle">` : '<span class="muted small">—</span>'}<div style="margin-top:4px"><button class="btn btn-sm btn-ghost" data-cimg="${i}" title="${c.image ? 'เปลี่ยนรูป' : 'เพิ่มรูป'}"><i class="fa-regular fa-image"></i></button>${c.image ? `<button class="btn btn-sm btn-ghost red" data-cimgdel="${i}" title="ลบรูป"><i class="fa-solid fa-xmark"></i></button>` : ''}</div></td><td><span class="code">${esc(c.code)}</span></td>${admin ? `<td class="small">${esc(ownerName(c.ownerId))}</td>` : ''}<td>${c.type === 'percent' ? c.value + '%' : money(c.value)}</td><td>${+c.min > 0 ? money(c.min) : '<span class="muted">ไม่มี</span>'}</td><td class="small">${esc(c.desc)}</td>
      <td>${used.length}${c.maxUses ? ` / ${c.maxUses}` : ''} ครั้ง${c.maxUses && used.length >= c.maxUses ? ' <span class="pill bad">ครบแล้ว</span>' : ''}<div class="small muted">${c.maxUses ? 'จำกัด ' + c.maxUses + ' ครั้ง' : 'ไม่จำกัด'} <a href="javascript:" data-climit="${i}">แก้</a></div></td><td>${money(used.reduce((s, b) => s + (b.price.coupon || 0), 0))}</td>
      <td><label class="switch"><input type="checkbox" data-cact="${i}" ${c.active ? 'checked' : ''}><span></span>${c.active ? 'ใช้งาน' : 'ปิด'}</label></td>
      <td style="text-align:right"><button class="btn btn-sm btn-ghost red" data-cdel="${i}" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`; }).join('') || '<tr><td colspan="9" class="muted">ยังไม่มีโค้ด</td></tr>'}</tbody></table></div></section>`;
  $$('[data-cact]', main).forEach(c => c.onchange = () => { const x = list[+c.dataset.cact]; x.active = c.checked; DB.saveCoupons(list); DB.log('coupon.toggle', `${x.code} → ${c.checked ? 'เปิด' : 'ปิด'}`); admCoupons(main); });
  $$('[data-climit]', main).forEach(a => a.onclick = () => {
    const x = list[+a.dataset.climit];
    const m = openModal(`<h2>จำนวนครั้งที่ใช้โค้ด <span class="code">${esc(x.code)}</span></h2><div class="fg" style="margin-top:12px"><label>ใช้ได้ทั้งหมดกี่ครั้ง (เว้นว่าง = ไม่จำกัด)</label><input id="cl-n" type="number" min="1" step="1" value="${x.maxUses || ''}"></div><div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-ghost" data-close>ยกเลิก</button><button class="btn btn-primary" id="cl-ok">บันทึก</button></div>`);
    $('#cl-ok', m).onclick = () => { const n = Math.floor(+$('#cl-n', m).value); x.maxUses = n > 0 ? n : null; DB.saveCoupons(list); DB.log('coupon.limit', `${x.code} → ${x.maxUses || 'ไม่จำกัด'}`); closeModal(); toast('บันทึกแล้ว'); admCoupons(main); };
  });
  $$('[data-cimg]', main).forEach(b => b.onclick = async () => {
    const x = list[+b.dataset.cimg];
    try { toast('เลือกรูปจากเครื่อง...', 'info'); const url = await pickAndUploadImage(900); if (!url) return; x.image = url; DB.saveCoupons(list); DB.log('coupon.image', x.code); toast('บันทึกรูปโค้ดแล้ว'); admCoupons(main); }
    catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); }
  });
  $$('[data-cimgdel]', main).forEach(b => b.onclick = () => { const x = list[+b.dataset.cimgdel]; x.image = ''; DB.saveCoupons(list); DB.log('coupon.image', `${x.code} (ลบรูป)`); admCoupons(main); });
  $$('[data-cdel]', main).forEach(b => b.onclick = async () => { const x = list[+b.dataset.cdel]; if (!(await confirmBox(`ลบโค้ด <b>${esc(x.code)}</b>?`, 'ลบ'))) return; list.splice(+b.dataset.cdel, 1); DB.saveCoupons(list); DB.log('coupon.delete', x.code); toast('ลบโค้ดแล้ว'); admCoupons(main); });
  $('#c-add').onclick = () => {
    const m = openModal(`<h2>เพิ่มโค้ดส่วนลด</h2><form id="cf" class="form-grid" style="margin-top:14px" novalidate>
      <div class="fg full"><label>โค้ด</label><input name="code" style="text-transform:uppercase"></div>
      <div class="fg"><label>ประเภท</label><select name="type"><option value="percent">เปอร์เซ็นต์ (%)</option><option value="fixed">จำนวนเงิน (฿)</option></select></div>
      <div class="fg"><label>มูลค่า</label><input name="value" type="number"></div>
      <div class="fg full"><label>เงื่อนไข: ยอดจองขั้นต่ำ (฿) — 0 = ไม่มีขั้นต่ำ</label><input name="min" type="number" min="0" value="0"></div>
      <div class="full small" id="cf-cond" style="background:#f4f7fb;border-radius:8px;padding:8px 10px"></div>
      <div class="fg full"><label>คำอธิบาย</label><input name="desc"></div>
      <div class="fg full"><label>จำกัดจำนวนครั้งที่ใช้ได้ทั้งหมด (เว้นว่าง = ไม่จำกัด)</label><input name="maxUses" type="number" min="1" step="1" placeholder="เช่น 50"></div>
      <div class="fg full"><label>รูปโค้ดส่วนลด (ไม่บังคับ)</label><div class="row" style="gap:10px;align-items:center"><div id="cf-prev" style="width:96px;height:64px;border-radius:8px;background:#f1f3f6;display:grid;place-items:center;overflow:hidden" class="muted small">ไม่มีรูป</div><button type="button" class="btn btn-outline btn-sm" id="cf-img"><i class="fa-regular fa-image"></i> เลือกรูป</button><button type="button" class="btn btn-ghost btn-sm red" id="cf-imgx" style="display:none">ลบรูป</button></div><input type="hidden" name="image"></div>
      <div class="full"><button class="btn btn-primary btn-block">บันทึก</button></div></form>`);
    const cf = $('#cf', m), condTxt = () => { const val = +cf.elements.value.value || 0, c = { type: cf.elements.type.value, value: val, min: +cf.elements.min.value || 0, maxUses: Math.floor(+cf.elements.maxUses.value) || null };
      return `${val ? 'ลด ' + couponOffText(c) : 'ลด …'} ${couponCondText(c)}`; };
    const drawCond = () => $('#cf-cond', m).innerHTML = `<b>ลูกค้าจะเห็นเงื่อนไข:</b> ${condTxt()}`;
    ['type', 'value', 'min', 'maxUses'].forEach(n => cf.elements[n].addEventListener('input', drawCond)); drawCond();
    const setImg = u => { cf.elements.image.value = u || ''; $('#cf-prev', m).innerHTML = u ? `<img src="${esc(u)}" alt="" style="width:100%;height:100%;object-fit:cover">` : 'ไม่มีรูป'; $('#cf-imgx', m).style.display = u ? '' : 'none'; };
    $('#cf-img', m).onclick = async () => { try { toast('เลือกรูปจากเครื่อง...', 'info'); const u = await pickAndUploadImage(900); if (u) setImg(u); } catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); } };
    $('#cf-imgx', m).onclick = () => setImg('');
    $('#cf', m).onsubmit = e => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target));
      const code = v.code.trim().toUpperCase();
      if (!/^[A-Z0-9]{3,20}$/.test(code)) return toast('โค้ดต้องเป็นตัวอักษรอังกฤษ/ตัวเลข 3-20 ตัว', 'err');
      if (!(+v.value > 0) || (v.type === 'percent' && +v.value > 100)) return toast('มูลค่าส่วนลดไม่ถูกต้อง', 'err');
      if (list.some(c => c.code === code)) return toast('มีโค้ดนี้อยู่แล้ว', 'err');
      list.push({ code, type: v.type, value: +v.value, min: +v.min || 0, desc: v.desc.trim() || condTxt(), image: v.image || '', maxUses: Math.floor(+v.maxUses) > 0 ? Math.floor(+v.maxUses) : null, active: true, ownerId: admin ? null : DB.currentUser().id });
      DB.saveCoupons(list); DB.log('coupon.add', code); closeModal(); toast('เพิ่มโค้ดแล้ว'); admCoupons(main);
    };
  };
}

// ================= Ads (โฆษณา) =================
// ราคาที่ตกลงกับผู้ลงโฆษณาเป็นข้อมูลภายใน (ไม่แสดงบนเว็บ) — ระบบแค่บันทึกยอด/สถานะรับเงิน และนับการแสดงผล/คลิก
const AD_KINDS = { banner: ['fa-panorama', 'แบนเนอร์หน้าแรก', 'แสดงใต้ช่องค้นหาหน้าแรก (รูปแนวนอน แนะนำ 1400×400)'], featured: ['fa-award', 'รีสอร์ทแนะนำ', 'รีสอร์ทขึ้นอันดับบนสุดของผลค้นหา + ส่วน "รีสอร์ทแนะนำ" หน้าแรก'], side_left: ['fa-angles-left', 'แบนเนอร์ลอยข้างซ้าย', 'ลอยติดขอบจอด้านซ้ายทุกหน้า มีปุ่มปิดด้านล่าง (แนะนำรูปแนวตั้ง 240×600)'], side_right: ['fa-angles-right', 'แบนเนอร์ลอยข้างขวา', 'ลอยติดขอบจอด้านขวาทุกหน้า มีปุ่มปิดด้านล่าง (แนะนำรูปแนวตั้ง 240×600)'], bottom_bar: ['fa-window-minimize', 'แถบโฆษณาติดขอบล่างจอ', 'แถบแนวนอนเกาะขอบล่างจอตลอดเมื่อเลื่อนหน้า มีปุ่มปิดสีแดง (แนะนำรูป 970×90)'], popup: ['fa-window-restore', 'ป๊อปอัพหน้าแรก', 'เด้งขึ้นกลางจอเมื่อลูกค้าเปิดเว็บ มีปุ่มปิด (แสดงครั้งเดียวต่อการเปิดเว็บแต่ละครั้ง)'], card: ['fa-rectangle-ad', 'การ์ดโฆษณา', 'แสดงที่หน้าแรก (ใต้ "รีสอร์ทแนะนำ") และแทรกในผลค้นหา (ธุรกิจภายนอกหรือรีสอร์ท)'] };
function adStatus(a) {
  const t = todayISO();
  if (!a.active) return ['ปิดอยู่', ''];
  if (a.end < t) return ['หมดอายุ', 'bad'];
  if (a.start > t) return ['รอเริ่ม', 'warn'];
  return ['กำลังแสดง', 'ok'];
}
function admAds(main) {
  const list = DB.ads(), live = list.filter(a => adStatus(a)[0] === 'กำลังแสดง');
  const sumFee = list.reduce((s, a) => s + a.fee, 0), paid = list.filter(a => a.paid).reduce((s, a) => s + a.fee, 0);
  main.innerHTML = pageHead('โฆษณา', `กำลังแสดง ${live.length} รายการ · ยอดตกลง ${money(sumFee)} · รับเงินแล้ว ${money(paid)}`, '<button class="btn btn-primary" id="ad-add"><i class="fa-solid fa-plus"></i> เพิ่มโฆษณา</button>') + `
    <section class="card flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>รูป</th><th>โฆษณา</th><th>ตำแหน่ง</th><th>ช่วงเวลา</th><th>สถานะ</th><th>แสดง / คลิก</th><th style="text-align:right">ค่าโฆษณา</th><th></th></tr></thead><tbody>
    ${list.map((a, i) => { const [st, cls] = adStatus(a), h = a.hotelId && DB.hotel(a.hotelId); return `<tr>
      <td>${a.image ? `<img src="${esc(a.image)}" alt="" style="width:72px;height:44px;object-fit:cover;border-radius:6px">` : '<span class="muted small">—</span>'}</td>
      <td><b>${esc(a.advertiser || a.title || '-')}</b><div class="small muted">${esc(a.title)}${h ? ` · ${esc(h.name)}` : ''}</div></td>
      <td class="small"><i class="fa-solid ${AD_KINDS[a.kind][0]}"></i> ${AD_KINDS[a.kind][1]}<div><a href="${siteUrl(a.kind === 'card' ? '#/search' : '#/')}" target="_blank" rel="noopener" class="small">ดูบนเว็บ <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div></td>
      <td class="small">${fmtDate(a.start, false)} – ${fmtDate(a.end, false)}</td>
      <td><span class="pill ${cls}">${st}</span></td>
      <td class="small">${a.views.toLocaleString()} / ${a.clicks.toLocaleString()}<div class="muted">${a.views ? (a.clicks / a.views * 100).toFixed(1) + '% คลิก' : '-'}</div></td>
      <td style="text-align:right">${a.fee ? money(a.fee) : '<span class="muted">-</span>'}<div><label class="small"><input type="checkbox" data-apaid="${i}" ${a.paid ? 'checked' : ''}> รับเงินแล้ว</label></div></td>
      <td style="white-space:nowrap;text-align:right"><label class="switch"><input type="checkbox" data-aact="${i}" ${a.active ? 'checked' : ''}><span></span></label>
        <button class="btn btn-sm btn-ghost" data-aedit="${i}" title="แก้ไข"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-ghost red" data-adel="${i}" title="ลบ"><i class="fa-solid fa-trash"></i></button></td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">ยังไม่มีโฆษณา — กด "เพิ่มโฆษณา" หลังตกลงราคากับผู้ลงโฆษณาแล้ว</td></tr>'}</tbody></table></div></section>`;
  const patch = async (a, ch, what) => { await DB.saveAd({ ...a, ...ch }); DB.log('ad.' + what, `${a.advertiser || a.title}`); admAds(main); };
  $$('[data-aact]', main).forEach(c => c.onchange = () => { const a = list[+c.dataset.aact]; patch(a, { active: c.checked }, 'toggle'); });
  $$('[data-apaid]', main).forEach(c => c.onchange = () => { const a = list[+c.dataset.apaid]; patch(a, { paid: c.checked }, 'paid'); });
  $$('[data-aedit]', main).forEach(b => b.onclick = () => adForm(main, list[+b.dataset.aedit]));
  $$('[data-adel]', main).forEach(b => b.onclick = async () => { const a = list[+b.dataset.adel]; if (!(await confirmBox(`ลบโฆษณา <b>${esc(a.advertiser || a.title)}</b>? สถิติแสดง/คลิกจะหายไปด้วย`, 'ลบ'))) return; await DB.deleteAd(a.id); DB.log('ad.delete', a.advertiser || a.title); toast('ลบโฆษณาแล้ว'); admAds(main); });
  $('#ad-add').onclick = () => adForm(main, null);
}
// ดูตัวอย่างโฆษณาบน "หน้าแรกจริง" (ยังไม่บันทึก): เปิดหน้าเว็บลูกค้าในกรอบ (คอมพิวเตอร์ / มือถือ) แล้วใส่โฆษณาร่างเข้าไปแทนโฆษณาชนิดเดียวกัน
function adHomePreview(draft) {
  document.getElementById('adp')?.remove();
  const ov = document.createElement('div'); ov.id = 'adp';
  ov.innerHTML = `<div class="adp-bar"><b><i class="fa-regular fa-eye"></i> ตัวอย่างหน้าแรก <span class="small" style="font-weight:400;opacity:.8">· ยังไม่บันทึก · ไม่นับสถิติ</span></b>
    <div class="row" style="gap:8px"><button type="button" class="adp-b on" data-dev="d"><i class="fa-solid fa-desktop"></i> คอมพิวเตอร์</button><button type="button" class="adp-b" data-dev="m"><i class="fa-solid fa-mobile-screen"></i> มือถือ</button>
      <button type="button" class="adp-b adp-x" id="adp-close"><i class="fa-solid fa-xmark"></i> ปิดตัวอย่าง</button></div></div>
    <div class="adp-stage" id="adp-stage"><div id="adp-wrap"><iframe id="adp-f" title="ตัวอย่างหน้าแรก" src="index.html#/"></iframe></div></div>`;
  document.body.appendChild(ov);
  const ifr = $('#adp-f', ov), stage = $('#adp-stage', ov), wrap = $('#adp-wrap', ov);
  let dev = 'd';
  const layout = () => {
    const W = dev === 'd' ? 1440 : 390, H = dev === 'd' ? 900 : 800, sw = stage.clientWidth - 24, sh = stage.clientHeight - 24;
    const k = Math.min(1, sw / W, sh / H);
    wrap.style.width = Math.round(W * k) + 'px'; wrap.style.height = Math.round(H * k) + 'px';
    Object.assign(ifr.style, { width: W + 'px', height: H + 'px', transform: `scale(${k})`, transformOrigin: '0 0' });
  };
  const inject = () => {
    const w = ifr.contentWindow;
    try {
      // CACHE เป็น const ระดับบนสุดของหน้าลูกค้า (ไม่ใช่คุณสมบัติของ window) จึงสั่งผ่าน eval ในกรอบนั้น
      w.eval(`(d => { sessionStorage.removeItem('sd_ad_pop'); sessionStorage.removeItem('sd_ad_side'); CACHE.pubAds = CACHE.pubAds.filter(x => x.kind !== d.kind); CACHE.pubAds.push(d); document.querySelector('.ad-pop')?.remove(); render(); })(${JSON.stringify(draft)})`);
      const target = { banner: '.ad-banner', card: '.ad-home-cards', featured: '.ad-badge' }[draft.kind];
      if (target) setTimeout(() => w.document.querySelector(target)?.scrollIntoView({ block: 'center' }), 500);
    } catch (e) { toast('เปิดตัวอย่างไม่ได้: ' + e.message, 'err'); }
  };
  let tries = 0;
  ifr.onload = () => { const t = setInterval(() => { tries++; let ok = false; try { ok = ifr.contentWindow.eval("typeof CACHE !== 'undefined' && CACHE.loaded && typeof render === 'function'"); } catch {} if (ok || tries > 80) { clearInterval(t); if (ok) setTimeout(inject, 400); } }, 250); };
  $$('[data-dev]', ov).forEach(b => b.onclick = () => { dev = b.dataset.dev; $$('[data-dev]', ov).forEach(x => x.classList.toggle('on', x === b)); layout(); inject(); });
  $('#adp-close', ov).onclick = () => ov.remove();
  window.addEventListener('resize', layout); layout();
  const esc = e => { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', esc); } }; document.addEventListener('keydown', esc);
}
function adForm(main, ad) {
  const a = ad || { kind: 'banner', advertiser: '', hotelId: '', title: '', body: '', image: '', link: '', phone: '', line: '', start: todayISO(), end: isoOf(new Date(Date.now() + 30 * 864e5)), active: true, fee: 0, paid: false, note: '' };
  const m = openModal(`<h2>${ad ? 'แก้ไข' : 'เพิ่ม'}โฆษณา</h2><form id="adf" class="form-grid" style="margin-top:14px" novalidate>
    <div class="fg full"><label>ตำแหน่งที่แสดง</label><select name="kind">${Object.entries(AD_KINDS).map(([k, v]) => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select><div class="small muted" id="ad-kh" style="margin-top:4px"></div></div>
    <div class="fg full"><label>ชื่อผู้ลงโฆษณา (ร้าน / รีสอร์ท)</label><input name="advertiser" value="${esc(a.advertiser)}" maxlength="80"></div>
    <div class="fg full" id="ad-hotel"><label>รีสอร์ทที่ต้องการดัน</label><select name="hotelId"><option value="">— เลือกรีสอร์ท —</option>${DB.hotels(true).map(h => `<option value="${esc(h.id)}" ${a.hotelId === h.id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
    <div class="fg full" id="ad-rank"><label>อันดับในผลค้นหา <span class="small muted" style="font-weight:400">(เว้นว่าง = ขึ้นบนสุด)</span></label><input name="rank" type="number" min="1" max="50" step="1" value="${a.fit?.rank || ''}" placeholder="เช่น 1, 5 หรือ 9"><div class="small muted" style="margin-top:4px">ใส่เลขอันดับที่ต้องการให้รีสอร์ทนี้อยู่ เช่น 5 = อันดับที่ 5 ส่วนอันดับอื่นเรียงตามจริงตามที่ลูกค้าเลือกเรียง · ถ้าห้องเต็มในวันที่ค้นหาจะอยู่ท้ายรายการ · ลูกค้าเห็นป้าย "แนะนำ · โฆษณา" กำกับ</div></div>
    <div class="fg full" id="ad-txt"><label>หัวข้อ</label><input name="title" value="${esc(a.title)}" maxlength="80"></div>
    <div class="fg full" id="ad-body"><label>ข้อความสั้นๆ</label><textarea name="body" rows="2" maxlength="200">${esc(a.body)}</textarea></div>
    <div class="fg full" id="ad-img"><label>รูปโฆษณา</label><div class="row" style="gap:10px;align-items:center"><div id="adf-prev" style="width:120px;height:64px;border-radius:8px;background:#f1f3f6;display:grid;place-items:center;overflow:hidden" class="muted small">ไม่มีรูป</div><button type="button" class="btn btn-outline btn-sm" id="adf-img"><i class="fa-regular fa-image"></i> เลือกรูป</button><button type="button" class="btn btn-ghost btn-sm red" id="adf-imgx" style="display:none">ลบรูป</button></div><input type="hidden" name="image" value="${esc(a.image)}"></div>
    <div class="fg full" id="ad-pos"><label>ตำแหน่งป๊อปอัพ</label><select name="popPos"><option value="center" ${(a.fit?.pos || 'center') === 'center' ? 'selected' : ''}>กลางจอ (มีฉากหลังมืด ลูกค้าต้องกดปิด)</option><option value="left" ${a.fit?.pos === 'left' ? 'selected' : ''}>ลอยมุมล่างซ้าย (ไม่บังหน้าเว็บ)</option><option value="right" ${a.fit?.pos === 'right' ? 'selected' : ''}>ลอยมุมล่างขวา (ไม่บังหน้าเว็บ)</option></select></div>
    <div class="fg full" id="ad-fit"><label>ปรับขนาดรูป <span class="small muted" style="font-weight:400">(ดูผลในตัวอย่างด้านล่างทันที)</span></label>
      <div class="ad-fit">
        <label class="small">การแสดงรูป<select name="fitMode"><option value="cover" ${(a.fit?.mode || 'cover') === 'cover' ? 'selected' : ''}>เต็มกรอบ (ตัดส่วนที่เกิน)</option><option value="contain" ${a.fit?.mode === 'contain' ? 'selected' : ''}>แสดงทั้งรูป (เว้นขอบ)</option></select></label>
        <label class="small">ซูมเข้า <b id="fz-v"></b><input type="range" name="fitZoom" min="100" max="250" step="5" value="${Math.round((a.fit?.zoom || 1) * 100)}"></label>
        <label class="small">เลื่อนซ้าย–ขวา<input type="range" name="fitX" min="0" max="100" value="${a.fit?.x ?? 50}"></label>
        <label class="small">เลื่อนขึ้น–ลง<input type="range" name="fitY" min="0" max="100" value="${a.fit?.y ?? 50}"></label>
        <button type="button" class="btn btn-ghost btn-sm" id="fit-reset"><i class="fa-solid fa-rotate-left"></i> รีเซ็ตรูป</button></div></div>
    <div class="fg full" id="ad-livebox"><label>ตัวอย่างที่ลูกค้าจะเห็นบนเว็บ <button type="button" class="btn btn-primary btn-sm" id="ad-home-prev" style="margin-left:8px"><i class="fa-regular fa-eye"></i> ดูตัวอย่างบนหน้าแรกจริง</button></label><div id="ad-live" style="background:#f6f8fb;border:1px dashed #cfd6e0;border-radius:12px;padding:12px"></div><div class="small muted" style="margin-top:4px" id="ad-where"></div></div>
    <div class="fg full" id="ad-link"><label>ลิงก์เมื่อกด (https://...) — เว้นว่างได้ถ้าใส่เบอร์โทร/LINE</label><input name="link" value="${esc(a.link)}" placeholder="https://facebook.com/ชื่อเพจ"></div>
    <div class="fg" id="ad-phone"><label>เบอร์โทร</label><input name="phone" value="${esc(a.phone)}" maxlength="30"></div><div class="fg" id="ad-line"><label>LINE ID</label><input name="line" value="${esc(a.line)}" maxlength="60" placeholder="@ไลน์ไอดี"></div>
    <div class="fg"><label>เริ่มแสดง</label><input name="start" type="date" value="${a.start}"></div><div class="fg"><label>แสดงถึงวันที่</label><input name="end" type="date" value="${a.end}"></div>
    <div class="fg"><label>ค่าโฆษณาที่ตกลง (฿) — ข้อมูลภายใน</label><input name="fee" type="number" min="0" value="${a.fee || ''}"></div>
    <div class="fg"><label>&nbsp;</label><label class="small"><input type="checkbox" name="paid" ${a.paid ? 'checked' : ''}> รับเงินแล้ว</label></div>
    <div class="fg full"><label>บันทึกภายใน (ไม่แสดงบนเว็บ)</label><input name="note" value="${esc(a.note)}" maxlength="200" placeholder="เช่น ติดต่อคุณ... โอนเข้าบัญชี..."></div>
    <div class="full"><button class="btn btn-primary btn-block">บันทึก</button></div></form>`);
  const f = $('#adf', m);
  const SIDE_WHERE = 'ลอยติดขอบจอทุกหน้า: จอใหญ่ (≥1400px) เป็นแถบแนวตั้งกลางขอบจอ · จอเล็ก/มือถือเป็นการ์ดเล็กมุมล่าง · ลูกค้ากด “ปิด” ด้านล่างได้ (ไม่แสดงอีกจนกว่าจะเปิดเว็บใหม่)';
  const AD_WHERE = { bottom_bar: 'เกาะขอบล่างของจอทุกหน้า เลื่อนหน้าไปไหนก็ลอยตาม มีปุ่มกดปิดสีแดงที่มุมบนขวาของแถบ (ไม่แสดงอีกจนกว่าจะเปิดเว็บใหม่) · จอเล็กจะย่อความสูงให้พอดี', side_left: SIDE_WHERE, side_right: SIDE_WHERE, banner: 'แสดงที่หน้าแรก ใต้ช่องค้นหา', popup: 'เด้งเป็นป๊อปอัพกลางจอที่หน้าแรกเมื่อลูกค้าเปิดเว็บ มีปุ่มปิด', card: 'แสดงที่หน้าแรก (ใต้ “รีสอร์ทแนะนำ”) แทรกในผลค้นหา (ทุก 6 รายการ เมื่อมีผลอย่างน้อย 3 รายการ)', featured: 'รีสอร์ทขึ้นบนสุดของผลค้นหา (หรืออันดับที่กำหนด) และอยู่ในส่วน "รีสอร์ทแนะนำ" หน้าแรก' };
  const fitOf = v => ({ mode: v.fitMode === 'contain' ? 'contain' : 'cover', zoom: Math.max(1, Math.min(3, (+v.fitZoom || 100) / 100)), x: +v.fitX, y: +v.fitY });
  const preview = () => { try {
    const v = Object.fromEntries(new FormData(f)), k = v.kind, box = $('#ad-live', m);
    $('#ad-where', m).textContent = AD_WHERE[k] + ' · ต้องเปิดสวิตช์ และอยู่ในช่วงวันที่แสดง';
    const x = { id: 'preview', kind: k, advertiser: v.advertiser, hotelId: v.hotelId, title: v.title, body: v.body, image: v.image, link: '', phone: v.phone, line: v.line, fit: fitOf(v) };
    $('#fz-v', m).textContent = Math.round((+v.fitZoom || 100)) + '%';
    if (k === 'banner') box.innerHTML = x.image ? `<div class="small muted" style="margin-bottom:4px">บนคอมพิวเตอร์ (กว้างประมาณ 1168×200 พิกเซล)</div><div class="ad-banner" style="pointer-events:none">${adBannerSlide(x, true, 'height:auto;aspect-ratio:1168/200')}</div><div class="small muted" style="margin:12px 0 4px">บนมือถือ</div><div class="ad-banner" style="pointer-events:none;max-width:340px">${adBannerSlide(x, true, 'height:150px')}</div><div class="small muted" style="margin-top:6px">แนะนำรูปขนาด 1400×400 พิกเซล</div>` : '<span class="muted small">เลือกรูปเพื่อดูตัวอย่าง</span>';
    else if (k === 'side_left' || k === 'side_right') box.innerHTML = x.image ? `<div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;pointer-events:none"><div><div class="small muted" style="margin-bottom:4px">จอใหญ่ (≥1400px)</div>${adSideHtml(x, k === 'side_left' ? 'L' : 'R', true, 'desk')}</div><div><div class="small muted" style="margin-bottom:4px">มือถือ / จอเล็ก</div>${adSideHtml(x, k === 'side_left' ? 'L' : 'R', true)}</div></div>` : '<span class="muted small">เลือกรูปเพื่อดูตัวอย่าง</span>';
    else if (k === 'bottom_bar') box.innerHTML = x.image ? `<div style="pointer-events:none"><div class="small muted" style="margin-bottom:4px">บนคอมพิวเตอร์ (แนะนำรูป 970×90 พิกเซล)</div>${adBottomHtml(x, true, 'desk')}<div class="small muted" style="margin:14px 0 4px">บนมือถือ</div><div style="max-width:340px">${adBottomHtml(x, true)}</div></div>` : '<span class="muted small">เลือกรูปเพื่อดูตัวอย่าง</span>';
    else if (k === 'popup') box.innerHTML = `<div class="small muted" style="margin-bottom:4px">${v.popPos === 'left' ? 'จะลอยที่มุมล่างซ้ายของจอ' : v.popPos === 'right' ? 'จะลอยที่มุมล่างขวาของจอ' : 'จะเด้งกลางจอ มีฉากหลังมืด'}</div><div style="pointer-events:none;${v.popPos === 'left' || v.popPos === 'right' ? 'max-width:300px' : ''}">${adPopupHtml({ ...x, id: '' }, true)}</div>`;
    else if (k === 'card') box.innerHTML = adCard({ ...x, id: '' }, false).replace(/^<a /, '<a style="pointer-events:none" ');
    else { const h = DB.hotel(x.hotelId); box.innerHTML = h ? `<div style="pointer-events:none">${featuredBadgePreview(h)}</div>` : '<span class="muted small">เลือกรีสอร์ทเพื่อดูตัวอย่าง</span>'; }
  } catch (e) { $('#ad-live', m).textContent = 'ดูตัวอย่างไม่ได้: ' + e.message; } };
  const featuredBadgePreview = h => `<span class="ad-badge">แนะนำ · โฆษณา</span> ${hotelCard(h)}`;
  f.addEventListener('input', preview); f.addEventListener('change', preview);
  const sync = () => { const k = f.elements.kind.value; $('#ad-kh', m).textContent = AD_KINDS[k][2];
    $('#ad-hotel', m).style.display = k === 'featured' ? '' : 'none';
    $('#ad-rank', m).style.display = k === 'featured' ? '' : 'none';
    $('#ad-fit', m).style.display = k === 'featured' || k === 'popup' ? 'none' : '';
    $('#ad-pos', m).style.display = k === 'popup' ? '' : 'none';
    if (k.startsWith('side_') && !ad && !f.elements.fitMode.dataset.touched) f.elements.fitMode.value = 'contain'; // แบนเนอร์ข้างจอ: ค่าตั้งต้นแสดงทั้งรูป
    if (k.startsWith('side_') || k === 'bottom_bar') ['#ad-txt', '#ad-body'].forEach(x => $(x, m).style.display = 'none');
    ['#ad-txt', '#ad-body', '#ad-img', '#ad-link', '#ad-phone', '#ad-line'].forEach(x => $(x, m).style.display = k === 'featured' ? 'none' : ''); };
  f.elements.fitMode.addEventListener('change', () => { f.elements.fitMode.dataset.touched = 1; });
  f.elements.kind.onchange = () => { sync(); preview(); }; sync();
  const setImg = u => { f.elements.image.value = u || ''; setTimeout(preview); $('#adf-prev', m).innerHTML = u ? `<img src="${esc(u)}" alt="" style="width:100%;height:100%;object-fit:cover">` : 'ไม่มีรูป'; $('#adf-imgx', m).style.display = u ? '' : 'none'; };
  setImg(a.image); preview();
  $('#adf-img', m).onclick = async () => { try { toast('เลือกรูปจากเครื่อง...', 'info'); const u = await pickAndUploadImage(1600); if (u) setImg(u); } catch (e) { toast('อัปโหลดรูปไม่สำเร็จ: ' + e.message, 'err'); } };
  $('#adf-imgx', m).onclick = () => setImg('');
  $('#ad-home-prev', m).onclick = () => {
    const v = Object.fromEntries(new FormData(f)), k = v.kind;
    if (k === 'featured' && !v.hotelId) return toast('เลือกรีสอร์ทที่ต้องการดันก่อน', 'err');
    if (k !== 'featured' && !v.image) return toast('เลือกรูปก่อน แล้วค่อยดูตัวอย่างบนหน้าแรก', 'err');
    adHomePreview({ id: 'preview-draft', kind: k, advertiser: v.advertiser, hotelId: k === 'featured' ? v.hotelId : '', title: v.title, body: v.body, image: v.image, link: '', phone: v.phone, line: v.line,
      fit: k === 'popup' ? { pos: v.popPos || 'center' } : fitOf(v) });
  };
  $('#fit-reset', m).onclick = () => { f.elements.fitMode.value = 'cover'; f.elements.fitZoom.value = 100; f.elements.fitX.value = 50; f.elements.fitY.value = 50; preview(); };
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), k = v.kind;
    if (k === 'featured' && !v.hotelId) return toast('กรุณาเลือกรีสอร์ทที่ต้องการดัน', 'err');
    if (k !== 'featured') {
      if (!v.advertiser.trim() && !v.title.trim()) return toast('กรุณาใส่ชื่อผู้ลงโฆษณาหรือหัวข้อ', 'err');
      if ((k === 'banner' || k === 'popup' || k.startsWith('side_') || k === 'bottom_bar') && !v.image) return toast('แบนเนอร์/ป๊อปอัพต้องมีรูป', 'err');
      if (!v.image && !v.title.trim()) return toast('กรุณาใส่รูปหรือหัวข้อ', 'err');
      if (v.link.trim() && !/^https?:\/\//i.test(v.link.trim())) return toast('ลิงก์ต้องขึ้นต้นด้วย https://', 'err');
    }
    if (!v.start || !v.end || v.end < v.start) return toast('ช่วงวันที่ไม่ถูกต้อง', 'err');
    const next = { ...a, kind: k, advertiser: v.advertiser.trim(), hotelId: k === 'featured' ? v.hotelId : '', title: k === 'featured' ? '' : v.title.trim(), body: k === 'featured' ? '' : v.body.trim(),
      image: k === 'featured' ? '' : v.image, link: k === 'featured' ? '' : v.link.trim(), phone: k === 'featured' ? '' : v.phone.trim(), line: k === 'featured' ? '' : v.line.trim(),
      start: v.start, end: v.end, fee: +v.fee || 0, paid: !!v.paid, note: v.note.trim(), fit: k === 'banner' || k === 'card' || k.startsWith('side_') || k === 'bottom_bar' ? fitOf(v) : k === 'popup' ? { pos: v.popPos || 'center' } : k === 'featured' && Math.floor(+v.rank) > 0 ? { rank: Math.min(50, Math.floor(+v.rank)) } : {} };
    if (k === 'featured' && !next.advertiser) next.advertiser = DB.hotel(v.hotelId)?.name || '';
    const saved = await DB.saveAd(next); if (!saved) return;
    DB.log(ad ? 'ad.edit' : 'ad.add', `${next.advertiser || next.title} (${k})`); closeModal(); toast('บันทึกโฆษณาแล้ว'); admAds(main);
  };
}

// ================= Customers =================
function boCustomers(main) {
  const users = DB.users();
  const map = {};
  users.filter(u => u.role === 'user').forEach(u => map[u.email.toLowerCase()] = { name: u.name, email: u.email, phone: u.phone, member: true, since: u.createdAt, bks: [] });
  DB.bookings().forEach(b => {
    const k = (b.guest.email || '').toLowerCase(); if (!k) return;
    const staff = users.find(u => u.email.toLowerCase() === k && isStaff(u)); if (staff) return;
    map[k] ||= { name: guestName(b), email: b.guest.email, phone: b.guest.phone, member: false, since: b.createdAt, bks: [] };
    map[k].bks.push(b);
  });
  const all = Object.values(map).map(c => { const ok = c.bks.filter(b => b.status !== 'cancelled'); return { ...c, n: ok.length, spend: ok.reduce((s, b) => s + b.price.total, 0), last: ok.map(b => b.checkIn).sort().pop() }; }).sort((a, b) => b.spend - a.spend);
  let q = '', seg = '';
  main.innerHTML = pageHead('รายชื่อลูกค้า', `${all.length} ราย · สมาชิก ${all.filter(c => c.member).length} · ผู้จองทั่วไป ${all.filter(c => !c.member).length}`, '<button class="btn btn-outline btn-sm" id="cu-csv"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>') + `
    <div class="filters"><div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="cu-q" placeholder="ชื่อ / อีเมล / เบอร์"></div>
    <select id="cu-s" class="sel"><option value="">ทุกกลุ่ม</option><option value="vip">VIP (ใช้จ่าย ≥ ฿20,000)</option><option value="repeat">ลูกค้าประจำ (≥ 2 ครั้ง)</option><option value="member">สมาชิก</option><option value="guest">ผู้จองทั่วไป</option></select></div>
    <section class="card flush" id="cu-list"></section>`;
  const filtered = () => all.filter(c => (!q || [c.name, c.email, c.phone].join(' ').toLowerCase().includes(q)) && (!seg || (seg === 'vip' ? c.spend >= 20000 : seg === 'repeat' ? c.n >= 2 : seg === 'member' ? c.member : !c.member)));
  const draw = () => {
    const list = filtered();
    $('#cu-list').innerHTML = list.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>ลูกค้า</th><th>ประเภท</th><th>การจอง</th><th style="text-align:right">ยอดใช้จ่าย</th><th>เข้าพักล่าสุด</th></tr></thead><tbody>
      ${list.slice(0, 200).map((c, i) => `<tr class="click" data-cu="${all.indexOf(c)}"><td><div class="row" style="gap:10px"><span class="bo-av sm">${esc(c.name[0] || '?')}</span><div><b>${esc(c.name)}</b>${c.spend >= 20000 ? ' <span class="pill vip"><i class="fa-solid fa-gem"></i> VIP</span>' : ''}<div class="small muted">${esc(c.email)}${c.phone ? ' · ' + esc(c.phone) : ''}</div></div></div></td>
        <td>${c.member ? '<span class="pill ok">สมาชิก</span>' : '<span class="pill">ผู้จองทั่วไป</span>'}</td><td>${c.n} ครั้ง</td><td style="text-align:right"><b>${money(c.spend)}</b></td><td class="small">${c.last ? fmtDate(c.last, false) : '-'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="bo-empty sm"><i class="fa-solid fa-users"></i><p class="muted">ไม่พบลูกค้า</p></div>';
    $$('[data-cu]', main).forEach(r => r.onclick = () => {
      const c = all[+r.dataset.cu];
      const m = openModal(`<div class="dr-head"><div class="small muted">ลูกค้า</div><h2>${esc(c.name)}</h2><div class="small muted">${esc(c.email)} · ${esc(c.phone || '-')}</div></div>
        <div class="mini-stats"><div><span>การจอง</span><b>${c.n} ครั้ง</b></div><div><span>ยอดใช้จ่าย</span><b>${money(c.spend)}</b></div><div><span>เป็นลูกค้าตั้งแต่</span><b>${c.since ? fmtDate(isoOf(new Date(c.since)), false) : '-'}</b></div><div><span>ประเภท</span><b>${c.member ? 'สมาชิก' : 'ผู้จองทั่วไป'}</b></div></div>
        <div class="dr-sec"><h4>ประวัติการจอง</h4>${bkRows(c.bks.slice().sort((a, b) => a.checkIn < b.checkIn ? 1 : -1), { right: b => `<b class="small">${money(b.price.total)}</b> ${stChip(b)}` })}</div>`, 'drawer');
      $$('[data-bk]', m).forEach(el => el.onclick = () => bookingDrawer(el.dataset.bk));
    });
  };
  $('#cu-q').oninput = debounce(e => { q = e.target.value.trim().toLowerCase(); draw(); }, 200);
  $('#cu-s').onchange = e => { seg = e.target.value; draw(); };
  $('#cu-csv').onclick = () => downloadFile(`customers-${todayISO()}.csv`, toCsv([['ชื่อ', 'อีเมล', 'โทร', 'สมาชิก', 'จำนวนจอง', 'ยอดใช้จ่าย', 'เข้าพักล่าสุด'], ...filtered().map(c => [c.name, c.email, c.phone, c.member ? 'Y' : 'N', c.n, c.spend, c.last || ''])]), 'text/csv;charset=utf-8');
  draw();
}

// ================= Reviews =================
function boReviews(main) {
  const list = DB.reviewsAll().slice().reverse();
  const avg = list.length ? list.reduce((s, r) => s + r.score, 0) / list.length : 0;
  const dist = [[9, 10, 'ยอดเยี่ยม 9-10'], [7, 8.99, 'ดี 7-8.9'], [5, 6.99, 'พอใช้ 5-6.9'], [0, 4.99, 'ต้องปรับปรุง < 5']].map(([a, b, l]) => [l, list.filter(r => r.score >= a && r.score <= b).length]);
  main.innerHTML = pageHead('รีวิวจากลูกค้า', 'รีวิวที่ลูกค้าเขียนหลังเข้าพัก (ไม่รวมรีวิวตัวอย่างของระบบ)') + `
    <div class="bo-grid g-1-2"><section class="card"><div class="kpi-v">${avg ? avg.toFixed(1) : '-'}<small>/10</small></div><div class="muted small">คะแนนเฉลี่ยจาก ${list.length} รีวิว</div>
      <div class="hbars" style="margin-top:14px">${dist.map(([l, n]) => `<div class="hbar"><div class="row between small"><span>${l}</span><b>${n}</b></div><div class="track"><span style="width:${list.length ? n / list.length * 100 : 0}%"></span></div></div>`).join('')}</div></section>
    <section class="card">${list.length ? list.map(r => `<div class="review"><div class="row between"><div><span class="score-b ${r.score >= 8 ? 'ok' : r.score >= 6 ? 'mid' : 'bad'}">${(+r.score).toFixed(1)}</span> <b>${esc(r.title)}</b></div>${can('reviews.manage') ? `<button class="btn btn-sm btn-ghost red" data-rv="${r.id}" title="ลบรีวิว"><i class="fa-solid fa-trash"></i></button>` : ''}</div>
      <p>${esc(r.text)}</p><div class="small muted">${esc(r.name)} · ${esc(DB.hotel(r.hotelId)?.name || r.hotelId)} · ${esc(r.room || '')} · ${fmtDate(r.date, false)}${r.bookingId ? ` · <a href="javascript:" data-bk="${r.bookingId}">${r.bookingId}</a>` : ''}</div></div>`).join('') : '<div class="bo-empty sm"><i class="fa-regular fa-star"></i><p class="muted">ยังไม่มีรีวิวจากลูกค้า</p></div>'}</section></div>`;
  bindBk(main);
  $$('[data-rv]', main).forEach(b => b.onclick = async () => {
    const r = list.find(x => String(x.id) === b.dataset.rv);
    if (!(await confirmBox(`ลบรีวิว "<b>${esc(r.title)}</b>" ของ ${esc(r.name)}? คะแนนของที่พักจะถูกคำนวณใหม่`, 'ลบรีวิว'))) return;
    try { await DB.deleteReview(r.id); } catch (e) { return toast(e.message, 'err'); }
    DB.log('review.delete', `${r.name} · ${r.title}`); toast('ลบรีวิวแล้ว'); render();
  });
}

// ================= Settings (owner) =================
function boSettings(main) {
  const s = DB.settings();
  const fg = (k, l, attrs = '', full = false) => `<div class="fg ${full ? 'full' : ''}"><label>${l}</label><input name="${k}" value="${esc(s[k])}" ${attrs}></div>`;
  main.innerHTML = pageHead('ตั้งค่ากิจการ', 'ข้อมูลนี้ใช้ในเอกสาร หน้าเว็บ และหน้าเข้าสู่ระบบ') + `
    <form id="set-f"><div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3>ข้อมูลกิจการ</h3></div><div class="form-grid">
        ${fg('bizName', 'ชื่อแบรนด์')}${fg('legalName', 'ชื่อนิติบุคคล')}${fg('taxId', 'เลขประจำตัวผู้เสียภาษี', 'inputmode="numeric" maxlength="13"')}${fg('phone', 'เบอร์โทรชมรม (แสดงท้ายเว็บ ศูนย์ช่วยเหลือ และหน้าที่พัก)', 'inputmode="tel" placeholder="รอกรอก เช่น 038-xxx-xxx"')}${fg('email', 'อีเมลชมรม (แสดงในศูนย์ช่วยเหลือ)', 'type="email" placeholder="รอกรอก เช่น info@โดเมนของชมรม"')}${fg('line', 'LINE Official ของชมรม (แสดงหัวเว็บ ท้ายเว็บ และหน้าที่พัก)', 'placeholder="รอกรอก เช่น @kohlarn หรือลิงก์ https://line.me/..."')}
        ${!s.phone || !s.email || !s.line ? `<div class="fg full"><div class="small" style="background:#fff7e6;border:1px solid #f5c26b;border-radius:8px;padding:8px 12px"><i class="fa-solid fa-triangle-exclamation"></i> ยังไม่ได้กรอก: ${[!s.phone && 'เบอร์โทร', !s.email && 'อีเมล', !s.line && 'LINE'].filter(Boolean).join(' · ')} — ช่องที่ว่างจะไม่แสดงบนเว็บ กรอกแล้วกดบันทึกด้านล่าง</div></div>` : ''}
        <div class="fg full"><label>ที่อยู่</label><textarea name="address" rows="2">${esc(s.address)}</textarea></div>
        ${fg('targetMonthly', 'เป้ายอดขายต่อเดือน (฿)', 'type="number" min="0" step="1000"', true)}</div></section>
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-qrcode"></i> การรับชำระเงิน</h3></div>
        <div class="form-grid">
          ${fg('promptpayId', 'หมายเลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลขบัตร/เลขผู้เสียภาษี 13 หลัก)', 'inputmode="numeric" maxlength="13" placeholder="0812345678"', true)}
          ${fg('promptpayName', 'ชื่อบัญชีพร้อมเพย์ (แสดงให้ลูกค้าตรวจก่อนโอน)', 'maxlength="80"', true)}
          <div class="fg full"><label>บัญชีธนาคารสำหรับโอน (เว้นว่าง = ไม่เปิดรับโอน)</label><textarea name="bankInfo" rows="2" maxlength="300" placeholder="ธนาคาร... เลขที่บัญชี... ชื่อบัญชี...">${esc(s.bankInfo)}</textarea></div>
        </div>
        <div class="row" style="gap:16px;margin-top:12px;align-items:center"><div class="pp-qr" id="pp-prev" style="width:136px;height:136px"></div><div class="small muted"><b>ใช้กับที่พักที่แพลตฟอร์มดูแลเอง (ไม่มีเจ้าของรีสอร์ท)</b> — ที่พักของเจ้าของรีสอร์ทใช้บัญชีที่เจ้าของตั้งเอง<br><b>หมายเหตุ:</b> promptpay.io สร้าง QR เท่านั้น ไม่แจ้งผลการโอน — ทีมงานต้องตรวจยอดในแอปธนาคาร แล้วกด "รับชำระเงิน" ในหน้าการจอง</div></div>
      </section>
      <section class="card"><div class="card-h"><h3>ประกาศบนหน้าเว็บ</h3></div>
        <label class="switch big"><input type="checkbox" name="announceOn" ${s.announceOn ? 'checked' : ''}><span></span>แสดงแถบประกาศด้านบนเว็บไซต์</label>
        <div class="form-grid" style="margin-top:14px"><div class="fg full"><label>ข้อความประกาศ</label><textarea name="announce" rows="2" maxlength="200" placeholder="เช่น โปรโมชั่นสงกรานต์ ลด 20% ทุกห้อง ใช้โค้ด SUMMER500">${esc(s.announce)}</textarea></div>
        <div class="fg full"><label>รูปแบบ</label><select name="announceType">${[['info', 'ข้อมูลทั่วไป (น้ำเงิน)'], ['promo', 'โปรโมชั่น (ส้ม)'], ['warn', 'แจ้งเตือน (แดง)']].map(([k, l]) => `<option value="${k}" ${s.announceType === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="small muted" style="margin:12px 0 6px">ตัวอย่าง</div><div class="announce ${s.announceType}" id="an-prev"><i class="fa-solid fa-bullhorn"></i> ${esc(s.announce || 'ข้อความประกาศ')}</div></section>
    </div><div class="save-bar"><button class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> บันทึกการตั้งค่า</button></div></form>`;
  const f = $('#set-f');
  const prev = () => {
    const v = Object.fromEntries(new FormData(f)); $('#an-prev').className = 'announce ' + v.announceType; $('#an-prev').innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${esc(v.announce || 'ข้อความประกาศ')}`;
    const id = v.promptpayId.replace(/\D/g, ''), box = $('#pp-prev');
    if (box.dataset.id !== id) { box.dataset.id = id; box.innerHTML = isPromptpayId(id) ? `<img src="${promptpayQr(id)}" alt="QR พร้อมเพย์" style="width:120px;height:120px">` : '<span class="small muted" style="line-height:1.4;display:block;padding:8px">ใส่หมายเลขพร้อมเพย์เพื่อดูตัวอย่าง</span>'; }
  };
  prev();
  f.oninput = prev; f.onchange = prev;
  f.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    if (!v.bizName.trim()) return toast('กรุณากรอกชื่อแบรนด์', 'err');
    if (v.taxId && !/^\d{13}$/.test(v.taxId)) return toast('เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก', 'err');
    v.promptpayId = v.promptpayId.replace(/\D/g, '');
    if (v.promptpayId && !isPromptpayId(v.promptpayId)) return toast('หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลข 13 หลัก', 'err');
    DB.saveSettings({ ...v, announceOn: !!v.announceOn, targetMonthly: Math.max(0, +v.targetMonthly || 0) });
    DB.log('settings.save', v.announceOn ? `ประกาศ: ${v.announce}` : 'ข้อมูลกิจการ'); toast('บันทึกการตั้งค่าแล้ว'); render();
  };
}

// ================= Audit log =================
const AUDIT_TH = {
  'auth.login': 'เข้าสู่ระบบ', 'auth.logout': 'ออกจากระบบ', 'auth.fail': 'ใส่รหัสผ่านผิด',
  'booking.pay': 'รับชำระเงิน', 'checkin.register': 'ลงทะเบียนผู้เข้าพัก', 'checkin.print': 'พิมพ์ทะเบียนผู้เข้าพัก', 'checkin.view': 'เปิดดูรูปเอกสารผู้เข้าพัก', 'checkin.delete': 'ลบข้อมูลเอกสารผู้เข้าพัก', 'booking.confirm': 'ยืนยันการจอง', 'booking.checkin': 'เช็คอิน', 'booking.checkout': 'เช็คเอาท์', 'booking.cancel': 'ยกเลิกการจอง', 'booking.delete': 'ลบการจอง', 'booking.note': 'เพิ่มโน้ต', 'booking.export': 'ส่งออกการจอง',
  'hotel.save': 'บันทึกที่พัก', 'hotel.delete': 'ลบที่พัก', 'hotel.toggle': 'เปิด/ปิดขาย', 'hotel.ical': 'เปิด/ปิดซิงก์ iCal รายรีสอร์ท', 'service.request': 'ขอใช้บริการเสริม','hotel.maintenance': 'ปิดปรับปรุงรีสอร์ท','hotel.maintenance.release': 'เปิดรับจองคืนหลังปรับปรุง','coupon.add': 'เพิ่มโค้ด', 'coupon.toggle': 'เปิด/ปิดโค้ด', 'coupon.delete': 'ลบโค้ด', 'review.delete': 'ลบรีวิว', 'sos.status': 'อัปเดตเหตุฉุกเฉิน', 'sos.contacts': 'แก้เบอร์ฉุกเฉิน',
  'staff.add': 'เพิ่มทีมงาน', 'staff.edit': 'แก้ไขทีมงาน', 'staff.suspend': 'ระงับบัญชี', 'staff.activate': 'เปิดใช้บัญชี', 'staff.delete': 'ลบทีมงาน', 'staff.resetpw': 'รีเซ็ตรหัสผ่าน',
  'booking.approve': 'อนุมัติการจอง', 'booking.reject': 'ปฏิเสธการจอง', 'payout.save': 'ตั้งค่าบัญชีรับเงิน',
  'partner.approve': 'อนุมัติเจ้าของรีสอร์ท', 'partner.reject': 'ไม่อนุมัติเจ้าของรีสอร์ท', 'partner.suspend': 'ระงับเจ้าของรีสอร์ท', 'partner.activate': 'เปิดใช้เจ้าของรีสอร์ท',
  'settings.save': 'บันทึกตั้งค่า', 'report.export': 'ส่งออกรายงาน', 'flags.save': 'เปลี่ยนฟีเจอร์', 'profile.save': 'แก้ไขโปรไฟล์', 'profile.password': 'เปลี่ยนรหัสผ่าน',
  'data.edit': 'แก้ข้อมูลดิบ', 'data.delete': 'ลบคีย์ข้อมูล', 'data.export': 'สำรองข้อมูล', 'data.import': 'กู้คืนข้อมูล', 'data.demo': 'สร้างข้อมูลตัวอย่าง', 'data.reset': 'รีเซ็ตระบบ', 'logs.clear': 'ล้าง error logs',
};
const AUDIT_TONE = a => a === 'auth.fail' || /delete|reset|suspend|cancel/.test(a) ? 'bad' : a.startsWith('auth') ? 'muted' : /data|flags|staff|settings/.test(a) ? 'warn' : 'ok';
function boAudit(main) {
  const all = DB.audit();
  let q = '', who = '', type = '';
  const groups = { auth: 'การเข้าสู่ระบบ', booking: 'การจอง', staff: 'ทีมงาน', hotel: 'ที่พัก', coupon: 'โค้ดส่วนลด', settings: 'ตั้งค่า', data: 'ข้อมูล', flags: 'ฟีเจอร์' };
  main.innerHTML = pageHead('บันทึกการใช้งาน (Audit log)', `ทุกการกระทำในหลังบ้านถูกบันทึกพร้อมผู้ทำและเวลา · เก็บล่าสุด 1,000 รายการ`, '<button class="btn btn-outline btn-sm" id="au-csv"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>') + `
    <div class="filters"><div class="f-search"><i class="fa-solid fa-magnifying-glass"></i><input id="au-q" placeholder="ค้นหารายละเอียด"></div>
      <select id="au-w" class="sel"><option value="">ทุกคน</option>${[...new Set(all.map(a => a.name))].map(n => `<option>${esc(n)}</option>`).join('')}</select>
      <select id="au-t" class="sel"><option value="">ทุกประเภท</option>${Object.entries(groups).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
    <section class="card flush" id="au-list"></section>`;
  const filtered = () => all.filter(a => (!who || a.name === who) && (!type || a.action.startsWith(type + '.')) && (!q || (a.target + ' ' + (AUDIT_TH[a.action] || a.action)).toLowerCase().includes(q)));
  const draw = () => {
    const list = filtered();
    $('#au-list').innerHTML = list.length ? `<div class="table-scroll" style="max-height:70vh"><table class="tbl"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>รายละเอียด</th></tr></thead><tbody>
      ${list.slice(0, 300).map(a => `<tr><td class="small" style="white-space:nowrap">${fmtDateTime(a.at)}<div class="muted">${relTime(a.at)}</div></td><td><b>${esc(a.name)}</b><div>${ROLES[a.role] ? roleBadge(a.role) : ''}</div></td>
        <td><span class="act ${AUDIT_TONE(a.action)}">${AUDIT_TH[a.action] || esc(a.action)}</span><div class="small muted mono">${esc(a.action)}</div></td><td class="small">${esc(a.target)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="bo-empty sm"><i class="fa-solid fa-clock-rotate-left"></i><p class="muted">ไม่มีบันทึก</p></div>';
  };
  $('#au-q').oninput = debounce(e => { q = e.target.value.trim().toLowerCase(); draw(); }, 200);
  $('#au-w').onchange = e => { who = e.target.value; draw(); };
  $('#au-t').onchange = e => { type = e.target.value; draw(); };
  $('#au-csv').onclick = () => downloadFile(`audit-${todayISO()}.csv`, toCsv([['เวลา', 'ผู้ใช้', 'บทบาท', 'การกระทำ', 'รายละเอียด'], ...filtered().map(a => [a.at, a.name, a.role, a.action, a.target])]), 'text/csv;charset=utf-8');
  draw();
}

// ================= Backup & tools =================
const backupData = () => ({
  app: 'staydee', version: APP_VERSION, exportedAt: new Date().toISOString(),
  hotels: DB.hotels(true), bookings: DB.bookings(), coupons: DB.coupons(), reviews: DB.reviewsAll(),
  settings: CACHE.kv.settings || null, flags: CACHE.kv.flags || null, sos_contacts: CACHE.kv.sos_contacts || null, sos: DB.sos(), audit: DB.audit(),
});
function boTools(main) {
  main.innerHTML = pageHead('สำรอง & กู้คืนข้อมูล', 'ข้อมูลหลักอยู่ในฐานข้อมูล Supabase — ไฟล์สำรองช่วยย้อนข้อมูลหรือย้ายระบบได้') + `
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-download"></i> สำรองข้อมูล</h3></div><p class="small muted">ดาวน์โหลดไฟล์ JSON ที่มีที่พัก การจอง โค้ดส่วนลด รีวิว การตั้งค่า แจ้งเหตุ และบันทึกการใช้งาน (เฉพาะข้อมูลที่บทบาทของคุณเห็นได้) — บัญชีผู้ใช้และรหัสผ่านไม่รวมอยู่ในไฟล์</p><button class="btn btn-primary" id="t-exp"><i class="fa-solid fa-download"></i> ดาวน์โหลดไฟล์สำรอง</button></section>
      <section class="card"><div class="card-h"><h3><i class="fa-solid fa-upload"></i> กู้คืนข้อมูล</h3></div><p class="small muted">นำเข้าไฟล์สำรอง — รายการที่มีรหัสตรงกันจะถูกเขียนทับ รายการอื่นในระบบยังอยู่ครบ</p><label class="btn btn-outline" style="cursor:pointer"><i class="fa-solid fa-upload"></i> เลือกไฟล์ .json<input type="file" id="t-imp" accept=".json" hidden></label></section>
      ${can('data.reset') ? `<section class="card"><div class="card-h"><h3><i class="fa-solid fa-wand-magic-sparkles"></i> สร้างข้อมูลตัวอย่าง</h3></div><p class="small muted">สร้างการจองตัวอย่าง ~60 รายการ ย้อนหลัง 60 วันถึงล่วงหน้า 30 วัน เพื่อทดสอบแดชบอร์ดและรายงาน — <b>ข้อมูลจะเข้าไปในฐานข้อมูลจริง</b></p><button class="btn btn-outline" id="t-demo"><i class="fa-solid fa-wand-magic-sparkles"></i> สร้างข้อมูลตัวอย่าง</button></section>
      <section class="card danger"><div class="card-h"><h3 class="red"><i class="fa-solid fa-triangle-exclamation"></i> รีเซ็ตระบบ</h3></div><p class="small muted">ลบการจอง รีวิว แจ้งเหตุ error logs ที่พัก โค้ดส่วนลด และการตั้งค่าทั้งหมด แล้วกลับสู่ข้อมูลตั้งต้น <b>ไม่สามารถย้อนกลับได้</b> (บัญชีผู้ใช้และ Audit log ยังอยู่)</p><button class="btn btn-danger" id="t-reset"><i class="fa-solid fa-rotate-left"></i> รีเซ็ตข้อมูลทั้งหมด</button></section>` : ''}
    </div>`;
  $('#t-exp').onclick = () => {
    downloadFile(`staydee-backup-${todayISO()}.json`, JSON.stringify(backupData(), null, 2), 'application/json'); DB.log('data.export', 'ไฟล์สำรองทั้งระบบ');
  };
  $('#t-imp').onchange = async e => {
    const file = e.target.files[0]; e.target.value = '';
    let data;
    try { data = JSON.parse(await file.text()); if (!Array.isArray(data.hotels)) throw new Error(); } catch { return toast('ไฟล์ไม่ถูกต้อง', 'err'); }
    const keys = ['hotels', 'bookings', 'coupons', 'reviews', 'settings', 'flags', 'sos_contacts', 'sos'].filter(k => data[k] != null);
    if (!(await confirmBox(`กู้คืนข้อมูล ${keys.length} หมวด (${keys.join(', ')}) จากไฟล์ ${esc(file.name)}?`, 'กู้คืน'))) return;
    try {
      const r = await DB.adminImport(Object.fromEntries(keys.map(k => [k, data[k]])));
      DB.log('data.import', `${file.name} · ที่พัก ${r.hotels} · การจอง ${r.bookings}`); toast('กู้คืนข้อมูลเรียบร้อย'); render();
    } catch (err) { toast('กู้คืนไม่สำเร็จ: ' + err.message, 'err'); }
  };
  $('#t-demo')?.addEventListener('click', async e => {
    e.target.disabled = true;
    try { const n = await seedDemoBookings(); DB.log('data.demo', `${n} การจอง`); toast(`สร้างการจองตัวอย่าง ${n} รายการ`); render(); }
    catch (err) { toast(err.message, 'err'); e.target.disabled = false; }
  });
  $('#t-reset')?.addEventListener('click', async () => {
    const v = await promptBox('รีเซ็ตข้อมูลทั้งหมด', 'พิมพ์คำว่า <b>RESET</b> เพื่อยืนยัน', 'รีเซ็ตระบบ');
    if (v !== 'RESET') return v != null && toast('ข้อความยืนยันไม่ถูกต้อง', 'err');
    try { await DB.adminImport({ hotels: buildSeedHotels(), coupons: DEFAULT_COUPONS }, true); DB.log('data.reset', 'รีเซ็ตเป็นข้อมูลตั้งต้น'); toast('รีเซ็ตระบบแล้ว'); render(); }
    catch (err) { toast('รีเซ็ตไม่สำเร็จ: ' + err.message, 'err'); }
  });
}
// สร้างการจองตัวอย่างฝั่งเบราว์เซอร์แล้วส่งเข้าฐานข้อมูลครั้งเดียว (ผ่าน sd_admin_import)
async function seedDemoBookings() {
  const hotels = DB.hotels(), today = todayISO();
  const names = [['สมศักดิ์', 'ใจดี'], ['John', 'Smith'], ['มาลี', 'สุขใจ'], ['Yuki', 'Tanaka'], ['ประเสริฐ', 'วงศ์ไทย'], ['Emma', 'Brown'], ['วิภา', 'รักษ์ทะเล'], ['Chen', 'Wei'], ['อนันต์', 'ศรีสุข'], ['Sophie', 'Martin'], ['กิตติ', 'มั่นคง'], ['Lena', 'Müller']];
  const methods = ['promptpay', 'promptpay', 'hotel', 'bank', 'promptpay'];
  const coupons = (DB.coupons().length ? DB.coupons() : DEFAULT_COUPONS).filter(c => c.active);
  const couponOff = (c, amt) => amt < c.min ? 0 : Math.min(amt, c.type === 'percent' ? Math.round(amt * c.value / 100) : c.value);
  const rnd = n => Math.floor(Math.random() * n);
  const made = [], used = (r, ci, co) => made.filter(b => b.roomId === r.id && b.status !== 'cancelled' && b.checkIn < co && ci < b.checkOut).reduce((s, b) => s + b.qty, 0);
  for (let i = 0; i < 80 && made.length < 60; i++) {
    const h = hotels[rnd(hotels.length)], r = h.rooms[rnd(h.rooms.length)];
    const ci = addDays(today, rnd(90) - 60), n = 1 + rnd(4), co = addDays(ci, n), qty = Math.random() < 0.15 ? 2 : 1;
    if (DB.available(r, ci, co) - used(r, ci, co) < qty) continue;
    const gi = rnd(names.length), q = DB.quote(r, ci, co, qty), [fn, ln] = names[gi], pm = methods[rnd(methods.length)];
    const cp = Math.random() < 0.25 ? coupons[rnd(coupons.length)] : null;
    const off = cp ? couponOff(cp, q.sub) : 0;
    const tax = Math.round((q.sub - off) * TAX_RATE), total = q.sub - off + tax;
    const created = addDays(ci, -(1 + rnd(30)));
    const createdAt = new Date((created > today ? today : created) + 'T' + pad(8 + rnd(13)) + ':' + pad(rnd(60)) + ':00').toISOString();
    const cancelled = Math.random() < 0.08, past = co < today, inHouse = ci <= today && co > today;
    const paid = !cancelled && (past || Math.random() < 0.6);
    const b = { id: 'SD' + String(Date.now() + i).slice(-6) + (100 + rnd(900)), pin: String(1000 + rnd(9000)), userId: null, hotelId: h.id, hotelName: h.name, roomId: r.id, roomName: r.name, offer: { id: r.breakfast ? 'bf' : 'ro', breakfast: r.breakfast, freeCancel: r.freeCancel, payAtHotel: r.payAtHotel, extra: 0 }, qty, checkIn: ci, checkOut: co, nights: n, adults: 2, children: rnd(3) === 0 ? 1 : 0, rooms: qty,
      guest: { firstName: fn, lastName: ln, email: `guest${gi}@example.com`, phone: '08' + String(10000000 + gi * 7919).slice(0, 8), requests: [], note: '' },
      payment: { method: pm, paid, ...(paid ? { paidAt: createdAt } : {}) }, price: { orig: q.orig, room: q.sub, member: 0, coupon: off, couponCode: cp && off ? cp.code : null, tax, total },
      status: cancelled ? 'cancelled' : paid || pm === 'hotel' ? 'confirmed' : 'pending', createdAt, demo: true };
    if (cancelled) Object.assign(b, { cancelledAt: createdAt, cancelReason: 'ลูกค้าเปลี่ยนแผนการเดินทาง' });
    else if (past && b.status === 'confirmed') Object.assign(b, { checkedInAt: ci + 'T07:30:00.000Z', checkedOutAt: co + 'T04:30:00.000Z', completedAt: co + 'T04:30:00.000Z' });
    else if (inHouse && b.status === 'confirmed' && Math.random() < 0.7) b.checkedInAt = ci + 'T07:30:00.000Z';
    made.push(b);
  }
  if (made.length) await DB.adminImport({ bookings: made });
  return made.length;
}

// ================= Developer: System =================
// ชุดข้อมูลที่นักพัฒนาดูได้ — แก้ไขผ่าน sd_admin_import (upsert ตามรหัส) · ข้อมูลบางชุดอ่านอย่างเดียว
const DATA_SETS = {
  hotels: { label: 'sd_hotels', get: () => DB.hotels(true), save: v => DB.adminImport({ hotels: v }) },
  bookings: { label: 'sd_bookings', get: () => DB.bookings(), save: v => DB.adminImport({ bookings: v }) },
  coupons: { label: 'sd_coupons', get: () => DB.coupons(), save: v => DB.adminImport({ coupons: v }) },
  reviews: { label: 'sd_reviews', get: () => DB.reviewsAll() },
  profiles: { label: 'sd_profiles', get: () => DB.users() },
  settings: { label: 'sd_kv · settings', get: () => CACHE.kv.settings ?? null, save: v => DB.adminImport({ settings: v }) },
  flags: { label: 'sd_kv · flags', get: () => CACHE.kv.flags ?? null, save: v => DB.adminImport({ flags: v }) },
  sos_contacts: { label: 'sd_kv · sos_contacts', get: () => CACHE.kv.sos_contacts ?? null, save: v => DB.adminImport({ sos_contacts: v }) },
  sos: { label: 'sd_sos', get: () => DB.sos(), save: v => DB.adminImport({ sos: v }) },
  audit: { label: 'sd_audit', get: () => DB.audit() },
  errors: { label: 'sd_errors', get: () => DB.errors() },
  ...Object.fromEntries(LOCAL_KEYS.map(k => [`local.${k}`, { label: `localStorage · sd_${k}`, local: true, get: () => LS.get(k, null), save: v => LS.set(k, v), del: () => LS.del(k) }])),
};
const dataEntries = () => Object.entries(DATA_SETS).map(([k, d]) => { const v = d.get(); const s = v == null ? '' : JSON.stringify(v); return { k, d, v, bytes: s.length * 2, n: Array.isArray(v) ? v.length : null }; });
const fmtBytes = n => n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : (n / 1024).toFixed(1) + ' KB';
function integrityCheck() {
  const issues = [], hotels = DB.hotels(true), bks = DB.bookings(), users = DB.users(), today = todayISO();
  bks.forEach(b => {
    const h = hotels.find(x => x.id === b.hotelId);
    if (!h) issues.push(['warn', `การจอง ${b.id} อ้างถึงที่พักที่ไม่มีอยู่ (${b.hotelId})`]);
    else if (!h.rooms.some(r => r.id === b.roomId)) issues.push(['warn', `การจอง ${b.id} อ้างถึงห้องที่ไม่มีอยู่ (${b.roomId})`]);
    const exp = b.price.room - (b.price.member || 0) - (b.price.coupon || 0) + b.price.tax;
    if (Math.abs(exp - b.price.total) > 1) issues.push(['warn', `การจอง ${b.id} ยอดรวมไม่ตรงกับรายการย่อย (${money(b.price.total)} ≠ ${money(exp)})`]);
    if (b.checkOut <= b.checkIn) issues.push(['bad', `การจอง ${b.id} วันเช็คเอาท์ไม่ถูกต้อง`]);
  });
  hotels.forEach(h => h.rooms.forEach(r => {
    for (let i = -7; i < 90; i++) { const d = addDays(today, i), c = DB.bookedCount(r.id, d, addDays(d, 1)); if (c > r.total) { issues.push(['bad', `ห้องเกิน (overbooking): ${h.name} / ${r.name} วันที่ ${fmtDate(d, false)} — จอง ${c} จาก ${r.total} ห้อง`]); break; } }
  }));
  if (users.length > 1 && !users.some(u => u.role === 'admin' && u.active !== false)) issues.push(['bad', 'ไม่มีบัญชีผู้ดูแลแพลตฟอร์มที่ใช้งานได้']);
  hotels.filter(h => h.ownerId && !users.some(u => u.id === h.ownerId)).forEach(h => issues.push(['warn', `ที่พัก ${h.name} อ้างถึงเจ้าของที่ไม่มีอยู่`]));
  if (!hotels.length) issues.push(['bad', 'ยังไม่มีที่พักในระบบ — ใช้ "รีเซ็ตระบบ" ในหน้าสำรอง & กู้คืน เพื่อติดตั้งข้อมูลตั้งต้น']);
  const codes = DB.coupons().map(c => c.code);
  codes.filter((c, i) => codes.indexOf(c) !== i).forEach(c => issues.push(['warn', `โค้ดส่วนลดซ้ำ: ${c}`]));
  return issues;
}
function boSystem(main) {
  const ents = dataEntries().sort((a, b) => b.bytes - a.bytes), total = ents.filter(e => !e.d.local).reduce((s, e) => s + e.bytes, 0);
  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const errs = DB.errors();
  const counts = [['ที่พัก', DB.hotels(true).length], ['ประเภทห้อง', DB.hotels(true).reduce((s, h) => s + h.rooms.length, 0)], ['การจอง', DB.bookings().length], ['ผู้ใช้', DB.users().length], ['ทีมงาน', DB.users().filter(isStaff).length], ['โค้ดส่วนลด', DB.coupons().length], ['รีวิว', DB.reviewsAll().length], ['Audit log', DB.audit().length]];
  main.innerHTML = pageHead('สถานะระบบ', 'ข้อมูลสำหรับนักพัฒนา — เวอร์ชัน ฐานข้อมูล และการตรวจสอบความถูกต้องของข้อมูล', '<button class="btn btn-outline" id="sy-ping"><i class="fa-solid fa-satellite-dish"></i> ทดสอบการเชื่อมต่อ</button><button class="btn btn-primary" id="sy-chk"><i class="fa-solid fa-stethoscope"></i> ตรวจสอบข้อมูล</button>') + `
    <div class="kpi-grid k4">
      ${kpi('fa-code-branch', 'violet', 'เวอร์ชันแอป', 'v' + APP_VERSION, 'Supabase · ตาราง sd_*')}
      ${kpi('fa-database', 'info', 'ข้อมูลที่โหลดไว้', fmtBytes(total), 'เฉพาะแถวที่บทบาทนี้มีสิทธิ์อ่าน')}
      ${kpi('fa-gauge-high', 'ok', 'เวลาโหลดหน้า', nav ? Math.round(nav.duration) + ' ms' : '-', nav ? `DOM ready ${Math.round(nav.domContentLoadedEventEnd)} ms` : '')}
      ${kpi('fa-bug', errs.length ? 'bad' : 'ok', 'Error ที่บันทึกไว้', errs.length, errs[0] ? 'ล่าสุด ' + relTime(errs[0].at) : 'ไม่มี error')}
    </div>
    <div id="sy-res"></div>
    <div class="bo-grid g-1-1">
      <section class="card flush"><div class="card-h pad"><h3>ขนาดข้อมูลตามชุด</h3><a class="small" href="#/admin/data">เปิด Data inspector →</a></div><div class="table-scroll"><table class="tbl"><thead><tr><th>ชุดข้อมูล</th><th>รายการ</th><th>ขนาด</th><th style="width:35%"></th></tr></thead><tbody>
        ${ents.map(e => `<tr><td class="mono small">${esc(e.d.label)}</td><td class="small">${e.n ?? '-'}</td><td class="small">${fmtBytes(e.bytes)}</td><td><div class="track"><span style="width:${e.bytes / (ents[0]?.bytes || 1) * 100}%"></span></div></td></tr>`).join('')}</tbody></table></div></section>
      <section class="card"><div class="card-h"><h3>จำนวนข้อมูล</h3></div><div class="mini-stats">${counts.map(([l, v]) => `<div><span>${l}</span><b>${v.toLocaleString()}</b></div>`).join('')}</div>
        <div class="card-h" style="margin-top:20px"><h3>สภาพแวดล้อม</h3></div>
        <div class="env">${[['Browser', navigator.userAgent], ['ภาษา', navigator.language], ['หน้าจอ', `${screen.width}×${screen.height} @${devicePixelRatio}x · viewport ${innerWidth}×${innerHeight}`], ['ออนไลน์', navigator.onLine ? 'ใช่' : 'ไม่'], ['เขตเวลา', Intl.DateTimeFormat().resolvedOptions().timeZone], ['ฐานข้อมูล', SUPABASE_URL], ['Realtime', rtChannel ? rtChannel.state : 'ไม่ได้เชื่อมต่อ'], ['Libraries', `supabase-js ${window.supabase ? 'ok' : '-'} · Leaflet ${window.L?.version || '-'}`]].map(([k, v]) => `<div><span>${k}</span><code>${esc(v)}</code></div>`).join('')}</div></section>
    </div>`;
  $('#sy-chk').onclick = () => {
    const t0 = performance.now(), iss = integrityCheck(), ms = Math.round(performance.now() - t0);
    $('#sy-res').innerHTML = `<section class="card"><div class="card-h"><h3>ผลการตรวจสอบ</h3><span class="small muted">${ms} ms</span></div>${iss.length ? `<ul class="insights">${iss.map(([t, x]) => `<li><i class="fa-solid ${t === 'bad' ? 'fa-circle-xmark red' : 'fa-triangle-exclamation'}"></i><span>${esc(x)}</span></li>`).join('')}</ul>` : '<p class="green"><i class="fa-solid fa-circle-check"></i> ไม่พบปัญหา ข้อมูลถูกต้องทั้งหมด</p>'}</section>`;
  };
  $('#sy-ping').onclick = async () => {
    const t0 = performance.now();
    try { await DB.load(); toast(`เชื่อมต่อฐานข้อมูลได้ · โหลดข้อมูลใหม่ใน ${Math.round(performance.now() - t0)} ms`); render(); } catch (e) { toast('เชื่อมต่อไม่สำเร็จ: ' + e.message, 'err'); }
  };
}

// ================= Developer: Data inspector =================
function boData(main, params) {
  const ents = dataEntries();
  const key = DATA_SETS[params.get('k')] ? params.get('k') : ents[0].k;
  const cur = ents.find(e => e.k === key), ds = cur.d;
  const pretty = cur.v == null ? '' : JSON.stringify(cur.v, null, 2);
  main.innerHTML = pageHead('ข้อมูลดิบ (Data inspector)', 'ดู JSON ของข้อมูลในฐานข้อมูลและในเบราว์เซอร์ — การบันทึกจะเขียนทับรายการที่มีรหัสตรงกัน (ไม่ลบรายการที่หายไปจาก JSON) และถูกบันทึกใน Audit log') + `
    <div class="data-layout"><section class="card flush data-keys">${ents.map(e => `<a href="#/admin/data?k=${encodeURIComponent(e.k)}" class="${e.k === key ? 'on' : ''}"><span class="mono">${esc(e.d.label)}</span><small>${e.n != null ? e.n + ' · ' : ''}${fmtBytes(e.bytes)}</small></a>`).join('')}</section>
    <section class="card data-ed"><div class="card-h"><h3 class="mono">${esc(ds.label)}</h3><span class="small muted">${cur.n != null ? cur.n + ' รายการ · ' : ''}${fmtBytes(cur.bytes)}${ds.save ? '' : ' · อ่านอย่างเดียว'}</span></div>
      ${key === 'bookings' ? '<div class="notice warn"><i class="fa-solid fa-triangle-exclamation"></i><div>แก้ไขการจองโดยตรงจะไม่ผ่านการตรวจราคาและห้องว่าง — ใช้เฉพาะกรณีแก้ข้อมูลผิดพลาด</div></div>' : ''}
      <textarea id="dt-v" class="code-ed" spellcheck="false" ${ds.save ? '' : 'readonly'}>${esc(pretty)}</textarea><div class="small" id="dt-msg" style="min-height:20px;margin:6px 0"></div>
      <div class="row wrap">${ds.save ? '<button class="btn btn-primary btn-sm" id="dt-save"><i class="fa-solid fa-floppy-disk"></i> บันทึก</button><button class="btn btn-outline btn-sm" id="dt-fmt"><i class="fa-solid fa-align-left"></i> จัดรูปแบบ</button>' : ''}<button class="btn btn-outline btn-sm" id="dt-dl"><i class="fa-solid fa-download"></i> ดาวน์โหลด</button><button class="btn btn-outline btn-sm" id="dt-cp"><i class="fa-regular fa-copy"></i> คัดลอก</button><span style="flex:1"></span>${ds.del ? '<button class="btn btn-ghost btn-sm red" id="dt-del"><i class="fa-solid fa-trash"></i> ลบคีย์</button>' : ''}</div></section></div>`;
  const ta = $('#dt-v'), msg = $('#dt-msg');
  const parse = () => { try { const v = JSON.parse(ta.value); msg.innerHTML = '<span class="green"><i class="fa-solid fa-circle-check"></i> JSON ถูกต้อง</span>'; return { v }; } catch (e) { msg.innerHTML = `<span class="red"><i class="fa-solid fa-circle-xmark"></i> ${esc(e.message)}</span>`; return null; } };
  if (ds.save) {
    ta.oninput = debounce(parse, 300);
    ta.onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); } if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); $('#dt-save').click(); } };
    $('#dt-fmt').onclick = () => { const r = parse(); if (r) ta.value = JSON.stringify(r.v, null, 2); };
    $('#dt-save').onclick = async () => {
      const r = parse(); if (!r) return toast('JSON ไม่ถูกต้อง', 'err');
      if (!(await confirmBox(`บันทึกทับข้อมูล <b class="mono">${esc(ds.label)}</b>?`, 'บันทึก'))) return;
      try { await ds.save(r.v); DB.log('data.edit', ds.label); toast('บันทึกแล้ว'); render(); } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message, 'err'); }
    };
  }
  $('#dt-dl').onclick = () => downloadFile(`${key}.json`, ta.value, 'application/json');
  $('#dt-cp').onclick = () => { copyText(ta.value); toast('คัดลอกแล้ว'); };
  $('#dt-del')?.addEventListener('click', async () => {
    if (!(await confirmBox(`ลบคีย์ <b class="mono">${esc(ds.label)}</b> ในเบราว์เซอร์นี้?`, 'ลบคีย์'))) return;
    ds.del(); DB.log('data.delete', ds.label); toast('ลบแล้ว'); go('/admin/data');
  });
}

// ================= Developer: Logs =================
function boLogs(main) {
  const errs = DB.errors();
  main.innerHTML = pageHead('Error logs', 'Error จากเบราว์เซอร์ของผู้ใช้ทุกเครื่อง (window.onerror / unhandledrejection / ฐานข้อมูล) · แสดงล่าสุด 200 รายการ',
    `<button class="btn btn-outline btn-sm" id="lg-test"><i class="fa-solid fa-flask"></i> ทดสอบ error</button><button class="btn btn-outline btn-sm" id="lg-dl" ${errs.length ? '' : 'disabled'}><i class="fa-solid fa-download"></i> ดาวน์โหลด</button><button class="btn btn-danger btn-sm" id="lg-clear" ${errs.length ? '' : 'disabled'}><i class="fa-solid fa-broom"></i> ล้าง</button>`) + `
    <section class="card flush">${errs.length ? `<div class="table-scroll"><table class="tbl"><thead><tr><th>เวลา</th><th>ประเภท</th><th>ข้อความ</th><th>ที่มา</th></tr></thead><tbody>
      ${errs.map(e => `<tr><td class="small" style="white-space:nowrap">${fmtDateTime(e.at)}<div class="muted">${relTime(e.at)}</div></td><td><span class="act bad">${esc(e.type)}</span></td><td class="mono small" style="word-break:break-word">${esc(e.msg)}</td><td class="mono small muted" style="word-break:break-all;max-width:280px">${esc(e.src)}<div>${esc(e.url)}</div></td></tr>`).join('')}</tbody></table></div>`
    : '<div class="bo-empty sm"><i class="fa-solid fa-circle-check green"></i><p class="muted">ไม่มี error 🎉</p></div>'}</section>`;
  $('#lg-test').onclick = () => { setTimeout(() => { throw new Error('ทดสอบระบบดักจับ error จากหน้า Logs'); }); setTimeout(render, 300); };
  $('#lg-dl').onclick = () => downloadFile(`errors-${todayISO()}.json`, JSON.stringify(errs, null, 2), 'application/json');
  $('#lg-clear').onclick = async () => { if (await confirmBox('ล้าง error logs ทั้งหมด?', 'ล้าง')) { DB.clearErrors(); DB.log('logs.clear', `${errs.length} รายการ`); render(); } };
}

// ================= Developer: Feature flags =================
function boFlags(main) {
  const fl = DB.flags();
  const sw = (k, t, d) => `<div class="flag"><div><b>${t}</b><p class="small muted">${d}</p><code class="small">${k}</code></div><label class="switch big"><input type="checkbox" data-fl="${k}" ${fl[k] ? 'checked' : ''}><span></span></label></div>`;
  main.innerHTML = pageHead('ฟีเจอร์ & โหมดระบบ', 'เปิด-ปิดฟีเจอร์โดยไม่ต้องแก้โค้ด — มีผลทันที') + `
    <section class="card">
      ${sw('maintenance', 'โหมดปิดปรับปรุง (Maintenance)', 'หน้าเว็บลูกค้าจะแสดงข้อความปิดปรับปรุง ทีมงานยังเข้าใช้งานได้ตามปกติ')}
      <div class="fg" style="margin:-4px 0 18px"><label class="small">ข้อความที่แสดงให้ลูกค้า</label><div class="row"><input id="fl-msg" value="${esc(fl.maintenanceMsg)}" style="flex:1"><button class="btn btn-outline btn-sm" id="fl-msg-save">บันทึก</button></div></div>
    </section>
    <section class="card">
      ${sw('icalSync', 'ซิงก์ปฏิทิน Agoda / Booking.com (iCal) — เปิดให้ทุกรีสอร์ท · ฟีเจอร์ Plus (มีค่าบริการ)', 'เปิดแล้วเจ้าของ “ทุกรีสอร์ท” จะเห็นกล่อง “ซิงก์อัตโนมัติ” ในหน้า “จองจากช่องทางอื่น” และระบบจะดึงปฏิทินทุก 20 นาที · ถ้าอยากเปิดเฉพาะบางรีสอร์ท ให้ปิดสวิตช์นี้ แล้วติ๊ก “ซิงก์ iCal” รายรีสอร์ทที่เมนู “สไลด์ & รูปรีสอร์ท” · ปิดทั้งสองอย่าง = กล่องซ่อน และระบบหยุดดึง (ลิงก์ที่เคยบันทึกไว้ไม่ถูกลบ)')}
    </section>
    <div class="notice info"><i class="fa-solid fa-circle-info"></i><div>สิทธิ์ถูกบังคับที่ฐานข้อมูลด้วย Row Level Security (ตาราง <code>sd_role_perms</code> + ฟังก์ชัน <code>sd_can()</code>) — <code>ROLE_PERMS</code> ใน <code>js/store.js</code> ใช้ซ่อนเมนูเท่านั้น หากแก้สิทธิ์ต้องแก้ทั้งสองที่ให้ตรงกัน</div></div>`;
  $$('[data-fl]', main).forEach(c => c.onchange = () => { DB.saveFlags({ [c.dataset.fl]: c.checked }); DB.log('flags.save', `${c.dataset.fl} = ${c.checked}`); toast('อัปเดตแล้ว'); render(); });
  $('#fl-msg-save').onclick = () => { DB.saveFlags({ maintenanceMsg: $('#fl-msg').value.trim() || DEFAULT_FLAGS.maintenanceMsg }); DB.log('flags.save', 'maintenanceMsg'); toast('บันทึกข้อความแล้ว'); };
}

// ================= Profile =================
function boProfile(main) {
  const u = DB.currentUser();
  const mine = DB.audit().filter(a => a.uid === u.id).slice(0, 12);
  main.innerHTML = pageHead('บัญชีของฉัน', `${esc(u.email)} · ${ROLES[u.role].label}`) + `
    <div class="bo-grid g-1-1">
      <section class="card"><div class="card-h"><h3>ข้อมูลส่วนตัว</h3></div><form id="pf-f" class="form-grid">
        <div class="fg full"><label>ชื่อที่แสดง</label><input name="name" value="${esc(u.name)}"></div><div class="fg"><label>อีเมล</label><input value="${esc(u.email)}" disabled></div><div class="fg"><label>เบอร์โทร</label><input name="phone" value="${esc(u.phone || '')}"></div>
        <div class="full"><button class="btn btn-primary">บันทึก</button></div></form>
        <div class="card-h" style="margin-top:24px"><h3>เปลี่ยนรหัสผ่าน</h3></div><form id="pw-f" class="form-grid">
        <div class="fg full"><label>รหัสผ่านปัจจุบัน</label><input name="cur" type="password" autocomplete="current-password"></div><div class="fg"><label>รหัสผ่านใหม่</label><input name="n1" type="password" autocomplete="new-password"></div><div class="fg"><label>ยืนยันรหัสผ่านใหม่</label><input name="n2" type="password" autocomplete="new-password"></div>
        <div class="full"><button class="btn btn-outline">เปลี่ยนรหัสผ่าน</button></div></form></section>
      <section class="card"><div class="card-h"><h3>สิทธิ์ของฉัน</h3>${roleBadge(u.role)}</div><ul class="perm-list">${ROLE_PERMS[u.role].map(p => `<li><i class="fa-solid fa-check green"></i> ${PERMS[p]}</li>`).join('')}</ul>
        <div class="card-h" style="margin-top:20px"><h3>กิจกรรมล่าสุดของฉัน</h3></div>${mine.length ? `<ol class="tl">${mine.map(a => `<li><i class="fa-solid fa-circle"></i><div><b>${AUDIT_TH[a.action] || esc(a.action)}</b> <span class="small muted">${esc(a.target)}</span><div class="small muted">${relTime(a.at)}</div></div></li>`).join('')}</ol>` : '<p class="small muted">ยังไม่มีกิจกรรม</p>'}</section>
    </div>`;
  $('#pf-f').onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); if (!v.name.trim()) return toast('กรุณากรอกชื่อ', 'err'); DB.updateUser(u.id, { name: v.name.trim(), phone: v.phone.trim() }); DB.log('profile.save', u.email); toast('บันทึกแล้ว'); render(); };
  $('#pw-f').onsubmit = async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    if (v.n1.length < 8) return toast('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร', 'err');
    if (v.n1 !== v.n2) return toast('รหัสผ่านใหม่ไม่ตรงกัน', 'err');
    const r = await DB.changePassword(v.cur, v.n1);
    if (r.error) return toast(r.error, 'err');
    DB.log('profile.password', u.email); toast('เปลี่ยนรหัสผ่านแล้ว'); e.target.reset();
  };
}
