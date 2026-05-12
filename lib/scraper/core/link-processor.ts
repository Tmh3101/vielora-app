/**
 * Link Processor for Recursive Crawling
 * Handles link extraction, normalization, and filtering
 * Phase 2: Advanced capabilities
 */

import * as cheerio from "cheerio";
import {
  EXCLUDED_EXTENSIONS,
  EXCLUDED_PATTERNS,
  KNOWN_SLDS,
  PAAS_SUFFIXES,
} from "@/config/scraper";

/**
 * Options for link processing
 */
export interface LinkProcessorOptions {
  /** Base URL for resolving relative links */
  baseUrl: string;
  /** Start URL hostname for exact-domain filtering (e.g., docs.example.com) */
  startHostname: string;
  /** Base domain for filtering (e.g., example.com) */
  baseDomain: string;
  /** Include subdomains (e.g., blog.example.com) */
  includeSubdomains?: boolean;
  /** Glob patterns for URLs to include */
  includePatterns?: string[];
  /** Glob patterns for URLs to exclude */
  excludePatterns?: string[];
  /** Set of already visited URLs to skip */
  visitedUrls?: Set<string>;
  /** Pre-extracted links (skip HTML parsing if provided) */
  preExtractedLinks?: string[];
}

/**
 * Result of link processing
 */
export interface LinkProcessorResult {
  /** Valid URLs that should be crawled */
  validUrls: string[];
  /** URLs that were filtered out */
  filteredCount: number;
  /** Total links found */
  totalFound: number;
}

/**
 * Extract the base domain from a URL, with strict support for PaaS Public Suffixes
 * e.g., "https://blog.example.com" -> "example.com"
 * e.g., "https://my-app.vercel.app" -> "my-app.vercel.app"
 */
export function extractBaseDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const suffix of PAAS_SUFFIXES) {
      if (hostname.endsWith(`.${suffix}`) || hostname === suffix) {
        const prefix = hostname.substring(0, hostname.length - suffix.length - 1);
        if (!prefix) return hostname;

        const parts = prefix.split(".");
        return `${parts[parts.length - 1]}.${suffix}`;
      }
    }

    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const tld = parts[parts.length - 1];
      const sld = parts[parts.length - 2];

      if (KNOWN_SLDS.includes(sld) && parts.length >= 3) {
        return `${parts[parts.length - 3]}.${sld}.${tld}`;
      }
      return `${sld}.${tld}`;
    }

    return hostname;
  } catch {
    return "";
  }
}

/**
 * Check if a URL belongs to the same domain (including subdomains optionally)
 */
function isSameDomain(
  url: string,
  startHostname: string,
  baseDomain: string,
  includeSubdomains: boolean
): boolean {
  try {
    const urlHostname = new URL(url).hostname;

    if (includeSubdomains) {
      return urlHostname.endsWith(baseDomain);
    } else {
      // Exact hostname match only
      return urlHostname === startHostname;
    }
  } catch {
    return false;
  }
}

/**
 * Check if URL has an excluded extension
 */
function hasExcludedExtension(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return EXCLUDED_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Check if URL matches an excluded pattern
 */
function hasExcludedPattern(url: string): boolean {
  const urlLower = url.toLowerCase();
  return EXCLUDED_PATTERNS.some((pattern) => urlLower.includes(pattern));
}

/**
 * Simple glob-like pattern matching
 * Supports * as wildcard
 */
function matchesPattern(url: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace(/\*/g, ".*"); // Convert * to .*

  try {
    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(url);
  } catch {
    return false;
  }
}

/**
 * Normalize a URL (remove trailing slash, fragment, normalize protocol)
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove fragment
    parsed.hash = "";

    // Strip trailing punctuation characters that can leak from prose text into href values
    // e.g. "https://example.com/slug." or "https://example.com/slug,"
    parsed.pathname = parsed.pathname.replace(/[.,;:!?)\]]+$/, "");

    // Remove trailing slash (except for root)
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Sort search params for consistency
    parsed.searchParams.sort();

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract and process links from HTML content or pre-extracted links
 */
export function processLinks(html: string, options: LinkProcessorOptions): LinkProcessorResult {
  const {
    baseUrl,
    startHostname,
    baseDomain,
    includeSubdomains = true,
    includePatterns,
    excludePatterns,
    visitedUrls = new Set(),
    preExtractedLinks,
  } = options;

  const foundUrls: Set<string> = new Set();
  const validUrls: Set<string> = new Set();
  let filteredCount = 0;

  // Use pre-extracted links if provided, otherwise extract from HTML
  if (preExtractedLinks && preExtractedLinks.length > 0) {
    for (const link of preExtractedLinks) {
      foundUrls.add(link);
    }
  } else if (html) {
    const $ = cheerio.load(html);
    // Extract all anchor hrefs
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl).toString();
        foundUrls.add(absoluteUrl);
      } catch {
        // Invalid URL, skip
      }
    });
  }

  // Process each found URL
  const urlsToProcess = Array.from(foundUrls);

  for (const url of urlsToProcess) {
    // Normalize the URL
    const normalizedUrl = normalizeUrl(url);

    // Reject URLs whose path is suspiciously long — these are usually article body
    // text fragments that leaked into an href value (e.g. very long Vietnamese slugs).
    // Real navigation paths are almost never longer than 300 characters.
    let parsedNormalized: URL;
    try {
      parsedNormalized = new URL(normalizedUrl);
      if (parsedNormalized.pathname.length > 300) {
        filteredCount++;
        continue;
      }
    } catch {
      filteredCount++;
      continue;
    }

    // Skip URLs whose first path segment is a single letter (e.g. /s/about, /p/news).
    // These are typically redirect aliases or CMS section prefixes that return soft-404 pages.
    if (/^\/[a-z]\//.test(parsedNormalized.pathname)) {
      filteredCount++;
      continue;
    }

    // Skip URLs with query parameters — filtered pages (e.g. ?category_id=..., ?page=2)
    // are duplicative content and not meaningful standalone pages to index.
    if (parsedNormalized.search !== "") {
      filteredCount++;
      continue;
    }

    if (visitedUrls.has(normalizedUrl)) {
      filteredCount++;
      continue;
    }

    // Check domain restriction
    if (!isSameDomain(normalizedUrl, startHostname, baseDomain, includeSubdomains)) {
      filteredCount++;
      continue;
    }

    // Check excluded extensions
    if (hasExcludedExtension(normalizedUrl)) {
      filteredCount++;
      continue;
    }

    // Check excluded patterns
    if (hasExcludedPattern(normalizedUrl)) {
      filteredCount++;
      continue;
    }

    // Check custom exclude patterns
    if (excludePatterns && excludePatterns.length > 0) {
      const matchedPattern = excludePatterns.find((pattern) =>
        matchesPattern(normalizedUrl, pattern)
      );
      if (matchedPattern) {
        filteredCount++;
        continue;
      }
    }

    // Check custom include patterns (if specified, URL must match at least one)
    if (includePatterns && includePatterns.length > 0) {
      const included = includePatterns.some((pattern) => matchesPattern(normalizedUrl, pattern));
      if (!included) {
        filteredCount++;
        continue;
      }
    }

    validUrls.add(normalizedUrl);
  }

  return {
    validUrls: Array.from(validUrls),
    filteredCount,
    totalFound: foundUrls.size,
  };
}
