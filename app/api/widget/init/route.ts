import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyWidgetRequest,
  apiRateLimitMiddleware,
  checkRateLimit,
  getClientIpFromRequest,
} from "@/lib/security";
import { API_RATE_LIMITS, corsHeaders } from "@/lib/constants";
import { InitRequest, InitResponse, Message } from "@/types";
import { ESubscriptionPlan, EWidgetBackgroundType, EWidgetIconType } from "@/types";
import {
  findActiveConversation,
  getConversationMessages,
  endConversation,
} from "@/lib/services/conversations.service";
import { getWorkspaceCreditSummary, resolveWorkspaceId } from "@/lib/services/credit.service";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import { getBotStatusInfo, isMissingBotError } from "@/lib/helpers";
import { CONVERSATION_MAX_AGE, WIDGET_FALLBACK } from "@/config/widget";
import { SUGGESTED_QUESTIONS_ALLOWED_PLANS } from "@/config";
import { getBotByIdCached } from "@/lib/services/server/bot-cache.service";
import { CHATBOT_UNAVAILABLE_MESSAGE } from "@/lib/constants/chat";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest): Promise<NextResponse<InitResponse>> {
  const rateLimitResponse = apiRateLimitMiddleware(req, API_RATE_LIMITS.widgetInit);

  if (rateLimitResponse) {
    return NextResponse.json(
      {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimitResponse.retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...rateLimitResponse.rateLimitHeaders,
        },
      }
    );
  }

  try {
    const body: InitRequest = await req.json();
    const { botId, visitorId } = body;

    console.log("Widget init request received:", { botId, visitorId });

    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();
    const botData = await getBotByIdCached(supabase, botId).catch((error) => {
      if (isMissingBotError(error)) return null;
      throw error;
    });

    if (!botData) {
      return NextResponse.json(
        { success: false, message: CHATBOT_UNAVAILABLE_MESSAGE },
        { status: 404, headers: corsHeaders }
      );
    }

    if (botData.is_banned) {
      return NextResponse.json(
        { success: false, message: CHATBOT_UNAVAILABLE_MESSAGE },
        { status: 403, headers: corsHeaders }
      );
    }

    const { data: bannedUser } = await supabase
      .from("banned_users")
      .select("user_id")
      .eq("user_id", botData.user_id)
      .maybeSingle();

    if (bannedUser) {
      return NextResponse.json(
        { success: false, message: CHATBOT_UNAVAILABLE_MESSAGE },
        { status: 403, headers: corsHeaders }
      );
    }

    if (botData.is_stopped) {
      const statusInfo = getBotStatusInfo(botData.status, botData.is_stopped);

      return NextResponse.json(
        {
          success: false,
          message: statusInfo.message || "Bot is currently stopped and cannot be initialized",
        },
        { status: 423, headers: corsHeaders }
      );
    }

    // Check if this is a standalone chat request
    const isStandaloneRequest = req.headers.get("x-standalone-chat") === "true";

    let bot;
    let clientIp: string;

    if (isStandaloneRequest) {
      if (!botData.is_public) {
        return NextResponse.json(
          { success: false, message: "This bot is not publicly accessible" },
          { status: 403, headers: corsHeaders }
        );
      }

      // Extract client Ip
      clientIp = getClientIpFromRequest(req);

      bot = botData;
    } else {
      // Widget request: use security middleware
      const securityResult = await verifyWidgetRequest(req, {
        checkRateLimits: false,
        requireVisitorId: false,
      });

      if (!securityResult.success) {
        return NextResponse.json(
          {
            success: false,
            message:
              securityResult.statusCode === 404
                ? CHATBOT_UNAVAILABLE_MESSAGE
                : securityResult.error || "Unauthorized",
          },
          { status: securityResult.statusCode || 401, headers: corsHeaders }
        );
      }

      bot = {
        ...securityResult.context!.bot,
        workspace_id:
          (securityResult.context!.bot as { workspace_id?: string | null }).workspace_id ??
          botData.workspace_id ??
          null,
        user_id: securityResult.context!.bot.user_id || botData.user_id,
      };
      clientIp = securityResult.context!.clientIp;
    }

    const rateLimitResult =
      bot.rate_limit_per_day != null || bot.rate_limit_per_ip != null
        ? await checkRateLimit({
            botId: bot.id,
            clientIp,
            limitPerDay: bot.rate_limit_per_day,
            limitPerIp: bot.rate_limit_per_ip,
          })
        : undefined;

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const effectiveWorkspaceId =
      bot.workspace_id || botData.workspace_id || (await resolveWorkspaceId(supabase, bot));

    const [creditSummary, userPlanCode, conversation] = await Promise.all([
      effectiveWorkspaceId
        ? getWorkspaceCreditSummary(supabase, effectiveWorkspaceId)
        : Promise.resolve(null),
      getBotActivePlanCode(supabase, bot),
      visitorId ? findActiveConversation(supabase, botId, visitorId) : Promise.resolve(null),
    ]);

    const totalRemainingCredits =
      (creditSummary as { totalCredits?: number; totalRemainingCredits?: number } | null)
        ?.totalCredits ??
      (creditSummary as { totalCredits?: number; totalRemainingCredits?: number } | null)
        ?.totalRemainingCredits ??
      0;
    const quotaExceeded = effectiveWorkspaceId ? totalRemainingCredits <= 0 : false;
    console.log("[WidgetInitDebug]", {
      botId: bot.id,
      botWorkspaceId: bot.workspace_id,
      effectiveWorkspaceId,
      creditSummary,
      totalRemainingCredits,
      quotaExceeded,
    });
    const statusInfo = getBotStatusInfo(bot.status, bot.is_stopped);
    const widgetSettings = bot.widget_settings as {
      primaryColor?: string;
      textColor?: string;
      position?: string;
      welcomeMessage?: string;
      suggestedQuestions?: string[];
      chatIconType?: EWidgetIconType;
      chatIconPreset?: string;
      chatIconUrl?: string | null;
      chatIconColor?: string;
      chatIconBgColor?: string;
      chatBackgroundType?: EWidgetBackgroundType;
      chatBackgroundValue?: string;
      chatBackgroundOpacity?: number;
      isVoiceEnabled?: boolean;
    } | null;

    const canUseSuggestedQuestions =
      userPlanCode && SUGGESTED_QUESTIONS_ALLOWED_PLANS.includes(userPlanCode as ESubscriptionPlan);

    let existingConversation = null;
    let previousMessages: Message[] = [];

    if (visitorId) {
      if (conversation) {
        const conversationAge = Date.now() - new Date(conversation.started_at).getTime();
        if (conversationAge < CONVERSATION_MAX_AGE) {
          existingConversation = conversation;
          previousMessages = (await getConversationMessages(
            supabase,
            conversation.id,
            50
          )) as Message[];
        } else {
          endConversation(supabase, conversation.id).catch(console.error);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Widget initialized successfully",
        data: {
          id: bot.id,
          name: bot.name,
          botName: bot.name,
          avatarUrl: bot.avatar_url || null,
          status: bot.status,
          domain: bot.domain,
          subscriptionPlan: userPlanCode || ESubscriptionPlan.Free,
          quotaExceeded,
          messagesRemaining: Math.max(0, totalRemainingCredits),
          isAvailable: statusInfo.isAvailable,
          statusMessage: statusInfo.message,
          rateLimitExceeded: rateLimitResult ? !rateLimitResult.allowed : false,
          rateLimitMessage: rateLimitResult?.reason || null,
          rateLimitInfo: rateLimitResult
            ? {
                remaining: rateLimitResult.remaining,
                resetAt: rateLimitResult.resetAt,
              }
            : undefined,
          errorCode: rateLimitResult?.code,
          settings: {
            primaryColor: widgetSettings?.primaryColor || "#3B82F6",
            textColor: widgetSettings?.textColor || "#1f2937",
            position: widgetSettings?.position || WIDGET_FALLBACK.POSITION,
            welcomeMessage:
              statusInfo.message ||
              widgetSettings?.welcomeMessage ||
              "Xin chào! Tôi có thể giúp gì cho bạn?",
            // Only include suggested questions if plan allows
            ...(canUseSuggestedQuestions && {
              suggestedQuestions: widgetSettings?.suggestedQuestions || [],
            }),
            // Pass plan configurations to control STT UI on clients
            subscriptionPlan: userPlanCode || ESubscriptionPlan.Free,
            // Icon settings
            chatIconType: widgetSettings?.chatIconType || EWidgetIconType.Preset,
            chatIconPreset: widgetSettings?.chatIconPreset || "messagecircle",
            chatIconUrl: widgetSettings?.chatIconUrl || null,
            chatIconColor: widgetSettings?.chatIconColor || "#ffffff",
            chatIconBgColor: widgetSettings?.chatIconBgColor || "#3B82F6",
            // Background settings
            chatBackgroundType: widgetSettings?.chatBackgroundType || EWidgetBackgroundType.Solid,
            chatBackgroundValue: widgetSettings?.chatBackgroundValue || "#ffffff",
            chatBackgroundOpacity: widgetSettings?.chatBackgroundOpacity || 100,
            isVoiceEnabled: widgetSettings?.isVoiceEnabled ?? true,
          },
          conversationId: existingConversation?.id || null,
          messages: previousMessages,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in widget init:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
