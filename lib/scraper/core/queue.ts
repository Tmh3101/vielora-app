import { Queue, type JobsOptions } from "bullmq";
import { randomUUID } from "node:crypto";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { createJobRecord } from "@/lib/services/job.service";
import { createAdminClient } from "@/lib/supabase/server";
import type { CrawlJobConfig, DiscoverJobData, IndexerJobData } from "@/types";
import { DISCOVER_QUEUE_NAME, INDEXER_QUEUE_NAME, JobName } from "@/lib/constants/job";

export const RATE_LIMITER_CONFIG = {
  max: 5,
  duration: 2000,
};

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 86400,
    count: 500,
  },
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
};

let discoverQueue: Queue<DiscoverJobData> | null = null;
let indexerQueue: Queue<IndexerJobData> | null = null;

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

export async function addDiscoverJob(params: {
  botId: string;
  startUrl: string;
  requestId?: string;
  config?: CrawlJobConfig;
}): Promise<string> {
  const requestId = params.requestId ?? randomUUID();
  const queue = getDiscoverQueue();
  const jobData = {
    botId: params.botId,
    startUrl: params.startUrl,
    requestId,
    config: params.config,
  };

  // Dual-insert: DB record first, then BullMQ job
  await createJobRecord(createAdminClient(), requestId, JobName.DISCOVER, jobData, params.botId);

  await queue.add(`discover:${params.botId}:${requestId}`, jobData, { jobId: requestId });

  return requestId;
}

export async function addIndexerJob(params: {
  botId: string;
  pageId: string;
  requestId?: string;
}): Promise<string> {
  const requestId = params.requestId ?? randomUUID();
  const queue = getIndexerQueue();
  const jobId = randomUUID();
  const jobData = {
    botId: params.botId,
    pageId: params.pageId,
    requestId,
  };

  // Dual-insert: DB record first, then BullMQ job
  await createJobRecord(createAdminClient(), jobId, JobName.INDEX, jobData, params.botId);

  await queue.add(`index:${params.pageId}:${requestId}`, jobData, { jobId });

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
    opts: { jobId: string };
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
      opts: { jobId: safeJobId },
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

export async function getQueueStatus(): Promise<{
  discover: { waiting: number; active: number; completed: number; failed: number };
  indexer: { waiting: number; active: number; completed: number; failed: number };
}> {
  const [discover, indexer] = await Promise.all([getDiscoverQueue(), getIndexerQueue()]);

  const [dWaiting, dActive, dCompleted, dFailed, iWaiting, iActive, iCompleted, iFailed] =
    await Promise.all([
      discover.getWaitingCount(),
      discover.getActiveCount(),
      discover.getCompletedCount(),
      discover.getFailedCount(),
      indexer.getWaitingCount(),
      indexer.getActiveCount(),
      indexer.getCompletedCount(),
      indexer.getFailedCount(),
    ]);

  return {
    discover: { waiting: dWaiting, active: dActive, completed: dCompleted, failed: dFailed },
    indexer: { waiting: iWaiting, active: iActive, completed: iCompleted, failed: iFailed },
  };
}

export async function closeQueue(): Promise<void> {
  await Promise.all([discoverQueue?.close(), indexerQueue?.close()]);

  discoverQueue = null;
  indexerQueue = null;
}
