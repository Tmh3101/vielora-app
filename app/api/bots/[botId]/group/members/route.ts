import { NextRequest, NextResponse } from "next/server";
import {
  corsHeaders,
  GROUP_MEMBER_CAP_REACHED_CODE,
  GROUP_ALREADY_MEMBER_CODE,
} from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotByIdServer } from "@/lib/services/bot.service";
import { isBotManager } from "@/lib/services/group-permission.service";
import {
  getGroupByBotId,
  getGroupWithMembers,
  inviteGroupMember,
} from "@/lib/services/group-chat.service";
import { isValidEmail } from "@/lib/utils/email";
import { EGroupChatStatus } from "@/types";

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
    const { user, supabase } = authResult;

    const manager = await isBotManager(supabase, botId, user.id);
    if (!manager) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Bot manager permissions required" },
        { status: 403, headers: corsHeaders }
      );
    }

    const { group, members } = await getGroupWithMembers(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, data: members }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error listing group members:", error);
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

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found. Please create the group first." },
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
    const { email }: { email?: string } = body;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "A valid email address is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const adminClient = createAdminClient();
    const inviterName = user.email ?? "A bot manager";

    const result = await inviteGroupMember(adminClient, {
      groupId: group.id,
      email: email!.trim(),
      invitedBy: user.id,
      botName: bot.name,
      inviterName,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.member,
        isNewAccount: result.isNewAccount,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error inviting group member:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (error as any)?.code;

    if (code === GROUP_MEMBER_CAP_REACHED_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_MEMBER_CAP_REACHED_CODE,
          message: "The group has reached the maximum capacity of 5 members.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    if (code === GROUP_ALREADY_MEMBER_CODE) {
      return NextResponse.json(
        {
          success: false,
          code: GROUP_ALREADY_MEMBER_CODE,
          message: "This user is already a member of the group.",
        },
        { status: 409, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
