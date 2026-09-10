const CACHE_NAME = "my-application-v0.4.4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./hobby.js",
  "./research-bridge.js",
  "./manifest.webmanifest",
  "./assets/icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))) )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (requestUrl.pathname.endsWith("/config.js")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (
    requestUrl.pathname.endsWith("/sw.js") ||
    event.request.mode === "navigate" ||
    requestUrl.pathname.endsWith("/index.html") ||
    requestUrl.pathname.endsWith("/styles.css") ||
    requestUrl.pathname.endsWith("/app.js") ||
    requestUrl.pathname.endsWith("/hobby.js") ||
    requestUrl.pathname.endsWith("/research-bridge.js")
  ) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
