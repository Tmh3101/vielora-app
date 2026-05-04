import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";

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
  const { data, error } = await client
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("monthly_credits", { ascending: true });

  if (error) throw new Error(error.message);
  const plans = data ?? [];
  return excludeEnterprise ? plans.filter((p) => p.code !== "enterprise") : plans;
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
