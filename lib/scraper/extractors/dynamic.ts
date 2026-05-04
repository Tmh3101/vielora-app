/**
 * Dynamic HTML Extractor
 * Uses Puppeteer-Extra with Stealth plugin for CSR/SPA pages
 */

import type { CrawlJob, CrawlResult } from "@/types/scrape";
import * as cheerio from "cheerio";
import { getRandomDesktopUserAgent, getRealisticHeaders } from "@/lib/scraper/utils/user-agents";
import {
  extractCleanHtml,
  extractMetadata,
  extractLinks,
  htmlToMarkdown,
  classifyError,
} from "@/lib/helper/crawl-website-helpers";
import {
  SCRAPE_DEFAULT_TIMEOUT,
  BLOCKED_RESOURCE_TYPES,
  BLOCKED_URL_PATTERNS,
  BROWSER_ARGS,
} from "@/config";
// import * as fs from 'node:fs';
// import * as path from 'node:path';

/**
 * Load puppeteer-extra with stealth plugin
 * Returns configured puppeteer instance
 */
async function loadStealthPuppeteer() {
  const puppeteerExtra = await import("puppeteer-extra");
  const StealthPlugin = await import("puppeteer-extra-plugin-stealth");

  // Add stealth plugin
  puppeteerExtra.default.use(StealthPlugin.default());

  return puppeteerExtra.default;
}

/**
 * Load standard puppeteer (non-stealth)
 */
async function loadStandardPuppeteer() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default;
}

/**
 * Main dynamic extraction function
 * Uses Puppeteer-Extra with Stealth to render JavaScript-heavy pages
 */
export async function extractDynamic(job: CrawlJob): Promise<CrawlResult> {
  const startTime = Date.now();
  const { url, id: jobId, config } = job;
  const timeout = config?.timeout || SCRAPE_DEFAULT_TIMEOUT;
  const useStealth = config?.useStealth !== false; // Default to true
  const proxyUrl = config?.proxyUrl;
  // const takeScreenshot = config?.takeScreenshot || false;
  // const screenshotPath = config?.screenshotPath || './debug';

  // Rotate user agent for each request
  const userAgent = config?.userAgent || getRandomDesktopUserAgent();
  const headers = getRealisticHeaders(userAgent);

  let browser = null;
  let page = null;

  try {
    // Load appropriate puppeteer variant
    const puppeteer = useStealth ? await loadStealthPuppeteer() : await loadStandardPuppeteer();

    // Add proxy if configured
    if (proxyUrl) {
      BROWSER_ARGS.push(`--proxy-server=${proxyUrl}`);
    }

    // Launch browser with optimized settings
    // Use 'new' headless mode for better WebGL/SPA support (Chrome 112+)
    browser = await puppeteer.launch({
      // @ts-expect-error - 'new' headless mode is not yet in types
      headless: "new" as const,
      args: BROWSER_ARGS,
    });

    page = await browser.newPage();

    page.on("pageerror", (err) => {
      console.error(`[Browser Crash] ${url}: ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error] ${url}: ${msg.text()}`);
      }
    });

    // Set user agent
    await page.setUserAgent(userAgent);

    // Set extra HTTP headers for realism
    await page.setExtraHTTPHeaders({
      "Accept-Language": headers["Accept-Language"],
      Accept: headers["Accept"],
    });

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Enable request interception for blocking resources
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const resourceType = request.resourceType();
      const requestUrl = request.url();

      // Block heavy resources
      if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
        request.abort();
        return;
      }

      // Block known tracking/ad URLs
      if (BLOCKED_URL_PATTERNS.some((pattern) => requestUrl.includes(pattern))) {
        request.abort();
        return;
      }

      request.continue();
    });

    // Navigate with timeout.
    // NOTE: "networkidle2" hangs on pages with persistent connections (WebSocket, polling).
    // Use "load" (DOMContentLoaded + subresources) as a reliable baseline,
    // then do a short fixed wait for JS frameworks.
    await page.goto(url, {
      waitUntil: "load",
      timeout,
    });

    // Wait a bit more for late-loading JS frameworks
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Wait for SPA content to render (React, Vue, Next.js, etc.)
    // Check if #root or #app has actual content
    try {
      await page.waitForFunction(
        () => {
          const root =
            document.querySelector("#root") ||
            document.querySelector("#app") ||
            document.querySelector("#__next");
          if (!root) return true; // No SPA container, content likely already there

          // Check if root has meaningful content (not just empty or loading)
          const hasContent = root.children.length > 0 || root.textContent?.trim().length || 0 > 50;

          // Also check for navigation links as a sign of loaded content
          const hasLinks = document.querySelectorAll("a[href]").length > 3;

          return hasContent || hasLinks;
        },
        { timeout: 10000 }
      );
    } catch {
      // SPA wait timeout, continue with current content
    }

    // Additional wait for any late JS execution
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Take screenshot if requested (for debugging)
    // if (takeScreenshot) {
    //   try {
    //     // Ensure debug directory exists
    //     if (!fs.existsSync(screenshotPath)) {
    //       fs.mkdirSync(screenshotPath, { recursive: true });
    //     }
    //     const filename = `${jobId}-${Date.now()}.png`;
    //     const fullPath = path.join(screenshotPath, filename);
    //     await page.screenshot({ path: fullPath, fullPage: false });
    //   } catch {
    //     // Screenshot failed, ignore
    //   }
    // }

    // Get page content
    const rawHtml = await page.content();
    const pageTitle = await page.title();

    const $ = cheerio.load(rawHtml);

    const baseTag = $("base").attr("href");
    if (baseTag) {
      console.warn(`[DynamicExtractor] <base href="${baseTag}"> found for ${url}`);
    }

    // Extract metadata
    const metadata = extractMetadata($);
    const title = pageTitle || metadata.ogTitle || new URL(url).hostname;

    // Extract links for recursive crawling
    const links = extractLinks($, url);

    // Clean HTML
    const cleanHtml = extractCleanHtml($, {
      includeTags: config?.includeTags,
      excludeTags: config?.excludeTags,
    });

    // Convert to Markdown (HTML already cleaned)
    const markdown = htmlToMarkdown(cleanHtml);

    return {
      success: true,
      url,
      jobId,
      statusCode: 200,
      title,
      html: cleanHtml,
      rawHtml,
      markdown,
      metadata,
      links,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    const { errorType, message } = classifyError(error);

    console.error(`[DynamicExtractor] ${errorType} for ${url}: ${message}`);

    return {
      success: false,
      url,
      jobId,
      title: "",
      html: "",
      markdown: "",
      error: message,
      errorType,
      processingTimeMs: Date.now() - startTime,
    };
  } finally {
    // Ensure browser is closed to prevent memory leaks
    if (page) {
      try {
        await page.close();
      } catch {
        // Ignore close errors
      }
    }
    if (browser) {
      try {
        // Wrap in a timeout to prevent browser.close() from deadlocking
        // in Docker --single-process mode when the renderer crashes.
        await Promise.race([
          browser.close(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("browser.close() timed out")), 5000)
          ),
        ]);
      } catch {
        // Force-kill the Chromium process if close() hangs
        try {
          browser.process()?.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    }
  }
}
