import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotPwaVersion } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";
import { isBotSubdomainHost } from "@/lib/utils/standalone-chat-url";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<NextResponse> {
  const { botSlug } = await params;
  const host = request.headers.get("host") ?? "";
  const isSubdomain = isBotSubdomainHost(host);

  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const pwaVersion = getPublicBotPwaVersion(bot?.pwa_updated_at);
    const manifest = createPublicBotManifest(bot, botSlug, pwaVersion, isSubdomain);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Failed to serve public bot manifest:", error);
    const manifest = createPublicBotManifest(null, botSlug, undefined, isSubdomain);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  }
}
