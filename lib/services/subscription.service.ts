import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveEntitlements } from "@/lib/services/entitlement.service";

export type SubscriptionRow = Tables<"subscriptions">;

export interface UserSubscriptionPlan {
  planCode: ESubscriptionPlan;
  botsLimit: number;
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

// ============================================================
// Workspace-scoped variants
// ============================================================

/**
 * Lấy subscription của workspace theo workspaceId.
 * Trả về null nếu không tìm thấy.
 */
export async function getSubscriptionByWorkspaceId(
  client: ServiceClient,
  workspaceId: string
): Promise<SubscriptionRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SubscriptionRow | null;
}

/**
 * Lấy planCode và botsLimit từ subscription đang active của workspace.
 * Trả về null nếu không tìm thấy hoặc không có subscription active.
 */
export async function getWorkspaceSubscriptionPlan(
  client: ServiceClient,
  workspaceId: string
): Promise<UserSubscriptionPlan | null> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/subscription`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.error("Error fetching workspace subscription via API:", err);
    }
    // Don't fall through to direct query on browser — RLS will block admin users
    return null;
  }

  const activeClient = createAdminClient();
  const entitlements = await getEffectiveEntitlements(activeClient, workspaceId);
  if (!entitlements) return null;

  return {
    planCode: entitlements.planCode,
    botsLimit: entitlements.botsLimit,
  };
}

/**
 * Lấy planCode active của Bot — luôn theo workspace plan.
 * Free nếu workspace chưa có subscription active hoặc bot không có workspace.
 */
export async function getBotActivePlanCode(
  client: ServiceClient,
  bot: { user_id: string; workspace_id?: string | null }
): Promise<ESubscriptionPlan | null> {
  if (!bot.workspace_id) return ESubscriptionPlan.Free;
  const wsPlan = await getWorkspaceSubscriptionPlan(client, bot.workspace_id);
  return wsPlan?.planCode ?? ESubscriptionPlan.Free;
}
