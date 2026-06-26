const CACHE_NAME = "jadhor-cache-v2";
const PRECACHE_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
];

// Install: precache offline fallback and skip waiting to activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener for skipWaiting and self-destruction (kill-switch)
self.addEventListener("message", (event) => {
  if (event.data) {
    if (event.data.action === "skipWaiting") {
      self.skipWaiting();
    }
    if (event.data.action === "kill") {
      console.warn("[Service Worker] Kill switch activated. Unregistering self...");
      self.registration.unregister()
        .then((success) => {
          if (success) {
            console.log("[Service Worker] Unregistered successfully.");
            // Clear all caches
            return caches.keys();
          }
        })
        .then((keys) => {
          if (keys) {
            return Promise.all(keys.map(key => caches.delete(key)));
          }
        })
        .then(() => {
          // Notify clients to reload
          return self.clients.matchAll();
        })
        .then((clients) => {
          if (clients) {
            clients.forEach(client => client.navigate(client.url));
          }
        });
    }
  }
});

// Fetch handler: Selective caching
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. Exclude dynamic / api routes, auth pages, and login endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    event.request.method !== "GET"
  ) {
    // Network only / Network first
    return;
  }

  // 2. Navigation requests: Network-first, with offline HTML page fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match("/offline.html");
        })
    );
    return;
  }

  // 3. Static assets: Cache-first
  // Match Next.js static files, fonts, and local images/assets
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          // Cache the cloned response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Return cached offline or nothing
          return caches.match("/offline.html");
        });
      })
    );
  }
});
