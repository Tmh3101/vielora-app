import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotPwaVersion } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<NextResponse> {
  const { botSlug } = await params;
  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const pwaVersion = getPublicBotPwaVersion(bot?.pwa_updated_at);
    const manifest = createPublicBotManifest(bot, botSlug, pwaVersion);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to serve public bot manifest:", error);
    const manifest = createPublicBotManifest(null, botSlug);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  }
}
