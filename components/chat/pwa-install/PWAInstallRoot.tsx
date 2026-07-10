"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PWAInstallContext, type PWAInstallContextValue } from "@/providers/PWAInstallProvider";
import {
  isStandaloneMode,
  isIOS,
  isAndroid,
  getIOSBrowser,
  getAndroidBrowser,
} from "@/lib/helpers/pwa-helpers";
import { EAndroidBrowser, EIOSBrowser } from "@/types/enums";
import { toast } from "@/components/ui/sonner";
import { PWAInstallIOSSheet } from "./PWAInstallIOSSheet";
import { PWAInstallAndroidSheet } from "./PWAInstallAndroidSheet";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export interface PWAInstallRootProps {
  appName: string;
  primaryColor: string;
  headerForeground: string;
  children: ReactNode;
}

export function PWAInstallRoot({
  appName,
  primaryColor,
  headerForeground,
  children,
}: PWAInstallRootProps) {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [isIOSSheetOpen, setIsIOSSheetOpen] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<EIOSBrowser>(EIOSBrowser.Safari);
  const [isAndroidSheetOpen, setIsAndroidSheetOpen] = useState(false);
  const [androidBrowser, setAndroidBrowser] = useState<EAndroidBrowser>(EAndroidBrowser.Chrome);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsHydrated(true);
      return;
    }

    setIsHydrated(true);
    setIsVisible(isAndroid() || isIOS());

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      deferredPromptRef.current = event;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS()) {
      setIosBrowser(getIOSBrowser() ?? EIOSBrowser.Other);
      setIsIOSSheetOpen(true);
      return;
    }

    if (isAndroid()) {
      const deferredPrompt = deferredPromptRef.current;
      if (deferredPrompt) {
        try {
          await deferredPrompt.prompt();
          await deferredPrompt.userChoice;
        } catch {
          toast.error("Không thể mở hộp thoại cài đặt. Vui lòng thử lại sau.");
        } finally {
          deferredPromptRef.current = null;
        }
        return;
      }

      setAndroidBrowser(getAndroidBrowser() ?? EAndroidBrowser.Other);
      setIsAndroidSheetOpen(true);
      return;
    }

    toast("Trình duyệt của bạn chưa hỗ trợ cài đặt ứng dụng.");
  }, []);

  const contextValue: PWAInstallContextValue = {
    appName,
    isVisible: isHydrated && isVisible,
    primaryColor,
    headerForeground,
    handleInstallClick,
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      {children}
      <PWAInstallIOSSheet
        appName={appName}
        browser={iosBrowser}
        open={isIOSSheetOpen}
        onClose={() => setIsIOSSheetOpen(false)}
      />
      <PWAInstallAndroidSheet
        appName={appName}
        browser={androidBrowser}
        open={isAndroidSheetOpen}
        onClose={() => setIsAndroidSheetOpen(false)}
      />
    </PWAInstallContext.Provider>
  );
}
