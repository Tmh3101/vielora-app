import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { getPlanById } from "@/lib/services/plan.service";
import type { PlanRow } from "@/lib/services/plan.service";
import { ESubscriptionStatus, ESubscriptionPlan } from "@/types";

export type { PlanRow } from "@/lib/services/plan.service";
export type SubscriptionRow = Tables<"subscriptions">;

export interface SubscriptionWithPlan {
  subscription: SubscriptionRow;
  plan: PlanRow;
}

export interface UserSubscriptionPlan {
  planCode: ESubscriptionPlan;
  botsLimit: number;
}

/**
 * Lấy subscription của user. Trả về null nếu không tìm thấy.
 */
export async function getSubscriptionByUserId(
  client: ServiceClient,
  userId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Lấy subscription kèm plan của user trong một lần truy vấn.
 * Trả về null nếu không có subscription hoặc không có plan_id.
 */
export async function getSubscriptionWithPlan(
  client: ServiceClient,
  userId: string
): Promise<SubscriptionWithPlan | null> {
  const subscription = await getSubscriptionByUserId(client, userId);
  if (!subscription?.plan_id) return null;

  const plan = await getPlanById(client, subscription.plan_id);
  if (!plan) return null;

  return { subscription, plan };
}

/**
 * Lấy planCode và botsLimit từ subscription đang active của user.
 * Trả về null nếu không tìm thấy hoặc không có subscription active.
 */
export async function getUserSubscriptionPlan(
  client: ServiceClient,
  userId: string
): Promise<UserSubscriptionPlan | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("plans!inner(code, bots_limit)")
    .eq("user_id", userId)
    .eq("status", ESubscriptionStatus.Active)
    .single();

  if (error) return null;
  if (!data) return null;

  const planInfoRaw = data.plans as unknown as { code: ESubscriptionPlan; bots_limit: number }[];
  const planInfo = Array.isArray(planInfoRaw) ? planInfoRaw[0] : planInfoRaw;
  if (!planInfo) return null;
  return {
    planCode: planInfo.code,
    botsLimit: planInfo.bots_limit,
  };
}

// ============================================================
// Server-client variants — nhận ServiceClient làm tham số
// Dùng trong API routes với server client
// ============================================================

/**
 * Lấy subscription của user theo userId (server client).
 */
export async function getSubscriptionByUserIdServer(
  client: ServiceClient,
  userId: string
): Promise<Pick<SubscriptionRow, "id" | "plan_id" | "status" | "current_period_end"> | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("id, plan_id, status, current_period_end")
    .eq("user_id", userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Pick<SubscriptionRow, "id" | "plan_id" | "status" | "current_period_end"> | null;
}

/**
 * Server variant: lấy full subscription row theo userId.
 * Dùng cho server-rendered pages cần đầy đủ thông tin subscription.
 */
export async function getSubscriptionByUserIdServerFull(
  client: ServiceClient,
  userId: string
): Promise<SubscriptionRow | null> {
  return getSubscriptionByUserId(client, userId);
}

/**
 * Lấy plan code từ subscription active của user (server client).
 * Dùng để kiểm tra quyền trong API routes.
 */
export async function getUserActivePlanCodeServer(
  client: ServiceClient,
  userId: string
): Promise<ESubscriptionPlan | null> {
  const { data, error } = await client
    .from("subscriptions")
    .select("plans!inner(code)")
    .eq("user_id", userId)
    .eq("status", ESubscriptionStatus.Active)
    .single();

  if (error) return null;
  if (!data) return null;

  const plan = data.plans as unknown as { code: ESubscriptionPlan };
  return plan.code ?? null;
}

/**
 * Xóa flag needs_bot_selection của subscription.
 * BẮT BUỘC DÙNG ADMIN CLIENT và kiểm tra kèm user_id để bảo mật.
 */
export async function clearBotSelectionFlagServer(
  adminClient: ServiceClient,
  subscriptionId: string,
  userId: string
): Promise<void> {
  const { error } = await adminClient
    .from("subscriptions")
    .update({ needs_bot_selection: false })
    .eq("id", subscriptionId)
    .eq("user_id", userId); // CHỐT CHẶN BẢO MẬT: Đảm bảo sub thuộc về user này

  if (error) throw new Error(error.message);
}
