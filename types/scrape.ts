import {
  RenderMode as RenderModeEnum,
  JobStatus as JobStatusEnum,
  JobType as JobTypeEnum,
  PageStatus as PageStatusEnum,
  CrawlSessionStatus as CrawlSessionStatusEnum,
  CrawlScope as CrawlScopeEnum,
} from "@/lib/constants";
import type { EPageErrorType } from "./enums";

export type CrawlScopeType = (typeof CrawlScopeEnum)[keyof typeof CrawlScopeEnum];

/**
 * Job types supported by the crawler
 */
export type JobType = (typeof JobTypeEnum)[keyof typeof JobTypeEnum];

/**
 * Job status tracking
 */
export type JobStatusType = (typeof JobStatusEnum)[keyof typeof JobStatusEnum];

/**
 * Render mode for content extraction
 */
export type RenderModeType = (typeof RenderModeEnum)[keyof typeof RenderModeEnum];

/**
 * Metadata extracted from a page
 */
export type PageStatusType = (typeof PageStatusEnum)[keyof typeof PageStatusEnum];

/**
 * Page content structure for RAG processing
 */
export type CrawlSessionStatusType =
  (typeof CrawlSessionStatusEnum)[keyof typeof CrawlSessionStatusEnum];

/**
 * Configuration for a crawl job
 */
export interface CrawlJobConfig {
  /** CSS selectors to include */
  includeTags?: string[];
  /** CSS selectors to exclude */
  excludeTags?: string[];
  /** Transform relative URLs to absolute */
  transformRelativeUrls?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Custom user agent */
  userAgent?: string;
  /** Render mode: 'static' (cheerio), 'dynamic' (puppeteer), 'auto' (detect) */
  renderMode?: RenderModeType;
  /** Maximum crawl depth (0 = single page, 1 = page + direct links, etc.) */
  maxDepth?: number;
  /** Include subdomains when crawling (e.g., blog.example.com) */
  includeSubdomains?: boolean;
  /** Glob patterns for URLs to include */
  includePatterns?: string[];
  /** Glob patterns for URLs to exclude */
  excludePatterns?: string[];
  /** Maximum number of pages to crawl */
  maxPages?: number;
  /** Proxy URL for requests (e.g., http://user:pass@proxy.example.com:8080) */
  proxyUrl?: string;
  /** Enable stealth mode for dynamic extraction */
  useStealth?: boolean;
  /** Take screenshot on dynamic extraction (for debugging) */
  takeScreenshot?: boolean;
  /** Screenshot save path */
  screenshotPath?: string;
}

/**
 * A job submitted to the crawler queue
 */
export interface CrawlJob {
  /** Unique job identifier */
  id: string;
  /** URL to scrape */
  url: string;
  /** Type of job */
  type: JobType;
  /** Current depth in BFS traversal */
  depth: number;
  /** Parent job ID (for recursive crawls) */
  parentJobId?: string;
  /** Root job ID (the original job that started the crawl) */
  rootJobId?: string;
  /** Base domain for subdomain filtering */
  baseDomain?: string;
  /** Job configuration */
  config?: CrawlJobConfig;
  /** Timestamp when job was created */
  createdAt: number;
}

/**
 * Metadata extracted from the page
 */
export interface PageMetadata {
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Result of a crawl job
 */
export interface CrawlResult {
  /** Whether the scrape was successful */
  success: boolean;
  /** The URL that was scraped */
  url: string;
  /** Job ID this result belongs to */
  jobId: string;
  /** HTTP status code */
  statusCode?: number;
  /** Page title */
  title: string;
  /** Cleaned HTML content */
  html: string;
  /** Raw HTML content before cleaning */
  rawHtml?: string;
  /** Markdown content */
  markdown: string;
  /** Extracted metadata */
  metadata?: PageMetadata;
  /** Links found on the page (for recursive crawling) */
  links?: string[];
  /** Error message if failed */
  error?: string;
  /** Categorized error type (populated when success=false) */
  errorType?: EPageErrorType;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Data structure passed to BullMQ job
 */
export interface QueueJobData {
  job: CrawlJob;
}

export interface DiscoverJobData {
  botId: string;
  startUrl: string;
  requestId: string;
  config?: CrawlJobConfig;
}

export interface PageCrawlerJobData {
  botId: string;
  currentUrl: string;
  depth: number;
  discoverJobId: string;
  startHostname: string;
  baseDomain: string;
  maxPages: number;
  maxDepth: number;
  config?: CrawlJobConfig;
}

export interface IndexerJobData {
  botId: string;
  pageId: string;
  requestId: string;
}

/**
 * Worker processing result
 */
export interface WorkerResult {
  success: boolean;
  result?: CrawlResult;
  error?: string;
}

/**
 * Preview request options
 */
export interface PreviewOptions {
  url: string;
  botId: string;
  maxPages?: number;
  selectedUrls?: string[];
}

/**
 * Parameters for adding a job to the queue
 * Flattened version of CrawlJobConfig for convenience
 */
export interface AddJobParams {
  url: string;
  /** Pre-generated job ID (optional, will be generated if not provided) */
  jobId?: string;
  type?: JobType;
  depth?: number;
  parentJobId?: string;
  /** Full config object (takes precedence over individual fields) */
  config?: CrawlJobConfig;
  /** Render mode: 'static' (cheerio), 'dynamic' (puppeteer), 'auto' (detect) */
  renderMode?: RenderModeType;
  /** Maximum crawl depth (0 = single page, 1 = page + direct links, etc.) */
  maxDepth?: number;
  /** Include subdomains when crawling */
  includeSubdomains?: boolean;
  /** Glob patterns for URLs to include */
  includePatterns?: string[];
  /** Glob patterns for URLs to exclude */
  excludePatterns?: string[];
  /** Maximum number of pages to crawl */
  maxPages?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Proxy URL for requests */
  proxyUrl?: string;
  /** Enable stealth mode (default: true for dynamic) */
  useStealth?: boolean;
  /** Take screenshot for debugging */
  takeScreenshot?: boolean;
}

/**
 * Aggregated crawl result for a session
 */
export interface CrawlSession {
  /** Root job ID that started the crawl */
  rootJobId: string;
  /** Bot ID this crawl belongs to */
  botId: string;
  /** Expected total jobs (grows as child jobs are discovered) */
  expectedJobs: number;
  /** Number of completed jobs */
  completedJobs: number;
  /** Number of failed jobs */
  failedJobs: number;
  /** Session status */
  status: CrawlSessionStatusType;
  /** Timestamp when session started */
  startedAt: number;
  /** Timestamp when session completed */
  completedAt?: number;
  /** RAG processing result */
  ragResult?: {
    success: boolean;
    pagesProcessed: number;
    chunksCreated: number;
    documentsStored: number;
    error?: string;
  };
}

/**
 * Result from RAG pipeline processing
 */
export interface RagHookResult {
  success: boolean;
  pagesProcessed: number;
  newPages: number;
  changedPages: number;
  unchangedPages: number;
  chunksCreated: number;
  documentsStored: number;
  error?: string;
  processingTimeMs: number;
}
