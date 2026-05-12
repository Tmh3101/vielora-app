/**
 * Static HTML Extractor
 * Fetches and processes HTML using fetch + cheerio (no browser needed)
 * Ported from lib/scraper/scraper.ts
 */

import * as cheerio from "cheerio";
import type { CrawlJob, CrawlResult } from "@/types/scrape";
import {
  transformRelativeUrls,
  extractMetadata,
  extractLinks,
  extractCleanHtml,
  htmlToMarkdown,
  classifyError,
} from "@/lib/helpers/crawl-website-helpers";
import { SCRAPE_DEFAULT_TIMEOUT, DEFAULT_USER_AGENT } from "@/config";
/**
 * Main extraction function
 * Fetches URL using native fetch and processes with cheerio
 */
export async function extractStatic(job: CrawlJob): Promise<CrawlResult> {
  const startTime = Date.now();
  const { url, id: jobId, config } = job;

  const timeout = config?.timeout || SCRAPE_DEFAULT_TIMEOUT;
  const userAgent = config?.userAgent || DEFAULT_USER_AGENT;

  try {
    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const { errorType } = classifyError(null, response.status);
      return {
        success: false,
        url,
        jobId,
        statusCode: response.status,
        title: "",
        html: "",
        markdown: "",
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorType,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const rawHtml = await response.text();
    const $ = cheerio.load(rawHtml);

    // Log <base> tag if present — affects relative URL resolution!
    const baseTag = $("base").attr("href");
    if (baseTag) {
      console.warn(`[StaticExtractor] <base href="${baseTag}"> found for ${url}`);
    }

    // Transform relative URLs
    if (config?.transformRelativeUrls !== false) {
      transformRelativeUrls($, url);
    }

    // Extract metadata
    const metadata = extractMetadata($);
    const title = $("title").text().trim() || new URL(url).hostname;

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
      statusCode: response.status,
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
    console.error(`[StaticExtractor] ${errorType} for ${url}: ${message}`);

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
  }
}
