import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateChatResponse } from "@/lib/rag/generative";
import { getSystemPrompt } from "@/lib/ai/prompt";
import {
  verifyWidgetRequest,
  apiRateLimitMiddleware,
  checkRateLimit,
  getClientIpFromRequest,
  type RateLimitResult,
} from "@/lib/security";
import { BOT_RATE_LIMIT_ERROR_CODES } from "@/lib/bot-rate-limit";
import {
  ChatRequest,
  ChatResponse,
  EBotStatus,
  ETransactionType,
  EUsageAction,
  EMessageRole,
} from "@/types";
import { API_RATE_LIMITS, corsHeaders, MessageRole } from "@/lib/constants";
import { hybridRetrival, shouldShowLeadForm } from "@/lib/rag/retrieval";
import { classifyIntent, Intent } from "@/lib/rag/intent-classifier";
import {
  CREDIT_PER_MESSAGE,
  MAX_HISTORY_MESSAGES,
  MAX_CHAT_INPUT,
  ERROR_RESPONSE,
  NO_ANSWER_PHRASES,
} from "@/config";
import { deductCredits, refundCredits } from "@/lib/services/credit.service";
import {
  createConversation,
  saveMessage,
  getMessagesForContext,
} from "@/lib/services/conversations.service";
import {
  getBotWithAIConfigCached,
  type BotAIConfig,
} from "@/lib/services/server/bot-cache.service";
import { insertUsageLog } from "@/lib/services/wallet.service";
import { isMissingBotError } from "@/lib/helpers";
import { isUserBanned } from "@/lib/services/banned.service";
import {
  CHATBOT_UNAVAILABLE_MESSAGE,
  INSUFFICIENT_CREDITS_ERROR_CODE,
  INSUFFICIENT_CREDITS_MESSAGE,
  LEAD_FORM_MESSAGE,
  ChatResponseType,
} from "@/lib/constants/chat";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

function createBusinessRateLimitResponse(rateLimitResult: RateLimitResult) {
  return NextResponse.json(
    {
      success: false,
      message: rateLimitResult.reason || "Rate limit exceeded",
      code: rateLimitResult.code,
      rateLimitInfo: {
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      },
    },
    { status: 429, headers: corsHeaders }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse>> {
  const rateLimitResponse = apiRateLimitMiddleware(req, API_RATE_LIMITS.widgetChat);

  if (rateLimitResponse) {
    return NextResponse.json(
      {
        success: false,
        message: `Rate limit exceeded. Try again in ${rateLimitResponse.retryAfter} seconds.`,
        code: BOT_RATE_LIMIT_ERROR_CODES.ApiExceeded,
      },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    const body: ChatRequest = await req.json();
    const { botId, message, conversationId, visitorId } = body;

    const supabase = createAdminClient();

    console.log("Received chat request:", {
      botId,
      message,
      conversationId,
      visitorId,
    });

    if (!botId || !message || !visitorId) {
      return NextResponse.json(
        { success: false, message: "botId, message, and visitorId are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (message.trim().length > MAX_CHAT_INPUT) {
      return NextResponse.json(
        {
          success: false,
          message: `The message length exceeds the allowed limit (${MAX_CHAT_INPUT} characters). Please shorten the content.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const botData = await getBotWithAIConfigCached(supabase, botId).catch((error) => {
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

    const bannedUser = await isUserBanned(supabase, botData.user_id);

    if (bannedUser) {
      return NextResponse.json(
        { success: false, message: CHATBOT_UNAVAILABLE_MESSAGE },
        { status: 403, headers: corsHeaders }
      );
    }

    if (botData.is_stopped) {
      return NextResponse.json(
        { success: false, message: "Bot is currently stopped and not accepting messages" },
        { status: 403, headers: corsHeaders }
      );
    }

    let bot;
    let clientIp: string;

    if (req.headers.get("x-standalone-chat") === "true") {
      if (!botData.is_public) {
        return NextResponse.json(
          { success: false, message: "This bot is not publicly accessible" },
          { status: 403, headers: corsHeaders }
        );
      }

      clientIp = getClientIpFromRequest(req);
      bot = botData;

      if (bot.rate_limit_per_day != null || bot.rate_limit_per_ip != null) {
        const rateLimitResult = await checkRateLimit({
          botId: bot.id,
          clientIp,
          limitPerDay: bot.rate_limit_per_day,
          limitPerIp: bot.rate_limit_per_ip,
        });

        if (!rateLimitResult.allowed) {
          return createBusinessRateLimitResponse(rateLimitResult);
        }
      }
    } else {
      const securityResult = await verifyWidgetRequest(req, {
        checkRateLimits: true,
        requireVisitorId: true,
      });

      if (!securityResult.success) {
        if (securityResult.statusCode === 429 && securityResult.rateLimitResult) {
          return createBusinessRateLimitResponse(securityResult.rateLimitResult);
        }

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

      bot = securityResult.context!.bot;
      clientIp = securityResult.context!.clientIp;
    }

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    if (bot.status !== EBotStatus.Ready) {
      return NextResponse.json(
        {
          success: false,
          message: "Bot is not ready",
          status: bot.status,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Intent classification
    const intent = classifyIntent(message);

    // Get or create conversation early (needed for both flows)
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const newConversation = await createConversation(supabase, botId, visitorId);
      currentConversationId = newConversation.id;
    }

    // Save user message
    await saveMessage(supabase, currentConversationId, EMessageRole.User, message);

    // Social messages: skip RAG, go straight to LLM with friendly response
    if (intent === Intent.Social) {
      const deductionResult = await deductCredits(supabase, {
        userId: bot.user_id,
        creditAmount: CREDIT_PER_MESSAGE,
        transactionType: ETransactionType.ChatMessage,
        transactionDescription: `Deducted ${CREDIT_PER_MESSAGE} credit for chat message on bot ${botId}`,
      });

      if (!deductionResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: INSUFFICIENT_CREDITS_MESSAGE,
            code: INSUFFICIENT_CREDITS_ERROR_CODE,
            error: deductionResult.message || "Insufficient credits to send chat messages.",
          },
          { status: 402, headers: corsHeaders }
        );
      }

      let deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
      let deductedFromPayg = deductionResult.deductedFromPayg || 0;

      try {
        const prevMessages = await getMessagesForContext(
          supabase,
          currentConversationId,
          MAX_HISTORY_MESSAGES
        );

        const conversationHistory = prevMessages
          .filter((m) => m.role !== EMessageRole.System)
          .slice(0, -1)
          .map((m) => ({
            role: m.role === EMessageRole.Assistant ? MessageRole.MODEL : MessageRole.USER,
            content: m.content,
          }));

        const assistantMessage = await generateChatResponse(
          getSystemPrompt(bot, "", undefined, undefined),
          message,
          conversationHistory
        ).catch(async (error) => {
          console.error("Gemini API error (social):", error);
          if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
            await refundCredits(supabase, {
              userId: bot.user_id,
              deductedFromSubscription,
              deductedFromPayg,
              transactionType: ETransactionType.ChatMessageRefund,
              transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to chat processing failure on bot ${botId}`,
            });
            deductedFromSubscription = 0;
            deductedFromPayg = 0;
          }
          return ERROR_RESPONSE;
        });

        await saveMessage(
          supabase,
          currentConversationId,
          EMessageRole.Assistant,
          assistantMessage
        );

        await insertUsageLog(supabase, {
          bot_id: botId,
          action: EUsageAction.ChatMessage,
          visitor_id: visitorId,
          client_ip: clientIp,
          count: 1,
        });

        return NextResponse.json(
          {
            success: true,
            message: "Message processed successfully",
            data: {
              conversationId: currentConversationId,
              message: assistantMessage,
              noAnswer: false,
              type: ChatResponseType.MESSAGE,
            },
          },
          { headers: corsHeaders }
        );
      } catch (processingError) {
        if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
          await refundCredits(supabase, {
            userId: bot.user_id,
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.ChatMessageRefund,
            transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to chat processing failure on bot ${botId}`,
          });
        }
        throw processingError;
      }
    }

    // Knowledge messages: use RAG
    const retrieval = await hybridRetrival(message, botId);

    if (shouldShowLeadForm(retrieval)) {
      await saveMessage(
        supabase,
        currentConversationId,
        EMessageRole.Assistant,
        LEAD_FORM_MESSAGE,
        true
      );

      await insertUsageLog(supabase, {
        bot_id: botId,
        action: EUsageAction.ChatMessage,
        visitor_id: visitorId,
        client_ip: clientIp,
        count: 1,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Message requires lead generation",
          data: {
            conversationId: currentConversationId,
            message: LEAD_FORM_MESSAGE,
            noAnswer: true,
            type: ChatResponseType.SHOW_LEAD_FORM,
            originalQuestion: message,
          },
        },
        { headers: corsHeaders }
      );
    }

    // Normal RAG flow: deduct credits and generate AI response
    const deductionResult = await deductCredits(supabase, {
      userId: bot.user_id,
      creditAmount: CREDIT_PER_MESSAGE,
      transactionType: ETransactionType.ChatMessage,
      transactionDescription: `Deducted ${CREDIT_PER_MESSAGE} credit for chat message on bot ${botId}`,
    });

    if (!deductionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: INSUFFICIENT_CREDITS_MESSAGE,
          code: INSUFFICIENT_CREDITS_ERROR_CODE,
          error: deductionResult.message || "Insufficient credits to send chat messages.",
        },
        { status: 402, headers: corsHeaders }
      );
    }

    let deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
    let deductedFromPayg = deductionResult.deductedFromPayg || 0;

    try {
      const isPaidOwner = botData.owner_plan_code && botData.owner_plan_code !== "free";
      const personalityPrompt = isPaidOwner
        ? ((bot as BotAIConfig).personality_prompt ?? undefined)
        : undefined;
      const skillsPrompt = isPaidOwner
        ? ((bot as BotAIConfig).skills_prompt ?? undefined)
        : undefined;
      const systemPrompt = getSystemPrompt(bot, retrieval.context, personalityPrompt, skillsPrompt);

      const prevMessages = await getMessagesForContext(
        supabase,
        currentConversationId,
        MAX_HISTORY_MESSAGES
      );

      const conversationHistory = prevMessages
        .filter((m) => m.role !== EMessageRole.System)
        .slice(0, -1)
        .map((m) => ({
          role: m.role === EMessageRole.Assistant ? MessageRole.MODEL : MessageRole.USER,
          content: m.content,
        }));

      console.log("conversationHistory:", conversationHistory);

      const assistantMessage = await generateChatResponse(
        systemPrompt,
        message,
        conversationHistory
      ).catch(async (error) => {
        console.error("Gemini API error:", error);
        if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
          await refundCredits(supabase, {
            userId: bot.user_id,
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.ChatMessageRefund,
            transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to chat processing failure on bot ${botId}`,
          }).catch((refundError) => {
            console.error("Failed to refund credits after chat processing error:", refundError);
          });
          deductedFromSubscription = 0;
          deductedFromPayg = 0;
        }
        return ERROR_RESPONSE;
      });

      const noAnswer = NO_ANSWER_PHRASES.some((phrase) =>
        assistantMessage.toLowerCase().includes(phrase)
      );

      await saveMessage(
        supabase,
        currentConversationId,
        EMessageRole.Assistant,
        assistantMessage,
        noAnswer
      );

      await insertUsageLog(supabase, {
        bot_id: botId,
        action: EUsageAction.ChatMessage,
        visitor_id: visitorId,
        client_ip: clientIp,
        count: 1,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Message processed successfully",
          data: {
            conversationId: currentConversationId,
            message: assistantMessage,
            noAnswer,
            type: ChatResponseType.MESSAGE,
          },
        },
        { headers: corsHeaders }
      );
    } catch (processingError) {
      if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
        await refundCredits(supabase, {
          userId: bot.user_id,
          deductedFromSubscription,
          deductedFromPayg,
          transactionType: ETransactionType.ChatMessageRefund,
          transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to chat processing failure on bot ${botId}`,
        });
      }

      throw processingError;
    }
  } catch (error) {
    console.error("Error in widget chat:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
