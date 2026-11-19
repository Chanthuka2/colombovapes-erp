// Offline cache for the app shell. Bump VERSION on every deploy.
const VERSION = 'cv-erp-v1.1.1';
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'db.js', 'config.js', 'seed.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const EXTRA = [FB + 'firebase-app.js', FB + 'firebase-firestore.js', FB + 'firebase-auth.js', 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(EXTRA.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
// App files: network first (always newest code), falls back to cache when offline or slow.
// Firebase / barcode libraries are versioned, so they are served cache-first.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const lib = u.href.startsWith('https://www.gstatic.com/firebasejs/') || u.hostname === 'cdn.jsdelivr.net';
  if (!lib && u.origin !== location.origin) return; // Firestore / Auth calls are never touched
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request, { ignoreSearch: !lib });
    if (lib && hit) return hit;
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    try {
      return await (hit ? Promise.race([net, new Promise((_, rej) => setTimeout(() => rej('slow'), 2500))]) : net);
    } catch (err) {
      return hit || (e.request.mode === 'navigate' ? await c.match('index.html') : Response.error());
    }
  })());
});
