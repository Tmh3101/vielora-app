"use client";

import { useSyncExternalStore } from "react";

function getOnlineStatus(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getServerSnapshot(): boolean {
  return true;
}

export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribeToOnlineStatus, getOnlineStatus, getServerSnapshot);
}
