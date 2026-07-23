const CACHE = 'crpg-v1.2';
const SHELL = ['./', './index.html', './manifest.json', './css/style.css',
  './js/db.js','./js/scryfall.js','./js/bonuses-data.js','./js/xp-engine.js','./js/app.js',
  './icons/icon-192.png','./icons/icon-512.png','./icons/icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Scryfall et toutes API externes → réseau uniquement, jamais en cache
  if (url.hostname !== location.hostname) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('[]', {headers:{'Content-Type':'application/json'}})));
    return;
  }
  // App shell → cache-first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
