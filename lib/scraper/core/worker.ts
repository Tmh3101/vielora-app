import { Worker, type Job } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { RATE_LIMITER_CONFIG, closeQueue } from "./queue";
import { DISCOVER_QUEUE_NAME, INDEXER_QUEUE_NAME } from "@/lib/constants/job";
import { extractContent } from "@/lib/scraper/extractors";
import { processLinks, extractBaseDomain, normalizeUrl } from "./link-processor";
import { ensureProtocol, fetchSitemapUrls } from "@/lib/helper/crawl-website-helpers";
import {
  createJobRecord as _createJobRecord,
  updateJobState,
  updateJobProgress,
} from "@/lib/services/job.service";
import {
  getPageByBotIdAndUrlServer,
  insertPageServer,
  updatePageServer,
  getPageByIdServer,
  deleteDocumentsByPageUrl,
  countDocumentsByBotIdAndUrlServer,
  insertDocumentsServer,
  countPagesByBotIdAndStatusesServer,
} from "@/lib/services/page.service";
import { setBotReadyServer, setBotStatusIfNotReadyServer } from "@/lib/services/bot.service";
import { EJobStatus } from "@/types";
import type {
  CrawlJob,
  CrawlResult,
  DiscoverJobData,
  IndexerJobData,
  QueueJobData,
  RenderModeType,
  WorkerResult,
  PageContent,
} from "@/types";
import { isSoft404 } from "@/lib/helper/crawl-website-helpers";
import { EBotStatus, EPageStatus, EPageErrorType } from "@/types";
import { RenderMode as RenderModeEnum } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { hashContent } from "@/lib/helper/crawl-website-helpers";
import { createChunks, embedChunks } from "@/lib/rag-processor";
import { DISCOVER_WORKER_CONCURRENCY, INDEXER_WORKER_CONCURRENCY } from "@/lib/constants/job";
import { MAX_PAGES, MAX_DEPTH } from "@/config/scraper";

let discoverWorker: Worker<DiscoverJobData> | null = null;
let indexerWorker: Worker<IndexerJobData> | null = null;
let legacyCrawlerWorker: Worker<QueueJobData, WorkerResult> | null = null;

async function insertPageIfNotExists(params: {
  botId: string;
  url: string;
  title?: string;
  rawContent?: string;
  content?: string;
  status: EPageStatus;
  depth?: number;
  contentHash?: string;
  errorMessage?: string;
  errorType?: EPageErrorType;
  httpStatusCode?: number;
}) {
  const supabase = createAdminClient();
  const crawledAt = new Date().toISOString();

  const existingPage = await getPageByBotIdAndUrlServer(supabase, params.botId, params.url);

  if (!existingPage) {
    await insertPageServer(supabase, {
      bot_id: params.botId,
      url: params.url,
      title: params.title ?? null,
      raw_content: params.rawContent ?? null,
      content: params.content ?? null,
      status: params.status,
      depth: params.depth ?? null,
      content_hash: params.contentHash ?? null,
      error_message: params.errorMessage ?? null,
      error_type: params.errorType ?? null,
      http_status_code: params.httpStatusCode ?? null,
      crawled_at: crawledAt,
    });
  } else if (existingPage.status === EPageStatus.Failed) {
    await updatePageServer(supabase, existingPage.id, {
      title: params.title ?? existingPage.title,
      raw_content: params.rawContent ?? existingPage.raw_content,
      content: params.content ?? existingPage.content,
      status: params.status,
      depth: params.depth ?? existingPage.depth,
      content_hash: params.contentHash ?? existingPage.content_hash,
      error_message: params.errorMessage ?? existingPage.error_message,
      error_type: params.errorType ?? existingPage.error_type,
      http_status_code: params.httpStatusCode ?? existingPage.http_status_code,
      crawled_at: crawledAt,
    });
  }
}

async function finalizeBotIfDone(botId: string): Promise<void> {
  const supabase = createAdminClient();

  const [pendingCount, completedCount, ignoredCount] = await Promise.all([
    countPagesByBotIdAndStatusesServer(supabase, botId, [
      EPageStatus.PendingIndex,
      EPageStatus.Processing,
    ]),
    countPagesByBotIdAndStatusesServer(supabase, botId, EPageStatus.Completed),
    countPagesByBotIdAndStatusesServer(supabase, botId, EPageStatus.Ignored),
  ]);

  if (pendingCount > 0) return;

  const completed = completedCount;
  const ignored = ignoredCount;

  if (completed + ignored > 0) {
    await setBotReadyServer(supabase, botId);
    return;
  }

  await setBotStatusIfNotReadyServer(supabase, botId, EBotStatus.Failed);
}

async function processDiscoverJob(job: Job<DiscoverJobData>): Promise<void> {
  const { botId, startUrl, config } = job.data;
  console.log(`Starting job for botId=${botId}, startUrl=${startUrl}`);
  const supabase = createAdminClient();

  const normalizedStartUrl = normalizeUrl(ensureProtocol(startUrl));
  const maxPages = Math.max(config?.maxPages ?? MAX_PAGES, 1);
  const maxDepth = Math.max(config?.maxDepth ?? MAX_DEPTH, 0);
  const baseDomain = extractBaseDomain(normalizedStartUrl);
  const renderMode: RenderModeType = config?.renderMode ?? RenderModeEnum.AUTO;

  const queue: Array<{ url: string; depth: number }> = [{ url: normalizedStartUrl, depth: 0 }];
  const visited = new Set<string>([normalizedStartUrl]);

  const sitemapUrls = await fetchSitemapUrls(normalizedStartUrl, maxPages);
  for (const url of sitemapUrls) {
    if (visited.size >= maxPages) break;
    if (!visited.has(url)) {
      visited.add(url);
      queue.push({ url, depth: 1 });
    }
  }

  let successCount = 0;
  let crawledCount = 0; // total attempts (success + failure) — used to enforce maxPages cap
  while (queue.length > 0 && crawledCount < maxPages) {
    const current = queue.shift();
    if (!current) continue;

    crawledCount++;

    const crawlJob: CrawlJob = {
      id: randomUUID(),
      url: current.url,
      type: "scrape",
      depth: current.depth,
      baseDomain,
      config,
      createdAt: Date.now(),
    };

    let result: CrawlResult;
    // Hard outer timeout: even if extractContent's internal timeout fails to
    // fire (e.g. browser.close() deadlock), this guarantees the crawl loop
    // keeps moving. Set to 2× the per-page timeout for a generous margin.
    const pageTimeoutMs = (config?.timeout ?? 30000) * 2;
    try {
      result = await Promise.race([
        extractContent(crawlJob, renderMode),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Page timed out after ${pageTimeoutMs}ms`)),
            pageTimeoutMs
          )
        ),
      ]);
    } catch (error) {
      result = {
        success: false,
        url: current.url,
        jobId: crawlJob.id,
        title: "",
        html: "",
        markdown: "",
        error: error instanceof Error ? error.message : "Unknown discover error",
        processingTimeMs: 0,
      };
    }

    console.log(
      `[${crawledCount}] Crawling (botId=${botId}): ${current.url} at depth ${current.depth} [success=${result.success}, error=${result.error ?? "none"}]`
    );

    if (!result.success) {
      // Skip failed pages — do not persist errors to DB
      continue;
    }

    console.log("Page:", {
      url: result.url,
      title: result.title,
      markdownLength: result.markdown.length,
      htmlLength: result.html.length,
    });

    // Soft 404 detection: HTTP 200 but content signals a "not found" page
    if (isSoft404(result.title, result.markdown)) {
      // Skip soft-404 pages — do not persist to DB
      continue;
    }

    successCount++;

    await insertPageIfNotExists({
      botId,
      url: current.url,
      title: result.title,
      rawContent: result.rawHtml || result.html,
      content: result.markdown,
      depth: current.depth,
      status: EPageStatus.Pending,
    });

    if (current.depth >= maxDepth) continue;

    const linkResult = processLinks("", {
      baseUrl: current.url,
      baseDomain,
      includeSubdomains: config?.includeSubdomains ?? true,
      includePatterns: config?.includePatterns,
      excludePatterns: config?.excludePatterns,
      visitedUrls: visited,
      preExtractedLinks: result.links,
    });

    for (const nextUrl of linkResult.validUrls) {
      if (visited.size >= maxPages) break;

      if (!visited.has(nextUrl)) {
        visited.add(nextUrl);
        queue.push({ url: nextUrl, depth: current.depth + 1 });
      }
    }
  }

  await setBotStatusIfNotReadyServer(
    supabase,
    botId,
    successCount > 0 ? EBotStatus.Discovered : EBotStatus.Failed
  );
}

async function processIndexerJob(job: Job<IndexerJobData>): Promise<void> {
  const { botId, pageId } = job.data;
  const supabase = createAdminClient();

  const page = await getPageByIdServer(supabase, pageId);

  if (!page) {
    return;
  }

  if (!page.content) {
    await updatePageServer(supabase, pageId, {
      status: EPageStatus.Failed,
      error_message: "Missing content",
    });
    await finalizeBotIfDone(botId);
    return;
  }

  await updatePageServer(supabase, pageId, { status: EPageStatus.Processing, error_message: null });

  try {
    // CPU Optimization: Skip HTML cleaning for manual_text entries since they're already clean
    const contentHash = hashContent(page.content);
    const existingDocCount = await countDocumentsByBotIdAndUrlServer(supabase, botId, page.url);

    if (page.content_hash === contentHash && existingDocCount > 0) {
      await updatePageServer(supabase, pageId, {
        status: EPageStatus.Completed,
        error_message: null,
        crawled_at: new Date().toISOString(),
      });
      await finalizeBotIfDone(botId);
      return;
    }

    const pageContent: PageContent = {
      url: page.url,
      title: page.title || page.url,
      content: page.content,
    };

    const chunks = createChunks([pageContent]);
    const embedded = await embedChunks(chunks);

    await deleteDocumentsByPageUrl(supabase, botId, page.url);

    if (embedded.length > 0) {
      const docsToInsert: TablesInsert<"documents">[] = embedded.map((doc) => ({
        bot_id: botId,
        content: doc.content,
        metadata: {
          ...doc.metadata,
          pageId: page.id,
          url: page.url,
        },
        embedding: `[${doc.embedding.join(",")}]`,
      }));

      await insertDocumentsServer(supabase, docsToInsert);
    }

    await updatePageServer(supabase, pageId, {
      content_hash: contentHash,
      status: EPageStatus.Completed,
      error_message: null,
      crawled_at: new Date().toISOString(),
    });
  } catch (error) {
    await updatePageServer(supabase, pageId, {
      status: EPageStatus.Failed,
      error_message: error instanceof Error ? error.message : "Failed to index page",
    });
  }

  await finalizeBotIfDone(botId);
}

export function startDiscoverWorker(): Worker<DiscoverJobData> {
  if (discoverWorker) return discoverWorker;
  const trackingClient = createAdminClient();

  discoverWorker = new Worker<DiscoverJobData>(DISCOVER_QUEUE_NAME, processDiscoverJob, {
    connection: getRedisConnectionOptions(),
    concurrency: DISCOVER_WORKER_CONCURRENCY,
    limiter: {
      max: RATE_LIMITER_CONFIG.max,
      duration: RATE_LIMITER_CONFIG.duration,
    },
    lockDuration: 120000,
    // Reduced from 600000 (10 min) to 30000 (30 s) so that if the worker
    // process crashes or hangs, BullMQ re-queues the job within 30 seconds
    // instead of leaving the onboarding screen loading for 10 minutes.
    stalledInterval: 30000,
    maxStalledCount: 1,
    drainDelay: 60,
  });

  discoverWorker.on("error", (error) => {
    console.error("[DiscoverWorker] Error:", error.message);
  });

  discoverWorker.on("active", (job) => {
    void updateJobState(trackingClient, job.id!, EJobStatus.Active);
  });

  discoverWorker.on("completed", (job) => {
    void updateJobState(trackingClient, job.id!, EJobStatus.Completed);
  });

  discoverWorker.on("failed", (job, err) => {
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Failed, err.message);
  });

  discoverWorker.on("progress", (job, progress) => {
    const pct = typeof progress === "number" ? progress : 0;
    // Only persist on multiples of 10 to avoid Supabase rate-limiting
    if (pct % 10 === 0) void updateJobProgress(trackingClient, job.id!, pct);
  });

  return discoverWorker;
}

export function startIndexerWorker(): Worker<IndexerJobData> {
  if (indexerWorker) return indexerWorker;
  const trackingClient = createAdminClient();

  indexerWorker = new Worker<IndexerJobData>(INDEXER_QUEUE_NAME, processIndexerJob, {
    connection: getRedisConnectionOptions(),
    concurrency: INDEXER_WORKER_CONCURRENCY,
    lockDuration: 120000,
    stalledInterval: 600000,
    maxStalledCount: 1,
    drainDelay: 60,
  });

  indexerWorker.on("error", (error) => {
    console.error("[IndexerWorker] Error:", error.message);
  });

  indexerWorker.on("active", (job) => {
    void updateJobState(trackingClient, job.id!, EJobStatus.Active);
  });

  indexerWorker.on("completed", (job) => {
    void updateJobState(trackingClient, job.id!, EJobStatus.Completed);
  });

  indexerWorker.on("failed", (job, err) => {
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Failed, err.message);
  });

  indexerWorker.on("progress", (job, progress) => {
    const pct = typeof progress === "number" ? progress : 0;
    if (pct % 10 === 0) void updateJobProgress(trackingClient, job.id!, pct);
  });

  return indexerWorker;
}

export function startWorkers(): {
  discover: Worker<DiscoverJobData>;
  indexer: Worker<IndexerJobData>;
} {
  return {
    discover: startDiscoverWorker(),
    indexer: startIndexerWorker(),
  };
}

export async function stopDiscoverWorker(): Promise<void> {
  if (!discoverWorker) return;
  await discoverWorker.close();
  discoverWorker = null;
}

export async function stopIndexerWorker(): Promise<void> {
  if (!indexerWorker) return;
  await indexerWorker.close();
  indexerWorker = null;
}

export async function stopWorker(): Promise<void> {
  if (!legacyCrawlerWorker) return;
  await legacyCrawlerWorker.close();
  legacyCrawlerWorker = null;
}

export async function stopWorkers(): Promise<void> {
  await Promise.all([stopDiscoverWorker(), stopIndexerWorker(), stopWorker()]);
}

export async function gracefulShutdown(): Promise<void> {
  await stopWorkers();
  await closeQueue();
}

export function registerShutdownHandlers(): void {
  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM");
    await gracefulShutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("Received SIGINT");
    await gracefulShutdown();
    process.exit(0);
  });
}

export function isWorkerRunning(): boolean {
  return (
    (discoverWorker !== null && !discoverWorker.closing) ||
    (indexerWorker !== null && !indexerWorker.closing) ||
    (legacyCrawlerWorker !== null && !legacyCrawlerWorker.closing)
  );
}
