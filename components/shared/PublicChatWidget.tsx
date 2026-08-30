"use client";

import { useEffect, useRef } from "react";
import { getPublicWidgetConfig } from "@/lib/helpers/widget-env";

declare global {
  interface Window {
    Vielora?: {
      init?: (botId: string, options?: { baseUrl?: string }) => void;
      isInitialized?: boolean;
      q?: unknown[];
      open?: () => void;
      close?: () => void;
    };
    ChatBotAI?: {
      init?: (botId: string, options?: { baseUrl?: string }) => void;
      isInitialized?: boolean;
      q?: unknown[];
    };
  }
}

const SCRIPT_ID = "vielora-public-widget-script";
const WIDGET_CONTAINER_ID = "chatbotai-widget";

/**
 * PublicChatWidget Component
 * Dynamically embeds the Vielora chatbot widget specifically on public pages.
 * Automatically resolves staging/localhost vs production script and credentials.
 */
export function PublicChatWidget() {
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const config = getPublicWidgetConfig();

    if (!config.botId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PublicChatWidget] No bot ID configured (NEXT_PUBLIC_DEMO_BOT_ID).");
      }
      return;
    }

    // Function to initialize widget via window.Vielora if already loaded
    const initWidget = () => {
      if (window.Vielora && typeof window.Vielora.init === "function") {
        window.Vielora.init(config.botId, { baseUrl: config.baseUrl });
      }
    };

    // Check if script element already exists
    let scriptEl = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = SCRIPT_ID;
      scriptEl.src = config.scriptSrc;
      scriptEl.setAttribute("data-bot-id", config.botId);
      scriptEl.setAttribute("data-base-url", config.baseUrl);
      scriptEl.defer = true;
      scriptEl.onload = () => {
        isLoadedRef.current = true;
        initWidget();
      };
      scriptEl.onerror = () => {
        console.error(`[PublicChatWidget] Failed to load widget script from: ${config.scriptSrc}`);
      };
      document.body.appendChild(scriptEl);
    } else {
      // Script already exists in DOM, initialize or re-open
      initWidget();
    }

    // Cleanup when navigating away from public pages (e.g. navigating to /dashboard or /auth)
    return () => {
      // Remove widget DOM container so it does not persist into private views
      const widgetContainer = document.getElementById(WIDGET_CONTAINER_ID);
      if (widgetContainer) {
        widgetContainer.remove();
      }

      // Reset initialized flag on global object if present
      if (window.Vielora) {
        window.Vielora.isInitialized = false;
      }
      if (window.ChatBotAI) {
        window.ChatBotAI.isInitialized = false;
      }
    };
  }, []);

  return null;
}
