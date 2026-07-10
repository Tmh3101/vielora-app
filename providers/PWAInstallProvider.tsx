"use client";

import { createContext, useContext } from "react";

export interface PWAInstallContextValue {
  appName: string;
  isVisible: boolean;
  primaryColor: string;
  headerForeground: string;
  handleInstallClick: () => void;
}

export const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

export function usePWAInstall(): PWAInstallContextValue {
  const context = useContext(PWAInstallContext);
  if (!context) {
    throw new Error("PWA install components must be used within PWAInstallRoot");
  }
  return context;
}
