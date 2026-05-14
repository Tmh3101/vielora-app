import crypto from "crypto";
import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { Element } from "domhandler";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { PageMetadata } from "@/types/scrape";
import { EPageErrorType } from "@/types/enums";
import { SOFT_404_TITLE_PATTERNS, LOAD_MORE_KEYWORDS, DEFAULT_USER_AGENT } from "@/config/scraper";
import { extractBaseDomain } from "@/lib/scraper/core/link-processor";
import type { Tables } from "@/lib/supabase/types";
import { normalizeSeedUrl, normalizeUrl } from "./url-helpers";

/**
 * Generate SHA-256 hash of content for change detection
 */
export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
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

const LOADING_MARKERS = [
  ".animate-spin",
  ".loading",
  ".spinner",
  ".skeleton",
  '[class*="loading-"]',
  '[class*="skeleton-"]',
  ".loading-state",
  "#loading-state",
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

  $("body div").each((_, el) => {
    const $el = $(el);

    // Skip if it's a known non-content container
    if ($el.is(EXCLUDE_NON_MAIN_TAGS.join(", "))) return;

    const textContent = $el.text().replace(/\s+/g, " ").trim();
    const textLength = textContent.length;

    if (textLength > maxTextLength && textLength > 50) {
      maxTextLength = textLength;
      longestDiv = $el as Cheerio<Element>;
    }
  });

  return longestDiv ? longestDiv.html() : null;
}

/**
 * Identify the best content container based on common CMS/Builder classes
 */
function findBestContainer($: CheerioAPI): string | null {
  const commonSelectors = [
    ".elementor-section-wrap",
    ".elementor-section",
    ".wp-block-group",
    ".entry-content",
    ".post-content",
    ".page-content",
    "#content",
    ".content",
    ".site-content",
  ];

  for (const selector of commonSelectors) {
    const $el = $(selector).first();
    if ($el.length && $el.text().trim().length > 200) {
      return $el.html();
    }
  }

  return null;
}

/**
 * Clean HTML and extract main content
 * Uses a cascading fallback strategy to find the best content container:
 * 1. Semantic tags (<main>, <article>)
 * 2. Common CMS/Builder containers
 * 3. Longest text content div (heuristic for SPA/modern sites)
 * 4. Body/full HTML (last resort)
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

  $('.leaflet-container, .leaflet-control, .map-tiles, #map, [id*="map"]').remove();
  $("script, style, noscript, iframe, svg").remove();

  $(EXCLUDE_NON_MAIN_TAGS.join(", ")).remove();

  if (options.excludeTags && options.excludeTags.length > 0) {
    $(options.excludeTags.join(", ")).remove();
  }

  $("*")
    .contents()
    .filter(function (this: { type?: string }) {
      return this.type === "comment";
    })
    .remove();

  // Cascading fallback strategy
  const mainContent = $("main").html();
  if (mainContent && mainContent.trim().length > 200) {
    return mainContent;
  }

  const articleContent = $("article").html();
  if (articleContent && articleContent.trim().length > 200) {
    return articleContent;
  }

  const bestContainer = findBestContainer($);
  if (bestContainer && bestContainer.trim().length > 200) {
    return bestContainer;
  }

  const longestDivContent = findLongestContentDiv($);
  if (longestDivContent && longestDivContent.trim().length > 100) {
    return longestDivContent;
  }

  return $("body").html() || $.html();
}

/**
 * Convert HTML to Markdown
 * Uses GFM plugin for proper table formatting
 * Strips all images and media to produce text-and-table-only output
 */
export function htmlToMarkdown(html: string): string {
  // Normalize whitespace and add spacing between HTML tags
  html = html.replace(/>\s+</g, "> <").replace(/></g, "> <").replace(/\s+/g, " ").trim();

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  turndown.use(gfm);
  (turndown.remove as (filter: string[]) => TurndownService)(ELEMENTS_TO_REMOVE);

  turndown.addRule("paragraphs", {
    filter: "p",
    replacement: (content: string) => {
      const trimmed = content.trim();
      return trimmed ? `\n\n${trimmed}\n\n` : "";
    },
  });

  turndown.addRule("span-spacing", {
    filter: ["span"],
    replacement: (content: string) => {
      const trimmed = content.trim();
      return trimmed ? ` ${trimmed} ` : "";
    },
  });

  turndown.addRule("images", {
    filter: "img",
    replacement: function (content, node) {
      const alt = node.getAttribute("alt") || "";
      return alt ? `[Ảnh: ${alt}] ` : "";
    },
  });

  const markdown = turndown.turndown(html);
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Check if HTML appears to be a CSR (Client-Side Rendered) page
 * These pages need a headless browser to render properly
 */
export function isCSRPage(html: string): boolean {
  const $ = cheerio.load(html);

  // Check for loading markers first - if found, it's definitely CSR/needs more time
  const hasLoadingMarker = LOADING_MARKERS.some((selector) => $(selector).length > 0);
  if (hasLoadingMarker) return true;

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
    if (statusCode === 404)
      return { errorType: EPageErrorType.NotFound, message: `HTTP 404: Not Found` };
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

export async function fetchSitemapUrls(startUrl: string, maxPages: number): Promise<string[]> {
  const candidates = new Set<string>();
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
          candidates.add(normalized);
          if (candidates.size >= maxPages * 2) break; // Get a few more for sampling
        } catch {
          // skip invalid loc
        }
      }
    } catch {
      // ignore sitemap fetch errors
    }
  }

  if (candidates.size === 0) return [];

  const candidateList = Array.from(candidates);

  // Validation: Sample up to 5 URLs to check for dead/garbage links
  const sampleSize = Math.min(candidateList.length, 5);
  const samples = [];
  const shuffled = [...candidateList].sort(() => 0.5 - Math.random());
  for (let i = 0; i < sampleSize; i++) {
    samples.push(shuffled[i]);
  }

  console.log(`[Sitemap] Validating sitemap for ${startUrl} by sampling ${sampleSize} URLs...`);

  const validationResults = await Promise.all(
    samples.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": DEFAULT_USER_AGENT },
        });

        if (!res.ok) {
          clearTimeout(timeoutId);
          console.log(`[Sitemap] Sample ${url} returned ${res.status}`);
          // 403/401 might be valid but protected, everything else (like 404) is a failure
          return false;
        }

        // Check for soft 404 in title
        const html = await res.text();
        clearTimeout(timeoutId);

        const $ = cheerio.load(html);
        const title = $("title").text().trim().toLowerCase();
        const isSoft = SOFT_404_TITLE_PATTERNS.some((p) => title.includes(p.toLowerCase()));

        if (isSoft) {
          console.log(`[Sitemap] Sample ${url} is a Soft 404 (Title: "${title}")`);
          return false;
        }

        return true;
      } catch (err) {
        console.log(
          `[Sitemap] Sample ${url} failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return false;
      }
    })
  );

  const failCount = validationResults.filter((r) => !r).length;
  const failRate = failCount / sampleSize;

  if (failRate >= 0.5) {
    console.warn(
      `[Sitemap] High failure rate detected (${(failRate * 100).toFixed(0)}%). Discarding sitemap to prevent queue poisoning.`
    );
    return [];
  }

  // Limit sitemap URLs to 20% of maxPages to ensure we have room for links found on the homepage
  const limit = Math.floor(maxPages * 0.2);
  console.log(`[Sitemap] Validation passed for ${startUrl}. Enqueueing first ${limit} URLs.`);
  return candidateList.slice(0, limit);
}

/**
 * Generate script to extract hidden items by clicking "load more" buttons
 * @param keywords - Array of keywords to identify load more buttons. Uses LOAD_MORE_KEYWORDS from config if not provided
 * @param maxAttempts - Maximum number of click attempts (default: 20)
 */
export function getExtractHiddenItemsScript(
  keywords: string[] = LOAD_MORE_KEYWORDS,
  maxAttempts: number = 20
): string {
  const keywordsList = keywords.map((k) => `'${k}'`).join(", ");

  return `(async () => {
    const loadMoreKeywords = [${keywordsList}];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let clicked = true;
    let attempts = 0;
    const maxAttempts = ${maxAttempts};

    while (clicked && attempts < maxAttempts) {
      clicked = false;
      const elements = Array.from(document.querySelectorAll('button, a, .btn, [role="button"]'));
      
      for (const el of elements) {
        const text = (el.textContent || '').toLowerCase().trim();
        const isMatch = loadMoreKeywords.some(keyword => text === keyword || text.includes(keyword));

        if (isMatch && el.offsetParent !== null) {
          el.click();
          clicked = true;
          attempts++;
          await delay(1000);
          break;
        }
      }
    }
  })()`;
}

export function getDiscoverSeedUrl(bot: Tables<"bots">): string {
  const crawlSettings = bot.crawl_settings;
  const seedUrl =
    crawlSettings && typeof crawlSettings === "object" && !Array.isArray(crawlSettings)
      ? (crawlSettings as Record<string, unknown>).seedUrl
      : undefined;

  if (typeof seedUrl === "string" && seedUrl.trim()) {
    return normalizeSeedUrl(seedUrl);
  }

  return normalizeSeedUrl(bot.domain);
}
