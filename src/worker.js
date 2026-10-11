// เสิร์ฟเว็บรีสอร์ทใต้เส้นทาง https://www.kohlarngo.com/hotel/ — ตัดคำนำหน้า /hotel ออกก่อนหาไฟล์ใน assets
const PREFIX = '/hotel';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + '/')) return env.ASSETS.fetch(request);
    if (url.pathname === PREFIX) { url.pathname = PREFIX + '/'; return Response.redirect(url.toString(), 301); }
    url.pathname = url.pathname.slice(PREFIX.length) || '/';
    const res = await env.ASSETS.fetch(new Request(url, request));
    const loc = res.headers.get('Location');
    if (loc && loc.startsWith('/')) { // redirect ของ assets (เช่น /privacy.html → /privacy) ต้องคง /hotel ไว้
      const h = new Headers(res.headers); h.set('Location', PREFIX + loc);
      return new Response(res.body, { status: res.status, headers: h });
    }
    return res;
  },
};
