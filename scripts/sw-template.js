/* Service worker generated at build time by vite.config.ts. Do not edit dist/sw.js directly. */

// Bump SCHEMA when the caching rules change, so every device drops its old caches on activate.
const SCHEMA = 2;
const VERSION = '__VERSION__';
const CACHE = `wassce-v${SCHEMA}-${VERSION}`;
const PRECACHE = __PRECACHE__;

/** Pages of the single-page app. Only these get index.html as a fallback. */
const APP_ROUTES = [
  /^\/$/,
  /^\/topic\/\d+\/?$/,
  /^\/mock\/?$/,
  /^\/paper2\/?$/,
  /^\/paper2\/Q\d+\/?$/i,
  /^\/progress\/?$/,
  /^\/teacher\/?$/,
];
const isAppRoute = (path) => APP_ROUTES.some((re) => re.test(path));

/** Files that may be added to the cache at runtime (built assets and icons only). */
const RUNTIME_CACHEABLE = /^\/(assets|icons)\//;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  // Delete every older cache, including ones from earlier versions that held junk entries.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const fromCache = (req) => caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true, ignoreVary: true }));
const appShell = () => caches.open(CACHE).then((c) => c.match('/', { ignoreVary: true }));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Real app pages: serve the cached app shell (works offline).
    if (isAppRoute(url.pathname)) {
      event.respondWith(appShell().then((cached) => cached || fetch(req)));
      return;
    }
    // Anything else: go to the network and never cache it. Offline, show the app (its "not found" page).
    event.respondWith(fetch(req).catch(() => appShell()));
    return;
  }

  // Precached files and assets: cache first, then network.
  event.respondWith(
    fromCache(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const type = res.headers.get('content-type') || '';
        const cacheable =
          res.ok && res.type === 'basic' && RUNTIME_CACHEABLE.test(url.pathname) && !type.includes('text/html');
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
