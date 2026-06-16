"use client";

import { createContext, useContext } from "react";

export interface PWAInstallContextValue {
  appName: string;
  isVisible: boolean;
  isBannerVisible: boolean;
  primaryColor: string;
  headerForeground: string;
  dismissBanner: () => void;
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
