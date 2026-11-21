const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/icons/icon.svg', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('agenda-v2').then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== 'agenda-v2').map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/') || e.request.method !== 'GET') return // API selalu network
  // network-first: kode terbaru selalu menang; cache hanya fallback offline
  e.respondWith(
    fetch(e.request).then((res) => {
      const cp = res.clone()
      caches.open('agenda-v2').then((c) => c.put(e.request, cp))
      return res
    }).catch(() => caches.match(e.request).then((h) => h || caches.match('/index.html')))
  )
})
self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data.json() } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Agenda Direksi', {
    body: d.body || '',
    icon: '/icons/icon.svg',
    data: { url: d.url || '/' },
    vibrate: [100, 50, 100],
  }))
})
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'))
})
