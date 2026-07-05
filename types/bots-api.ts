import { ApiResponse } from "./utils";
import type { PageStatusType, RenderModeType } from "./scrape";
import { EBotStatus } from "./enums";

/**
 * Page content for RAG processing
 */
export interface PageContent {
  url: string;
  title: string;
  content: string;
}

export type PreviewRequest = {
  url: string;
  botId: string;
  maxPages?: number;
  selectedUrls?: string[];
};

export type PageStatus = {
  url: string;
  title: string;
  status: PageStatusType;
  content: string;
  contentHash?: string;
};

export type CrawlPageError = {
  url: string;
  error: string;
};

export type PreviewData = {
  pages: PageStatus[];
  errors?: CrawlPageError[];
  totalUrls: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
};

export type PreviewResponse = ApiResponse<PreviewData>;

// ============================================================================
// Async Crawl API Types (V2)
// ============================================================================

export type CrawlRequest = {
  url: string;
  botId: string;
  maxPages?: number;
  maxDepth?: number;
  renderMode?: RenderModeType;
  includeSubdomains?: boolean;
  selectedUrls?: string[]; // For backward compatibility
};

export type CrawlStartResponse = ApiResponse<{
  jobId: string;
  botId: string;
  status: "queued";
  checkStatusUrl: string;
}>;

export type CrawlStatusData = {
  jobId: string;
  botId: string | null;
  name: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type CrawlStatusResponse = ApiResponse<CrawlStatusData>;

export type DiscoverRequest = {
  botId: string;
  url: string;
  maxPages?: number;
  maxDepth?: number;
  includeSubdomains?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  renderMode?: RenderModeType;
};

export type DiscoverResponse = ApiResponse<{
  discoverJobId: string;
  botId: string;
  status: "queued";
}>;

export type PipelineStatusData = {
  botId: string;
  botStatus: EBotStatus | string;
  counts: Record<string, number>;
};

export type PipelineStatusResponse = ApiResponse<PipelineStatusData>;

export type SelectionRequest = {
  botId: string;
  selectedPageIds: string[];
};

export type SelectionResponse = ApiResponse<{
  botId: string;
  selectedCount: number;
  ignoredCount: number;
  queuedCount: number;
  jobIds: string[];
}>;

export type QueueStatusData = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

export type QueueStatusResponse = ApiResponse<QueueStatusData>;

// Legacy types for backward compatibility
export type CrawlData = {
  botId: string;
  pages: PageContent[];
  errors: CrawlPageError[];
  totalUrls: number;
  successCount: number;
  errorCount: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  rag?: {
    chunksCreated: number;
    documentsStored: number;
  };
};

export type CrawlResponse = ApiResponse<CrawlData>;
