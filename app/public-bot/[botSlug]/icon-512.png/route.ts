import { createPublicBotIcon512 } from "@/lib/public-bot/create-apple-touch-icon";
import { PUBLIC_BOT_ICON_SIZE_512 } from "@/lib/public-bot/apple-touch-icon";
import { serveBotIcon } from "@/lib/services/icon.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ botSlug: string }> }
): Promise<Response> {
  const { botSlug } = await params;
  return serveBotIcon(botSlug, PUBLIC_BOT_ICON_SIZE_512, createPublicBotIcon512, "512 icon");
}
