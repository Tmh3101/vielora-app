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
import { deductBotCredits, refundBotCredits } from "@/lib/services/credit.service";
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
import { matchKeyAction } from "@/lib/utils/intent-matcher";
import {
  matchByLLM,
  preflightNavigation,
  buildNavigationContextBlock,
} from "@/lib/services/navigation-llm-match.service";
import { validateNavigationTarget } from "@/lib/security/navigation-validator";
import { isNavigationEnabledForBot } from "@/lib/services/navigation-gating";
import type { KeyActionPage, WidgetSettings } from "@/types";

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

/**
 * Attempt Smart Homepage navigation. Returns the navigation payload OR null.
 * Pure, no LLM calls. Caller decides whether to short-circuit the response.
 */
async function tryNavigation(
  supabase: ReturnType<typeof createAdminClient>,
  botData: {
    workspace_id?: string | null;
    widget_settings?: unknown;
    domain: string;
    allowed_domains: string[];
    id?: string;
  },
  message: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }> = []
): Promise<{ url: string; anchor?: string | null; explicit: boolean } | null> {
  // 1. Master toggle and whitelist present?
  const settings = (botData.widget_settings ?? {}) as WidgetSettings;
  const allowedPages = settings.allowed_pages ?? [];
  const autoPages = settings.auto_pages ?? [];
  const pages: KeyActionPage[] = settings.navigation_enabled ? [...allowedPages, ...autoPages] : [];
  console.log("[SmartHomepage] tryNavigation called", {
    botId: botData.id ?? null,
    navigation_enabled: settings.navigation_enabled ?? false,
    allowedPagesCount: allowedPages.length,
    autoPagesCount: autoPages.length,
    totalPages: pages.length,
    message: message.slice(0, 80),
  });
  if (pages.length === 0) {
    console.log("[SmartHomepage] No pages (whitelist empty or toggle off) → skip");
    return null;
  }

  // 2. Plan gating
  const enabled = await isNavigationEnabledForBot(supabase, {
    workspace_id: botData.workspace_id ?? null,
  });
  if (!enabled) {
    console.log("[SmartHomepage] Plan gating blocked (not Standard/Pro/Enterprise)");
    return null;
  }

  // 3. Match intent (LLM-first, substring fallback)
  let matchUrl: string | null = null;
  let matchAnchor: string | null = null;
  let matchExplicit = false;
  let matchSource: "llm" | "substring" | null = null;

  if (botData.id) {
    const llmResult = await matchByLLM({
      botId: botData.id,
      userMessage: message,
      conversationHistory,
      candidates: pages,
    });
    if (llmResult) {
      matchUrl = llmResult.url;
      matchAnchor = llmResult.anchor ?? null;
      matchExplicit = true; // LLM-confident → treat as explicit (no countdown)
      matchSource = "llm";
    }
  }

  if (!matchUrl) {
    const subMatch = matchKeyAction(message, pages);
    if (subMatch) {
      matchUrl = subMatch.url;
      matchAnchor = subMatch.anchor ?? null;
      matchExplicit = subMatch.explicit;
      matchSource = "substring";
    }
  }

  if (!matchUrl) {
    console.log("[SmartHomepage] No intent match (LLM + substring)");
    return null;
  }
  console.log("[SmartHomepage] Intent matched", {
    url: matchUrl,
    anchor: matchAnchor,
    explicit: matchExplicit,
    source: matchSource,
  });

  // 4. Security validation (FR-6 Layer 2)
  const result = validateNavigationTarget(matchUrl, {
    domain: botData.domain,
    allowed_domains: botData.allowed_domains,
  });
  if (!result.ok) {
    console.warn(`[SmartHomepage] Blocked navigation target: ${matchUrl}`);
    return null;
  }
  console.log("[SmartHomepage] Security OK → returning NAVIGATE", {
    url: matchUrl,
    anchor: matchAnchor,
    explicit: matchExplicit,
  });

  return { url: matchUrl, anchor: matchAnchor, explicit: matchExplicit };
}

/**
 * FR-11 preflight: build a navigation context block to inject into the chat
 * system prompt BEFORE the Gemini call, so the bot's reply can acknowledge
 * the upcoming navigation in the user's language. Returns an empty string
 * when navigation is disabled, no candidates exist, or no match is found.
 */
async function buildNavContext(
  supabase: ReturnType<typeof createAdminClient>,
  botData: { id?: string; widget_settings?: unknown; workspace_id?: string | null },
  message: string,
  conversationHistory: Array<{ role: "user" | "model"; content: string }>
): Promise<string> {
  if (!botData.id) return "";
  const settings = (botData.widget_settings ?? {}) as WidgetSettings;
  if (!settings.navigation_enabled) return "";
  const candidates: KeyActionPage[] = [
    ...(settings.allowed_pages ?? []),
    ...(settings.auto_pages ?? []),
  ];
  if (candidates.length === 0) return "";
  const preflight = await preflightNavigation(botData.id, message, conversationHistory, candidates);
  if (!preflight.matched) return "";
  return buildNavigationContextBlock(preflight);
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

    console.log("[WidgetChatDebug] Received chat request:", {
      botId,
      message,
      conversationId,
      visitorId,
      standaloneHeader: req.headers.get("x-standalone-chat"),
      origin: req.headers.get("origin"),
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
      console.warn("[WidgetChatDebug] botData not found for botId:", botId);
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
        console.warn("[WidgetChatDebug] verifyWidgetRequest failed:", securityResult);
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

    console.log("[WidgetChatDebug] Resolved bot context:", {
      id: bot.id,
      user_id: bot.user_id,
      workspace_id: (bot as unknown as { workspace_id?: string }).workspace_id,
    });

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
      const deductionResult = await deductBotCredits(supabase, botData, {
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

        // FR-11: preflight nav intent and append context to the system prompt
        // BEFORE the Gemini call so the reply can acknowledge the navigation.
        const baseSystemPrompt = getSystemPrompt(bot, "", undefined, undefined);
        const navContext = await buildNavContext(supabase, botData, message, conversationHistory);
        if (navContext) {
          console.log("[SmartHomepage] Pre-flight: injecting nav context into system prompt");
          console.log("[SmartHomepage] Pre-flight nav context", {
            botId: botData.id,
            matched: !!navContext,
            preview: navContext ? navContext.slice(0, 120) : null,
          });
        }
        const augmentedSystemPrompt = navContext
          ? `${baseSystemPrompt}\n${navContext}`
          : baseSystemPrompt;

        const assistantMessage = await generateChatResponse(
          augmentedSystemPrompt,
          message,
          conversationHistory
        ).catch(async (error) => {
          console.error("Gemini API error (social):", error);
          if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
            await refundBotCredits(supabase, botData, {
              deductedFromSubscription,
              deductedFromPayg,
              transactionType: ETransactionType.ChatMessageRefund,
              transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to failure while recording social chat message for bot ${botId}`,
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
          workspace_id: botData.workspace_id ?? null,
          action: EUsageAction.ChatMessage,
          visitor_id: visitorId,
          client_ip: clientIp,
          count: 1,
        });

        // Smart Homepage navigation (SH-001) — social flow
        if (req.headers.get("x-standalone-chat") !== "true") {
          const nav = await tryNavigation(
            supabase,
            { ...botData, id: botId },
            message,
            conversationHistory
          );
          if (nav) {
            return NextResponse.json(
              {
                success: true,
                message: "Message processed successfully",
                data: {
                  conversationId: currentConversationId,
                  message: assistantMessage,
                  noAnswer: false,
                  type: ChatResponseType.NAVIGATE,
                  url: nav.url,
                  anchor: nav.anchor ?? undefined,
                  explicit: nav.explicit,
                },
              },
              { headers: corsHeaders }
            );
          }
        }

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
          await refundBotCredits(supabase, botData, {
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.ChatMessageRefund,
            transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to an error while generating social response for bot ${botId}`,
          });
        }
        throw processingError;
      }
    }

    // Knowledge messages: use RAG (bot private + workspace shared)
    const retrieval = await hybridRetrival(message, botId, botData.workspace_id ?? null);

    if (shouldShowLeadForm(retrieval)) {
      const deductionResult = await deductBotCredits(supabase, botData, {
        creditAmount: CREDIT_PER_MESSAGE,
        transactionType: ETransactionType.ChatMessage,
        transactionDescription: `Deducted ${CREDIT_PER_MESSAGE} credit for lead form chat message on bot ${botId}`,
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

      const deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
      const deductedFromPayg = deductionResult.deductedFromPayg || 0;

      try {
        await saveMessage(
          supabase,
          currentConversationId,
          EMessageRole.Assistant,
          LEAD_FORM_MESSAGE,
          true
        );

        await insertUsageLog(supabase, {
          bot_id: botId,
          workspace_id: botData.workspace_id ?? null,
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
      } catch (processingError) {
        if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
          await refundBotCredits(supabase, botData, {
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.ChatMessageRefund,
            transactionDescription: `Refunded ${CREDIT_PER_MESSAGE} credit due to an error while recording lead form message for bot ${botId}`,
          });
        }
        throw processingError;
      }
    }

    // Normal RAG flow: deduct credits and generate AI response
    const deductionResult = await deductBotCredits(supabase, botData, {
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

      // FR-11: preflight nav intent and append context to the system prompt
      // BEFORE the Gemini call so the reply can acknowledge the navigation.
      const navContext = await buildNavContext(supabase, botData, message, conversationHistory);
      if (navContext) {
        console.log("[SmartHomepage] Pre-flight: injecting nav context into system prompt");
        console.log("[SmartHomepage] Pre-flight nav context", {
          botId: botData.id,
          matched: !!navContext,
          preview: navContext ? navContext.slice(0, 120) : null,
        });
      }
      // Append after the existing system prompt so it does not override the
      // primary system instructions (CONSTRAINTS / CONTEXT).
      const augmentedSystemPrompt = navContext ? `${systemPrompt}\n${navContext}` : systemPrompt;

      const assistantMessage = await generateChatResponse(
        augmentedSystemPrompt,
        message,
        conversationHistory
      ).catch(async (error) => {
        console.error("Gemini API error:", error);
        if (CREDIT_PER_MESSAGE > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
          await refundBotCredits(supabase, botData, {
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
        workspace_id: botData.workspace_id ?? null,
        action: EUsageAction.ChatMessage,
        visitor_id: visitorId,
        client_ip: clientIp,
        count: 1,
      });

      // Smart Homepage navigation (SH-001) — knowledge flow
      if (req.headers.get("x-standalone-chat") !== "true") {
        const nav = await tryNavigation(
          supabase,
          { ...botData, id: botId },
          message,
          conversationHistory
        );
        if (nav) {
          return NextResponse.json(
            {
              success: true,
              message: "Message processed successfully",
              data: {
                conversationId: currentConversationId,
                message: assistantMessage,
                noAnswer,
                type: ChatResponseType.NAVIGATE,
                url: nav.url,
                anchor: nav.anchor ?? undefined,
                explicit: nav.explicit,
              },
            },
            { headers: corsHeaders }
          );
        }
      }

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
        await refundBotCredits(supabase, botData, {
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
