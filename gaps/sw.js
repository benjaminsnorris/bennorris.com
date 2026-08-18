/* Service worker.
   Cache-first, because the bathroom and the dog walk are exactly where signal
   is worst. Bump VERSION on every deploy - old caches are dropped on activate.
   Add new module and data files to ASSETS when you add a module.
*/

const VERSION = "gaps-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
  "./shell/shell.js",
  "./shell/store.js",
  "./modules/ask.js",
  "./modules/memorize.js",
  "./modules/chess.js",
  "./vendor/chess.js",
  "./data/ask-decks.json",
  "./data/memorize-seeds.json",
  "./data/chess-motifs.json",
  "./data/chess-puzzles.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if(url.origin !== location.origin) return;      // let fonts and CDNs go to network

  e.respondWith(
    caches.match(e.request).then(hit => {
      if(hit){
        // Refresh in the background so the next open is current.
        fetch(e.request)
          .then(res => res.ok && caches.open(VERSION).then(c => c.put(e.request, res.clone())))
          .catch(() => {});
        return hit;
      }
      return fetch(e.request)
        .then(res => {
          if(res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
