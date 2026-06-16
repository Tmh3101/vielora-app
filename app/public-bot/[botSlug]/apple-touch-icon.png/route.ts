import sharp from "sharp";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicBotBranding, getPublicBotThemeColor } from "@/lib/public-bot/branding";
import { createPublicBotAppleTouchIcon } from "@/lib/public-bot/create-apple-touch-icon";
import { APPLE_TOUCH_ICON_SIZE } from "@/lib/public-bot/apple-touch-icon";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<Response> {
  const { botSlug } = await params;
  let bot: Awaited<ReturnType<typeof getPublicBotBranding>> = null;
  try {
    const supabase = await createServerClient();
    bot = await getPublicBotBranding(supabase, botSlug);

    if (bot?.avatar_url) {
      try {
        const themeColor = getPublicBotThemeColor(bot.widget_settings ?? null);
        const imageResponse = await fetch(bot.avatar_url);
        if (!imageResponse.ok) {
          return createPublicBotAppleTouchIcon(bot, botSlug);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const processedBuffer = await sharp(imageBuffer)
          .resize(APPLE_TOUCH_ICON_SIZE, APPLE_TOUCH_ICON_SIZE, {
            fit: "cover",
            position: "centre",
          })
          .flatten({ background: themeColor })
          .png()
          .toBuffer();

        return new Response(new Uint8Array(processedBuffer), {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      } catch (imageError) {
        console.error("Failed to process bot avatar image, falling back to text icon:", imageError);
        return createPublicBotAppleTouchIcon(bot, botSlug);
      }
    }

    return createPublicBotAppleTouchIcon(bot, botSlug);
  } catch (error) {
    console.error("Failed to generate public bot apple-touch-icon:", error);
    return createPublicBotAppleTouchIcon(bot, botSlug);
  }
}
