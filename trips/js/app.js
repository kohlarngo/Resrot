// ================= Router =================
const ROUTES = [
  [/^\/$/, pageHome], [/^\/search$/, pageSearch], [/^\/c\/(boat|car|stay)$/, pageCategory], [/^\/trip\/([^/]+)$/, pageTrip], [/^\/book$/, pageBook],
  [/^\/booking\/(\w+)$/, pageBookingView], [/^\/my-bookings$/, pageMyBookings], [/^\/favorites$/, pageFavorites],
  [/^\/profile$/, pageProfile], [/^\/help$/, pageHelp], [/^\/terms$/, pageTerms],
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
  closeModal();
  const isBO = !!PORTAL, app = $('#app');
  document.body.classList.toggle('bo', isBO);
  document.body.classList.remove('home2'); // pageHome ใส่กลับเอง
  if (isBO) {
    $('#header').innerHTML = '';
    if (!path.startsWith('/admin')) return go('/admin', true);
    pageBackoffice(app, params, path.match(/^\/admin(?:\/(\w+))?$/)?.[1]);
    lastPath = path; return;
  }
  const set = DB.settings();
  $('#header').innerHTML = (set.announceOn && set.announce.trim() ? `<div class="announce ${esc(set.announceType)}"><i class="fa-solid fa-bullhorn"></i> ${esc(set.announce)}</div>` : '') + headerHtml();
  bindHeader();
  const route = ROUTES.find(([re]) => re.test(path));
  if (DB.flags().maintenance && !isStaff(DB.currentUser())) {
    app.innerHTML = `<div class="container"><div class="maint"><i class="fa-solid fa-screwdriver-wrench"></i><h1>${T('ปิดปรับปรุงชั่วคราว')}</h1><p class="muted">${esc(DB.flags().maintenanceMsg)}</p></div></div>`;
  } else if (route) route[1](app, params, ...path.match(route[0]).slice(1));
  else notFound(app);
  $('footer')?.remove();
  document.body.insertAdjacentHTML('beforeend', footerHtml()); bindSosLinks($('footer'));
  showSideAds();
  if (path !== lastPath) scrollTo(0, 0);
  lastPath = path;
}
window.addEventListener('hashchange', () => CACHE.loaded && render());
function boot() {
  $('#app').innerHTML = `<div class="container"><div class="empty" style="margin-top:60px"><i class="fa-solid fa-spinner fa-spin"></i><p class="muted">${T('กำลังโหลดข้อมูล...')}</p></div></div>`;
  document.documentElement.lang = LANG;
  DB.load().then(() => {
    const qs = new URLSearchParams(location.search), back = LS.get('after_login', null);
    if (qs.has('code') || qs.get('error')) history.replaceState(null, '', location.pathname + (back || location.hash)); // กลับจาก Google/Facebook
    if (back) { LS.del('after_login'); if (CACHE.me && (!location.hash || location.hash === '#/')) history.replaceState(null, '', location.pathname + back); }
    render();
    if (qs.get('error_description')) toast(qs.get('error_description'), 'err');
    if (PORTAL) startBackofficePolling();
  }).catch(e => {
    console.error(e);
    $('#app').innerHTML = `<div class="container"><div class="empty" style="margin-top:60px"><i class="fa-solid fa-wifi"></i><h3>เชื่อมต่อฐานข้อมูลไม่สำเร็จ</h3><p class="muted small">${esc(e.message || String(e))}</p><p class="small muted">ตรวจว่ารัน supabase/migrations/0001_tourgo_core.sql แล้ว และใส่ค่าใน js/config.js ถูกต้อง</p><button class="btn btn-primary" id="retry">${T('ลองอีกครั้ง')}</button></div></div>`;
    $('#retry').onclick = boot;
  });
}
boot();
