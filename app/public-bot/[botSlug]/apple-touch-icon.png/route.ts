import { createPublicBotAppleTouchIcon } from "@/lib/public-bot/create-apple-touch-icon";
import { APPLE_TOUCH_ICON_SIZE } from "@/lib/public-bot/apple-touch-icon";
import { serveBotIcon } from "@/lib/services/icon.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<Response> {
  const { botSlug } = await params;
  return serveBotIcon(
    botSlug,
    APPLE_TOUCH_ICON_SIZE,
    createPublicBotAppleTouchIcon,
    "apple-touch-icon"
  );
}
