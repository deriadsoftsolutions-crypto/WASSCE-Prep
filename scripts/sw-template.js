/* Service worker generated at build time by vite.config.ts. Do not edit dist/sw.js directly. */

// Bump SCHEMA when the caching rules change, so every device drops its old caches on activate.
const SCHEMA = 5;
const VERSION = '__VERSION__';
const CACHE = `wassce-v${SCHEMA}-${VERSION}`;
const PRECACHE = __PRECACHE__;

/** Pages of the single-page app. Only these get index.html as a fallback. */
const APP_ROUTES = [
  /^\/$/,
  /^\/topic\/\d+\/?$/,
  /^\/topic\/\d+\/[a-z0-9-]+\/?$/,
  /^\/mock\/?$/,
  /^\/paper2\/?$/,
  /^\/paper2\/Q\d+\/?$/i,
  /^\/progress\/?$/,
  /^\/learn\/?$/,
  /^\/learn\/[A-Za-z0-9_-]+\/?$/,
  /^\/wassce\/?$/,
  /^\/portfolio\/?$/,
  /^\/portfolio\/print(\/[A-Za-z0-9_-]+)?\/?$/,
  /^\/assignments\/?$/,
  /^\/assignments\/[A-Za-z0-9_-]+\/?$/,
  /^\/tests\/[A-Za-z0-9_-]+\/?$/,
  /^\/lessons\/[A-Za-z0-9_-]+\/?$/,
  /^\/teacher\/?$/,
];
const isAppRoute = (path) => APP_ROUTES.some((re) => re.test(path));

/** Worth keeping offline: a real, complete file that is not a video and not huge. */
const MAX_KEEP = 30 * 1024 * 1024;
function keepable(res) {
  const type = res.headers.get('content-type') || '';
  const size = Number(res.headers.get('content-length') || 0);
  return res.ok && res.status === 200 && res.type === 'basic' && !type.startsWith('video/') && size <= MAX_KEEP;
}

/** Files that may be added to the cache at runtime (built assets and icons only). */
// Lesson images never change at the same address, so they can be kept for offline reading.
const RUNTIME_CACHEABLE = /^\/(assets|icons|api\/lesson-file)\//;

/**
 * Fill the new cache. Files under /assets/ have a fingerprint in their name, so if an older
 * cache already holds the same name it is the same file: copy it instead of downloading it
 * again. After an update, tablets only download what actually changed (saves mobile data).
 */
async function precache() {
  const cache = await caches.open(CACHE);
  const oldNames = (await caches.keys()).filter((k) => k !== CACHE && k.startsWith('wassce-'));
  const olds = await Promise.all(oldNames.map((k) => caches.open(k)));
  await Promise.all(PRECACHE.map(async (url) => {
    if (url.startsWith('/assets/')) {
      for (const old of olds) {
        const hit = await old.match(url);
        if (hit) { await cache.put(url, hit); return; }
      }
    }
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error(`Could not cache ${url}`);
    await cache.put(url, res);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
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

  // Notes and lesson images: keep a copy once opened, so they can be read again offline.
  // (A PDF opened in a new tab arrives as a navigation, so this comes before the page rules.)
  if (url.pathname.startsWith('/api/lesson-file/') && !req.headers.has('range')) {
    event.respondWith(fromCache(req).then((cached) => cached || fetch(req).then((res) => {
      if (keepable(res)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

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
        const cacheable = RUNTIME_CACHEABLE.test(url.pathname) && !type.includes('text/html') && keepable(res);
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }),
  );
});
