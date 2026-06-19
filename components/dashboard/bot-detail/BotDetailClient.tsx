"use client";

import { lazy, Suspense, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { useBotDetailUIStore } from "@/store/useBotDetailUIStore";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  MessageSquare,
  BarChart3,
  Code,
  FileText,
  Globe,
  Palette,
  Sparkles,
  Settings,
  Plus,
  MinusCircle,
  Bot,
  Home,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BotPlayground } from "@/components/dashboard/bots/BotPlayground";
import { LogoLoader } from "@/components/ui/logo-loader";
import { EBotStatus, EPageStatus } from "@/types";
import { BotDetailDashboardTabs } from "@/lib/constants";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useBotData } from "@/hooks/dashboard/bot-detail/useBotData";
import { useBotSettings } from "@/hooks/dashboard/bot-detail/useBotSettings";
import { useKnowledgeBase } from "@/hooks/dashboard/bot-detail/useKnowledgeBase";
import { StopBotDialog } from "@/components/dashboard/bot-detail/modals/StopBotDialog";
import { ReindexModal } from "@/components/dashboard/bot-detail/modals/ReindexModal";
import { AddKnowledgeModal } from "@/components/dashboard/bot-detail/modals/AddKnowledgeModal";
import { EditKnowledgeModal } from "@/components/dashboard/bot-detail/modals/EditKnowledgeModal";
import { DeleteKnowledgeDialog } from "@/components/dashboard/bot-detail/modals/DeleteKnowledgeDialog";
import { OverviewLoadingState } from "@/components/dashboard/bot-detail/tabs/OverviewLoadingState";
import { KnowledgeBaseLoadingState } from "@/components/dashboard/bot-detail/tabs/KnowledgeBaseLoadingState";
import { AppearanceTab } from "@/components/dashboard/bot-detail/tabs/AppearanceTab";
import { IntegrationTab } from "@/components/dashboard/bot-detail/tabs/IntegrationTab";
import { SettingsTab } from "@/components/dashboard/bot-detail/tabs/SettingsTab";
import { AIConfigTab } from "@/components/dashboard/bot-detail/tabs/AIConfigTab";
import { getEmbededScript } from "@/lib/helpers";
import type { Tables } from "@/lib/supabase/types";

type BotType = Tables<"bots">;

function BotSkillIdsFetcher({
  botId,
  children,
}: {
  botId: string;
  children: (skillIds: string[]) => ReactNode;
}) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { data: skillIds = [] } = useQuery({
    queryKey: ["bot-skills", botId],
    queryFn: async () => {
      const { data } = (await supabase
        .from("bot_skills")
        .select("skill_id")
        .eq("bot_id", botId)) as unknown as { data: { skill_id: string }[] | null };
      return data?.map((r) => r.skill_id) ?? [];
    },
    enabled: !!botId,
  });
  return <>{children(skillIds)}</>;
}

const OverviewTab = lazy(() =>
  import("@/components/dashboard/bot-detail/tabs/OverviewTab").then((module) => ({
    default: module.OverviewTab,
  }))
);

const KnowledgeBaseTab = lazy(() =>
  import("@/components/dashboard/bot-detail/tabs/KnowledgeBaseTab").then((module) => ({
    default: module.KnowledgeBaseTab,
  }))
);

export interface BotDetailClientProps {
  initialBot: BotType;
  initialUserId: string;
  initialPagesCount: number;
}

export function BotDetailClient({
  initialBot,
  initialUserId,
  initialPagesCount,
}: BotDetailClientProps) {
  const botId = initialBot.id;
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  useAuth();
  const effectiveUser = user ?? { id: initialUserId };
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const setReindexModalOpen = useBotDetailUIStore((s) => s.setReindexModalOpen);
  const setReindexScope = useBotDetailUIStore((s) => s.setReindexScope);
  const setAddDataSourceOpen = useBotDetailUIStore((s) => s.setAddDataSourceOpen);
  const setEditKnowledgeOpen = useBotDetailUIStore((s) => s.setEditKnowledgeOpen);
  const setDeleteKnowledgeOpen = useBotDetailUIStore((s) => s.setDeleteKnowledgeOpen);
  const activeTab = useBotDetailUIStore((s) => s.activeTab);
  const setActiveTab = useBotDetailUIStore((s) => s.setActiveTab);
  const stopModalOpen = useBotDetailUIStore((s) => s.stopModalOpen);
  const setStopModalOpen = useBotDetailUIStore((s) => s.setStopModalOpen);
  const upgradeModalOpen = useBotDetailUIStore((s) => s.upgradeModalOpen);
  const setUpgradeModalOpen = useBotDetailUIStore((s) => s.setUpgradeModalOpen);
  const upgradeModalMessage = useBotDetailUIStore((s) => s.upgradeModalMessage);
  const position = useAppearanceStore((s) => s.position);
  const isStoppingBot = useAppearanceStore((s) => s.isStoppingBot);

  const {
    bot,
    pages,
    isLoading,
    totalCredits,
    planCode,
    botsLimit,
    botLoadVersion,
    pagesCount,
    fetchData,
    setBot,
    setTotalCredits,
  } = useBotData({
    botId,
    user: effectiveUser,
    authLoading,
    supabase,
    router,
    toast,
    initialBot,
    initialUserId,
    initialPagesCount,
  });

  const {
    openUpgradeModal,
    handleSaveAppearance,
    handleSaveRateLimit,
    handleSaveAllowedDomains,
    handleSaveSlugSettings,
    handleStopBot,
    handleStartBot,
  } = useBotSettings({
    bot,
    user: effectiveUser,
    botsLimit,
    supabase,
    toast,
    setBot,
  });

  useEffect(() => {
    if (bot && botLoadVersion > 0) {
      useAppearanceStore.getState().initializeFromBot(bot);
    }
  }, [bot, botLoadVersion]);

  const {
    isReindexing,
    reindexModalOpen,
    isLoadingPreview,
    previewPages,
    selectedUrls,
    previewErrors,
    addDataSourceOpen,
    isSubmittingDataSource,
    editKnowledgeOpen,
    editingPage,
    isSavingKnowledge,
    isLoadingPageDetail,
    deleteKnowledgeOpen,
    isDeletingKnowledge,
    selectedPendingCount,
    selectedUrlCount,
    selectedCreditsCost,
    maxSelectablePagesByCredit,
    selectablePreviewPages,
    isDiscovering,
    reindexCurrentAction,
    reindexCrawledCount,
    reindexScope,
    hasStartedReindexDiscover,
    handleReindex,
    handleStartReindexDiscover,
    handleUpdateSelected,
    handleSelectAll,
    handleDeselectAll,
    handleTogglePage,
    handleOpenAddDataSource,
    handleAddDataSource,
    handleAddFileDataSource,
    handleAddUrlDataSource,
    handleOpenEditKnowledge,
    handleSaveEditKnowledge,
    handleOpenDeleteKnowledge,
    handleConfirmDeleteKnowledge,
    clearEditingPage,
  } = useKnowledgeBase({
    bot,
    userId: user?.id ?? initialUserId,
    planCode,
    totalCredits,
    supabase,
    toast,
    fetchData,
    setTotalCredits,
    onRequireUpgrade: () => openUpgradeModal(),
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const sidebarItems = [
    { id: BotDetailDashboardTabs.OVERVIEW, label: "Tổng quan", icon: BarChart3 },
    { id: BotDetailDashboardTabs.PLAYGROUND, label: "Playground", icon: MessageSquare },
    { id: BotDetailDashboardTabs.KNOWLEDGE, label: "Kiến thức", icon: FileText },
    { id: BotDetailDashboardTabs.APPEARANCE, label: "Giao diện", icon: Palette },
    { id: BotDetailDashboardTabs.AI, label: "Tùy chỉnh", icon: Sparkles },
    { id: BotDetailDashboardTabs.INSTALL, label: "Cài đặt Widget", icon: Code },
    { id: BotDetailDashboardTabs.SETTINGS, label: "Cài đặt", icon: Settings },
  ];

  const getStatusBadge = (status: EPageStatus) => {
    switch (status) {
      case EPageStatus.Pending:
      case EPageStatus.Ignored:
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            <Plus className="mr-1 h-3 w-3" />
            Chưa index
          </Badge>
        );
      case EPageStatus.Completed:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Plus className="mr-1 h-3 w-3" />
            Đã index
          </Badge>
        );
      case EPageStatus.Failed:
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <MinusCircle className="mr-1 h-3 w-3" />
            Discover lỗi
          </Badge>
        );
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoLoader size={60} />
      </div>
    );
  }

  if (!bot) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm lg:flex">
        {/* Logo with back arrow */}
        <div className="flex items-center gap-3 border-b border-border/50 p-6">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 transition-colors hover:bg-muted"
            title="Về Dashboard"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/dashboard" className="group flex items-center">
            <Image
              src="/images/logo-full.png"
              alt="Vielora"
              width={200}
              height={64}
              className="h-16 w-auto px-1"
              priority
            />
            {/* <span className="text-xl font-bold text-foreground">Vielora</span> */}
          </Link>
        </div>

        {/* Bot Info */}
        <div className="border-b border-border/50 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-2xl">
              <AvatarImage src={bot.avatar_url || undefined} alt={bot.name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{bot.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    bot.is_stopped
                      ? "bg-gray-500"
                      : bot.status === EBotStatus.Ready
                        ? "bg-green-500"
                        : bot.status === EBotStatus.Failed
                          ? "bg-red-500"
                          : "bg-yellow-500"
                  }`}
                />
                {bot.is_stopped
                  ? "Đã dừng"
                  : bot.status === EBotStatus.Ready
                    ? "Hoạt động"
                    : bot.status === EBotStatus.Failed
                      ? "Lỗi"
                      : "Đang xử lý"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Dashboard Link */}
        <div className="border-t border-border/50 p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Home className="h-5 w-5" />
            Về Dashboard
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-4 border-b border-border/50 bg-card/80 px-4 backdrop-blur-sm lg:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={bot.avatar_url || undefined} alt={bot.name} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{bot.name}</span>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="fixed bottom-6 left-6 right-6 z-50 flex items-center justify-around rounded-2xl border border-white/10 bg-background/80 p-2 shadow-lg backdrop-blur-xl lg:hidden">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors ${
              activeTab === item.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="min-h-screen pb-20 pt-16 lg:ml-64 lg:pb-8 lg:pt-0">
        <div className="max-w-6xl p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-1 text-2xl font-bold text-foreground">
              {sidebarItems.find((i) => i.id === activeTab)?.label || "Tổng quan"}
            </h1>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              {bot.domain}
            </p>
          </div>

          {/* Overview Tab */}
          {activeTab === BotDetailDashboardTabs.OVERVIEW && (
            <Suspense fallback={<OverviewLoadingState />}>
              <OverviewTab bot={bot} pagesCount={pagesCount} />
            </Suspense>
          )}

          {/* Playground Tab */}
          {activeTab === BotDetailDashboardTabs.PLAYGROUND && (
            <BotPlayground botId={bot.id} position={position} />
          )}

          {/* Knowledge Tab */}
          {activeTab === BotDetailDashboardTabs.KNOWLEDGE && (
            <Suspense fallback={<KnowledgeBaseLoadingState />}>
              <KnowledgeBaseTab
                pages={pages}
                isReindexing={isReindexing}
                onReindex={handleReindex}
                onOpenAddDataSource={handleOpenAddDataSource}
                onOpenEditKnowledge={handleOpenEditKnowledge}
                onOpenDeleteKnowledge={handleOpenDeleteKnowledge}
              />
            </Suspense>
          )}

          {/* Appearance Tab */}
          {activeTab === BotDetailDashboardTabs.APPEARANCE && (
            <AppearanceTab
              botId={botId}
              currentPlan={planCode}
              onSaveAppearance={handleSaveAppearance}
            />
          )}

          {/* Install Tab */}
          {activeTab === BotDetailDashboardTabs.INSTALL && (
            <IntegrationTab
              botId={bot.id}
              appUrl={appUrl}
              onCopyScript={(framework, copiedLabel) => {
                const script = getEmbededScript(bot.id, appUrl, framework);
                navigator.clipboard.writeText(script);
                toast({
                  title: "Đã copy!",
                  description: `${copiedLabel || "Code"} đã được copy vào clipboard.`,
                });
              }}
            />
          )}

          {/* AI Config Tab */}
          {activeTab === BotDetailDashboardTabs.AI && (
            <BotSkillIdsFetcher botId={bot.id}>
              {(skillIds) => (
                <AIConfigTab
                  botId={bot.id}
                  currentPlan={planCode}
                  initialPersonalityId={bot.personality_id}
                  initialSkillIds={skillIds}
                />
              )}
            </BotSkillIdsFetcher>
          )}

          {/* Settings Tab */}
          {activeTab === BotDetailDashboardTabs.SETTINGS && (
            <SettingsTab
              bot={bot}
              onStartBot={handleStartBot}
              onSaveRateLimit={handleSaveRateLimit}
              onSaveAllowedDomains={handleSaveAllowedDomains}
              onSaveSlugSettings={handleSaveSlugSettings}
            />
          )}
        </div>
      </main>

      <StopBotDialog
        open={stopModalOpen}
        onOpenChange={setStopModalOpen}
        isStoppingBot={isStoppingBot}
        onConfirm={handleStopBot}
      />

      <ReindexModal
        open={reindexModalOpen}
        onOpenChange={setReindexModalOpen}
        isLoadingPreview={isLoadingPreview}
        isReindexing={isReindexing}
        isDiscovering={isDiscovering}
        currentAction={reindexCurrentAction}
        crawledCount={reindexCrawledCount}
        reindexScope={reindexScope}
        hasStartedDiscover={hasStartedReindexDiscover}
        previewPages={previewPages}
        selectedUrls={selectedUrls}
        previewErrors={previewErrors}
        selectedPendingCount={selectedPendingCount}
        selectedUrlCount={selectedUrlCount}
        selectedCreditsCost={selectedCreditsCost}
        totalCredits={totalCredits}
        maxSelectablePagesByCredit={maxSelectablePagesByCredit}
        selectablePreviewPagesCount={selectablePreviewPages.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onScopeChange={setReindexScope}
        onStartDiscover={handleStartReindexDiscover}
        onTogglePage={handleTogglePage}
        onConfirm={handleUpdateSelected}
        renderStatusBadge={getStatusBadge}
      />

      <AddKnowledgeModal
        open={addDataSourceOpen}
        onOpenChange={setAddDataSourceOpen}
        isSubmitting={isSubmittingDataSource}
        totalCredits={totalCredits}
        onConfirmManual={handleAddDataSource}
        onConfirmFile={handleAddFileDataSource}
        onConfirmUrl={handleAddUrlDataSource}
      />

      <EditKnowledgeModal
        open={editKnowledgeOpen}
        onOpenChange={setEditKnowledgeOpen}
        page={editingPage}
        isSaving={isSavingKnowledge}
        isLoadingContent={isLoadingPageDetail}
        totalCredits={totalCredits}
        onConfirm={handleSaveEditKnowledge}
        onResetPage={clearEditingPage}
      />

      <DeleteKnowledgeDialog
        open={deleteKnowledgeOpen}
        onOpenChange={setDeleteKnowledgeOpen}
        isDeleting={isDeletingKnowledge}
        onConfirm={handleConfirmDeleteKnowledge}
      />

      {/* Upgrade Modal for Free Users */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        {...upgradeModalMessage}
      />
    </div>
  );
}
