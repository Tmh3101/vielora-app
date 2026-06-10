import { Worker } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { closeQueue } from "./queue";
import {
  createJobRecord as _createJobRecord,
  updateJobProgress,
  updateJobState,
} from "@/lib/services/job.service";
import { normalizeWorkerProgress, publishProgress } from "@/lib/services/worker.service";
import { EJobStatus } from "@/types";
import { processDiscoverJob, processIndexerJob, processPageCrawlerJob } from "./job-processors";
import { BrowserManager } from "@/lib/scraper/core/browser-manager";
import type {
  DiscoverJobData,
  IndexerJobData,
  PageCrawlerJobData,
  QueueJobData,
  WorkerResult,
} from "@/types";
import { createAdminClient } from "@/lib/supabase/server";
import { RATE_LIMITER_CONFIG } from "@/config/scraper";
import {
  DISCOVER_QUEUE_NAME,
  INDEXER_QUEUE_NAME,
  PAGE_CRAWLER_QUEUE_NAME,
  DISCOVER_WORKER_CONCURRENCY,
  INDEXER_WORKER_CONCURRENCY,
  PAGE_CRAWLER_WORKER_CONCURRENCY,
} from "@/lib/constants/job";
import { getBotIndexStreamId, getJobProgressStreamId } from "@/lib/helpers";

let discoverWorker: Worker<DiscoverJobData> | null = null;
let pageCrawlerWorker: Worker<PageCrawlerJobData> | null = null;
let indexerWorker: Worker<IndexerJobData> | null = null;
let legacyCrawlerWorker: Worker<QueueJobData, WorkerResult> | null = null;

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
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Completed);
  });

  discoverWorker.on("failed", (job, err) => {
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Failed, err.message);
  });

  discoverWorker.on("progress", (job, progress) => {
    if (!job?.id) return;
    const { percent, currentUrl } = normalizeWorkerProgress(progress);
    void updateJobProgress(
      trackingClient,
      job.id,
      percent,
      currentUrl ? { current_url: currentUrl } : undefined
    ).catch((error) => {
      console.error(`[DiscoverWorker] Failed to update job progress for job ${job.id}:`, error);
    });
    publishProgress(getJobProgressStreamId(job.id), percent, currentUrl);
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
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Completed);
  });

  indexerWorker.on("failed", (job, err) => {
    if (job?.id) void updateJobState(trackingClient, job.id, EJobStatus.Failed, err.message);
  });

  indexerWorker.on("progress", (job, progress) => {
    if (!job?.id) return;
    const { percent, currentUrl } = normalizeWorkerProgress(progress);
    void updateJobProgress(
      trackingClient,
      job.id,
      percent,
      currentUrl ? { current_url: currentUrl } : undefined
    ).catch((error) => {
      console.error(`[IndexerWorker] Failed to update job progress for job ${job.id}:`, error);
    });
    publishProgress(getJobProgressStreamId(job.id), percent, currentUrl);
    if (job.data.botId) publishProgress(getBotIndexStreamId(job.data.botId), percent, currentUrl);
  });

  return indexerWorker;
}

export function startPageCrawlerWorker(): Worker<PageCrawlerJobData> {
  if (pageCrawlerWorker) return pageCrawlerWorker;
  const trackingClient = createAdminClient();

  pageCrawlerWorker = new Worker<PageCrawlerJobData>(
    PAGE_CRAWLER_QUEUE_NAME,
    processPageCrawlerJob,
    {
      connection: getRedisConnectionOptions(),
      concurrency: PAGE_CRAWLER_WORKER_CONCURRENCY,
      limiter: {
        max: RATE_LIMITER_CONFIG.max,
        duration: RATE_LIMITER_CONFIG.duration,
      },
      lockDuration: 120000,
      stalledInterval: 30000,
      maxStalledCount: 1,
      drainDelay: 60,
    }
  );

  pageCrawlerWorker.on("error", (error) => {
    console.error("[PageCrawlerWorker] Error:", error.message);
  });

  pageCrawlerWorker.on("active", (job) => {
    if (job.data.mode !== "single_url_knowledge" || !job.id) return;
    void updateJobState(trackingClient, job.id, EJobStatus.Active);
  });

  pageCrawlerWorker.on("completed", (job) => {
    if (job.data.mode !== "single_url_knowledge" || !job.id) return;
    void updateJobState(trackingClient, job.id, EJobStatus.Completed);
  });

  pageCrawlerWorker.on("failed", (job, err) => {
    if (job?.data.mode !== "single_url_knowledge" || !job.id) return;
    void updateJobState(trackingClient, job.id, EJobStatus.Failed, err.message);
  });

  pageCrawlerWorker.on("progress", (job, progress) => {
    if (job.data.mode !== "single_url_knowledge" || !job.id) return;
    const { percent, currentUrl } = normalizeWorkerProgress(progress);
    void updateJobProgress(
      trackingClient,
      job.id,
      percent,
      currentUrl ? { current_url: currentUrl } : undefined
    ).catch((error) => {
      console.error(`[PageCrawlerWorker] Failed to update job progress for job ${job.id}:`, error);
    });
    publishProgress(getJobProgressStreamId(job.id), percent, currentUrl);
  });

  return pageCrawlerWorker;
}

export function startWorkers(): {
  discover: Worker<DiscoverJobData>;
  pageCrawler: Worker<PageCrawlerJobData>;
  indexer: Worker<IndexerJobData>;
} {
  return {
    discover: startDiscoverWorker(),
    pageCrawler: startPageCrawlerWorker(),
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

export async function stopPageCrawlerWorker(): Promise<void> {
  if (!pageCrawlerWorker) return;
  await pageCrawlerWorker.close();
  pageCrawlerWorker = null;
}

export async function stopWorker(): Promise<void> {
  if (!legacyCrawlerWorker) return;
  await legacyCrawlerWorker.close();
  legacyCrawlerWorker = null;
}

export async function stopWorkers(): Promise<void> {
  await Promise.all([
    stopDiscoverWorker(),
    stopPageCrawlerWorker(),
    stopIndexerWorker(),
    stopWorker(),
  ]);
}

export async function gracefulShutdown(): Promise<void> {
  await stopWorkers();
  await BrowserManager.closeAll();
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
    (pageCrawlerWorker !== null && !pageCrawlerWorker.closing) ||
    (indexerWorker !== null && !indexerWorker.closing) ||
    (legacyCrawlerWorker !== null && !legacyCrawlerWorker.closing)
  );
}
