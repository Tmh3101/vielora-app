import type { Metadata } from "next";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotBySlug } from "@/lib/services/bot.service";
import { StandaloneChatUI } from "@/components/chat/StandaloneChatUI";
import { EBotStatus } from "@/types";
import { FALLBACK_CHAT_TITLE } from "@/lib/constants/chat";

const getStandaloneChatBot = cache(async (slug: string) => {
  const supabase = createAdminClient();
  return getBotBySlug(supabase, slug);
});

export async function generateMetadata({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const bot = await getStandaloneChatBot(resolvedParams.slug);
  const title = bot?.name ? `Chat with ${bot.name.trim()}` : FALLBACK_CHAT_TITLE;

  return {
    title: {
      absolute: title,
    },
  };
}

export default async function StandaloneChatPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const bot = await getStandaloneChatBot(slug);

  if (!bot || !bot.is_public) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Chatbot không còn tồn tại</h1>
          <p className="mt-2 text-slate-600">Chatbot này đã bị xóa hoặc không còn công khai.</p>
        </div>
      </div>
    );
  }

  if (bot.is_stopped) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Bot Temporarily Unavailable</h1>
          <p className="mt-2 text-slate-600">This chatbot is currently paused.</p>
        </div>
      </div>
    );
  }

  if (bot.status !== EBotStatus.Ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Bot Not Ready</h1>
          <p className="mt-2 text-slate-600">This chatbot is still being set up.</p>
        </div>
      </div>
    );
  }

  return <StandaloneChatUI bot={bot} />;
}
