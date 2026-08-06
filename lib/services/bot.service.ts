import type { ServiceClient } from "@/lib/services/types";
import type { createServerClient } from "@/lib/supabase/server";
import type { Json, Tables, TablesUpdate } from "@/lib/supabase/types";
import { deleteKnowledgeFilesByBotId } from "@/lib/supabase/upload";
import { deletePagesByBotId } from "@/lib/services/page.service";
import { getJobById, getActiveJobsByBotId } from "@/lib/services/job.service";
import { validateRateLimitValue } from "@/lib/bot-rate-limit";
import { validateAllowedDomains } from "@/lib/security/allowed-domains";
import { WIDGET_FALLBACK, WIDGET_LIMITS } from "@/config";
import {
  CrawlStatusData,
  CrawlStatusResponse,
  CrawlSessionStatusType,
  DiscoverRequest,
  DiscoverResponse,
  PipelineStatusData,
  PipelineStatusResponse,
  SelectionResponse,
  EBotStatus,
  EJobStatus,
  EPageStatus,
  EPageSourceType,
} from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveEntitlements } from "@/lib/services/entitlement.service";
import { EWorkspaceMemberStatus, EWorkspaceRole } from "@/types/enums";
import { WorkspaceService } from "@/lib/services/workspace.service";

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Validates suggested questions array
 * @throws Error if validation fails
 */
export function validateSuggestedQuestions(questions: unknown): { valid: boolean; error?: string } {
  if (questions === undefined || questions === null) {
    return { valid: true }; // Optional field, null/undefined is okay
  }

  if (!Array.isArray(questions)) {
    return { valid: false, error: "suggestedQuestions must be an array" };
  }

  if (questions.length > WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_COUNT) {
    return {
      valid: false,
      error: `Maximum ${WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_COUNT} suggested questions allowed`,
    };
  }

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    if (typeof question !== "string") {
      return {
        valid: false,
        error: `Question ${i} must be a string`,
      };
    }

    if (question.trim().length === 0) {
      return {
        valid: false,
        error: `Question ${i} cannot be empty`,
      };
    }

    if (question.length > WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH) {
      return {
        valid: false,
        error: `Question ${i} exceeds maximum length of ${WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH} characters`,
      };
    }
  }

  return { valid: true };
}

export interface AddKnowledgeRequest {
  botId: string;
  isManual?: boolean;
  mode?: "manual" | "file" | "url";
  context?: "onboarding";
  title?: string;
  content?: string;
  url?: string;
  filePath?: string;
}

export interface AddKnowledgeResponse {
  success: boolean;
  message?: string;
  data?: {
    pageId: string;
    jobId: string;
    sourceType: EPageSourceType;
  };
}

export interface EditKnowledgeRequest {
  title: string;
  content: string;
}

export interface EditKnowledgeResponse {
  success: boolean;
  message?: string;
  changed?: boolean;
  data?: {
    pageId: string;
    jobId: string;
  };
}

export interface DeleteKnowledgeResponse {
  success: boolean;
  message?: string;
}

export interface GetKnowledgeResponse {
  success: boolean;
  message?: string;
  data?: Tables<"pages"> | null;
}

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

async function getAuthHeaders(client: ServiceClient): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

export interface CrawlProgressCallback {
  onProgress?: (data: CrawlStatusData) => void;
  onComplete?: (data: CrawlStatusData) => void;
  onError?: (error: Error) => void;
}

export interface PipelineProgressCallback {
  onProgress?: (data: PipelineStatusData) => void;
  onComplete?: (data: PipelineStatusData) => void;
  onError?: (error: Error) => void;
}

export interface StartCrawlResult {
  jobId: string;
  botId: string;
  status: "queued";
  checkStatusUrl: string;
}

export async function startDiscover(
  client: ServiceClient,
  request: DiscoverRequest
): Promise<{ discoverJobId: string; botId: string }> {
  const headers = {
    ...(await getAuthHeaders(client)),
    "Content-Type": "application/json",
  };
  const response = await fetch("/api/bots/crawl-website/discover", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  const res = (await response.json()) as DiscoverResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to start discover");
  }

  return {
    discoverJobId: res.data.discoverJobId,
    botId: res.data.botId,
  };
}

export async function getPipelineStatus(
  _client: ServiceClient,
  botId: string
): Promise<PipelineStatusData> {
  const response = await fetch(`/api/bots/crawl-website/status?botId=${botId}`);
  const res = (await response.json()) as PipelineStatusResponse;

  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to fetch pipeline status");
  }

  return res.data;
}

/**
 * Poll a single job by its ID until it reaches a terminal status
 * (completed or failed). When done, fetches the final PipelineStatusData
 * from the bot's page counts.
 */
export async function pollPipelineStatus(
  client: ServiceClient,
  jobId: string,
  callbacks: PipelineProgressCallback = {}
): Promise<PipelineStatusData> {
  const { onProgress, onComplete, onError } = callbacks;
  const startedAt = Date.now();

  const poll = async (): Promise<PipelineStatusData> => {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      const timeoutError = new Error("Pipeline status polling timed out");
      onError?.(timeoutError);
      throw timeoutError;
    }

    try {
      const job = await getJobById(client, jobId);

      if (!job) throw new Error(`Job ${jobId} not found`);

      const partialStatus: PipelineStatusData = {
        botId: job.bot_id ?? "",
        botStatus: job.status,
        counts: { progress: job.progress },
      };

      onProgress?.(partialStatus);

      if (job.status === EJobStatus.Failed) {
        const failed = new Error(job.error_message ?? "Job failed");
        onError?.(failed);
        throw failed;
      }

      if (job.status === EJobStatus.Completed) {
        if (job.bot_id) {
          const finalStatus = await getPipelineStatus(client, job.bot_id);
          onComplete?.(finalStatus);
          return finalStatus;
        }
        onComplete?.(partialStatus);
        return partialStatus;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      return poll();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("timed out") || error.message === "Job failed")
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      return poll();
    }
  };

  return poll();
}

/**
 * Poll until all active/pending jobs for a given bot are done.
 * Used for the indexing phase where multiple per-page jobs are queued
 * and there is no single master job ID.
 */
export async function pollBotJobsCompletion(
  client: ServiceClient,
  botId: string,
  callbacks: PipelineProgressCallback = {}
): Promise<PipelineStatusData> {
  const { onProgress, onComplete, onError } = callbacks;
  const startedAt = Date.now();

  const poll = async (): Promise<PipelineStatusData> => {
    console.log(`Polling active jobs for bot ${botId}...`);
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      const timeoutError = new Error("Pipeline status polling timed out");
      onError?.(timeoutError);
      throw timeoutError;
    }

    try {
      const activeJobs = await getActiveJobsByBotId(client, botId);
      console.log(`Found ${activeJobs.length} active/pending jobs for bot ${botId}`);

      if (activeJobs.length === 0) {
        const finalStatus = await getPipelineStatus(client, botId);
        onComplete?.(finalStatus);
        return finalStatus;
      }

      const partialStatus: PipelineStatusData = {
        botId,
        botStatus: EBotStatus.Indexing,
        counts: { active: activeJobs.length },
      };

      console.log(`Active jobs for bot ${botId}:`, activeJobs);

      onProgress?.(partialStatus);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      return poll();
    } catch (error) {
      if (error instanceof Error && error.message.includes("timed out")) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      return poll();
    }
  };

  return poll();
}

export async function submitSelection(
  client: ServiceClient,
  botId: string,
  selectedPageIds: string[]
): Promise<SelectionResponse["data"]> {
  const headers = {
    ...(await getAuthHeaders(client)),
    "Content-Type": "application/json",
  };
  const response = await fetch("/api/bots/crawl-website/selection", {
    method: "POST",
    headers,
    body: JSON.stringify({ botId, selectedPageIds }),
  });

  const res = (await response.json()) as SelectionResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to submit selection");
  }

  return res.data;
}

// Legacy: kept for compatibility.
export async function getCrawlStatus(
  client: ServiceClient,
  jobId: string
): Promise<CrawlStatusData> {
  const headers = await getAuthHeaders(client);
  const response = await fetch(`/api/bots/crawl-website/status?jobId=${jobId}`, { headers });
  const res = (await response.json()) as CrawlStatusResponse;

  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to get crawl status");
  }

  return res.data;
}

export function isTerminalStatus(_client: ServiceClient, status: CrawlSessionStatusType): boolean {
  return status === EPageStatus.Completed || status === EPageStatus.Failed;
}

/**
 * Add a knowledge source (website URL or manual text) to a bot's knowledge base.
 */
export async function addKnowledge(
  client: ServiceClient,
  request: AddKnowledgeRequest
): Promise<NonNullable<AddKnowledgeResponse["data"]>> {
  const headers = {
    ...(await getAuthHeaders(client)),
    "Content-Type": "application/json",
  };
  const response = await fetch("/api/bots/knowledge", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });

  const res = (await response.json()) as AddKnowledgeResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to add knowledge");
  }

  return res.data;
}

export async function addKnowledgeFile(
  client: ServiceClient,
  request: { botId: string; file: File }
): Promise<NonNullable<AddKnowledgeResponse["data"]>> {
  const formData = new FormData();
  formData.append("botId", request.botId);
  formData.append("file", request.file);

  const authHeaders = await getAuthHeaders(client);

  const response = await fetch("/api/bots/knowledge/upload", {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  const res = (await response.json()) as AddKnowledgeResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to add file knowledge");
  }

  return res.data;
}

export async function addOnboardingKnowledgeFile(
  client: ServiceClient,
  request: { botId: string; file: File }
): Promise<NonNullable<AddKnowledgeResponse["data"]>> {
  const formData = new FormData();
  formData.append("botId", request.botId);
  formData.append("file", request.file);
  formData.append("isOnboarding", "true");

  const authHeaders = await getAuthHeaders(client);

  const response = await fetch("/api/bots/knowledge/upload", {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  const res = (await response.json()) as AddKnowledgeResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to add onboarding file knowledge");
  }

  return res.data;
}

export async function addKnowledgeUrl(
  client: ServiceClient,
  request: { botId: string; url: string }
): Promise<NonNullable<AddKnowledgeResponse["data"]>> {
  const headers = {
    ...(await getAuthHeaders(client)),
    "Content-Type": "application/json",
  };
  const response = await fetch("/api/bots/knowledge", {
    method: "POST",
    headers,
    body: JSON.stringify({
      botId: request.botId,
      mode: "url",
      url: request.url,
    }),
  });

  const res = (await response.json()) as AddKnowledgeResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to add URL knowledge");
  }

  return res.data;
}

/**
 * Get a single knowledge source by pageId.
 */
export async function getKnowledge(
  client: ServiceClient,
  pageId: string
): Promise<NonNullable<GetKnowledgeResponse["data"]>> {
  const headers = await getAuthHeaders(client);
  const response = await fetch(`/api/bots/knowledge/${pageId}`, {
    method: "GET",
    headers,
  });

  const res = (await response.json()) as GetKnowledgeResponse;
  if (!response.ok || !res.success || !res.data) {
    throw new Error(res.message || "Failed to get knowledge");
  }

  return res.data;
}

/**
 * Edit a knowledge source (update title and content).
 */
export async function editKnowledge(
  client: ServiceClient,
  pageId: string,
  request: EditKnowledgeRequest
): Promise<EditKnowledgeResponse> {
  const headers = {
    ...(await getAuthHeaders(client)),
    "Content-Type": "application/json",
  };
  const response = await fetch(`/api/bots/knowledge/${pageId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(request),
  });

  const res = (await response.json()) as EditKnowledgeResponse;
  if (!response.ok || !res.success) {
    throw new Error(res.message || "Failed to edit knowledge");
  }

  return res;
}

/**
 * Delete a knowledge source.
 */
export async function deleteKnowledge(
  client: ServiceClient,
  pageId: string
): Promise<DeleteKnowledgeResponse> {
  const headers = await getAuthHeaders(client);
  const response = await fetch(`/api/bots/knowledge/${pageId}`, {
    method: "DELETE",
    headers,
  });

  const res = (await response.json()) as DeleteKnowledgeResponse;
  if (!response.ok || !res.success) {
    throw new Error(res.message || "Failed to delete knowledge");
  }

  return res;
}

export type BotRow = Tables<"bots">;

export interface CreateBotParams {
  userId: string;
  workspaceId?: string;
  name: string;
  domain: string;
  avatarUrl?: string | null;
  crawlSettings?: Json | null;
}

export interface WidgetSettingsInput {
  primaryColor?: string;
  textColor?: string;
  position?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
}

export interface UpdateBotAppearanceParams {
  name?: string;
  avatarUrl?: string | null;
  widgetSettings?: Json;
}

export interface UpdateBotRateLimitParams {
  rateLimitPerDay?: number | null;
  rateLimitPerIp?: number | null;
}

export interface UpdateBotAllowedDomainsParams {
  allowedDomains: string[];
}

export interface BotsPaginatedOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "name" | "created_at";
  sortOrder?: "asc" | "desc";
  workspaceId?: string;
}

export interface BotsPaginatedResult {
  bots: BotRow[];
  total: number;
}

/**
 * Lấy danh sách bots phân trang, hỗ trợ search và sort.
 */
export async function getBotsPaginated(
  client: ServiceClient,
  userId: string,
  options: BotsPaginatedOptions = {}
): Promise<BotsPaginatedResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 12), 50);
  const offset = (page - 1) * limit;

  let query = client.from("bots").select("*", { count: "exact" });

  if (options.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  } else {
    query = query.eq("user_id", userId);
  }

  if (options.search?.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const sortBy = options.sortBy ?? "created_at";
  const sortOrder = options.sortOrder ?? "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { bots: data ?? [], total: count ?? 0 };
}

/**
 * Lấy thông tin một bot theo botId.
 */
export async function getBotById(client: ServiceClient, botId: string): Promise<BotRow | null> {
  if (typeof window !== "undefined") {
    const res = await fetch(`/api/bots/${botId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as BotRow;
      }
    }
    // Don't fall through to direct query on browser — RLS will block admin users
    return null;
  }

  const activeClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (activeClient as any)
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BotRow | null;
}

/**
 * Tạo một bot mới cho user.
 */
export async function createBot(_client: ServiceClient, params: CreateBotParams): Promise<BotRow> {
  const allowedDomains = validateAllowedDomains([params.domain]);

  let workspaceId = params.workspaceId;
  if (!workspaceId) {
    workspaceId = await WorkspaceService.getOrCreateDefaultWorkspace(params.userId);
  }

  if (!workspaceId) {
    throw new Error(
      "Không thể xác định Workspace cho bot. Vui lòng chọn hoặc tạo Workspace trước."
    );
  }

  const adminClient = createAdminClient();
  const entitlements = await getEffectiveEntitlements(adminClient, workspaceId);
  if (entitlements) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: activeBotsCount } = await (adminClient as any)
      .from("bots")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_stopped", false);

    if ((activeBotsCount || 0) >= entitlements.botsLimit) {
      throw new Error(
        `Workspace đã đạt giới hạn tối đa ${entitlements.botsLimit} bots đối với gói ${entitlements.planCode.toUpperCase()}. Vui lòng nâng cấp gói để tạo thêm bot.`
      );
    }
  }

  const newBot = {
    user_id: params.userId,
    workspace_id: workspaceId,
    name: params.name,
    domain: params.domain,
    allowed_domains: allowedDomains.valid ? allowedDomains.domains : [],
    widget_settings: {
      primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
      textColor: WIDGET_FALLBACK.TEXT_COLOR,
      position: WIDGET_FALLBACK.POSITION,
      welcomeMessage: WIDGET_FALLBACK.WELCOME_MESSAGE,
      suggestedQuestions: [],
      chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
      chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
      chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
      chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
      chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
      chatIconUrl: null,
      chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
      chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
    },
    ...(params.avatarUrl !== undefined ? { avatar_url: params.avatarUrl } : {}),
    ...(params.crawlSettings !== undefined ? { crawl_settings: params.crawlSettings } : {}),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any).from("bots").insert(newBot).select().single();

  if (error) {
    console.error("[BotService] Error creating bot:", error);
    throw new Error(error.message);
  }
  if (!data) throw new Error("Failed to create bot");
  return data as BotRow;
}

/**
 * Kiểm tra xem người dùng có quyền xóa Bot hay không.
 * Cho phép nếu:
 * 1. Là người trực tiếp tạo ra bot (user_id === userId).
 * 2. Có vai trò Owner hoặc Admin trong workspace chứa bot.
 */
export async function canUserDeleteBot(
  _client: ServiceClient,
  bot: { user_id: string; workspace_id?: string | null },
  userId: string
): Promise<boolean> {
  if (bot.user_id === userId) return true;

  if (bot.workspace_id) {
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (adminClient as any)
      .from("workspace_members")
      .select("role_id, status")
      .eq("workspace_id", bot.workspace_id)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .maybeSingle();

    if (
      member &&
      (member.role_id === EWorkspaceRole.Owner || member.role_id === EWorkspaceRole.Admin)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Xóa một bot cùng toàn bộ pages và storage liên quan.
 */
export async function deleteBot(_client: ServiceClient, botId: string): Promise<void> {
  const adminClient = createAdminClient();

  try {
    const deleteStorageResult = await deleteKnowledgeFilesByBotId(adminClient, botId);
    if (!deleteStorageResult.success) {
      console.error(
        `[BotService] Failed to delete knowledge files for bot ${botId}:`,
        deleteStorageResult.error
      );
    }
  } catch (storageError) {
    console.error(`[BotService] Error during storage cleanup for bot ${botId}:`, storageError);
  }

  await deletePagesByBotId(adminClient, botId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any).from("bots").delete().eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật cài đặt giao diện của bot (tên, avatar, widget settings).
 */
export async function updateBotAppearance(
  client: ServiceClient,
  botId: string,
  params: UpdateBotAppearanceParams
): Promise<void> {
  const updates: TablesUpdate<"bots"> = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.avatarUrl !== undefined) updates.avatar_url = params.avatarUrl;
  if (params.widgetSettings !== undefined) updates.widget_settings = params.widgetSettings;

  const { error } = await client.from("bots").update(updates).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật cài đặt giới hạn rate limit của bot.
 */
export async function updateBotRateLimit(
  client: ServiceClient,
  botId: string,
  params: UpdateBotRateLimitParams
): Promise<void> {
  validateRateLimitValue(params.rateLimitPerDay, "Giới hạn tin nhắn / ngày");
  validateRateLimitValue(params.rateLimitPerIp, "Giới hạn tin nhắn / IP / ngày");

  const updates: TablesUpdate<"bots"> = {
    rate_limit_per_day: params.rateLimitPerDay ?? null,
    rate_limit_per_ip: params.rateLimitPerIp ?? null,
  };

  const { error } = await client.from("bots").update(updates).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật danh sách domain được phép nhúng widget của bot.
 */
export async function updateBotAllowedDomains(
  client: ServiceClient,
  botId: string,
  params: UpdateBotAllowedDomainsParams
): Promise<string[]> {
  const validation = validateAllowedDomains(params.allowedDomains);
  if (!validation.valid) {
    throw new Error(validation.error || "Danh sách domain không hợp lệ.");
  }

  const updates: TablesUpdate<"bots"> = {
    allowed_domains: validation.domains,
  };

  const { error } = await client.from("bots").update(updates).eq("id", botId);
  if (error) throw new Error(error.message);

  return validation.domains;
}

/**
 * Cập nhật trạng thái pipeline của bot (status field).
 */
export async function updateBotStatus(
  client: ServiceClient,
  botId: string,
  status: string
): Promise<void> {
  const { error } = await client.from("bots").update({ status }).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Dừng một bot (is_stopped = true).
 */
export async function stopBot(client: ServiceClient, botId: string): Promise<void> {
  if (typeof window !== "undefined") {
    const res = await fetch(`/api/bots/${botId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStopped: true }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to stop bot");
    }
    return;
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("bots").update({ is_stopped: true }).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Khởi động lại một bot (is_stopped = false).
 */
export async function startBot(client: ServiceClient, botId: string): Promise<void> {
  if (typeof window !== "undefined") {
    const res = await fetch(`/api/bots/${botId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStopped: false }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to start bot");
    }
    return;
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("bots").update({ is_stopped: false }).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Kích hoạt nhiều bots cùng lúc (is_stopped = false).
 */
export async function activateBots(client: ServiceClient, botIds: string[]): Promise<void> {
  if (botIds.length === 0) return;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("bots")
    .update({ is_stopped: false })
    .in("id", botIds);
  if (error) throw new Error(error.message);
}

/**
 * Dừng nhiều bots cùng lúc (is_stopped = true).
 */
export async function stopBots(client: ServiceClient, botIds: string[]): Promise<void> {
  if (botIds.length === 0) return;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("bots").update({ is_stopped: true }).in("id", botIds);
  if (error) throw new Error(error.message);
}

/**
 * Đếm số bots đang hoạt động (is_stopped = false) của user.
 */
export async function getActiveBotCount(client: ServiceClient, userId: string): Promise<number> {
  const { count, error } = await client
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_stopped", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

// ============================================================
// Server-client variants — nhận ServiceClient làm tham số
// Dùng trong API routes với server client
// ============================================================

/**
 * Lấy bot theo ID (server client). Trả về null nếu không tìm thấy.
 */
export async function getBotByIdServer(
  client: ServiceClient,
  botId: string
): Promise<BotRow | null> {
  const activeClient = typeof window !== "undefined" ? client : createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (activeClient as any)
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BotRow | null;
}

/**
 * Kiểm tra xem người dùng có quyền truy cập vào Bot hay không
 * (Bao gồm trực tiếp chủ sở hữu hoặc thành viên active của workspace chứa bot).
 */
export async function canUserAccessBot(
  client: ServiceClient,
  bot: { user_id: string; workspace_id?: string | null },
  userId: string
): Promise<boolean> {
  if (bot.user_id === userId) return true;

  if (bot.workspace_id) {
    const activeClient = typeof window !== "undefined" ? client : createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (activeClient as any)
      .from("workspace_members")
      .select("id, status")
      .eq("workspace_id", bot.workspace_id)
      .eq("user_id", userId)
      .eq("status", EWorkspaceMemberStatus.Active)
      .maybeSingle();

    return !!member;
  }

  return false;
}

/**
 * Lấy bot theo ID và kiểm tra quyền truy cập của người dùng (Server/Client).
 */
export async function getBotByOwner(
  client: ServiceClient,
  botId: string,
  userId: string
): Promise<BotRow | null> {
  const activeClient = typeof window !== "undefined" ? client : createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bot, error } = await (activeClient as any)
    .from("bots")
    .select("*")
    .eq("id", botId)
    .maybeSingle();

  if (error || !bot) return null;

  const hasAccess = await canUserAccessBot(client, bot, userId);
  if (!hasAccess) return null;

  return bot as BotRow;
}

/**
 * Cập nhật status của bot (server client).
 */
export async function updateBotStatusServer(
  client: ServiceClient,
  botId: string,
  status: EBotStatus
): Promise<void> {
  const { error } = await client.from("bots").update({ status }).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật verification_token của bot (server client).
 */
export async function updateBotVerificationToken(
  client: ServiceClient,
  botId: string,
  token: string
): Promise<void> {
  const { error } = await client.from("bots").update({ verification_token: token }).eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Đánh dấu bot đã được verified (cập nhật verified_at = now) (server client).
 */
export async function markBotVerified(client: ServiceClient, botId: string): Promise<void> {
  const { error } = await client
    .from("bots")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Đánh dấu bot hoàn thành crawl: status = Ready, last_crawl_at = now (server client).
 */
export async function setBotReadyServer(client: ServiceClient, botId: string): Promise<void> {
  const { error } = await client
    .from("bots")
    .update({ status: EBotStatus.Ready, last_crawl_at: new Date().toISOString() })
    .eq("id", botId);
  if (error) throw new Error(error.message);
}

/**
 * Cập nhật status của bot chỉ khi bot chưa ở trạng thái Ready (server client).
 * Dùng khi kết thúc bước discover hoặc khi toàn bộ pages thất bại.
 */
export async function setBotStatusIfNotReadyServer(
  client: ServiceClient,
  botId: string,
  status: EBotStatus
): Promise<void> {
  const { error } = await client
    .from("bots")
    .update({ status })
    .eq("id", botId)
    .neq("status", EBotStatus.Ready);
  if (error) throw new Error(error.message);
}

export type BotForWidget = Pick<
  BotRow,
  | "id"
  | "domain"
  | "allowed_domains"
  | "status"
  | "is_stopped"
  | "rate_limit_per_day"
  | "rate_limit_per_ip"
  | "user_id"
  | "name"
  | "avatar_url"
  | "widget_settings"
>;

/**
 * Lấy thông tin bot cần thiết cho widget (server client).
 * Dùng trong widget security middleware để xác minh origin và rate limit.
 */
export async function getBotForWidgetServer(
  client: ServiceClient,
  botId: string
): Promise<BotForWidget | null> {
  const { data, error } = await client
    .from("bots")
    .select(
      "id, domain, allowed_domains, status, is_stopped, rate_limit_per_day, rate_limit_per_ip, user_id, name, avatar_url, widget_settings"
    )
    .eq("id", botId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BotForWidget | null;
}

// ============================================================
// Standalone Chat Support
// ============================================================

export interface PublicBotData {
  id: string;
  name: string;
  avatar_url: string | null;
  widget_settings: Json;
  is_public: boolean;
  is_stopped: boolean;
  status: string;
  pwa_updated_at: string;
}

/**
 * Lấy bot theo slug cho trang standalone chat (chỉ public bots).
 */
export async function getBotBySlug(
  client: ServiceClient,
  slug: string
): Promise<PublicBotData | null> {
  const normalizedSlug = slug.toLowerCase();
  const { data, error } = await client
    .from("bots")
    .select("id, name, avatar_url, widget_settings, is_public, is_stopped, status, pwa_updated_at")
    .eq("slug", normalizedSlug)
    .eq("is_public", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PublicBotData | null;
}

/**
 * Cập nhật slug và/hoặc is_public của bot.
 */
export async function updateBotSlugSettings(
  client: ServiceClient,
  botId: string,
  params: { slug?: string | null; isPublic?: boolean }
): Promise<void> {
  const updates: TablesUpdate<"bots"> = {};

  if (params.slug !== undefined) {
    // Validate slug format
    if (params.slug && !/^[a-z0-9-]+$/.test(params.slug)) {
      throw new Error("Slug must contain only lowercase letters, numbers, and hyphens");
    }
    updates.slug = params.slug;
  }

  if (params.isPublic !== undefined) {
    updates.is_public = params.isPublic;
  }

  const { error } = await client.from("bots").update(updates).eq("id", botId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("This slug is already taken. Please choose another.");
    }
    throw new Error(error.message);
  }
}

type PublicSupabaseClient = Awaited<ReturnType<typeof createServerClient>>;

export interface PublicBotBranding {
  slug: string;
  name: string;
  widget_settings: Json | null;
  avatar_url: string | null;
  pwa_updated_at: string;
}

export async function getPublicBotBranding(
  client: PublicSupabaseClient,
  botSlug: string
): Promise<PublicBotBranding | null> {
  const normalizedSlug = botSlug.toLowerCase();
  const { data, error } = await client
    .from("bots")
    .select("slug, name, widget_settings, avatar_url, pwa_updated_at")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PublicBotBranding | null;
}

// ============================================================
// Workspace-scoped Bot variants
// ============================================================

export interface CreateBotInWorkspaceParams {
  userId: string;
  workspaceId: string;
  name: string;
  domain: string;
  avatarUrl?: string | null;
  crawlSettings?: Json | null;
}

/**
 * Lấy danh sách tất cả bots của workspace, sắp xếp theo ngày tạo giảm dần.
 */
export async function getBotsByWorkspaceId(
  client: ServiceClient,
  workspaceId: string
): Promise<BotRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("bots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BotRow[];
}

/**
 * Tạo một bot mới cho workspace.
 */
export async function createBotInWorkspace(
  _client: ServiceClient,
  params: CreateBotInWorkspaceParams
): Promise<BotRow> {
  const allowedDomains = validateAllowedDomains([params.domain]);

  const newBot = {
    user_id: params.userId,
    workspace_id: params.workspaceId,
    name: params.name,
    domain: params.domain,
    allowed_domains: allowedDomains.valid ? allowedDomains.domains : [],
    widget_settings: {
      primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
      textColor: WIDGET_FALLBACK.TEXT_COLOR,
      position: WIDGET_FALLBACK.POSITION,
      welcomeMessage: WIDGET_FALLBACK.WELCOME_MESSAGE,
      suggestedQuestions: [],
      chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
      chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
      chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
      chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
      chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
      chatIconUrl: null,
      chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
      chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
    },
    ...(params.avatarUrl !== undefined ? { avatar_url: params.avatarUrl } : {}),
    ...(params.crawlSettings !== undefined ? { crawl_settings: params.crawlSettings } : {}),
  };

  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any).from("bots").insert(newBot).select().single();

  if (error) {
    console.error("[BotService] Error creating bot in workspace:", error);
    throw new Error(error.message);
  }
  if (!data) throw new Error("Failed to create bot");
  return data as BotRow;
}

/**
 * Đếm số lượng bots đang hoạt động (is_stopped = false) của workspace.
 */
export async function getActiveBotCountByWorkspaceId(
  client: ServiceClient,
  workspaceId: string
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (client as any)
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_stopped", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
