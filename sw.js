/**
 * sw.js — Service Worker de Commander RPG
 * ----------------------------------------------------------------------
 * Stratégie :
 *  - App shell (HTML/CSS/JS/icônes) : cache-first, pour un lancement
 *    instantané et un fonctionnement hors-ligne complet de l'app.
 *  - Requêtes vers l'API Scryfall : network-first (les données doivent
 *    être à jour), sans mise en cache — la recherche de Commander
 *    nécessite une connexion.
 * ----------------------------------------------------------------------
 */

const CACHE_NAME = 'commander-rpg-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/db.js',
  './js/scryfall.js',
  './js/bonuses-data.js',
  './js/xp-engine.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels à l'API Scryfall : réseau uniquement
  if (url.hostname.includes('scryfall.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('[]', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // App shell : cache-first avec repli réseau
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
