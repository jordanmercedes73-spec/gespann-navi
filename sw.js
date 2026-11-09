// Gespann-Navi: App-Hülle für Start ohne Netz zwischenspeichern.
// Karten, Routen, Suche und Verkehr kommen immer live aus dem Netz.
const CACHE = "gespann-navi-v8";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js",
  "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === location.origin, lib = url.host === "cdnjs.cloudflare.com";
  if (!own && !lib) return;
  // Eigene Dateien immer frisch vom Server holen (am Browser-Zwischenspeicher vorbei),
  // nur ohne Netz die gespeicherte Fassung nehmen.
  const req = own ? fetch(url.href, {cache: "no-cache", credentials: "same-origin"}) : fetch(e.request);
  e.respondWith(req.then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(own && e.request.mode === "navigate" ? "./index.html" : e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
