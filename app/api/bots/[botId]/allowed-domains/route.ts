import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getBotByOwner, updateBotAllowedDomains } from "@/lib/services/bot.service";

interface AllowedDomainsRequest {
  allowedDomains?: unknown;
}

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

    const body = (await req.json()) as AllowedDomainsRequest;
    if (!Array.isArray(body.allowedDomains)) {
      return NextResponse.json(
        { success: false, message: "allowedDomains must be an array" },
        { status: 400 }
      );
    }

    const allowedDomains = await updateBotAllowedDomains(supabase, botId, {
      allowedDomains: body.allowedDomains,
    });

    return NextResponse.json({
      success: true,
      data: {
        allowed_domains: allowedDomains,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update allowed domains";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
