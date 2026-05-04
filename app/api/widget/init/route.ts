import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWidgetRequest, apiRateLimitMiddleware } from "@/lib/security";
import { API_RATE_LIMITS, corsHeaders } from "@/lib/constants";
import { InitRequest, InitResponse, Message } from "@/types";
import { EBotStatus, EUsageAction } from "@/types";
import {
  findActiveConversation,
  getConversationMessages,
  endConversation,
} from "@/lib/services/conversations.service";
import { getWalletByUserId, getMonthlyBotMessageCount } from "@/lib/services/wallet.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest): Promise<NextResponse<InitResponse>> {
  // Check API rate limit first (DDoS/spam protection)
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
    // Clone request for body parsing (needed because we read body twice)
    const body: InitRequest = await req.json();
    const { botId, visitorId } = body;

    console.log("Widget init request received:", { botId, visitorId });

    if (!botId) {
      return NextResponse.json(
        { success: false, message: "botId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify request with security middleware (no rate limit for init)
    const securityResult = await verifyWidgetRequest(req, {
      checkRateLimits: false,
      requireVisitorId: false,
    });

    if (!securityResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: securityResult.error || "Unauthorized",
        },
        { status: securityResult.statusCode || 401, headers: corsHeaders }
      );
    }

    const bot = securityResult.context!.bot;
    const supabase = createAdminClient();

    // Check bot owner's wallet credits for quota (optional - may not exist)
    const wallet = await getWalletByUserId(supabase, bot.user_id);

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messagesUsed = await getMonthlyBotMessageCount(
      supabase,
      botId,
      EUsageAction.ChatMessage,
      startOfMonth
    );

    const messagesLimit = wallet?.total_credits || 1000;
    const quotaExceeded = messagesUsed >= messagesLimit;

    // Check bot status and determine availability
    const getBotStatusInfo = (status: string, isStopped: boolean) => {
      if (isStopped) {
        return {
          isAvailable: false,
          message: "Bot is temporarily suspended. Please contact the administrator.",
        };
      }
      switch (status) {
        case EBotStatus.Ready:
          return { isAvailable: true, message: null };
        case EBotStatus.Pending:
          return {
            isAvailable: false,
            message: "Bot is being set up. Please wait a moment and refresh the page.",
          };
        case EBotStatus.Discovering:
          return { isAvailable: false, message: "Bot is discovering your website..." };
        case EBotStatus.Discovered:
          return { isAvailable: false, message: "Bot is preparing data..." };
        case EBotStatus.Indexing:
          return { isAvailable: false, message: "Bot is processing and indexing data..." };
        case EBotStatus.Failed:
          return {
            isAvailable: false,
            message: "Bot encountered an error during setup. Please try again later.",
          };
        default:
          return { isAvailable: false, message: "Bot is not ready yet. Please wait a moment." };
      }
    };

    const statusInfo = getBotStatusInfo(bot.status, bot.is_stopped);

    const widgetSettings = bot.widget_settings as {
      primaryColor?: string;
      textColor?: string;
      position?: string;
      welcomeMessage?: string;
    } | null;

    // Find existing conversation for this visitor
    let existingConversation = null;
    let previousMessages: Message[] = [];

    if (visitorId) {
      const conversation = await findActiveConversation(supabase, botId, visitorId);

      if (conversation) {
        const conversationAge = Date.now() - new Date(conversation.started_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (conversationAge < maxAge) {
          existingConversation = conversation;

          // Load previous messages
          const messages = await getConversationMessages(supabase, conversation.id, 50);
          previousMessages = messages as Message[];
        } else {
          // Update the conversation to set ended_at since it's too old
          await endConversation(supabase, conversation.id);
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
          avatarUrl: bot.avatar_url || null,
          status: bot.status,
          domain: bot.domain,
          quotaExceeded,
          messagesRemaining: Math.max(0, messagesLimit - messagesUsed),
          isAvailable: statusInfo.isAvailable,
          statusMessage: statusInfo.message,
          settings: {
            primaryColor: widgetSettings?.primaryColor || "#3B82F6",
            textColor: widgetSettings?.textColor || "#1f2937",
            position: widgetSettings?.position || "bottom-right",
            welcomeMessage:
              statusInfo.message ||
              widgetSettings?.welcomeMessage ||
              "Xin chào! Tôi có thể giúp gì cho bạn?",
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
