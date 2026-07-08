import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/constants";
import { createLead } from "@/lib/services/lead.service";
import { getMessagesForContext } from "@/lib/services/conversations.service";
import { verifyWidgetRequest, apiRateLimitMiddleware } from "@/lib/security";
import { API_RATE_LIMITS } from "@/lib/constants";
import { BOT_RATE_LIMIT_ERROR_CODES } from "@/lib/bot-rate-limit";
import type { LeadFormRequest } from "@/types/widget-api";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
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
    const body: LeadFormRequest = await req.json();
    const { botId, visitorId, conversationId, question, name, email, phone, note } = body;

    if (!botId || !visitorId || !conversationId || !question || !name || !email) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: botId, visitorId, conversationId, question, name, email",
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const nameTrimmed = name.trim();
    const emailTrimmed = email.trim().toLowerCase();

    if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
      return NextResponse.json(
        { success: false, message: "Name must be between 2 and 100 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (phone && phone.trim()) {
      const phoneTrimmed = phone.trim();
      const phoneDigits = phoneTrimmed.replace(/\D/g, "");
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        return NextResponse.json(
          { success: false, message: "Invalid phone number" },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const supabase = createAdminClient();

    const securityResult = await verifyWidgetRequest(req, {
      checkRateLimits: false,
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

    // Verify conversation belongs to the specified bot to prevent IDOR / information disclosure
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, bot_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation || conversation.bot_id !== botId) {
      return NextResponse.json(
        { success: false, message: "Invalid conversation" },
        { status: 400, headers: corsHeaders }
      );
    }
    const recentMessages = await getMessagesForContext(supabase, conversationId, 6);

    const lead = await createLead(supabase, {
      botId,
      visitorSessionId: visitorId,
      unansweredQuestion: question,
      customerName: nameTrimmed,
      customerEmail: emailTrimmed,
      customerPhone: phone?.trim() || undefined,
      note: note?.trim() || undefined,
      chatHistory: recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead submitted successfully",
        data: { id: lead.id },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in widget lead:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit lead information" },
      { status: 500, headers: corsHeaders }
    );
  }
}
