import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { getBotBySlug } from "@/lib/services/bot.service";
import { getBotActivePlanCode } from "@/lib/services/subscription.service";
import { PwaGroupChatContainer } from "@/components/chat/group/PwaGroupChatContainer";
import { EBotStatus, ESubscriptionPlan } from "@/types";

const getPublicBot = cache(async (slug: string) => {
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

export default async function PwaGroupPage({ params }: { params: Promise<{ botSlug: string }> }) {
  const { botSlug } = await params;
  const bot = await getPublicBot(botSlug);

  if (!bot || !bot.is_public) {
    return (
      <PublicBotUnavailable
        title="Chatbot không tồn tại"
        message="Chatbot này đã bị xóa hoặc không công khai."
      />
    );
  }

  if (bot.is_stopped) {
    return (
      <PublicBotUnavailable
        title="Tạm ngừng dịch vụ"
        message="Nhóm chat của bot đang tạm ngưng hoạt động."
      />
    );
  }

  if (bot.status !== EBotStatus.Ready) {
    return (
      <PublicBotUnavailable
        title="Bot chưa sẵn sàng"
        message="Nhóm chat của bot đang trong quá trình thiết lập."
      />
    );
  }

  const supabase = createAdminClient();
  const planCode = await getBotActivePlanCode(supabase, bot);
  const isProOrEnterprise =
    planCode === ESubscriptionPlan.Pro || planCode === ESubscriptionPlan.Enterprise;

  if (!isProOrEnterprise) {
    return (
      <PublicBotUnavailable
        title="Tính năng Nhóm chat chưa khả dụng"
        message="Nhóm chat với AI là tính năng nâng cao chỉ khả dụng cho các chatbot thuộc gói Pro hoặc Enterprise. Vui lòng liên hệ quản trị viên không gian làm việc để kích hoạt."
      />
    );
  }

  return (
    <main className="h-dvh overflow-hidden bg-background">
      <PwaGroupChatContainer botId={bot.id} botSlug={botSlug} botName={bot.name} botData={bot} />
    </main>
  );
}
