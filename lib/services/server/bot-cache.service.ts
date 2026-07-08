import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import { getBotById, getBotForWidgetServer } from "@/lib/services/bot.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { getBotWidgetCache, getBotConfigCache, clearBotWidgetCache } from "@/lib/cache";

export type BotRow = Tables<"bots">;

export type BotForWidget = Pick<
  BotRow,
  | "id"
  | "domain"
  | "allowed_domains"
  | "status"
  | "is_stopped"
  | "rate_limit_per_day"
  | "rate_limit_per_ip"
  | "user_id"
  | "name"
  | "avatar_url"
  | "widget_settings"
>;

export async function getBotByIdCached(
  client: ServiceClient,
  botId: string
): Promise<BotRow | null> {
  return getBotWidgetCache<BotRow>(botId, () => getBotById(client, botId), { secure: false });
}

export async function getBotForWidgetServerCached(
  client: ServiceClient,
  botId: string
): Promise<BotForWidget | null> {
  return getBotWidgetCache<BotForWidget>(botId, () => getBotForWidgetServer(client, botId), {
    secure: true,
  });
}

export { clearBotWidgetCache as clearBotCache };

export interface BotAIConfig {
  id: string;
  name: string;
  domain: string;
  status: string;
  is_stopped: boolean;
  rate_limit_per_day: number | null;
  rate_limit_per_ip: number | null;
  user_id: string;
  avatar_url: string | null;
  widget_settings: unknown;
  allowed_domains: string[];
  slug: string | null;
  is_public: boolean;
  personality_prompt: string | null;
  skills_prompt: string | null;
  owner_plan_code: string | null;
}

type BotQueryPersonality = {
  ai_personalities: { prompt_injection: string } | null;
};

type BotSkillQueryRow = {
  ai_skills: { prompt_injection: string } | null;
};

export async function getBotWithAIConfigCached(
  client: ServiceClient,
  botId: string
): Promise<BotAIConfig | null> {
  return getBotConfigCache<BotAIConfig>(botId, async () => {
    const { data: bot, error } = await client
      .from("bots")
      .select(
        `
          id,
          name,
          domain,
          status,
          is_stopped,
          rate_limit_per_day,
          rate_limit_per_ip,
          user_id,
          avatar_url,
          widget_settings,
          allowed_domains,
          slug,
          is_public,
          personality_id,
          ai_personalities!bots_personality_id_fkey (
            prompt_injection
          )
        `
      )
      .eq("id", botId)
      .single();

    if (error || !bot) return null;

    const personalityPrompt =
      (bot as unknown as BotQueryPersonality).ai_personalities?.prompt_injection ?? null;

    const { data: skills } = await client
      .from("bot_skills")
      .select("ai_skills!inner(prompt_injection)")
      .eq("bot_id", botId)
      .order("sort_order");

    const skillsPrompt =
      (skills as unknown as BotSkillQueryRow[])
        ?.map((s) => s.ai_skills?.prompt_injection)
        .filter(Boolean)
        .join("\n\n") ?? null;

    const ownerPlanCode = await getUserActivePlanCodeServer(client, bot.user_id);

    return {
      id: bot.id,
      name: bot.name,
      domain: bot.domain,
      status: bot.status,
      is_stopped: bot.is_stopped,
      rate_limit_per_day: bot.rate_limit_per_day,
      rate_limit_per_ip: bot.rate_limit_per_ip,
      user_id: bot.user_id,
      avatar_url: bot.avatar_url,
      widget_settings: bot.widget_settings,
      allowed_domains: bot.allowed_domains,
      slug: bot.slug,
      is_public: bot.is_public,
      personality_prompt: personalityPrompt,
      skills_prompt: skillsPrompt,
      owner_plan_code: ownerPlanCode,
    };
  });
}
