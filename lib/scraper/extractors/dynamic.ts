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
  getExtractHiddenItemsScript,
} from "@/lib/helpers";
import { EPageErrorType } from "@/types/enums";
import { SCRAPE_DEFAULT_TIMEOUT, BLOCKED_RESOURCE_TYPES, BLOCKED_URL_PATTERNS } from "@/config";
import { BrowserManager } from "@/lib/scraper/core/browser-manager";

export async function extractDynamic(job: CrawlJob): Promise<CrawlResult> {
  const startTime = Date.now();
  const { url, id: jobId, config } = job;
  const timeout = config?.timeout || SCRAPE_DEFAULT_TIMEOUT;
  const useStealth = config?.useStealth !== false;
  const proxyUrl = config?.proxyUrl;

  const userAgent = config?.userAgent || getRandomDesktopUserAgent();
  const headers = getRealisticHeaders(userAgent);

  let page = null;

  try {
    page = await BrowserManager.getPage(useStealth, proxyUrl);

    page.on("pageerror", (err) => {
      console.error(`[Browser Crash] ${url}: ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("net::ERR_FAILED") ||
          text.includes("net::ERR_BLOCKED_BY_CLIENT") ||
          text.includes("status of 404")
        ) {
          return;
        }
        console.error(`[Browser Console Error] ${url}: ${text}`);
      }
    });

    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      "Accept-Language": headers["Accept-Language"],
      Accept: headers["Accept"],
    });
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const resourceType = request.resourceType();
      const requestUrl = request.url();

      if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
        request.abort();
        return;
      }

      if (BLOCKED_URL_PATTERNS.some((pattern) => requestUrl.includes(pattern))) {
        request.abort();
        return;
      }

      request.continue();
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout,
    });

    if (!response) {
      throw new Error("No response received from navigation");
    }

    const statusCode = response.status();
    if (statusCode === 404) {
      return {
        success: false,
        url,
        jobId,
        statusCode: 404,
        title: "404 Not Found",
        html: "",
        markdown: "",
        error: "HTTP 404: Not Found",
        errorType: EPageErrorType.NotFound,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Wait for SPA content to render (React, Vue, Next.js, Nuxt, etc.)
    // Wait for root element AND for loading spinners to disappear
    try {
      await page.waitForFunction(
        () => {
          const loadingSelectors = [
            ".animate-spin",
            ".loading",
            ".spinner",
            ".skeleton",
            '[class*="loading-"]',
            '[class*="skeleton-"]',
          ];
          const isLoading = loadingSelectors.some((s) => document.querySelector(s) !== null);
          if (isLoading) return false;

          const root =
            document.querySelector("#root") ||
            document.querySelector("#app") ||
            document.querySelector("#__next") ||
            document.querySelector("#__nuxt") ||
            document.querySelector("main") ||
            document.querySelector("article");

          if (!root) return true;

          const hasContent = (root.textContent || "").trim().length > 100;
          const hasLinks = document.querySelectorAll("a[href]").length > 5;

          return hasContent || hasLinks;
        },
        { timeout: 15000 }
      );
    } catch {
      // SPA wait timeout, continue with current content
    }

    try {
      await page.evaluate(getExtractHiddenItemsScript());
    } catch (evaluateError) {
      console.warn(`[DynamicExtractor] Error clicking load more on ${url}:`, evaluateError);
    }

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

    const metadata = extractMetadata($);
    const title = pageTitle || metadata.ogTitle || new URL(url).hostname;
    const links = extractLinks($, url);
    const cleanHtml = extractCleanHtml($, {
      includeTags: config?.includeTags,
      excludeTags: config?.excludeTags,
    });
    const markdown = htmlToMarkdown(cleanHtml);

    return {
      success: true,
      url,
      jobId,
      statusCode,
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
    if (page) {
      try {
        await Promise.race([
          page.close(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("page.close() timed out")), 5000)
          ),
        ]);
      } catch {
        BrowserManager.markPageZombie(page);
      }
    }
  }
}
