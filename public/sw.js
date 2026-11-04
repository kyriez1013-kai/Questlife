/* QuestLife offline shell. Registered only by the production web build (never under the dev server).
   Navigation: network first, cached shell when offline. Hashed static files: cache first.
   Nothing cross-origin (sync / AI endpoints) is ever cached. */
const CACHE = 'questlife-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

const usableShell = response => response?.ok
  && !response.redirected
  && response.headers.get('content-type')?.includes('text/html');

async function offlineShell() {
  try {
    const saved = await (await caches.open(CACHE)).match('/');
    if (usableShell(saved)) return saved;
  } catch {
    // Private browsing or storage eviction must still produce a usable response.
  }
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QuestLife</title><body><main><h1>QuestLife</h1><p>Connect to the internet to open the app, then try again.</p><p lang="zh">暂时无法连接。请恢复网络后重试，你的数据没有被清除。</p><a href="/">Retry / 重试</a></main></body></html>', {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('questlife-shell-') && key !== CACHE).map((key) => caches.delete(key))))
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
          if (!response.ok) return offlineShell();
          if (usableShell(response)) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put('/', copy)).catch(() => {}));
          }
          return response;
        })
        .catch(offlineShell),
    );
    return;
  }

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match(request)).catch(() => undefined).then((hit) => hit || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      })),
    );
  }
});
