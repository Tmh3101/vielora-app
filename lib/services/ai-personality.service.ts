import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";

export type AIPersonalityRow = Tables<"ai_personalities">;

export interface AIPersonalityCatalog {
  id: string;
  name: string;
  description: string | null;
  prompt_injection: string;
  is_active: boolean;
}

export async function getActivePersonalities(
  client: ServiceClient
): Promise<AIPersonalityCatalog[]> {
  const { data, error } = await client
    .from("ai_personalities")
    .select("id, name, description, prompt_injection, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPersonalityById(
  client: ServiceClient,
  personalityId: string
): Promise<AIPersonalityRow | null> {
  const { data, error } = await client
    .from("ai_personalities")
    .select("*")
    .eq("id", personalityId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
