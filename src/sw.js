// Service worker: salva i file del gioco nel dispositivo, così funziona anche offline.
// Se aggiungi o rinomini file, aggiorna l'elenco e aumenta il numero di versione.
const CACHE = 'scacchi-v3';

const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/chess.js',
  'js/ai.js',
  'js/lessons.js',
  'js/app.js',
  'js/worker.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];
for (const c of 'wb') for (const p of 'KQRBNP') FILES.push(`pieces/${c}${p}.svg`);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Cancella le versioni vecchie
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Prima la rete (così vedi sempre l'ultima versione) e aggiorna la copia salvata;
  // se sei offline usa la copia salvata.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
