import crypto from "crypto";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { PageMetadata } from "@/types/scrape";
import { EPageErrorType } from "@/types/enums";
import { SOFT_404_TITLE_PATTERNS } from "@/config/scraper";
import { extractBaseDomain } from "@/lib/scraper/core/link-processor";

/**
 * Generate SHA-256 hash of content for change detection
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

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

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    // Remove multiple consecutive slashes in pathname (e.g., //about -> /about)
    url.pathname = url.pathname.replace(/\/+/g, "/");

    // Remove trailing slash for ALL paths (including root)
    if (url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Sort query parameters for consistency
    if (url.search) {
      const params = new URLSearchParams(url.search);
      const sortedParams = new URLSearchParams(Array.from(params.entries()).sort());
      url.search = sortedParams.toString();
    }

    // Remove hash/fragment
    url.hash = "";

    return url.href;
  } catch {
    return urlString;
  }
}

/**
 * Non-main content tags to exclude
 * Aggressively removes UI noise, forms, media, and hidden duplicate elements
 * to produce clean, text-and-table-only content for LLM consumption
 */
const EXCLUDE_NON_MAIN_TAGS: string[] = [
  // Layout & Navigation
  "header",
  "footer",
  "nav",
  "aside",
  ".header",
  ".navbar",
  "#header",
  ".footer",
  "#footer",
  ".sidebar",
  "#sidebar",
  ".menu",
  ".navigation",
  ".breadcrumbs",

  // UI Overlays & Popups
  ".modal",
  ".popup",
  ".overlay",
  ".cookie",

  // Ads & Social
  ".ad",
  ".ads",
  ".advert",
  ".social",
  ".social-media",
  ".share",
  ".widget",
  ".comments",

  // Scripts & Styles (non-content)
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",

  // UI Forms & Inputs (waste tokens, cause hallucination)
  "form",
  "input",
  "textarea",
  "button",
  "select",
  "option",

  // Media Elements (images handled separately in Turndown)
  "dialog",
  "canvas",
  "picture",
  "video",
  "audio",

  // Hidden Elements (prevent duplicate responsive/mobile blocks)
  "[aria-hidden='true']",
  ".hidden",
  ".d-none",
  ".display-none",
  "[style*='display: none']",
  "[style*='display:none']",
];

// Completely remove non-content elements and media
// This prevents images from rendering as markdown ![alt](src) links
const ELEMENTS_TO_REMOVE = [
  "script",
  "style",
  "noscript",
  "meta",
  "link",
  "iframe",
  // Media elements - strip completely (no markdown image links)
  "img",
  "svg",
  "picture",
  // UI elements that may have slipped through
  "form",
  "button",
  "input",
  "select",
  "textarea",
];

const CSR_MARKERS = [
  '<div id="root"></div>',
  '<div id="app"></div>',
  '<div id="__next"></div>',
  '<div id="__nuxt"></div>',
];

const SITEMAP_CANDIDATES = ["/sitemap.xml", "/sitemap_index.xml"];

/**
 * Extract metadata from HTML
 */
export function extractMetadata($: CheerioAPI): PageMetadata {
  return {
    description:
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content"),
    keywords: $('meta[name="keywords"]').attr("content"),
    ogTitle: $('meta[property="og:title"]').attr("content"),
    ogDescription: $('meta[property="og:description"]').attr("content"),
    ogImage: $('meta[property="og:image"]').attr("content"),
    canonical: $('link[rel="canonical"]').attr("href"),
  };
}

/**
 * Transform relative URLs to absolute
 */
export function transformRelativeUrls($: CheerioAPI, baseUrl: string): void {
  try {
    const base = new URL(baseUrl);

    // Transform images
    $("img[src]").each((_, el) => {
      const $el = $(el);
      const src = $el.attr("src");
      if (src) {
        try {
          $el.attr("src", new URL(src, base).toString());
        } catch {
          // Keep original
        }
      }
    });

    // Transform links
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        try {
          $el.attr("href", new URL(href, base).toString());
        } catch {
          // Keep original
        }
      }
    });
  } catch {
    // Ignore URL parsing errors
  }
}

/**
 * Extract links from the page for recursive crawling
 * Returns ALL links (filtering is done by link-processor)
 */
export function extractLinks($: CheerioAPI, baseUrl: string): string[] {
  const links: Set<string> = new Set();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl);
      if (absoluteUrl.protocol === "http:" || absoluteUrl.protocol === "https:") {
        absoluteUrl.hash = "";
        links.add(absoluteUrl.toString());
      }
    } catch {
      // invalid URL, skip
    }
  });

  return Array.from(links);
}

/**
 * Find the div with the longest text content inside body
 * This heuristic helps identify the main content container
 * when semantic tags like <main> or <article> are missing
 */
function findLongestContentDiv($: CheerioAPI): string | null {
  let longestDiv: Cheerio<Element> | null = null;
  let maxTextLength = 0;

  // Only search direct children of body to avoid deeply nested noise
  $("body > div").each((_, el) => {
    const $el = $(el);
    const textContent = $el.text().replace(/\s+/g, " ").trim();
    const textLength = textContent.length;

    // Require minimum content length to avoid empty wrappers
    if (textLength > maxTextLength && textLength > 100) {
      maxTextLength = textLength;
      longestDiv = $el as Cheerio<Element>;
    }
  });

  return longestDiv ? longestDiv.html() : null;
}

/**
 * Clean HTML and extract main content
 * Uses a cascading fallback strategy to find the best content container:
 * 1. Semantic tags (<main>, <article>)
 * 2. Longest text content div (heuristic for SPA/modern sites)
 * 3. Body/full HTML (last resort)
 */
export function extractCleanHtml(
  $: CheerioAPI,
  options: { includeTags?: string[]; excludeTags?: string[] }
): string {
  // If include_tags is specified, only extract those elements
  if (options.includeTags && options.includeTags.length > 0) {
    const $newDoc = cheerio.load("<div></div>");
    const $root = $newDoc("div");

    for (const selector of options.includeTags) {
      $(selector).each((_, el) => {
        $root.append($(el).clone());
      });
    }

    return $root.html() || "";
  }

  // Remove non-main content elements (UI noise, forms, hidden elements)
  $(EXCLUDE_NON_MAIN_TAGS.join(", ")).remove();

  // Apply custom excludeTags
  if (options.excludeTags && options.excludeTags.length > 0) {
    $(options.excludeTags.join(", ")).remove();
  }

  // Remove HTML comments
  $("*")
    .contents()
    .filter(function (this: { type?: string }) {
      return this.type === "comment";
    })
    .remove();

  // Cascading fallback for main content extraction:
  // 1. Prefer semantic tags (best signal for main content)
  const mainContent = $("main").html();
  if (mainContent && mainContent.trim().length > 50) {
    return mainContent;
  }

  const articleContent = $("article").html();
  if (articleContent && articleContent.trim().length > 50) {
    return articleContent;
  }

  // 2. Find the div with longest text content (heuristic for SPA sites)
  const longestDivContent = findLongestContentDiv($);
  if (longestDivContent && longestDivContent.trim().length > 50) {
    return longestDivContent;
  }

  // 3. Last resort: return body or full HTML
  return $("body").html() || $.html();
}

/**
 * Convert HTML to Markdown
 * Uses GFM plugin for proper table formatting
 * Strips all images and media to produce text-and-table-only output
 */
export function htmlToMarkdown(html: string): string {
  // Pre-process: normalize whitespace
  html = html.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Enable GFM (GitHub Flavored Markdown) for proper table support
  turndown.use(gfm);

  // Use type assertion to support non-standard tags like 'svg'
  (turndown.remove as (filter: string[]) => TurndownService)(ELEMENTS_TO_REMOVE);

  // Handle paragraphs with proper spacing
  turndown.addRule("paragraphs", {
    filter: "p",
    replacement: (content: string) => {
      const trimmed = content.trim();
      return trimmed ? `\n\n${trimmed}\n\n` : "";
    },
  });

  const markdown = turndown.turndown(html);

  // Post-process: clean up excessive newlines and normalize spacing
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Check if HTML appears to be a CSR (Client-Side Rendered) page
 * These pages need a headless browser to render properly
 */
export function isCSRPage(html: string): boolean {
  const $ = cheerio.load(html);

  // Remove script/style/noscript
  $("script, style, noscript, link, meta").remove();
  const bodyText = ($("body").text() || "").replace(/\s+/g, "").trim();

  // If body text is very short, likely CSR
  if (bodyText.length < 50) return true;

  // Check for known SPA root markers
  const bodyHtml = $("body").html() || "";

  return CSR_MARKERS.some((marker) => bodyHtml.includes(marker) && bodyText.length < 100);
}

/**
 * Classify a failed fetch into a typed error category.
 */
export function classifyError(
  error: unknown,
  statusCode?: number
): { errorType: EPageErrorType; message: string } {
  if (statusCode !== undefined) {
    if (statusCode === 429)
      return { errorType: EPageErrorType.RateLimited, message: `HTTP 429: Too Many Requests` };
    if (statusCode === 403)
      return { errorType: EPageErrorType.Blocked, message: `HTTP 403: Forbidden` };
    return {
      errorType: EPageErrorType.HttpError,
      message: `HTTP ${statusCode}`,
    };
  }
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (
    lower.includes("abort") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("signal")
  )
    return { errorType: EPageErrorType.TimeoutError, message: msg };
  if (
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("network")
  )
    return { errorType: EPageErrorType.NetworkError, message: msg };
  return { errorType: EPageErrorType.UnknownError, message: msg };
}

export function isSoft404(title: string, markdown: string): boolean {
  const titleLower = title.toLowerCase();
  if (SOFT_404_TITLE_PATTERNS.some((p) => titleLower.includes(p))) return true;
  // Thin content that is unlikely to be a real page
  if (markdown.trim().length < 150) return true;
  return false;
}

export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function fetchSitemapUrls(startUrl: string, maxPages: number): Promise<string[]> {
  const results = new Set<string>();
  const root = new URL(startUrl);

  for (const path of SITEMAP_CANDIDATES) {
    try {
      const sitemapUrl = new URL(path, root).toString();
      const res = await fetch(sitemapUrl, { headers: { Accept: "application/xml,text/xml" } });
      if (!res.ok) continue;
      const xml = await res.text();
      const matches = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gi));
      for (const match of matches) {
        const loc = match[1]?.trim();
        if (!loc) continue;
        try {
          const normalized = normalizeUrl(loc);
          if (extractBaseDomain(normalized) !== extractBaseDomain(startUrl)) continue;
          // Skip single-letter path prefix aliases (e.g. /s/..., /p/...) from sitemap
          if (/^\/[a-z]\//.test(new URL(normalized).pathname)) continue;
          // Skip URLs with query parameters
          if (new URL(normalized).search !== "") continue;
          results.add(normalized);
          if (results.size >= maxPages) {
            return Array.from(results);
          }
        } catch {
          // skip invalid loc
        }
      }
    } catch {
      // ignore sitemap fetch errors and fallback to crawl
    }
  }

  return Array.from(results);
}
