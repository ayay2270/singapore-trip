'use strict';
// Bump this version whenever the saved itinerary/app shell changes.
const CACHE_PREFIX = 'sg-travel-shell-';
const CACHE = CACHE_PREFIX + '2026-10-05-v1';
const SHELL = ['index.html', 'travel-companion.css', 'travel-companion.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const urls = SHELL.map(file => new URL(file, self.registration.scope).href);
self.addEventListener('install', event => {
  // All-or-nothing install. A failed download leaves the existing worker intact.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls.map(url => new Request(url, { cache: 'reload' })))));
  // No skipWaiting: an open guide keeps its current version until the next visit.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const shellURL = new URL('index.html', self.registration.scope);
  const isGuide = request.mode === 'navigate' && (url.pathname === shellURL.pathname || url.pathname === new URL(self.registration.scope).pathname);
  const key = isGuide ? shellURL.href : url.href;
  // Never cache external fonts, map tiles, Google Maps, or arbitrary documents.
  if (!isGuide && !urls.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(request, { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok || response.type === 'opaque') throw new Error('Unavailable app shell');
      await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(key);
      return saved || new Response('旅行指南尚未儲存，請連線後再開啟。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } finally { clearTimeout(timer); }
  })());
});
