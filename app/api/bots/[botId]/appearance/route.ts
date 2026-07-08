import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { ESubscriptionPlan, AppearanceUpdateResponse, AppearanceUpdateRequest } from "@/types";
import { clearBotCache } from "@/lib/services/server/bot-cache.service";
import {
  getBotByIdServer,
  updateBotAppearance,
  validateSuggestedQuestions,
} from "@/lib/services/bot.service";
import { getUserActivePlanCodeServer } from "@/lib/services/subscription.service";
import { isHexColor } from "@/lib/helpers";
import { SUGGESTED_QUESTIONS_ALLOWED_PLANS } from "@/config";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
): Promise<NextResponse<AppearanceUpdateResponse>> {
  try {
    const { botId } = await params;

    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Authenticate user
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) return authResult;
    const { user, supabase } = authResult;

    // Get bot and verify ownership
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

    // Parse request body
    const body: AppearanceUpdateRequest = await req.json();
    const { name, avatarUrl, widgetSettings } = body;
    const normalizedName = typeof name === "string" ? name.trim() : name;
    const normalizedPrimaryColor =
      typeof widgetSettings?.primaryColor === "string"
        ? widgetSettings.primaryColor.trim()
        : widgetSettings?.primaryColor;
    const normalizedWelcomeMessage =
      typeof widgetSettings?.welcomeMessage === "string"
        ? widgetSettings.welcomeMessage.trim()
        : widgetSettings?.welcomeMessage;

    if (typeof name === "string" && !normalizedName) {
      return NextResponse.json(
        { success: false, message: "Tên Bot không được để trống." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof widgetSettings?.welcomeMessage === "string" && !normalizedWelcomeMessage) {
      return NextResponse.json(
        { success: false, message: "Tin nhắn chào mừng không được để trống." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (typeof widgetSettings?.primaryColor === "string" && !isHexColor(normalizedPrimaryColor)) {
      return NextResponse.json(
        { success: false, message: "Màu thương hiệu phải là mã Hex hợp lệ dạng #RRGGBB." },
        { status: 400, headers: corsHeaders }
      );
    }

    // If suggestedQuestions is being set, check plan
    if (widgetSettings?.suggestedQuestions && widgetSettings.suggestedQuestions.length > 0) {
      const planCode = await getUserActivePlanCodeServer(supabase, user.id);

      if (!planCode) {
        return NextResponse.json(
          { success: false, message: "Unable to verify subscription status" },
          { status: 403, headers: corsHeaders }
        );
      }

      // Check if plan allows using suggested questions
      if (!SUGGESTED_QUESTIONS_ALLOWED_PLANS.includes(planCode as ESubscriptionPlan)) {
        return NextResponse.json(
          {
            success: false,
            message: "Upgrade to Standard or Pro plan to use suggested questions feature.",
          },
          { status: 403, headers: corsHeaders }
        );
      }

      // Validate suggestedQuestions format
      const validation = validateSuggestedQuestions(widgetSettings.suggestedQuestions);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, message: validation.error },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Build updated widget settings
    let updatedWidgetSettings = null;
    if (widgetSettings) {
      // Get current widget settings
      const currentBot = await supabase
        .from("bots")
        .select("widget_settings")
        .eq("id", botId)
        .single();
      const currentSettings = (currentBot.data?.widget_settings as Record<string, unknown>) || {};

      // Merge with new settings
      updatedWidgetSettings = {
        ...currentSettings,
        ...(widgetSettings?.primaryColor !== undefined && {
          primaryColor: normalizedPrimaryColor,
        }),
        ...(widgetSettings?.textColor !== undefined && {
          textColor: widgetSettings.textColor,
        }),
        ...(widgetSettings?.position !== undefined && { position: widgetSettings.position }),
        ...(widgetSettings?.welcomeMessage !== undefined && {
          welcomeMessage: normalizedWelcomeMessage,
        }),
        ...(widgetSettings?.suggestedQuestions !== undefined && {
          suggestedQuestions: widgetSettings.suggestedQuestions ?? [],
        }),
        ...(widgetSettings.chatBackgroundType !== undefined && {
          chatBackgroundType: widgetSettings.chatBackgroundType,
        }),
        ...(widgetSettings.chatBackgroundValue !== undefined && {
          chatBackgroundValue: widgetSettings.chatBackgroundValue,
        }),
        ...(widgetSettings.chatBackgroundOpacity !== undefined && {
          chatBackgroundOpacity: widgetSettings.chatBackgroundOpacity,
        }),
        ...(widgetSettings.chatIconType !== undefined && {
          chatIconType: widgetSettings.chatIconType,
        }),
        ...(widgetSettings.chatIconPreset !== undefined && {
          chatIconPreset: widgetSettings.chatIconPreset,
        }),
        ...(widgetSettings.chatIconUrl !== undefined && {
          chatIconUrl: widgetSettings.chatIconUrl,
        }),
        ...(widgetSettings.chatIconColor !== undefined && {
          chatIconColor: widgetSettings.chatIconColor,
        }),
        ...(widgetSettings.chatIconBgColor !== undefined && {
          chatIconBgColor: widgetSettings.chatIconBgColor,
        }),
      };
    }

    // Update bot appearance
    await updateBotAppearance(supabase, botId, {
      name: normalizedName,
      avatarUrl,
      widgetSettings: updatedWidgetSettings,
    });

    // Clear cached widget data
    clearBotCache(botId).catch(console.error);

    // Fetch updated bot
    const { data: updatedBot, error } = await supabase
      .from("bots")
      .select("id, name, avatar_url, widget_settings")
      .eq("id", botId)
      .single();

    if (error || !updatedBot) {
      return NextResponse.json(
        { success: false, message: "Failed to retrieve updated bot" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Bot appearance updated successfully",
        data: {
          id: updatedBot.id,
          name: updatedBot.name,
          avatar_url: updatedBot.avatar_url,
          widget_settings: updatedBot.widget_settings as Record<string, unknown>,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error updating bot appearance:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
