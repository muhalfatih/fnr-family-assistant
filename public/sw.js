// F&R Family Hub — Service Worker (PWA)
const CACHE_NAME = "fnr-family-v1";

const STATIC_ASSETS = [
  "/",
  "/favicon.ico",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/fonts/Geist-Variable.woff2",
  "/fonts/GeistMono-Variable.woff2",
];

// Install: Pre-cache critical static shell & fonts
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Pre-cache partial fail:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous cache versions & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategy dispatch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external origins
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never cache dynamic API routes, Telegram webhooks, or authentication endpoints
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Static Assets (fonts, images, manifest, static css/js): Cache-first with network fallback
  if (
    url.pathname.startsWith("/fonts/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2|webp)$/) ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navigation requests (HTML pages): Network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to cached home page if available
          const homeFallback = await caches.match("/");
          if (homeFallback) {
            return homeFallback;
          }
          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Offline — F&R Family Hub</title></head><body style='font-family:sans-serif;text-align:center;padding:40px;background:#09090b;color:#f4f4f5;'><h2>Mode Offline</h2><p>Perangkat Anda sedang tidak terhubung ke internet.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        })
    );
    return;
  }
});
