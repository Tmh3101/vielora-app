import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotBySlug } from "@/lib/services/bot.service";
import { StandaloneChatUI } from "@/components/chat/StandaloneChatUI";
import { EBotStatus } from "@/types";

export default async function StandaloneChatPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const supabase = createAdminClient();
  const bot = await getBotBySlug(supabase, slug);

  if (!bot || !bot.is_public) {
    notFound();
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
