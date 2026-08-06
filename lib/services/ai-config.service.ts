import type { ServiceClient } from "@/lib/services/types";
import { MAX_SKILLS_PER_BOT } from "@/lib/config/ai-customization";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateBotPersonality(
  client: ServiceClient,
  botId: string,
  personalityId: string | null
): Promise<void> {
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("bots")
    .update({ personality_id: personalityId })
    .eq("id", botId);

  if (error) throw new Error(error.message);
}

export async function syncBotSkills(
  client: ServiceClient,
  botId: string,
  skillIds: string[]
): Promise<void> {
  if (skillIds.length > MAX_SKILLS_PER_BOT) {
    throw new Error(`Tối đa ${MAX_SKILLS_PER_BOT} kỹ năng có thể chọn.`);
  }

  const adminClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (adminClient as any)
    .from("bot_skills")
    .delete()
    .eq("bot_id", botId);

  if (delError) throw new Error(delError.message);

  if (skillIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insError } = await (adminClient as any).from("bot_skills").insert(
      skillIds.map((skillId: string, index: number) => ({
        bot_id: botId,
        skill_id: skillId,
        sort_order: index,
      }))
    );

    if (insError) throw new Error(insError.message);
  }
}
