import { ApiResponse } from "./utils";
import type { PageStatusType, RenderModeType } from "./scrape";
import type { KnowledgeRequestMode } from "@/lib/constants/knowledge";
import { EBotStatus, EWidgetBackgroundType, EWidgetIconType, EPageSourceType } from "./enums";
import { getBotAnalytics } from "@/lib/services/analytics.service";

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

export interface AnalyticsRouteResponse {
  success: boolean;
  message?: string;
  data?: Awaited<ReturnType<typeof getBotAnalytics>>;
}

export interface AllowedDomainsRequest {
  allowedDomains?: unknown;
}

export interface AppearanceUpdateRequest {
  name?: string;
  avatarUrl?: string | null;
  widgetSettings?: {
    primaryColor?: string;
    textColor?: string;
    position?: string;
    welcomeMessage?: string;
    suggestedQuestions?: string[] | null;
    chatBackgroundType?: EWidgetBackgroundType;
    chatBackgroundValue?: string;
    chatBackgroundOpacity?: number;
    chatIconType?: EWidgetIconType;
    chatIconPreset?: string;
    chatIconUrl?: string | null;
    chatIconColor?: string;
    chatIconBgColor?: string;
  };
}

export interface AppearanceUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    avatar_url: string | null;
    widget_settings: Record<string, unknown>;
  };
}

export type JobStatusResponse = ApiResponse<{
  jobId: string;
  botId: string | null;
  name: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}>;

export type QueueAllStatusResponse = ApiResponse<{
  discover: { pending: number; active: number; completed: number; failed: number };
  pageCrawler: { pending: number; active: number; completed: number; failed: number };
  indexer: { pending: number; active: number; completed: number; failed: number };
}>;

export type BotPipelineStatusResponse = ApiResponse<{
  botId: string;
  botStatus: string;
  counts: Record<string, number>;
}>;

export interface EditKnowledgeRequest {
  title: string;
  content: string;
}

export type EditKnowledgeResponse = ApiResponse<{
  pageId: string;
  jobId?: string;
}>;

export interface KnowledgeRequest {
  botId?: string;
  isManual?: boolean;
  mode?: KnowledgeRequestMode;
  context?: "onboarding";
  title?: string;
  content?: string;
  url?: string;
  filePath?: string;
}

export type KnowledgeResponse = ApiResponse<{
  pageId: string;
  jobId: string;
  sourceType: EPageSourceType;
}>;
