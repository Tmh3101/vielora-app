"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useDashboardUIStore } from "@/store/useDashboardUIStore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ESubscriptionPlan } from "@/types";
import {
  useDashboardData,
  type DashboardInitialData,
} from "@/hooks/dashboard/main/useDashboardData";
import { useBotSelectionAlert } from "@/hooks/dashboard/main/useBotSelectionAlert";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { DashboardMobileNav } from "@/components/dashboard/shared/DashboardMobileNav";
import { SubscriptionBanner } from "@/components/dashboard/overview/SubscriptionBanner";
import { StatsGrid } from "@/components/dashboard/overview/StatsGrid";
import { BotsSection } from "@/components/dashboard/overview/BotsSection";

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
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const { activeWorkspace } = useWorkspace();
  const { signOut } = useAuth();
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
    initialData,
    workspaceId: activeWorkspace?.id,
  });

  const botsLimit = subscription?.bots_limit_override ?? plan?.bots_limit ?? 1;
  const limitDialogOpen = useDashboardUIStore((s) => s.limitDialogOpen);
  const setLimitDialogOpen = useDashboardUIStore((s) => s.setLimitDialogOpen);
  const botSelectorOpen = useDashboardUIStore((s) => s.botSelectorOpen);

  const {
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
      const res = await fetch(`/api/bots/${botId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể xóa chatbot.");
      }

      setBots((prev) => prev.filter((bot) => bot.id !== botId));
      setIndexedPagesByBot((prev) => {
        const next = { ...prev };
        delete next[botId];
        return next;
      });
      toast.success(`Đã xóa chatbot "${botName}"`);
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa chatbot. Vui lòng thử lại."
      );
    }
  };

  const currentPlan = (plan?.code as ESubscriptionPlan | undefined) || ESubscriptionPlan.Free;
  const creditsUsedThisMonth = creditSummary?.creditsUsedThisMonth ?? 0;
  const effectiveMonthlyCredits = subscription?.monthly_credits_override ?? plan?.monthly_credits;
  const creditsTotalThisMonth =
    (effectiveMonthlyCredits && effectiveMonthlyCredits > 0 ? effectiveMonthlyCredits : null) ??
    ((creditSummary && "totalCreditsThisMonth" in creditSummary
      ? creditSummary.totalCreditsThisMonth
      : ((creditSummary as { totalCredits?: number } | null)?.totalCredits ?? 0)) ||
      (currentPlan === ESubscriptionPlan.Free ? 100 : 0));
  const usagePercent =
    creditSummary && "usagePercent" in creditSummary
      ? creditSummary.usagePercent
      : creditsTotalThisMonth > 0
        ? Math.min(100, Math.round((creditsUsedThisMonth / creditsTotalThisMonth) * 100))
        : 0;
  const totalIndexedDocuments = Object.values(indexedPagesByBot).reduce(
    (sum, count) => sum + count,
    0
  );

  const showContentSkeleton = authLoading || isLoading;

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
          {/* Header Banner */}
          {showContentSkeleton ? (
            <div className="space-y-8">
              <Skeleton className="h-36 w-full rounded-2xl border border-border/40" />
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-64 rounded-2xl" />
                  <Skeleton className="h-64 rounded-2xl" />
                  <Skeleton className="h-64 rounded-2xl" />
                </div>
              </div>
            </div>
          ) : (
            <>
              <SubscriptionBanner
                subscription={subscription}
                currentPlan={currentPlan}
                creditsUsedThisMonth={creditsUsedThisMonth}
                creditsTotalThisMonth={creditsTotalThisMonth}
                usagePercent={usagePercent}
                paygCredits={creditSummary?.paygCredits ?? 0}
                onUpgrade={() => router.push("/dashboard/upgrade")}
              />

              <StatsGrid
                messagesThisMonth={messagesThisMonth}
                totalConversations={totalConversations}
                totalIndexedDocuments={totalIndexedDocuments}
                botCount={bots.length}
                botsLimit={botsLimit}
                hasSubscription={Boolean(subscription)}
              />

              <BotsSection
                indexedPagesByBot={indexedPagesByBot}
                onCreateNew={handleClickCreateNewChatbot}
                onOpenBot={(botId) => router.push(`/dashboard/bots/${botId}`)}
                onDeleteBot={handleDeleteBot}
              />
            </>
          )}
        </div>
      </main>

      <DashboardMobileNav />

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
        onOpenChange={useDashboardUIStore.getState().setBotSelectorOpen}
        bots={bots}
        selectedBotIds={selectedBotIds}
        botsLimit={botsLimit}
        planName={plan?.name || currentPlan}
        isSavingBotSelection={isSavingBotSelection}
        onToggleBotSelection={handleToggleBotSelection}
        onUpgrade={() => {
          router.push("/dashboard/upgrade");
          useDashboardUIStore.getState().setBotSelectorOpen(false);
        }}
        onConfirm={handleConfirmBotSelection}
      />
    </div>
  );
}
