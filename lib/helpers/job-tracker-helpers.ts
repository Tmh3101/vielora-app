import { EJobStatus, JobTrackerCounts, TrackedJob } from "@/types";
import type { Json } from "@/lib/supabase/types";

export const createDefaultCounts: () => JobTrackerCounts = () => {
  return { completed: 0, failed: 0, pending: 0, processing: 0, total: 0, percent: 0 };
};

export const computeCounts = (
  map: Map<string, TrackedJob>,
  totalPages?: number
): JobTrackerCounts => {
  const counts = createDefaultCounts();
  let sumPercent = 0;

  map.forEach((entry) => {
    const percent = Math.min(100, Math.max(0, Math.round(entry.progress ?? 0)));
    sumPercent += percent;

    if (entry.status === EJobStatus.Active) counts.processing += 1;
    if (entry.status === EJobStatus.Pending) counts.pending += 1;
    if (entry.status === EJobStatus.Completed) counts.completed += 1;
    if (entry.status === EJobStatus.Failed) counts.failed += 1;
  });

  counts.total = map.size;

  // If totalPages provided, calculate percent from completed/total ratio
  // Otherwise use average of job progress (legacy behavior)
  if (totalPages != null && totalPages > 0) {
    counts.percent = Math.round((counts.completed / totalPages) * 100);
  } else {
    counts.percent = counts.total > 0 ? Math.round(sumPercent / counts.total) : 0;
  }

  return counts;
};

export const getCurrentUrlFromData: (data: Json | null) => string | undefined = (data) => {
  if (!data) return undefined;

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return getUrlFromRecord(parsed);
    } catch {
      return undefined;
    }
  }

  if (typeof data === "object" && data !== null) {
    return getUrlFromRecord(data as Record<string, unknown>);
  }

  return undefined;
};

export const getUrlFromRecord: (record: Record<string, unknown>) => string | undefined = (
  record
) => {
  const candidate = record["current_url"] ?? record["currentUrl"];
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  return undefined;
};

export const getJobProgressStreamId = (jobId: string) => `job-progress-${jobId}`;
export const getBotIndexStreamId = (botId: string) => `bot-index-${botId}`;
