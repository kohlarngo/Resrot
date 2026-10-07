// ================= Router =================
const ROUTES = [
  [/^\/$/, pageHome],
  [/^\/search$/, pageSearch],
  [/^\/deals$/, pageDeals],
  [/^\/hotel\/([\w-]+)$/, pageHotel],
  [/^\/book$/, pageBook],
  [/^\/booking\/(\w+)$/, pageBookingView],
  [/^\/my-bookings$/, pageMyBookings],
  [/^\/favorites$/, pageFavorites],
  [/^\/profile$/, pageProfile],
  [/^\/help$/, pageHelp],
  [/^\/admin(?:\/(\w+))?$/, pageStaffHub],
];

function go(path, replace = false) {
  const h = '#' + path;
  if (replace) { history.replaceState(null, '', h); render(); }
  else if (location.hash === h) render();
  else location.hash = h;
}

let lastPath = null;
function render() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(qs || '');
  clearInterval(bookTimer);
  closeModal();
  // หน้าหลังบ้าน (owner/admin/dev.html) มีแต่ระบบหลังบ้าน — ลิงก์หน้าเว็บลูกค้าส่งไป index.html
  if (PORTAL && !path.startsWith('/admin')) {
    if (/^\/(booking|hotel)\//.test(path)) location.href = SITE_URL + location.hash;
    else go('/admin', true);
    return;
  }
  const isBO = !!PORTAL;
  document.body.classList.toggle('bo', isBO);
  const app = $('#app');
  // ระบบหลังบ้านมีแถบด้านบนของตัวเอง — ไม่ใช้ header ของหน้าเว็บ
  if (isBO) $('#header').innerHTML = '';
  else {
    const set = DB.settings();
    $('#header').innerHTML = (set.announceOn && set.announce.trim() ? `<div class="announce ${set.announceType}"><i class="fa-solid fa-bullhorn"></i> ${esc(set.announce)}</div>` : '') + headerHtml();
    bindHeader();
  }
  const route = ROUTES.find(([re]) => re.test(path));
  if (!isBO && DB.flags().maintenance && !isStaff(DB.currentUser())) {
    app.innerHTML = `<div class="container"><div class="maint"><i class="fa-solid fa-screwdriver-wrench"></i><h1>ปิดปรับปรุงชั่วคราว</h1><p class="muted">${esc(DB.flags().maintenanceMsg)}</p><p class="small muted">ติดต่อ ${esc(DB.settings().phone)} · LINE ${esc(DB.settings().line)}</p><a href="#/admin" class="btn btn-ghost btn-sm">เข้าสู่ระบบทีมงาน</a></div></div>`;
  } else if (PORTAL) pageAdmin(app, params, path.match(/^\/admin(?:\/(\w+))?$/)?.[1]);
  else if (route) route[1](app, params, ...path.match(route[0]).slice(1));
  else app.innerHTML = '<div class="container"><div class="empty" style="margin-top:30px"><h3>ไม่พบหน้านี้</h3><a href="#/" class="btn btn-primary">กลับหน้าแรก</a></div></div>';
  $('footer')?.remove();
  if (!isBO) { document.body.insertAdjacentHTML('beforeend', footerHtml()); bindSosLinks($('footer')); }
  if (path !== lastPath) scrollTo(0, 0);
  lastPath = path;
}

window.addEventListener('hashchange', () => CACHE.loaded && render());
// โหลดข้อมูลจากฐานข้อมูลก่อนแสดงหน้าแรก
function boot() {
  $('#app').innerHTML = '<div class="container"><div class="empty" style="margin-top:60px"><i class="fa-solid fa-spinner fa-spin"></i><p class="muted">กำลังโหลดข้อมูล...</p></div></div>';
  DB.load().then(() => {
    // กลับมาจากการล็อกอินด้วย Google / Facebook: พากลับหน้าที่ลูกค้าอยู่ก่อนกดล็อกอิน + แจ้งต้อนรับ / แจ้ง error
    const qs = new URLSearchParams(location.search);
    const oauthErr = qs.get('error_description') || qs.get('error');
    let back = null;
    try { back = localStorage.getItem('sd_after_login'); localStorage.removeItem('sd_after_login'); } catch {}
    if (qs.has('code') || oauthErr) history.replaceState(null, '', location.pathname + (back && !oauthErr ? back : location.hash));
    if (back && !oauthErr && CACHE.me && (!location.hash || location.hash === '#/')) history.replaceState(null, '', location.pathname + back);
    render();
    if (oauthErr) toast(`เข้าสู่ระบบด้วยบัญชีโซเชียลไม่สำเร็จ: ${oauthErr}`, 'err');
    else if (back && CACHE.me) toast(`ยินดีต้อนรับ ${CACHE.me.name}`);
  }).catch(e => {
    console.error(e);
    $('#app').innerHTML = `<div class="container"><div class="empty" style="margin-top:60px"><i class="fa-solid fa-wifi"></i><h3>เชื่อมต่อฐานข้อมูลไม่สำเร็จ</h3><p class="muted small">${esc(e.message || String(e))}</p><button class="btn btn-primary" id="retry">ลองอีกครั้ง</button></div></div>`;
    $('#retry').onclick = boot;
  });
}
boot();
