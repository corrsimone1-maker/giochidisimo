/* Service worker di Giochi di Simo.
   Prima la rete: chi è online vede sempre l'ultima versione pubblicata.
   Senza connessione si usa l'ultima copia salvata, così i segnapunti
   funzionano anche in cantina. Non c'è un numero di versione da cambiare. */
importScripts('giochi.js');
const CACHE = 'giochidisimo';
const BASE = new URL('./', self.location).href;
const PAGINE = ['', 'giochi.js', 'manifest.webmanifest', 'comune/app.js', 'comune/app.css', 'comune/pulizia.js', 'icone/icon-192.png', 'icone/apple-touch-icon.png']
  .concat((self.GIOCHI ? self.GIOCHI.giochi : []).flatMap(g => [g.link.split('#')[0]].concat(g.extra || [])))
  .map(p => BASE + p);

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([...new Set(PAGINE)].map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(BASE)) return;   // font, librerie, server del poker: rete normale
  const url = req.url.split('#')[0];
  e.respondWith(
    fetch(url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(url, copy)); }
        return res;
      })
      .catch(() => caches.match(url, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match(BASE) : undefined)).then(hit => hit || Response.error()))
  );
});
