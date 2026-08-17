import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getBotByOwner } from "@/lib/services/bot.service";
import { GroupManagement } from "@/components/dashboard/group/GroupManagement";
import { UUID_PATTERN } from "@/lib/utils/patterns";

export const dynamic = "force-dynamic";

interface BotGroupPageProps {
  params: Promise<{
    botId: string;
  }>;
}

export default async function BotGroupPage({ params }: BotGroupPageProps) {
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

  const bot = await getBotByOwner(supabase, botId, user.id);
  if (!bot) {
    notFound();
  }

  return (
    <div className="p-6">
      <GroupManagement bot={bot} />
    </div>
  );
}
