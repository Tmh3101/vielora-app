"use client";

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

  return (
    <>
      {/* Shopify App Bridge v4 configuration via meta tags */}
      <meta name="shopify-api-key" content={apiKey} />
      {host && <meta name="shopify-host" content={host} />}
      {children}
    </>
  );
}
