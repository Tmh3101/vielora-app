export const RenderMode = {
  STATIC: "static",
  DYNAMIC: "dynamic",
  AUTO: "auto",
} as const;

export const JobStatus = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const JobType = {
  CRAWL: "crawl",
  SCRAPE: "scrape",
} as const;

export const PageStatus = {
  NEW: "new",
  CHANGED: "changed",
  UNCHANGED: "unchanged",
} as const;

export const CrawlSessionStatus = {
  PENDING: "pending",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  FAILED: "failed",
  PROCESSING_RAG: "processing-rag",
} as const;

export const JobName = {
  DISCOVER: "discover",
  PAGE_CRAWL: "page_crawl",
  INDEX: "index",
} as const;

export const DISCOVER_QUEUE_NAME = "discover-queue";
export const DISCOVER_WORKER_CONCURRENCY = 5;

export const PAGE_CRAWLER_QUEUE_NAME = "page-crawler-queue";
export const PAGE_CRAWLER_WORKER_CONCURRENCY = 5;

export const INDEXER_QUEUE_NAME = "indexer-queue";
export const INDEXER_WORKER_CONCURRENCY = 2;

export const CRON_QUEUE_NAME = "cron-queue";
export const CRON_WORKER_CONCURRENCY = 1;
