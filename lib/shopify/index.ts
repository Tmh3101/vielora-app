import "@shopify/shopify-api/adapters/web-api";
import { setDefaultResultOrder } from "node:dns";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";
import { InMemoryShopifySessionStorage } from "./shopify-memory-session-storage";

/**
 * Shopify configuration for Next.js App Router.
 * Uses the 'web-api' adapter to work with standard Web Request/Response objects.
 */

// Prefer IPv4 first to avoid ENETUNREACH when host resolves to unreachable IPv6.
setDefaultResultOrder("ipv4first");

if (!process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID)
  throw new Error("Missing NEXT_PUBLIC_SHOPIFY_CLIENT_ID");
if (!process.env.SHOPIFY_CLIENT_SECRET) throw new Error("Missing SHOPIFY_CLIENT_SECRET");
if (!process.env.NEXT_PUBLIC_APP_URL) throw new Error("Missing NEXT_PUBLIC_APP_URL");

const storageMode =
  process.env.SHOPIFY_SESSION_STORAGE ??
  (process.env.NODE_ENV === "production" ? "postgres" : "memory");

if (storageMode !== "memory" && !process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

// Singleton session storage for development
const globalForShopify = globalThis as unknown as { sessionStorage: SessionStorage | undefined };

function getSessionStorage() {
  if (!globalForShopify.sessionStorage) {
    const useMemoryStorage = storageMode === "memory";
    globalForShopify.sessionStorage = useMemoryStorage
      ? new InMemoryShopifySessionStorage()
      : new PostgreSQLSessionStorage(process.env.DATABASE_URL!);
  }

  return globalForShopify.sessionStorage;
}

const shopify = shopifyApi({
  apiKey: process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID,
  apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET,
  scopes: process.env.SHOPIFY_API_SCOPES?.split(",") || [],
  hostName: new URL(process.env.NEXT_PUBLIC_APP_URL).host,
  apiVersion: "2026-04" as ApiVersion, // Match shopify.app.toml
  isEmbeddedApp: true,
});

function decodeShopifyHost(host: string): string {
  try {
    return Buffer.from(host, "base64").toString("utf8").trim();
  } catch {
    throw new Error("Invalid host parameter encoding");
  }
}

function buildEmbeddedAdminAppUrl(host: string): string {
  const decodedHost = decodeShopifyHost(host);
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_SHOPIFY_CLIENT_ID");

  try {
    const url = new URL(`https://${decodedHost}`);
    const hostname = url.hostname;

    if (hostname === "admin.shopify.com") {
      const normalizedPath = decodedHost.replace(/\/+$/, "");
      return `https://${normalizedPath}/apps/${apiKey}`;
    }

    if (hostname.endsWith(".myshopify.com") && url.pathname === "/admin") {
      return `https://${hostname}/admin/apps/${apiKey}`;
    }
  } catch {
    // Fall through to unsupported error
  }

  throw new Error("Unsupported Shopify host parameter format");
}

export { shopify, getSessionStorage, buildEmbeddedAdminAppUrl };
