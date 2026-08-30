/**
 * Helper utility to determine public chatbot widget configuration.
 * Uses a unified configuration that automatically adapts to the current origin (localhost, staging, or production).
 */

export interface PublicWidgetConfig {
  scriptSrc: string;
  baseUrl: string;
  botId: string;
}

/**
 * Returns the public widget configuration.
 * Automatically resolves baseUrl from current window origin or NEXT_PUBLIC_APP_URL.
 */
export function getPublicWidgetConfig(): PublicWidgetConfig {
  // Determine base URL dynamically from browser origin or environment variable
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (typeof window !== "undefined" && window.location?.origin) {
    baseUrl = window.location.origin;
  }

  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const scriptSrc = `${cleanBaseUrl}/widget.js`;
  const botId = process.env.NEXT_PUBLIC_DEMO_BOT_ID || "vielora_demo_bot_id";

  return {
    scriptSrc,
    baseUrl: cleanBaseUrl,
    botId,
  };
}
