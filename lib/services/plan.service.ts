import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionPlan } from "@/types";

export type PlanRow = Tables<"plans">;

/**
 * Lấy thông tin plan theo ID. Trả về null nếu không tìm thấy.
 */
export async function getPlanById(client: ServiceClient, planId: string): Promise<PlanRow | null> {
  const { data, error } = await client.from("plans").select("*").eq("id", planId).maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Lấy plan theo code. Trả về null nếu không tìm thấy.
 */
export async function getPlanByCode(
  client: ServiceClient,
  code: PlanRow["code"]
): Promise<PlanRow | null> {
  const { data, error } = await client.from("plans").select("*").eq("code", code).maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Lấy danh sách tất cả plans đang hoạt động, sắp xếp theo monthly_credits tăng dần.
 * @param excludeEnterprise - Nếu true, lọc bỏ gói enterprise. Mặc định là false.
 */
export async function getActivePlans(
  client: ServiceClient,
  excludeEnterprise = false
): Promise<PlanRow[]> {
  const { data, error } = await client.from("plans").select("*").eq("is_active", true);

  if (error) throw new Error(error.message);
  let plans = data ?? [];

  // Fallback Enterprise plan if DB row doesn't exist yet
  if (!excludeEnterprise && !plans.some((p) => p.code === ESubscriptionPlan.Enterprise)) {
    plans.push({
      id: "enterprise-plan-fallback-id",
      code: ESubscriptionPlan.Enterprise,
      name: "Enterprise",
      description: "Gói tùy chỉnh linh hoạt cho doanh nghiệp lớn",
      monthly_credits: 20000,
      bots_limit: 10,
      max_shared_knowledge_items: null,
      pricing: { VND: { monthly: 1490000, yearly: 14900000 } },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as PlanRow);
  }

  if (excludeEnterprise) {
    plans = plans.filter((p) => p.code !== ESubscriptionPlan.Enterprise);
  }

  const planPriority: Record<string, number> = {
    [ESubscriptionPlan.Free]: 1,
    [ESubscriptionPlan.Standard]: 2,
    [ESubscriptionPlan.Pro]: 3,
    [ESubscriptionPlan.Enterprise]: 4,
  };

  return plans.sort((a, b) => (planPriority[a.code] ?? 99) - (planPriority[b.code] ?? 99));
}

/**
 * Server variant: lấy plan theo ID.
 */
export async function getPlanByIdServer(
  client: ServiceClient,
  planId: string
): Promise<PlanRow | null> {
  return getPlanById(client, planId);
}

/**
 * Server variant: lấy danh sách plan active.
 */
export async function getActivePlansServer(
  client: ServiceClient,
  excludeEnterprise = false
): Promise<PlanRow[]> {
  return getActivePlans(client, excludeEnterprise);
}

// ============================================================
// Server-client variants — nhận ServiceClient làm tham số
// Dùng trong API routes với server client
// ============================================================

/**
 * Lấy plan theo code, chỉ trả về plan đang active.
 * Dùng cho API routes (server client).
 */
export async function getPlanByCodeServer(
  client: ServiceClient,
  code: PlanRow["code"]
): Promise<PlanRow | null> {
  const { data, error } = await client
    .from("plans")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
