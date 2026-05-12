import type { ServiceClient } from "@/lib/services/types";
import type { Database, Json, Tables } from "@/lib/supabase/types";
import { EJobStatus } from "@/types";

export type JobRow = Tables<"jobs">;

/**
 * Creates a job record in the `jobs` table.
 * Call this immediately before (or after) enqueuing the BullMQ job.
 */
export async function createJobRecord(
  client: ServiceClient,
  jobId: string,
  name: string,
  data: Record<string, unknown>,
  botId?: string
): Promise<void> {
  console.log(`[JobTracker] Creating job record with id=${jobId}, name=${name}, botId=${botId}`);
  const { error } = await client.from("jobs").insert({
    id: jobId,
    name,
    status: EJobStatus.Pending,
    data: data as Json,
    bot_id: botId ?? null,
  });

  if (error) {
    console.error(`[JobTracker] createJobRecord failed for ${jobId}:`, error.message);
  }

  console.log(`[JobTracker] Job record created for id=${jobId}`); // Confirm creation
}

/**
 * Transitions a job to a new status.
 * - 'active'    → sets started_at = now()
 * - 'completed' → sets finished_at = now()
 * - 'failed'    → sets finished_at = now(), stores error_message
 */
export async function updateJobState(
  client: ServiceClient,
  jobId: string,
  status: EJobStatus,
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();

  const patch: Database["public"]["Tables"]["jobs"]["Update"] = { status };

  if (status === EJobStatus.Active) {
    patch.started_at = now;
  } else if (status === EJobStatus.Completed || status === EJobStatus.Failed) {
    patch.finished_at = now;
    if (errorMessage) patch.error_message = errorMessage;
  }

  const { error } = await client.from("jobs").update(patch).eq("id", jobId);

  if (error) {
    console.error(`[JobTracker] updateJobState(${status}) failed for ${jobId}:`, error.message);
  }
}

/**
 * Updates the progress percentage of a job (0–100).
 * Throttle calls at the call-site — do not invoke on every tick.
 */
async function getMergedJobData(
  client: ServiceClient,
  jobId: string,
  meta: Record<string, unknown>
): Promise<Json> {
  const { data, error } = await client.from("jobs").select("data").eq("id", jobId).maybeSingle();
  if (error) {
    console.error(`[JobTracker] Failed to load data for job ${jobId}:`, error.message);
    return meta as Json;
  }

  const existing = data ? parseJsonRecord(data.data) : {};
  return { ...existing, ...meta } as Json;
}

function parseJsonRecord(value: Json | null): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function updateJobProgress(
  client: ServiceClient,
  jobId: string,
  progress: number,
  meta?: Record<string, unknown>
): Promise<void> {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const patch: Database["public"]["Tables"]["jobs"]["Update"] = { progress: normalizedProgress };

  if (meta && Object.keys(meta).length > 0) {
    patch.data = await getMergedJobData(client, jobId, meta);
  }

  const { error } = await client.from("jobs").update(patch).eq("id", jobId);

  if (error) {
    console.error(`[JobTracker] updateJobProgress failed for ${jobId}:`, error.message);
  }
}

// ============================================================
// Read functions — nhận ServiceClient làm tham số
// Tương thích cả browser client và server client
// ============================================================

/**
 * Lấy thông tin cơ bản của một job theo ID để polling trạng thái.
 * Dùng cho browser polling và API routes.
 */
export async function getJobById(
  client: ServiceClient,
  jobId: string
): Promise<Pick<JobRow, "id" | "bot_id" | "status" | "progress" | "error_message"> | null> {
  const { data, error } = await client
    .from("jobs")
    .select("id, bot_id, status, progress, error_message")
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<JobRow, "id" | "bot_id" | "status" | "progress" | "error_message"> | null;
}

/**
 * Lấy danh sách jobs đang pending/active của một bot.
 * Dùng để poll tiến độ indexing.
 */
export async function getActiveJobsByBotId(
  client: ServiceClient,
  botId: string
): Promise<Pick<JobRow, "id" | "status">[]> {
  const { data, error } = await client
    .from("jobs")
    .select("id, status")
    .eq("bot_id", botId)
    .in("status", [EJobStatus.Pending, EJobStatus.Active]);

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<JobRow, "id" | "status">[];
}

/**
 * Lấy chi tiết đầy đủ của một job theo ID.
 * Dùng trong API routes (status route).
 */
export async function getJobDetailById(
  client: ServiceClient,
  jobId: string
): Promise<Pick<
  JobRow,
  | "id"
  | "bot_id"
  | "name"
  | "status"
  | "progress"
  | "error_message"
  | "created_at"
  | "started_at"
  | "finished_at"
> | null> {
  const { data, error } = await client
    .from("jobs")
    .select(
      "id, bot_id, name, status, progress, error_message, created_at, started_at, finished_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<
    JobRow,
    | "id"
    | "bot_id"
    | "name"
    | "status"
    | "progress"
    | "error_message"
    | "created_at"
    | "started_at"
    | "finished_at"
  > | null;
}

/**
 * Lấy tất cả jobs để tổng hợp thống kê queue.
 * Dùng trong API routes (status route).
 */
export async function getAllJobStats(
  client: ServiceClient
): Promise<Pick<JobRow, "name" | "status">[]> {
  const { data, error } = await client.from("jobs").select("name, status");

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<JobRow, "name" | "status">[];
}
