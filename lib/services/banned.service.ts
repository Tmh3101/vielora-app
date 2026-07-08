import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";

export type BannedUserRow = Tables<"banned_users">;

export async function isUserBanned(
  client: ServiceClient,
  userId: string
): Promise<BannedUserRow | null> {
  const { data, error } = await client
    .from("banned_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BannedUserRow | null;
}
