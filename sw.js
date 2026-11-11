// Gespann-Navi: App-Hülle zwischenspeichern, damit die App immer startet, auch bei schlechtem Netz.
// Karten, Routen, Suche, Verkehr und Preise kommen immer live aus dem Netz.
const CACHE = "gespann-navi-v12";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js",
  "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === location.origin;
  const lib = url.host === "cdnjs.cloudflare.com" || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";
  if (!own && !lib) return;
  if (lib) {
    // Feste Bibliotheksversion und Schriften: aus dem Speicher, sonst einmal laden
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok || n.type === "opaque") { const c = n.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); } return n; })));
    return;
  }
  // Eigene Dateien: frisch vom Server, aber höchstens 4 Sekunden warten, dann die gespeicherte Fassung
  const key = e.request.mode === "navigate" ? "./index.html" : e.request;
  const net = fetch(url.href, {cache: "no-cache", credentials: "same-origin"}).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(key, c)); } return r; });
  e.respondWith(Promise.race([net, timeout(4000)]).catch(() => caches.match(key).then(r => r || net)));
});
