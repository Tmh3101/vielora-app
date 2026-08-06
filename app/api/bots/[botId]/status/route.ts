import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUserAccessBot, getBotByIdServer } from "@/lib/services/bot.service";

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
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

    const body = await req.json();
    const { isStopped } = body;

    if (typeof isStopped !== "boolean") {
      return NextResponse.json(
        { success: false, message: "isStopped (boolean) is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const bot = await getBotByIdServer(supabase, botId);
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

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedBot, error: updateError } = await (admin as any)
      .from("bots")
      .update({ is_stopped: isStopped })
      .eq("id", botId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ success: true, data: updatedBot }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error updating bot status:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
