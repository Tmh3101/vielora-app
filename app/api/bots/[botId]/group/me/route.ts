import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { getGroupByBotId, leaveGroup } from "@/lib/services/group-chat.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
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

    const group = await getGroupByBotId(supabase, botId);
    if (!group) {
      return NextResponse.json(
        { success: false, message: "Group chat not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    await leaveGroup(supabase, group.id, user.id);
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    console.error("Error self-leaving group:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
