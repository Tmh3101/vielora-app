"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Provider for Shopify App Bridge v4.
 * In v4, App Bridge is initialized via a script tag in the document head
 * and configuration is provided via meta tags.
 */
export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const host = searchParams.get("host");

  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID || "";

  useEffect(() => {
    const keyMetaSelector = 'meta[name="shopify-api-key"]';
    const hostMetaSelector = 'meta[name="shopify-host"]';

    let apiKeyMeta = document.head.querySelector<HTMLMetaElement>(keyMetaSelector);
    if (!apiKeyMeta) {
      apiKeyMeta = document.createElement("meta");
      apiKeyMeta.setAttribute("name", "shopify-api-key");
      document.head.appendChild(apiKeyMeta);
    }
    apiKeyMeta.setAttribute("content", apiKey);

    if (host) {
      let hostMeta = document.head.querySelector<HTMLMetaElement>(hostMetaSelector);
      if (!hostMeta) {
        hostMeta = document.createElement("meta");
        hostMeta.setAttribute("name", "shopify-host");
        document.head.appendChild(hostMeta);
      }
      hostMeta.setAttribute("content", host);
    }
  }, [apiKey, host]);

  return <>{children}</>;
}
