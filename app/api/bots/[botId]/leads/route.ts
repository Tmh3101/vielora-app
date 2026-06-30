import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { authenticateRequest, isAuthError } from "@/lib/helpers/auth-helpers";
import { getBotByIdServer } from "@/lib/services/bot.service";
import { getLeadsByBotId, updateLeadStatus } from "@/lib/services/lead.service";
import { ELeadStatus } from "@/types";

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

    const bot = await getBotByIdServer(supabase, botId);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (bot.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const status = statusParam && statusParam !== "all" ? statusParam : undefined;
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 10, 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const result = await getLeadsByBotId(supabase, botId, { status, limit, offset });

    return NextResponse.json({ success: true, data: result }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot leads:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;

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

    if (bot.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { leadId, status } = body;

    if (!leadId || !status) {
      return NextResponse.json(
        { success: false, message: "leadId and status are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!Object.values(ELeadStatus).includes(status as ELeadStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400, headers: corsHeaders }
      );
    }

    await updateLeadStatus(supabase, leadId, botId, status);

    return NextResponse.json(
      { success: true, message: "Lead status updated" },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
