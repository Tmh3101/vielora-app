import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserAccessBot } from "@/lib/services/bot.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

/**
 * GET /api/bots/[botId]/jobs?name=discover&fields=id,status,progress,data,error_message
 * Returns jobs for a bot, accessible by workspace admins.
 */
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
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const admin = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bot } = await (admin as any)
      .from("bots")
      .select("id, user_id, workspace_id")
      .eq("id", botId)
      .maybeSingle();

    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const hasAccess = await canUserAccessBot(supabase, bot, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Build query
    const name = req.nextUrl.searchParams.get("name");
    const fields =
      req.nextUrl.searchParams.get("fields") || "id, status, progress, data, error_message";

    let query = admin.from("jobs").select(fields).eq("bot_id", botId);

    if (name) {
      query = query.eq("name", name);
    }

    query = query.order("created_at", { ascending: false });

    const limit = req.nextUrl.searchParams.get("limit");
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: data ?? [] }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error fetching bot jobs:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
