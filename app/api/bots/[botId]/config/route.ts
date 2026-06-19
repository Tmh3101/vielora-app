import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, PLAN_RANK } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { getBotByIdServer } from "@/lib/services/bot.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { getPersonalityById } from "@/lib/services/ai-personality.service";
import { getSkillsByIds } from "@/lib/services/ai-skill.service";
import { updateBotPersonality, syncBotSkills } from "@/lib/services/ai-config.service";
import { clearBotWidgetCache } from "@/lib/cache/bot-cache";
import { AI_CONFIG_REQUIRED_PLAN } from "@/lib/config/ai-customization";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    // Verify bot ownership
    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }
    if (bot.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { personalityId, skillIds }: { personalityId?: string | null; skillIds?: string[] } =
      body;

    const planCode = await getUserActivePlanCodeServer(supabase, user.id);

    if (!planCode || (PLAN_RANK[planCode] ?? -1) < (PLAN_RANK[AI_CONFIG_REQUIRED_PLAN] ?? 0)) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nâng cấp gói để sử dụng tính năng AI." },
        { status: 403, headers: corsHeaders }
      );
    }

    // Update personality if provided
    if (personalityId !== undefined) {
      if (personalityId !== null) {
        const personality = await getPersonalityById(supabase, personalityId);

        if (!personality || !personality.is_active) {
          return NextResponse.json(
            { success: false, message: "Selected personality not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      }

      await updateBotPersonality(supabase, botId, personalityId);
    }

    // Update skills if provided
    if (skillIds !== undefined) {
      if (!Array.isArray(skillIds)) {
        return NextResponse.json(
          { success: false, message: "skillIds must be an array" },
          { status: 400, headers: corsHeaders }
        );
      }
      if (skillIds.length > 0) {
        const skills = await getSkillsByIds(supabase, skillIds);

        if (skills.length !== skillIds.length) {
          return NextResponse.json(
            { success: false, message: "One or more skills not found" },
            { status: 404, headers: corsHeaders }
          );
        }
      }

      await syncBotSkills(supabase, botId, skillIds);
    }

    // Invalidate cache
    await clearBotWidgetCache(botId).catch(console.error);

    return NextResponse.json(
      { success: true, message: "Bot AI config updated successfully" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error updating bot AI config:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
