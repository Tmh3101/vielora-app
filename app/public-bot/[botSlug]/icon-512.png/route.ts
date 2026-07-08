import sharp from "sharp";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicBotBranding, getPublicBotThemeColor } from "@/lib/public-bot/branding";
import { createPublicBotIcon512 } from "@/lib/public-bot/create-apple-touch-icon";
import { PUBLIC_BOT_ICON_SIZE_512 } from "@/lib/public-bot/apple-touch-icon";

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
          return createPublicBotIcon512(bot, botSlug);
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const processedBuffer = await sharp(imageBuffer)
          .resize(PUBLIC_BOT_ICON_SIZE_512, PUBLIC_BOT_ICON_SIZE_512, {
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
        console.error(
          "Failed to process bot avatar image for 512 icon, falling back to text icon:",
          imageError
        );
        return createPublicBotIcon512(bot, botSlug);
      }
    }

    return createPublicBotIcon512(bot, botSlug);
  } catch (error) {
    console.error("Failed to generate public bot 512 icon:", error);
    return createPublicBotIcon512(bot, botSlug);
  }
}
