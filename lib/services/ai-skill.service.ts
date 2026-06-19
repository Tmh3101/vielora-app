import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";

export type AISkillRow = Tables<"ai_skills">;

export interface AISkillCatalog {
  id: string;
  name: string;
  prompt_injection: string;
  is_active: boolean;
}

export async function getActiveSkills(client: ServiceClient): Promise<AISkillCatalog[]> {
  const { data, error } = await client
    .from("ai_skills")
    .select("id, name, prompt_injection, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSkillsByIds(
  client: ServiceClient,
  skillIds: string[]
): Promise<Pick<AISkillRow, "id">[]> {
  const { data, error } = await client
    .from("ai_skills")
    .select("id")
    .in("id", skillIds)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return data ?? [];
}
