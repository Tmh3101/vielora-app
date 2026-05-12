import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updateBotSlugSettings, getBotByOwner } from "@/lib/services/bot.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ botId: string }> }) {
  try {
    const { botId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const bot = await getBotByOwner(supabase, botId, user.id);
    if (!bot) {
      return NextResponse.json(
        { success: false, message: "Bot not found or access denied" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { slug, isPublic } = body;

    await updateBotSlugSettings(supabase, botId, { slug, isPublic });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update slug settings";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
