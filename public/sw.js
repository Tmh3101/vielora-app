const CACHE_VERSION = "vielora-public-bot-v1";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_PAGE = "/offline.html";
const CORE_ASSETS = [
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/images/logo-icon.png",
  OFFLINE_PAGE,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("vielora-public-bot-"))
            .filter((cacheName) => cacheName !== CORE_CACHE && cacheName !== RUNTIME_CACHE)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldHandleRequest(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  return url.protocol === "http:" || url.protocol === "https:";
}

function shouldCacheRequest(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/api/")) {
    return false;
  }

  return true;
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok && shouldCacheRequest(request)) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (isNavigationRequest(request)) {
      const offlineResponse = await caches.match(OFFLINE_PAGE);
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandleRequest(event.request)) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});
