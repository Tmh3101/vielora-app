"use client";

import { useCallback } from "react";

type ShopifyGlobal = {
  idToken?: () => Promise<string>;
};

const SHOPIFY_READY_TIMEOUT_MS = 5000;
const SHOPIFY_READY_POLL_MS = 50;
const TOKEN_EXPIRY_BUFFER_SECONDS = 10;

type ShopifyIdTokenOptions = {
  allowInitialTokenFallback?: boolean;
};

function getShopifyGlobal() {
  return (window as Window & { shopify?: ShopifyGlobal }).shopify;
}

function getInitialIdToken() {
  return new URLSearchParams(window.location.search).get("id_token");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return window.atob(padded);
}

function isJwtFresh(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return false;

    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    if (!parsed.exp) return false;

    return parsed.exp > Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_BUFFER_SECONDS;
  } catch {
    return false;
  }
}

async function getAppBridgeIdToken() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SHOPIFY_READY_TIMEOUT_MS) {
    const idToken = getShopifyGlobal()?.idToken;

    if (idToken) {
      return idToken();
    }

    await new Promise((resolve) => window.setTimeout(resolve, SHOPIFY_READY_POLL_MS));
  }

  return null;
}

export async function getShopifyIdToken(options: ShopifyIdTokenOptions = {}) {
  const { allowInitialTokenFallback = true } = options;
  const appBridgeToken = await getAppBridgeIdToken();

  if (appBridgeToken) {
    return appBridgeToken;
  }

  if (!allowInitialTokenFallback) {
    return null;
  }

  const initialToken = getInitialIdToken();
  if (initialToken && isJwtFresh(initialToken)) {
    return initialToken;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[Shopify App Bridge] Unable to resolve a fresh Shopify ID token.", {
      hasShopifyGlobal: Boolean(getShopifyGlobal()),
      hasIdTokenApi: Boolean(getShopifyGlobal()?.idToken),
      hasInitialToken: Boolean(initialToken),
      initialTokenFresh: initialToken ? isJwtFresh(initialToken) : false,
    });
  }

  return null;
}

export function useShopifyFetch() {
  const shopifyFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getShopifyIdToken();
    const headers = new Headers(options.headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      console.warn("[Shopify App Bridge] Unable to resolve a Shopify ID token for this request.");
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }, []);

  return shopifyFetch;
}
