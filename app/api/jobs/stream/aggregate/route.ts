import { NextRequest } from "next/server";
import { subscribeStreamChanel } from "@/lib/services/worker.service";
import { getBotIndexStreamId } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const botId = request.nextUrl.searchParams.get("botId");
  if (!botId) {
    return new Response("Missing botId", { status: 400 });
  }
  return await subscribeStreamChanel(getBotIndexStreamId(botId), request);
}
