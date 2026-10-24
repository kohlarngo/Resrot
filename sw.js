// Service worker ของหน้าเจ้าของรีสอร์ท — ใช้รับ Web Push (แจ้งเตือนการจอง) เท่านั้น ไม่แคชหน้าเว็บ
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'kohlarngo', {
    body: d.body || '', tag: d.tag, renotify: !!d.tag, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', data: { url: d.url || 'owner.html' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'owner.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => x.url.startsWith(new URL('owner.html', self.registration.scope).href));
    return c ? c.focus().then(() => c.navigate(url)) : self.clients.openWindow(url);
  }));
});
