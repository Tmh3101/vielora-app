import type { ServiceClient } from "@/lib/services/types";
import type { Tables, TablesInsert } from "@/lib/supabase/types";

export type WalletRow = Tables<"wallets">;
export type UsageLogRow = Tables<"usage_logs">;

/**
 * Lấy thông tin wallet của user (total_credits).
 * Trả về null nếu không tìm thấy.
 */
export async function getWalletByUserId(
  client: ServiceClient,
  userId: string
): Promise<Pick<WalletRow, "total_credits"> | null> {
  const { data } = await client
    .from("wallets")
    .select("total_credits")
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Pick<WalletRow, "total_credits"> | null) ?? null;
}

/**
 * Đếm số lượng chat messages trong tháng hiện tại của một bot.
 */
export async function getMonthlyBotMessageCount(
  client: ServiceClient,
  botId: string,
  action: string,
  startOfMonth: Date
): Promise<number> {
  const { count } = await client
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .eq("action", action)
    .gte("created_at", startOfMonth.toISOString());

  return count ?? 0;
}

/**
 * Ghi nhật ký sử dụng (usage log).
 */
export async function insertUsageLog(
  client: ServiceClient,
  params: TablesInsert<"usage_logs">
): Promise<void> {
  const { error } = await client.from("usage_logs").insert(params);
  if (error) throw new Error(error.message);
}
