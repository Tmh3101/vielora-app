import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyWidgetRequest,
  apiRateLimitMiddleware,
  checkRateLimit,
  getClientIpFromRequest,
} from "@/lib/security";
import { API_RATE_LIMITS, corsHeaders } from "@/lib/constants";
import { EBotStatus, ETransactionType, ESubscriptionPlan } from "@/types";
import { deductBotCredits, refundBotCredits } from "@/lib/services/credit.service";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import { getBotByIdCached } from "@/lib/services/server/bot-cache.service";
import { CHATBOT_UNAVAILABLE_MESSAGE } from "@/lib/constants/chat";
import { transcribeAudio } from "@/lib/ai/stt";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Rate Limiting Check
  const rateLimitResponse = apiRateLimitMiddleware(req, API_RATE_LIMITS.widgetVoice);
  if (rateLimitResponse) {
    return NextResponse.json(
      {
        success: false,
        message:
          API_RATE_LIMITS.widgetVoice.message || "Too many voice requests. Please try again later.",
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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy file âm thanh" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Widget Security Verification
    const isStandaloneRequest = req.headers.get("x-standalone-chat") === "true";
    let bot;
    let clientIp: string;

    const botId = req.headers.get("x-bot-id");
    const visitorId = req.headers.get("x-visitor-id");

    if (!botId || !visitorId) {
      return NextResponse.json(
        { success: false, message: "x-bot-id and x-visitor-id headers are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    if (isStandaloneRequest) {
      const botData = await getBotByIdCached(supabase, botId).catch(() => null);
      if (!botData) {
        return NextResponse.json(
          { success: false, message: CHATBOT_UNAVAILABLE_MESSAGE },
          { status: 404, headers: corsHeaders }
        );
      }

      if (!botData.is_public || botData.is_banned || botData.is_stopped) {
        return NextResponse.json(
          { success: false, message: "This bot is not accessible" },
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
          return NextResponse.json(
            { success: false, message: rateLimitResult.reason || "Rate limit exceeded" },
            { status: 429, headers: corsHeaders }
          );
        }
      }
    } else {
      const securityResult = await verifyWidgetRequest(req, {
        checkRateLimits: true,
        requireVisitorId: true,
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

      bot = securityResult.context!.bot;
      clientIp = securityResult.context!.clientIp;
    }

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    if (bot.status !== EBotStatus.Ready) {
      return NextResponse.json(
        { success: false, message: "Bot is not ready" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. SaaS Plan Gatekeeping (Standard, Pro, and Enterprise allowed. Free blocked)
    const userPlanCode = await getBotActivePlanCode(supabase, bot);
    const allowedPlans = [
      ESubscriptionPlan.Standard,
      ESubscriptionPlan.Pro,
      ESubscriptionPlan.Enterprise,
    ];
    const isAllowedPlan = userPlanCode && allowedPlans.includes(userPlanCode as ESubscriptionPlan);

    if (!isAllowedPlan) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tính năng Voice Input không khả dụng đối với gói dịch vụ Miễn phí. Vui lòng nâng cấp gói cước để sử dụng.",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. Deduct 1 Credit for STT API call
    const CREDIT_STT_COST = 1;
    const deductionResult = await deductBotCredits(supabase, bot, {
      creditAmount: CREDIT_STT_COST,
      transactionType: ETransactionType.ChatMessage, // Standard category used for general bot interactions
      transactionDescription: `Deducted ${CREDIT_STT_COST} credit for Voice STT on bot ${bot.id}`,
    });

    if (!deductionResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản sở hữu Bot không đủ credits để xử lý tin nhắn thoại.",
          error: deductionResult.message,
        },
        { status: 402, headers: corsHeaders }
      );
    }

    // Track credits for refund fallback
    const deductedFromSubscription = deductionResult.deductedFromSubscription || 0;
    const deductedFromPayg = deductionResult.deductedFromPayg || 0;

    try {
      // 5. Transcribe Audio using lib/ai/stt service module
      const arrayBuffer = await file.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");
      const textResult = await transcribeAudio({
        base64Audio,
        mimeType: file.type || "audio/webm",
      });

      if (!textResult) {
        // Refund credit if transcription didn't yield text
        if (CREDIT_STT_COST > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
          await refundBotCredits(supabase, bot, {
            deductedFromSubscription,
            deductedFromPayg,
            transactionType: ETransactionType.ChatMessageRefund,
            transactionDescription: `Refunded ${CREDIT_STT_COST} credit due to empty Voice STT on bot ${bot.id}`,
          });
        }

        return NextResponse.json(
          {
            success: false,
            message: "Không nhận diện được giọng nói trong đoạn âm thanh. Vui lòng thử lại.",
          },
          { status: 400, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          text: textResult,
        },
        { headers: corsHeaders }
      );
    } catch (genError) {
      // Refund credits on transcription failure
      if (CREDIT_STT_COST > 0 && (deductedFromSubscription > 0 || deductedFromPayg > 0)) {
        await refundBotCredits(supabase, bot, {
          deductedFromSubscription,
          deductedFromPayg,
          transactionType: ETransactionType.ChatMessageRefund,
          transactionDescription: `Refunded ${CREDIT_STT_COST} credit due to Voice STT failure on bot ${bot.id}`,
        });
      }
      throw genError;
    }
  } catch (error) {
    console.error("Lỗi xử lý Speech-to-Text:", error);
    const errorMessage = error instanceof Error ? error.message : "Lỗi xử lý chuyển ngữ giọng nói";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
