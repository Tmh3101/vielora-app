"use client";

import { useState, useCallback, useEffect } from "react";
import { isStandaloneMode, isIOS } from "@/lib/helpers/pwa-helpers";

const PWA_VERSION_KEY = "vielora_pwa_version";

function computeShowPrompt(serverPwaVersion: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isIOS() || !isStandaloneMode()) return false;

  try {
    const localVersion = localStorage.getItem(PWA_VERSION_KEY);
    if (!localVersion) {
      localStorage.setItem(PWA_VERSION_KEY, serverPwaVersion);
      return false;
    }
    return localVersion !== serverPwaVersion;
  } catch {
    return false;
  }
}

export function useIOSPWAUpdatePrompt(serverPwaVersion: string) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    setShowPrompt(computeShowPrompt(serverPwaVersion));
  }, [serverPwaVersion]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(PWA_VERSION_KEY, serverPwaVersion);
    } catch {
      // silent
    }
    setShowPrompt(false);
  }, [serverPwaVersion]);

  return { showPrompt, handleDismiss };
}
