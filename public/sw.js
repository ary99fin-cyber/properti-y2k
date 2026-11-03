// Service worker Properti Y2K — sengaja minimal & aman.
// Hanya cache aset statis (/_next/static, ikon, font). Data Supabase, /api, dan /admin TIDAK pernah di-cache.
const V = 'y2k-v1', STATIC = V + '-static';
const OFFLINE = '/offline.html';
self.addEventListener('install', e => { e.waitUntil(caches.open(STATIC).then(c => c.addAll([OFFLINE, '/icons/icon-192.png']))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // lintas-origin (Supabase, foto) dibiarkan
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match(OFFLINE))); return; }  // selalu data terbaru
  if (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/')) {
    e.respondWith(caches.open(STATIC).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }));
  }
});
