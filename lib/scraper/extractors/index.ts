import { extractStatic } from "./static";
import { isCSRPage } from "@/lib/helpers/crawl-website-helpers";
import { extractDynamic } from "./dynamic";
import type { CrawlResult, CrawlJob, RenderModeType } from "@/types";
import { RenderMode as RenderModeEnum } from "@/lib/constants";

/**
 * Determine which extractor to use based on config and content
 */
export async function extractContent(
  job: CrawlJob,
  renderMode: RenderModeType
): Promise<CrawlResult> {
  // If explicitly set to dynamic, use Puppeteer
  if (renderMode === RenderModeEnum.DYNAMIC) {
    return extractDynamic(job);
  }

  // If static, use Cheerio only
  if (renderMode === RenderModeEnum.STATIC) {
    return extractStatic(job);
  }

  // Auto-detect: try static first, fall back to dynamic if CSR detected
  const staticResult = await extractStatic(job);

  // If static extraction returns 404, skip dynamic extraction
  if (staticResult.statusCode === 404) {
    return staticResult;
  }

  // If static extraction succeeded with substantial content, use it
  if (staticResult.success && staticResult.markdown.trim().length > 300) {
    return staticResult;
  }

  // Check if it's a CSR page OR if content is very thin (likely a loading skeleton)
  if (
    staticResult.html &&
    (isCSRPage(staticResult.html) || staticResult.markdown.trim().length < 150)
  ) {
    return extractDynamic(job);
  }

  // If static failed but not due to CSR, still try dynamic as fallback
  if (!staticResult.success) {
    return extractDynamic(job);
  }

  return staticResult;
}
