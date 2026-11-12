// Caches the app so it opens with no connection, but always loads the newest version when online.
const CACHE = 'sf50-cruise-20261112-182948';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

// cache:'reload' skips the browser's HTTP cache (GitHub Pages allows 10 minutes),
// so a new version never gets stored with the previous page inside it.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('sf50-cruise-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// App files: try the network first (fresh copy, 4 s limit), fall back to the saved copy offline.
// Google Fonts: saved copy first, since they never change.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (!sameOrigin && hit) return hit;
    // A page-load request can't be copied with new options, so same-origin files are fetched by URL
    const net = (sameOrigin ? fetch(e.request.url, { cache: 'no-store' }) : fetch(e.request)).then(r => {
      if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone());
      return r;
    });
    if (!hit) return net;
    const timeout = new Promise(res => setTimeout(() => res(hit), 4000));
    return Promise.race([net.catch(() => hit), timeout]);
  }));
});
