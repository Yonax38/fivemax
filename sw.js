// Service worker : rend Fivemax installable et jouable hors connexion sur Android/navigateur.
const CACHE = 'fivemax-v1';
const ASSETS = [
  './', './index.html', './style.css', './manifest.json',
  './js/data.js', './js/audio.js', './js/characters.js', './js/game3d.js', './js/world.js', './js/game.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
