"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PWAInstallContext, type PWAInstallContextValue } from "@/providers/PWAInstallProvider";
import { BANNER_DISMISSED_KEY } from "@/lib/constants";
import {
  isStandaloneMode,
  isIOS,
  getIOSBrowser,
  isAndroidChromium,
} from "@/lib/helpers/pwa-helpers";
import { EIOSBrowser } from "@/types/enums";
import { Toaster, toast } from "sonner";
import { PWAInstallIOSSheet } from "./PWAInstallIOSSheet";

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
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [iosBrowser, setIosBrowser] = useState<EIOSBrowser>(EIOSBrowser.Safari);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsVisible(false);
      setIsBannerVisible(false);
      setIsHydrated(true);
      return;
    }

    const bannerDismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
    setIsVisible(true);
    setIsBannerVisible(!bannerDismissed);
    setIsHydrated(true);

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      deferredPromptRef.current = event;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setIsBannerVisible(false);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS()) {
      const browser = getIOSBrowser() ?? EIOSBrowser.Other;
      setIosBrowser(browser);
      setIsSheetOpen(true);
      return;
    }

    const deferredPrompt = deferredPromptRef.current;
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        toast("Không thể mở hộp thoại cài đặt. Vui lòng thử lại sau.");
      } finally {
        deferredPromptRef.current = null;
      }
      return;
    }

    if (isAndroidChromium()) {
      toast("Hãy mở menu trình duyệt và chọn Cài đặt ứng dụng hoặc Thêm vào màn hình chính.");
      return;
    }

    toast("Trình duyệt của bạn chưa hỗ trợ cài đặt ứng dụng trực tiếp.");
  }, []);

  const contextValue: PWAInstallContextValue = {
    appName,
    isVisible: isHydrated && isVisible,
    isBannerVisible: isHydrated && isVisible && isBannerVisible,
    primaryColor,
    headerForeground,
    dismissBanner,
    handleInstallClick,
  };

  return (
    <PWAInstallContext.Provider value={contextValue}>
      <Toaster position="top-center" richColors />
      {children}
      {isHydrated && isVisible && (
        <PWAInstallIOSSheet
          appName={appName}
          browser={iosBrowser}
          open={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </PWAInstallContext.Provider>
  );
}
