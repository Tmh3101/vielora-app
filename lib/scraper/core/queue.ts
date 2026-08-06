import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { createJobRecord } from "@/lib/services/job.service";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  CrawlJobConfig,
  DiscoverJobData,
  IndexerJobData,
  PageCrawlerJobData,
  WorkspaceKnowledgeJobData,
} from "@/types";
import {
  DISCOVER_QUEUE_NAME,
  INDEXER_QUEUE_NAME,
  JobName,
  PAGE_CRAWLER_QUEUE_NAME,
  WORKSPACE_KNOWLEDGE_QUEUE_NAME,
} from "@/lib/constants/job";
import { DEFAULT_JOB_OPTIONS } from "@/config/scraper";

let discoverQueue: Queue<DiscoverJobData> | null = null;
let indexerQueue: Queue<IndexerJobData> | null = null;
let pageCrawlerQueue: Queue<PageCrawlerJobData> | null = null;
let workspaceKnowledgeQueue: Queue<WorkspaceKnowledgeJobData> | null = null;

export function getDiscoverQueue(): Queue<DiscoverJobData> {
  if (!discoverQueue) {
    discoverQueue = new Queue<DiscoverJobData>(DISCOVER_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return discoverQueue;
}

export function getIndexerQueue(): Queue<IndexerJobData> {
  if (!indexerQueue) {
    indexerQueue = new Queue<IndexerJobData>(INDEXER_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return indexerQueue;
}

export function getPageCrawlerQueue(): Queue<PageCrawlerJobData> {
  if (!pageCrawlerQueue) {
    pageCrawlerQueue = new Queue<PageCrawlerJobData>(PAGE_CRAWLER_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return pageCrawlerQueue;
}

export function getWorkspaceKnowledgeQueue(): Queue<WorkspaceKnowledgeJobData> {
  if (!workspaceKnowledgeQueue) {
    workspaceKnowledgeQueue = new Queue<WorkspaceKnowledgeJobData>(WORKSPACE_KNOWLEDGE_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return workspaceKnowledgeQueue;
}

export async function addDiscoverJob(params: {
  botId: string;
  startUrl: string;
  requestId?: string;
  config?: CrawlJobConfig;
}): Promise<string> {
  const requestId = params.requestId ?? randomUUID();
  const queue = getDiscoverQueue();
  const jobData: DiscoverJobData = {
    botId: params.botId,
    startUrl: params.startUrl,
    requestId,
    config: params.config,
  };

  // Dual-insert: DB record first, then BullMQ job
  await createJobRecord(
    createAdminClient(),
    requestId,
    JobName.DISCOVER,
    jobData as unknown as Record<string, unknown>,
    params.botId
  );

  await queue.add(`discover:${params.botId}:${requestId}`, jobData, { jobId: requestId });

  return requestId;
}

export async function addSingleUrlCrawlJob(params: {
  botId: string;
  pageId: string;
  url: string;
  requestId?: string;
  config?: CrawlJobConfig;
  creditRefund?: PageCrawlerJobData["creditRefund"];
}): Promise<string> {
  const requestId = params.requestId ?? randomUUID();
  const queue = getPageCrawlerQueue();
  const jobId = randomUUID();
  const hostname = new URL(params.url).hostname;
  const jobData: PageCrawlerJobData = {
    mode: "single_url_knowledge",
    botId: params.botId,
    currentUrl: params.url,
    depth: 0,
    discoverJobId: requestId,
    startHostname: hostname,
    baseDomain: hostname,
    maxPages: 1,
    maxDepth: 0,
    config: params.config,
    pageId: params.pageId,
  };
  if (params.creditRefund) jobData.creditRefund = params.creditRefund;

  await createJobRecord(
    createAdminClient(),
    jobId,
    JobName.PAGE_CRAWL,
    jobData as unknown as Record<string, unknown>,
    params.botId
  );

  await queue.add(`page-crawl:single-url:${params.pageId}:${requestId}`, jobData, {
    jobId,
    attempts: 1,
  });

  return jobId;
}

export async function addIndexerJob(params: {
  botId: string;
  pageId: string;
  requestId?: string;
  creditRefund?: IndexerJobData["creditRefund"];
}): Promise<string> {
  const requestId = params.requestId ?? randomUUID();
  const queue = getIndexerQueue();
  const jobId = randomUUID();
  const jobData: IndexerJobData = {
    botId: params.botId,
    pageId: params.pageId,
    requestId,
  };
  if (params.creditRefund) jobData.creditRefund = params.creditRefund;

  // Dual-insert: DB record first, then BullMQ job
  await createJobRecord(
    createAdminClient(),
    jobId,
    JobName.INDEX,
    jobData as unknown as Record<string, unknown>,
    params.botId
  );

  await queue.add(`index:${params.pageId}:${requestId}`, jobData, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });

  return jobId;
}

export async function addIndexerJobs(
  jobs: Array<{ botId: string; pageId: string; requestId?: string }>
): Promise<string[]> {
  const queue = getIndexerQueue();
  const ids: string[] = [];

  type BulkItem = {
    name: string;
    data: IndexerJobData;
    opts: { jobId: string; attempts: number; backoff: { type: string; delay: number } };
    safeJobId: string;
    jobData: IndexerJobData;
  };

  const items: BulkItem[] = jobs.map((job) => {
    const requestId = job.requestId ?? randomUUID();
    const safeJobId = randomUUID();
    const jobData: IndexerJobData = { botId: job.botId, pageId: job.pageId, requestId };
    ids.push(requestId);
    return {
      name: `index:${job.pageId}:${requestId}`,
      data: jobData,
      opts: { jobId: safeJobId, attempts: 3, backoff: { type: "exponential", delay: 10000 } },
      safeJobId,
      jobData,
    };
  });

  // Create DB records concurrently before enqueuing
  await Promise.all(
    items.map((item) =>
      createJobRecord(
        createAdminClient(),
        item.safeJobId,
        JobName.INDEX,
        item.jobData as unknown as Record<string, unknown>,
        item.jobData.botId
      )
    )
  );

  await queue.addBulk(items.map((item) => ({ name: item.name, data: item.data, opts: item.opts })));
  const indexerJobIds = items.map((item) => item.safeJobId);

  return indexerJobIds;
}

export async function addWorkspaceKnowledgeJob(
  itemId: string,
  workspaceId: string
): Promise<string> {
  const requestId = randomUUID();
  const queue = getWorkspaceKnowledgeQueue();
  const jobId = randomUUID();
  const jobData: WorkspaceKnowledgeJobData = {
    itemId,
    workspaceId,
    requestId,
  };

  // Dual-insert: DB record first, then BullMQ job
  await createJobRecord(
    createAdminClient(),
    jobId,
    JobName.WORKSPACE_KNOWLEDGE,
    jobData as unknown as Record<string, unknown>
  );

  await queue.add(`workspace-knowledge:${itemId}:${requestId}`, jobData, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
  });

  return jobId;
}

export async function getQueueStatus(): Promise<{
  discover: { waiting: number; active: number; completed: number; failed: number };
  pageCrawler: { waiting: number; active: number; completed: number; failed: number };
  indexer: { waiting: number; active: number; completed: number; failed: number };
  workspaceKnowledge: { waiting: number; active: number; completed: number; failed: number };
}> {
  const [discover, pageCrawler, indexer, workspaceKnowledge] = await Promise.all([
    getDiscoverQueue(),
    getPageCrawlerQueue(),
    getIndexerQueue(),
    getWorkspaceKnowledgeQueue(),
  ]);

  const [
    dWaiting,
    dActive,
    dCompleted,
    dFailed,
    pWaiting,
    pActive,
    pCompleted,
    pFailed,
    iWaiting,
    iActive,
    iCompleted,
    iFailed,
    wkWaiting,
    wkActive,
    wkCompleted,
    wkFailed,
  ] = await Promise.all([
    discover.getWaitingCount(),
    discover.getActiveCount(),
    discover.getCompletedCount(),
    discover.getFailedCount(),
    pageCrawler.getWaitingCount(),
    pageCrawler.getActiveCount(),
    pageCrawler.getCompletedCount(),
    pageCrawler.getFailedCount(),
    indexer.getWaitingCount(),
    indexer.getActiveCount(),
    indexer.getCompletedCount(),
    indexer.getFailedCount(),
    workspaceKnowledge.getWaitingCount(),
    workspaceKnowledge.getActiveCount(),
    workspaceKnowledge.getCompletedCount(),
    workspaceKnowledge.getFailedCount(),
  ]);

  return {
    discover: { waiting: dWaiting, active: dActive, completed: dCompleted, failed: dFailed },
    pageCrawler: { waiting: pWaiting, active: pActive, completed: pCompleted, failed: pFailed },
    indexer: { waiting: iWaiting, active: iActive, completed: iCompleted, failed: iFailed },
    workspaceKnowledge: {
      waiting: wkWaiting,
      active: wkActive,
      completed: wkCompleted,
      failed: wkFailed,
    },
  };
}

export async function closeQueue(): Promise<void> {
  await Promise.all([
    discoverQueue?.close(),
    pageCrawlerQueue?.close(),
    indexerQueue?.close(),
    workspaceKnowledgeQueue?.close(),
  ]);

  discoverQueue = null;
  pageCrawlerQueue = null;
  indexerQueue = null;
  workspaceKnowledgeQueue = null;
}
