import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { checkApiRateLimit, createRateLimitHeaders } from "@/lib/security/api-rate-limiter";
import { API_RATE_LIMITS } from "@/lib/constants/api-rate-limit";
import { MAX_GROUP_CHAT_INPUT } from "@/config/rag";
import {
  getGroupByBotId,
  listGroupMessages,
  insertGroupMessage,
} from "@/lib/services/group-chat.service";
import { EGroupChatStatus, EGroupSenderType } from "@/types";

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

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated" },
        { status: 401, headers: corsHeaders }
      );
    }

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const before = url.searchParams.get("before") || undefined;
    const limit = url.searchParams.get("limit") ? parseInt(url.searchParams.get("limit")!, 10) : 50;

    const data = await listGroupMessages(supabase, group.id, { before, limit });
    return NextResponse.json({ success: true, data }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching group messages:", error);
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

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Rate Limit per user
    const rateLimitResult = checkApiRateLimit(`group_msg:${user.id}`, API_RATE_LIMITS.groupMessage);

    if (!rateLimitResult.allowed) {
      const headers = {
        ...corsHeaders,
        ...createRateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetIn,
          API_RATE_LIMITS.groupMessage.maxRequests
        ),
      };
      return NextResponse.json(
        { success: false, message: API_RATE_LIMITS.groupMessage.message },
        { status: 429, headers }
      );
    }

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (group.status === EGroupChatStatus.Disabled) {
      return NextResponse.json(
        { success: false, code: "group_disabled", message: "Group chat is currently disabled" },
        { status: 409, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const {
      content,
      reply_to_id,
      mentions,
      should_bot_reply,
    }: {
      content?: string;
      reply_to_id?: string | null;
      mentions?: string[];
      should_bot_reply?: boolean;
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: "Message content cannot be empty" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (content.length > MAX_GROUP_CHAT_INPUT) {
      return NextResponse.json(
        {
          success: false,
          message: `Message content exceeds maximum limit of ${MAX_GROUP_CHAT_INPUT} characters.`,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const message = await insertGroupMessage(supabase, {
      groupId: group.id,
      senderType: EGroupSenderType.User,
      senderId: user.id,
      content: content.trim(),
      replyToId: reply_to_id,
      mentions,
      shouldBotReply: should_bot_reply ?? true,
    });

    if (message.should_bot_reply) {
      const { runGroupBotReply } = await import("@/lib/services/group-chat-reply.service");
      void runGroupBotReply(group.id, {
        id: message.id,
        content: message.content,
        reply_to_id: message.reply_to_id,
      });
    }

    return NextResponse.json(
      { success: true, data: message },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error sending group message:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
