import { cache } from "react";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotBySlug } from "@/lib/services/bot.service";
import { FALLBACK_CHAT_TITLE } from "@/lib/constants/chat";
import { StandaloneChatUI } from "@/components/chat/StandaloneChatUI";
import { EBotStatus } from "@/types";

const getStandaloneChatBot = cache(async (slug: string) => {
  const supabase = createAdminClient();
  return getBotBySlug(supabase, slug);
});

function PublicBotUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export default async function PublicBotPage({ params }: { params: Promise<{ botSlug: string }> }) {
  const { botSlug } = await params;
  const bot = await getStandaloneChatBot(botSlug);

  if (!bot || !bot.is_public) {
    return (
      <PublicBotUnavailable
        title="Chatbot không còn tồn tại"
        message="Chatbot này đã bị xóa hoặc không còn công khai."
      />
    );
  }

  if (bot.is_stopped) {
    return (
      <PublicBotUnavailable
        title="Bot Temporarily Unavailable"
        message="This chatbot is currently paused."
      />
    );
  }

  if (bot.status !== EBotStatus.Ready) {
    return (
      <PublicBotUnavailable title="Bot Not Ready" message="This chatbot is still being set up." />
    );
  }

  const deviceType = headers().get("x-device-type") ?? "desktop";
  const isMobile = deviceType === "mobile" || deviceType === "tablet";

  return (
    <main
      className="h-dvh overflow-hidden"
      aria-label={bot.name ? `Chat with ${bot.name}` : FALLBACK_CHAT_TITLE}
    >
      <StandaloneChatUI bot={bot} isMobile={isMobile} />
    </main>
  );
}
