/* Service worker generated at build time by vite.config.ts. Do not edit dist/sw.js directly. */
const VERSION = '__VERSION__';
const CACHE = `wassce-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wassce-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Every page of the app is the same index.html (single-page app), served from the cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/', { cacheName: CACHE, ignoreVary: true }).then((cached) => cached || fetch(req)).catch(() => caches.match('/', { ignoreVary: true })),
    );
    return;
  }

  // Assets: cache first, then network (and remember anything new).
  event.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
