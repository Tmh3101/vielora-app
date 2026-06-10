"use client";

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, HelpCircle, Home } from "lucide-react";
import { toast } from "sonner";
import { LogoLoader } from "@/components/ui/logo-loader";
import { ESubscriptionPlan } from "@/types";
import { deleteBot } from "@/lib/services/bot.service";
import {
  useDashboardData,
  type DashboardInitialData,
} from "@/hooks/dashboard/main/useDashboardData";
import { useBotSelectionAlert } from "@/hooks/dashboard/main/useBotSelectionAlert";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { SubscriptionBanner } from "@/components/dashboard/overview/SubscriptionBanner";
import { StatsGrid } from "@/components/dashboard/overview/StatsGrid";
import { BotsGrid } from "@/components/dashboard/overview/BotsGrid";
import { getStatusColor, getStatusText } from "@/lib/helpers";

const BotLimitDialog = dynamic(
  () => import("@/components/dashboard/shared/BotLimitDialog").then((m) => m.BotLimitDialog),
  { ssr: false }
);
const BotSelectorDialog = dynamic(
  () => import("@/components/dashboard/shared/BotSelectorDialog").then((m) => m.BotSelectorDialog),
  { ssr: false }
);

export interface DashboardClientProps {
  initialData?: DashboardInitialData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const {
    isLoading,
    bots,
    subscription,
    plan,
    creditSummary,
    messagesThisMonth,
    totalConversations,
    indexedPagesByBot,
    setBots,
    setIndexedPagesByBot,
    fetchData,
  } = useDashboardData({
    user,
    authLoading,
    router,
    supabase,
    initialData,
  });

  const botsLimit = plan?.bots_limit ?? 1;

  const {
    limitDialogOpen,
    setLimitDialogOpen,
    botSelectorOpen,
    setBotSelectorOpen,
    selectedBotIds,
    handleToggleBotSelection,
    handleConfirmBotSelection,
    isSavingBotSelection,
  } = useBotSelectionAlert({
    isLoading,
    bots,
    botsLimit,
    subscription,
    supabase,
    onRefresh: fetchData,
  });

  const handleClickCreateNewChatbot = () => {
    if (subscription && bots.length >= botsLimit) {
      setLimitDialogOpen(true);
      return;
    }
    router.push("/onboarding");
  };

  const handleDeleteBot = async (botId: string, botName: string) => {
    try {
      await deleteBot(supabase, botId);
      setBots((prev) => prev.filter((bot) => bot.id !== botId));
      setIndexedPagesByBot((prev) => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
      toast.success(`Đã xóa chatbot "${botName}"`);
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error("Không thể xóa chatbot. Vui lòng thử lại.");
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LogoLoader size={80} />
        </div>
      </div>
    );
  }

  const creditsUsedThisMonth = creditSummary?.creditsUsedThisMonth ?? 0;
  const creditsTotalThisMonth = creditSummary?.totalCreditsThisMonth ?? 0;
  const usagePercent = creditSummary?.usagePercent ?? 0;
  const currentPlan = (plan?.code as ESubscriptionPlan | undefined) || ESubscriptionPlan.Free;
  const totalIndexedDocuments = Object.values(indexedPagesByBot).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        currentPlanLabel={currentPlan}
        onSignOut={signOut}
      />

      <DashboardMobileHeader
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        currentPlanLabel={currentPlan}
        onNavigateSettings={() => router.push("/dashboard/settings")}
        onSignOut={signOut}
      />

      <main className="lg:pl-64">
        <div className="container mx-auto space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {subscription && (
            <SubscriptionBanner
              subscription={subscription}
              currentPlan={currentPlan}
              creditsUsedThisMonth={creditsUsedThisMonth}
              creditsTotalThisMonth={creditsTotalThisMonth}
              usagePercent={usagePercent}
              paygCredits={creditSummary?.paygCredits ?? 0}
              onUpgrade={() => router.push("/dashboard/upgrade")}
            />
          )}

          <StatsGrid
            messagesThisMonth={messagesThisMonth}
            totalConversations={totalConversations}
            totalIndexedDocuments={totalIndexedDocuments}
            botCount={bots.length}
            botsLimit={botsLimit}
            hasSubscription={Boolean(subscription)}
          />

          <BotsGrid
            bots={bots}
            indexedPagesByBot={indexedPagesByBot}
            getStatusColor={getStatusColor}
            getStatusText={getStatusText}
            onCreateNew={handleClickCreateNewChatbot}
            onOpenBot={(botId) => router.push(`/dashboard/bots/${botId}`)}
            onDeleteBot={handleDeleteBot}
          />
        </div>
      </main>

      <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden">
        <nav className="flex items-center justify-around rounded-2xl border border-white/10 bg-background/80 px-3 py-2 shadow-lg backdrop-blur-xl">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 rounded-xl p-2 text-primary"
          >
            <Home className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard/upgrade"
            className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Quản lý thanh toán"
          >
            <CreditCard className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard/support"
            className="flex flex-col items-center gap-1 rounded-xl p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Hỗ trợ"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>
        </nav>
      </div>

      <BotLimitDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        currentPlanLabel={currentPlan}
        botsLimit={botsLimit}
        botsCount={bots.length}
        creditsUsedThisMonth={creditsUsedThisMonth}
        creditsTotalThisMonth={creditsTotalThisMonth}
        onUpgrade={() => {
          setLimitDialogOpen(false);
          router.push("/dashboard/upgrade");
        }}
      />

      <BotSelectorDialog
        open={botSelectorOpen}
        onOpenChange={setBotSelectorOpen}
        bots={bots}
        selectedBotIds={selectedBotIds}
        botsLimit={botsLimit}
        planName={plan?.name || currentPlan}
        isSavingBotSelection={isSavingBotSelection}
        onToggleBotSelection={handleToggleBotSelection}
        onUpgrade={() => {
          router.push("/dashboard/upgrade");
          setBotSelectorOpen(false);
        }}
        onConfirm={handleConfirmBotSelection}
      />
    </div>
  );
}
