"use client";

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

import { useCallback, useEffect } from "react";

const DB_NAME = "vielora-pwa";
const DB_VERSION = 1;
const STORE_NAME = "pending-messages";

interface PendingMessage {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addPendingMessage(msg: Omit<PendingMessage, "id" | "createdAt">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...msg, createdAt: Date.now() });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function registerSync(): Promise<void> {
  if ("sync" in navigator.serviceWorker) {
    try {
      const registration = (await navigator.serviceWorker
        .ready) as ServiceWorkerRegistrationWithSync;
      await registration.sync.register("sync-messages");
    } catch {
      // Background Sync không supported — silent ignore
    }
  }
}

export function useOfflineMessageQueue() {
  useEffect(() => {
    const handleOnline = () => {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SYNC_MESSAGES" });
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const queueMessage = useCallback(
    async (url: string, headers: Record<string, string>, body: string) => {
      await addPendingMessage({ url, method: "POST", headers, body });
      await registerSync();
    },
    []
  );

  return { queueMessage };
}
