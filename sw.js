// Delicate Skin & Care — Service Worker (offline-first app shell)

// Bump this on every deploy that changes index.html or anything in APP_SHELL below —
// returning visitors' browsers keep serving the OLD cached copy via cache-first
// until this string changes (that's what makes the browser treat sw.js as updated).
const CACHE_VERSION = 'dsc-v6';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './delicate-skin-and-care_assets/hero-facial.jpg',
  './delicate-skin-and-care_assets/spa-party.jpg',
  './delicate-skin-and-care_assets/services-bg.jpg',
];

// Install: cache the app shell and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(APP_SHELL).catch(err => {
        console.error('[DSC SW] Precache failed:', err);
      });
      await self.skipWaiting();
    })()
  );
});

// Activate: clean stale caches, claim all tabs
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
//   Non-GET (e.g. POST /api/analyze-skin) → never intercept, always hit the network
//   /api/ routes → never intercept, always hit the network (live data, not cacheable)
//   Everything else → cache-first with background revalidation, offline fallback for navigations
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(cacheFirstWithNetwork(request));
});

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then(async res => {
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, res);
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(request);
    if (res.ok && res.status < 400 && res.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./offline.html');
      return fallback || new Response('<h1>Delicate Skin & Care is offline</h1>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('', { status: 408 });
  }
}

// Silent auto-update: a waiting SW activates immediately on SKIP_WAITING
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
