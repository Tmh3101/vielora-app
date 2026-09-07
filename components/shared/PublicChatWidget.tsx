"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPublicWidgetConfig } from "@/lib/helpers/widget-env";

declare global {
  interface Window {
    Vielora?: {
      init?: (botId: string, options?: { baseUrl?: string }) => void;
      show?: () => void;
      hide?: () => void;
      reset?: () => void;
      remove?: () => void;
      isInitialized?: boolean;
      q?: unknown[];
      open?: () => void;
      close?: () => void;
    };
    ChatBotAI?: {
      init?: (botId: string, options?: { baseUrl?: string }) => void;
      show?: () => void;
      hide?: () => void;
      reset?: () => void;
      remove?: () => void;
      isInitialized?: boolean;
      q?: unknown[];
    };
  }
}

const SCRIPT_ID = "vielora-public-widget-script";

/**
 * Routes where the public chat widget should NOT appear.
 * Matches dashboard, auth, onboarding, shopify, and admin paths.
 */
const PRIVATE_PATH_PATTERN = /^\/(?:vi|en)?\/?(?:dashboard|auth|onboarding|shopify|admin)(?:\/|$)/;

function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_PATH_PATTERN.test(pathname);
}

/**
 * PublicChatWidget Component
 *
 * Uses client-side route detection (usePathname) instead of server-side
 * conditional rendering. This ensures the widget correctly appears/disappears
 * during SPA navigation without requiring a full page reload.
 *
 * The widget script is loaded once and controlled via Vielora.show()/hide()/reset().
 */
export function PublicChatWidget() {
  const pathname = usePathname();
  const scriptLoadedRef = useRef(false);
  const initializedRef = useRef(false);

  // Load widget script once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const config = getPublicWidgetConfig();
    if (!config.botId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PublicChatWidget] No bot ID configured (NEXT_PUBLIC_DEMO_BOT_ID).");
      }
      return;
    }

    let scriptEl = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = SCRIPT_ID;
      scriptEl.src = config.scriptSrc;
      scriptEl.setAttribute("data-bot-id", config.botId);
      scriptEl.setAttribute("data-base-url", config.baseUrl);
      scriptEl.defer = true;
      scriptEl.onload = () => {
        scriptLoadedRef.current = true;
        // If already on a public route when script loads, init immediately
        if (!isPrivateRoute(window.location.pathname)) {
          initAndShow(config.botId, config.baseUrl);
        }
      };
      scriptEl.onerror = () => {
        console.error(`[PublicChatWidget] Failed to load widget script from: ${config.scriptSrc}`);
      };
      document.body.appendChild(scriptEl);
    } else {
      scriptLoadedRef.current = true;
    }

    // Cleanup on unmount: reset widget state so next mount gets fresh init
    return () => {
      if (window.Vielora?.reset) {
        window.Vielora.reset();
      }
      initializedRef.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, []);

  // Show/hide widget based on current route
  useEffect(() => {
    if (typeof window === "undefined") return;

    const config = getPublicWidgetConfig();
    if (!config.botId) return;

    if (isPrivateRoute(pathname)) {
      // Hide widget on private routes
      if (window.Vielora?.hide) {
        window.Vielora.hide();
      }
    } else {
      // Show widget on public routes — init if needed
      if (!initializedRef.current && scriptLoadedRef.current) {
        initAndShow(config.botId, config.baseUrl);
      } else if (window.Vielora?.show) {
        window.Vielora.show();
      }
    }
  }, [pathname]);

  return null;
}

function initAndShow(botId: string, baseUrl: string) {
  if (window.Vielora && typeof window.Vielora.init === "function") {
    window.Vielora.init(botId, { baseUrl });
  }
}
