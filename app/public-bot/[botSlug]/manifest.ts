import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotPwaVersion } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";
import { isBotSubdomainHost } from "@/lib/utils/standalone-chat-url";

export const dynamic = "force-dynamic";

export default async function manifest({
  params,
}: {
  params: Promise<{ botSlug: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { botSlug } = await params;
  const host = headers().get("host") ?? "";
  const isSubdomain = isBotSubdomainHost(host);

  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const pwaVersion = getPublicBotPwaVersion(bot?.pwa_updated_at);
    return createPublicBotManifest(bot, botSlug, pwaVersion, isSubdomain);
  } catch (error) {
    console.error("Failed to build public bot manifest:", error);
    return createPublicBotManifest(null, botSlug, undefined, isSubdomain);
  }
}
