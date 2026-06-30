import type { ServiceClient } from "@/lib/services/types";
import { MAX_SKILLS_PER_BOT } from "@/lib/config/ai-customization";

export async function updateBotPersonality(
  client: ServiceClient,
  botId: string,
  personalityId: string | null
): Promise<void> {
  const { error } = await client
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

  const { error: delError } = await client.from("bot_skills").delete().eq("bot_id", botId);

  if (delError) throw new Error(delError.message);

  if (skillIds.length > 0) {
    const { error: insError } = await client.from("bot_skills").insert(
      skillIds.map((skillId, index) => ({
        bot_id: botId,
        skill_id: skillId,
        sort_order: index,
      }))
    );

    if (insError) throw new Error(insError.message);
  }
}
