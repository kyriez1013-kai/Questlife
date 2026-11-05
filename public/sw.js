/* QuestLife offline shell. Registered only by the production web build (never under the dev server).
   Navigation: network first, cached shell when offline. Hashed static files: cache first.
   Nothing cross-origin (sync / AI endpoints) is ever cached. */
const CACHE = 'questlife-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) throw new Error('Offline shell unavailable');
    const html = await response.clone().text();
    // Expo's generated HTML lists the hashed entry script and styles. Cache only
    // those boot assets, not lazy example datasets or authenticated API responses.
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(match => new URL(match[1], self.location.origin))
      .filter(url => url.origin === self.location.origin && url.pathname.startsWith('/_expo/static/') && /\.(js|css)$/.test(url.pathname))
      .map(url => url.pathname);
    if (!assets.some(url => url.endsWith('.js'))) throw new Error('Offline entry script missing');
    const cache = await caches.open(CACHE);
    await cache.addAll([...new Set([...SHELL.slice(1), ...assets])]);
    await cache.put('/', response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('questlife-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return caches.match('/').then(hit => hit || response);
          if ((response.headers.get('content-type') || '').includes('text/html')) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
