import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { createPublicBotManifest, getPublicBotBranding } from "@/lib/public-bot/branding";

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
    return createPublicBotManifest(bot, botSlug);
  } catch (error) {
    console.error("Failed to build public bot manifest:", error);
    return createPublicBotManifest(null, botSlug);
  }
}
