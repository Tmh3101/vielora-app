import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotBranding } from "@/lib/public-bot/branding";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<NextResponse> {
  const { botSlug } = await params;
  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const manifest = createPublicBotManifest(bot, botSlug);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to serve public bot manifest:", error);
    const manifest = createPublicBotManifest(null, botSlug);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
