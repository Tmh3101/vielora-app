import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, GROUP_CHAT_REQUIRES_PRO_CODE } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { isPlanSufficient } from "@/lib/helpers/plan-helpers";
import { getBotByIdServer } from "@/lib/services/bot.service";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import { isBotManager } from "@/lib/services/group-permission.service";
import {
  getGroupByBotId,
  getOrCreateGroup,
  getGroupWithMembers,
  updateGroupStatus,
} from "@/lib/services/group-chat.service";
import { GROUP_CHAT_ALLOWED_PLANS } from "@/lib/config/group-chat";
import { ESubscriptionPlan } from "@/types";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
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
    const { supabase, user } = authResult;

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const planCode = await getBotActivePlanCode(supabase, bot);
    const requiredPlan = GROUP_CHAT_ALLOWED_PLANS[0] ?? ESubscriptionPlan.Pro;
    const isSufficient = planCode && isPlanSufficient(planCode, requiredPlan);

    if (!isSufficient) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_CHAT_REQUIRES_PRO_CODE,
          message:
            "Tính năng Nhóm chat chỉ khả dụng cho gói Pro và Enterprise. Vui lòng nâng cấp gói để sử dụng.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const currentUserInfo = user && user.email ? { id: user.id, email: user.email } : undefined;
    const data = await getGroupWithMembers(supabase, botId, currentUserInfo);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          bot: bot
            ? {
                id: bot.id,
                name: bot.name,
                avatar_url: bot.avatar_url,
                widget_settings: bot.widget_settings,
                workspace_id: bot.workspace_id,
              }
            : null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error fetching group chat:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
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

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const manager = await isBotManager(supabase, botId, user.id);
    if (!manager) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Bot manager permissions required" },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!bot.workspace_id) {
      return NextResponse.json(
        { success: false, message: "Bot has no workspace assigned" },
        { status: 400, headers: corsHeaders }
      );
    }

    const planCode = await getBotActivePlanCode(supabase, bot);
    const requiredPlan = GROUP_CHAT_ALLOWED_PLANS[0] ?? ESubscriptionPlan.Pro;

    if (!planCode || !isPlanSufficient(planCode, requiredPlan)) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_CHAT_REQUIRES_PRO_CODE,
          message: "Please upgrade to Pro or Enterprise plan to use Group Chat.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    const group = await getOrCreateGroup(supabase, botId, user.id);
    return NextResponse.json({ success: true, data: group }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Error creating group chat:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
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

    const manager = await isBotManager(supabase, botId, user.id);
    if (!manager) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Bot manager permissions required" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { status }: { status?: "active" | "disabled" } = body;

    if (!status || !["active", "disabled"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Valid status ('active' or 'disabled') is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const existingGroup = await getGroupByBotId(supabase, botId);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, message: "Group chat not found for this bot" },
        { status: 404, headers: corsHeaders }
      );
    }

    const updatedGroup = await updateGroupStatus(supabase, existingGroup.id, status);
    return NextResponse.json({ success: true, data: updatedGroup }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating group chat status:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
