import type { Queue, JobsOptions } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { REPORT_EXPORT_QUEUE_NAME, JobName } from "@/lib/constants/job";

export interface ReportExportJobData {
  exportId: string;
  workspaceId: string;
  botId: string;
  templateKey: string;
  language: string;
  scope: Record<string, unknown>;
}

export const REPORT_EXPORT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 10000,
  },
  removeOnComplete: 50,
  removeOnFail: 100,
};

let _reportExportQueue: Queue<ReportExportJobData> | null = null;

// BullMQ is imported dynamically so webpack does NOT try to bundle its Node built-ins
// (child_process, net, worker_threads, etc.) into the Next.js app/cron build.
export async function getReportExportQueue(): Promise<Queue<ReportExportJobData>> {
  if (!_reportExportQueue) {
    const { Queue } = await import("bullmq");
    _reportExportQueue = new Queue<ReportExportJobData>(REPORT_EXPORT_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: REPORT_EXPORT_JOB_OPTIONS,
    });
  }
  return _reportExportQueue;
}

export async function addReportExportJob(data: ReportExportJobData): Promise<string> {
  const queue = await getReportExportQueue();
  const job = await queue.add(JobName.REPORT_EXPORT, data, {
    jobId: data.exportId,
    ...REPORT_EXPORT_JOB_OPTIONS,
  });
  return job.id!;
}

export async function closeReportExportQueue(): Promise<void> {
  if (_reportExportQueue) {
    await _reportExportQueue.close();
    _reportExportQueue = null;
  }
}
