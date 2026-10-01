// Service worker — PDJ & Hygiène AABD
// Changer CACHE à chaque publication pour forcer la mise à jour des fichiers.
// Le stockage de cache est partagé par TOUTE l'origine pdj-aabd.github.io, qui héberge
// aussi l'app Terrain (/terrain-aabd/). On ne supprime donc que NOS propres caches :
// un filtre aveugle effacerait le cache hors ligne de l'autre app.
const PREFIXE = 'aabd-pdj-';
const CACHE = PREFIXE + 'v1.1.3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache:'reload' : on télécharge les fichiers neufs, pas ceux gardés en mémoire par le navigateur
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIXE) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // les envois vers le relais Apps Script ne passent jamais par le cache
  const url = new URL(req.url);
  // Générateur de QR code (cdnjs) : gardé en cache après le 1er usage
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
    // cache:'no-cache' : on ignore la mémoire du navigateur (GitHub Pages la garde 10 min) pour voir la nouvelle version tout de suite.
    e.respondWith(fetch(req, { cache: 'no-cache' })
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
