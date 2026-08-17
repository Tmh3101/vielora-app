import type { ServiceClient } from "@/lib/services/types";

export async function isBotManager(
  client: ServiceClient,
  botId: string,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc("is_bot_manager", {
    p_bot_id: botId,
    p_user_id: userId,
  });

  if (error) {
    console.error("Error checking is_bot_manager:", error);
    return false;
  }

  return !!data;
}
