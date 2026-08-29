import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { isBotManager } from "@/lib/services/group-permission.service";
import {
  getGroupByBotId,
  removeGroupMember,
  updateGroupMember,
} from "@/lib/services/group-chat.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; memberId: string }> }
) {
  try {
    const { botId, memberId } = await params;
    if (!botId || !memberId) {
      return NextResponse.json(
        { success: false, message: "botId and memberId are required" },
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

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    await removeGroupMember(supabase, group.id, memberId);
    return NextResponse.json(
      { success: true, message: "Member removed successfully" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error removing group member:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string; memberId: string }> }
) {
  try {
    const { botId, memberId } = await params;
    if (!botId || !memberId) {
      return NextResponse.json(
        { success: false, message: "botId and memberId are required" },
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

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const {
      role_label,
      can_pin_knowledge,
      can_create_note,
      can_export_report,
      canExportReport,
    }: {
      role_label?: string | null;
      can_pin_knowledge?: boolean;
      can_create_note?: boolean;
      can_export_report?: boolean;
      canExportReport?: boolean;
    } = body;

    const exportReportVal = can_export_report !== undefined ? can_export_report : canExportReport;

    const updated = await updateGroupMember(supabase, group.id, memberId, {
      ...(role_label !== undefined ? { role_label } : {}),
      ...(can_pin_knowledge !== undefined ? { can_pin_knowledge } : {}),
      ...(can_create_note !== undefined ? { can_create_note } : {}),
      ...(exportReportVal !== undefined ? { can_export_report: exportReportVal } : {}),
    });

    return NextResponse.json({ success: true, data: updated }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating group member:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
