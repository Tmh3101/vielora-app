import sharp from "sharp";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicBotThemeColor } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";
import type { ImageResponse } from "next/og";

export async function serveBotIcon(
  botSlug: string,
  size: number,
  createFallbackIcon: (
    bot: Awaited<ReturnType<typeof getPublicBotBranding>>,
    slug: string
  ) => ImageResponse,
  iconName: string
): Promise<Response> {
  let bot: Awaited<ReturnType<typeof getPublicBotBranding>> = null;
  try {
    const supabase = await createServerClient();
    bot = await getPublicBotBranding(supabase, botSlug);

    if (bot?.avatar_url) {
      try {
        const themeColor = getPublicBotThemeColor(bot.widget_settings ?? null);
        const imageResponse = await fetch(bot.avatar_url);
        if (!imageResponse.ok) {
          return createFallbackIcon(bot, botSlug);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const processedBuffer = await sharp(imageBuffer)
          .resize(size, size, {
            fit: "cover",
            position: "center",
          })
          .flatten({ background: themeColor })
          .png()
          .toBuffer();

        return new Response(new Uint8Array(processedBuffer), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      } catch (imageError) {
        console.error(
          `Failed to process bot avatar image for ${iconName}, falling back to text icon:`,
          imageError
        );
        return createFallbackIcon(bot, botSlug);
      }
    }

    return createFallbackIcon(bot, botSlug);
  } catch (error) {
    console.error(`Failed to generate public bot ${iconName}:`, error);
    return createFallbackIcon(bot, botSlug);
  }
}
