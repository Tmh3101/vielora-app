import { EJobStatus } from "@/types";
import type { JobRow } from "@/lib/services/job.service";

export const JobTrackerMode = {
  Job: "job",
  Aggregate: "aggregate",
} as const;

export type JobTrackerOptions =
  | { mode: typeof JobTrackerMode.Job; jobId: string | null }
  | {
      mode: typeof JobTrackerMode.Aggregate;
      botId: string | null;
      jobName: string;
      totalPages?: number;
    };

export interface JobTrackerCounts {
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  total: number;
  percent: number;
}

export interface UseJobTrackerReturn {
  progress: number;
  status: EJobStatus | null;
  currentAction: string;
  uniqueActionCount: number;
  error: string | null;
  counts?: JobTrackerCounts;
}

export type TrackedJob = {
  status: EJobStatus | null;
  progress: number;
};

export type SSEPayload = { progress: number; data?: { current_url?: string } };

export type JobRowPick = Pick<JobRow, "id" | "status" | "progress" | "data" | "error_message">;
