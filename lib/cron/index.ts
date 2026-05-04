import { Queue, Worker, type Job } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import {
  processSubscriptionLifecycle,
  processExpiryReminders,
} from "@/lib/services/subscription-cron.service";
import type {
  LifecycleResult,
  ExpiryReminderResult,
} from "@/lib/services/subscription-cron.service";
import { CRON_QUEUE_NAME, CRON_WORKER_CONCURRENCY } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";

const DAILY_SUBSCRIPTION_JOB_NAME = "daily-subscription-check" as const;
const DAILY_SUBSCRIPTION_JOB_ID = "daily-subscription-check-job";
const DAILY_EXPIRY_REMINDER_JOB_NAME = "daily-expiry-reminder" as const;
const DAILY_EXPIRY_REMINDER_JOB_ID = "daily-expiry-reminder-job";
const DAILY_SUBSCRIPTION_CRON = "0 0 * * *";

const cronQueue = new Queue(CRON_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

let cronWorker: Worker | null = null;

async function handleCronJob(job: Job): Promise<LifecycleResult | ExpiryReminderResult | void> {
  console.log(`[CronWorker] Processing job: ${job.name} (id=${job.id})`);

  switch (job.name) {
    case DAILY_SUBSCRIPTION_JOB_NAME:
      return await processSubscriptionLifecycle(createAdminClient());
    case DAILY_EXPIRY_REMINDER_JOB_NAME:
      return await processExpiryReminders(createAdminClient());

    default:
      console.warn(`[CronWorker] Unknown job name: "${job.name}" — skipping`);
  }
}

/** Registers all repeatable cron jobs. Safe to call on every startup. */
export async function initCronJobs(): Promise<void> {
  await cronQueue.add(
    DAILY_SUBSCRIPTION_JOB_NAME,
    {},
    {
      repeat: { pattern: DAILY_SUBSCRIPTION_CRON },
      jobId: DAILY_SUBSCRIPTION_JOB_ID,
    }
  );

  await cronQueue.add(
    DAILY_EXPIRY_REMINDER_JOB_NAME,
    {},
    {
      repeat: { pattern: DAILY_SUBSCRIPTION_CRON },
      jobId: DAILY_EXPIRY_REMINDER_JOB_ID,
    }
  );

  console.log(
    `[CronSystem] Registered repeatable jobs: "${DAILY_SUBSCRIPTION_JOB_NAME}", "${DAILY_EXPIRY_REMINDER_JOB_NAME}" (${DAILY_SUBSCRIPTION_CRON})`
  );
}

/** Starts the BullMQ worker. Returns existing worker if already running. */
export function startCronWorker(): Worker {
  if (cronWorker) return cronWorker;

  cronWorker = new Worker(CRON_QUEUE_NAME, handleCronJob, {
    connection: getRedisConnectionOptions(),
    concurrency: CRON_WORKER_CONCURRENCY,
    lockDuration: 120_000,
    stalledInterval: 120_000,
    maxStalledCount: 1,
    drainDelay: 300_000, // 5 min — reduces Upstash request cost when idle
  });

  cronWorker.on("completed", (job, result) => {
    console.log(`[CronWorker] ✓ Job "${job.name}" (id=${job.id}) completed:`, result);
  });

  cronWorker.on("failed", (job, err) => {
    console.error(`[CronWorker] ✗ Job "${job?.name}" (id=${job?.id}) failed:`, err.message);
  });

  cronWorker.on("error", (err) => {
    console.error("[CronWorker] Worker error:", err.message);
  });

  console.log(`[CronSystem] Worker started on queue: "${CRON_QUEUE_NAME}"`);
  return cronWorker;
}

/** Gracefully shuts down the worker and closes the queue connection. */
export async function closeCronSystem(): Promise<void> {
  if (cronWorker) {
    await cronWorker.close();
    cronWorker = null;
    console.log("[CronSystem] Worker closed");
  }

  await cronQueue.close();
  console.log("[CronSystem] Queue connection closed");
}
