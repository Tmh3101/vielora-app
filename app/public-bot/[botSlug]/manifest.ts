import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotPwaVersion } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";

export const dynamic = "force-dynamic";

export default async function manifest({
  params,
}: {
  params: Promise<{ botSlug: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { botSlug } = await params;
  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const pwaVersion = getPublicBotPwaVersion(bot?.pwa_updated_at);
    return createPublicBotManifest(bot, botSlug, pwaVersion);
  } catch (error) {
    console.error("Failed to build public bot manifest:", error);
    return createPublicBotManifest(null, botSlug);
  }
}
