import { getDiscoverSeedUrl } from "./crawl-website-helpers";
import type { Tables } from "@/lib/supabase/types";

const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_REGEX = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

/**
 * Format URL to ensure it has a protocol
 */
export function formatUrl(url: string): string {
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }
  return formattedUrl;
}

/**
 * Normalize URL by removing trailing slashes, lowercasing hostname, and removing default ports
 */
export function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);

    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    url.pathname = url.pathname.replace(/\/+/g, "/");

    if (url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    if (url.search) {
      const params = new URLSearchParams(url.search);
      const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());
      url.search = sortedParams.toString();
    }

    url.hash = "";

    return url.href;
  } catch {
    return urlString;
  }
}

export const normalizeSeedUrl = (value: string): string => normalizeUrl(formatUrl(value));

export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const value = Number(part);
    return value >= 0 && value <= 255;
  });
}

function isIpAddress(hostname: string): boolean {
  return isIpv4Address(hostname) || hostname.includes(":");
}

function isValidDomainHostname(hostname: string): boolean {
  if (hostname === "localhost") return true;
  if (isIpAddress(hostname)) return false;

  const labels = hostname.split(".");
  if (labels.length < 2) return false;

  const tld = labels.at(-1);
  const domainLabels = labels.slice(0, -1);

  if (!tld || !TLD_REGEX.test(tld)) return false;
  return domainLabels.every((label) => DOMAIN_LABEL_REGEX.test(label));
}

export interface WebsiteUrlValidationResult {
  formattedUrl?: string;
  hostname?: string;
  error: string | null;
}

export function validateWebsiteUrl(value: string): WebsiteUrlValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { error: null };

  try {
    const formattedUrl = ensureProtocol(trimmed);
    const parsed = new URL(formattedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: "Domain không hợp lệ" };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!isValidDomainHostname(hostname)) {
      return { error: "Domain không hợp lệ" };
    }

    return { formattedUrl, hostname, error: null };
  } catch {
    return { error: "Domain không hợp lệ" };
  }
}

export const canonicalizeActionKey = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    url.pathname = url.pathname.replace(/\/+/g, "/");
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    if (url.search) {
      const sortedParams = new URLSearchParams(
        Array.from(new URLSearchParams(url.search).entries()).sort(([a], [b]) => a.localeCompare(b))
      );
      const sorted = sortedParams.toString();
      url.search = sorted ? `?${sorted}` : "";
    }

    url.hash = "";
    return url.toString();
  } catch {
    return trimmed.replace(/\s+/g, " ").toLowerCase();
  }
};

export function normalizeKnowledgeUrl(input: string): string | null {
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    parsed.hash = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/g, "") || "/";
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isRootPath(pathname: string): boolean {
  return pathname === "" || pathname === "/";
}

export function isBotRootUrl(url: string, bot: Tables<"bots">): boolean {
  try {
    const target = new URL(url);
    const seed = new URL(getDiscoverSeedUrl(bot));

    return (
      normalizeHostname(target.hostname) === normalizeHostname(seed.hostname) &&
      isRootPath(target.pathname)
    );
  } catch {
    return false;
  }
}
