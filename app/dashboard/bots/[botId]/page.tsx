import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getBotByOwner } from "@/lib/services/bot.service";
import { countPagesByBotIdAndStatusesServer } from "@/lib/services/page.service";
import { BotDetailClient } from "@/components/dashboard/bot-detail/BotDetailClient";
import { EPageStatus } from "@/types";
import { UUID_PATTERN } from "@/lib/utils/patterns";

export const dynamic = "force-dynamic";

interface BotDetailPageProps {
  params: Promise<{
    botId: string;
  }>;
}

export default async function BotDetailPage({ params }: BotDetailPageProps) {
  const { botId } = await params;

  if (!UUID_PATTERN.test(botId)) {
    notFound();
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth");
  }

  const [bot, initialPagesCount] = await Promise.all([
    getBotByOwner(supabase, botId, user.id),
    countPagesByBotIdAndStatusesServer(supabase, botId, [
      EPageStatus.Completed,
      EPageStatus.PendingIndex,
      EPageStatus.Processing,
    ]),
  ]);

  if (!bot) {
    notFound();
  }

  return (
    <BotDetailClient
      initialBot={bot}
      initialUserId={user.id}
      initialPagesCount={initialPagesCount}
    />
  );
}
