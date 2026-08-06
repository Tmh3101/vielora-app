const DB_NAME = "vielora-pwa";
const DB_VERSION = 1;
const STORE_NAME = "pending-messages";

function openMessageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function processPendingMessages() {
  try {
    const db = await openMessageDB();
    const messages = await getAllPending(db);

    for (const msg of messages) {
      try {
        const response = await fetch(msg.url, {
          method: msg.method,
          headers: msg.headers,
          body: msg.body,
        });
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
          await deletePending(db, msg.id);
        }
      } catch {
        // Retry next sync
      }
    }

    db.close();
  } catch {
    // IndexedDB unavailable
  }
}

const CACHE_VERSION = "vielora-public-bot-v2";
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000; // 1 ngày
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
            .filter(
              (cacheName) =>
                cacheName !== CORE_CACHE && cacheName !== RUNTIME_CACHE && cacheName !== IMAGE_CACHE
            )
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

  if (url.pathname.startsWith("/api/") && !url.pathname.includes("/manifest")) {
    return false;
  }

  return true;
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isImageRequest(request) {
  const url = new URL(request.url);
  const ext = url.pathname.split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);
}

async function cacheFirstWithTTL(request, cacheName, ttlMs) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get("date") || 0).getTime();
    const age = Date.now() - cachedDate;

    if (age < ttlMs) {
      return cachedResponse;
    }

    await cache.delete(request);
  }

  try {
    const response = await fetch(request);
    if (response.ok && shouldCacheRequest(request)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cachedResponse) return cachedResponse;
    throw error;
  }
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

  if (isImageRequest(event.request)) {
    event.respondWith(cacheFirstWithTTL(event.request, IMAGE_CACHE, IMAGE_TTL_MS));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(processPendingMessages());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_MESSAGES") {
    event.waitUntil(processPendingMessages());
  }
});
