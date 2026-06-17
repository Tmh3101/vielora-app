"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  addKnowledge,
  addKnowledgeFile,
  addKnowledgeUrl,
  deleteKnowledge,
  editKnowledge,
  getKnowledge,
  pollPipelineStatus,
  startDiscover,
  submitSelection,
} from "@/lib/services/bot.service";
import { useReindexDiscover } from "@/hooks/dashboard/bot-detail/useReindexDiscover";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getPagePreviewByBotId } from "@/lib/services/page.service";
import { getDiscoverSeedUrl, normalizeKnowledgeUrl } from "@/lib/helpers";
import { CREDIT_PER_PAGE } from "@/config";
import { EPageSourceType, EPageStatus, ESubscriptionPlan } from "@/types";
import type { CrawlScopeType } from "@/types/scrape";
import { CrawlScope } from "@/lib/constants";
import { useBotDetailUIStore } from "@/store/useBotDetailUIStore";
import type { PageListItem } from "@/lib/services/page.service";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
type BotType = Tables<"bots">;
type PageType = Tables<"pages">;

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (payload: ToastPayload) => void;

interface UseKnowledgeBaseParams {
  bot: BotType | null;
  userId?: string;
  planCode: string;
  totalCredits: number;
  supabase: SupabaseClient;
  toast: ToastFn;
  fetchData: () => Promise<void>;
  setTotalCredits: Dispatch<SetStateAction<number>>;
  onRequireUpgrade: () => void;
}

export interface PageStatus {
  id: string;
  url: string;
  title: string;
  status: EPageStatus;
}

export interface UseKnowledgeBaseResult {
  isReindexing: boolean;
  reindexModalOpen: boolean;
  isLoadingPreview: boolean;
  previewPages: PageStatus[];
  selectedUrls: Set<string>;
  previewErrors: Array<{ url: string; error: string }>;
  addDataSourceOpen: boolean;
  isSubmittingDataSource: boolean;
  editKnowledgeOpen: boolean;
  editingPage: PageType | null;
  isSavingKnowledge: boolean;
  isLoadingPageDetail: boolean;
  deleteKnowledgeOpen: boolean;
  deletingPage: PageListItem | null;
  isDeletingKnowledge: boolean;
  selectedPendingCount: number;
  selectedUrlCount: number;
  selectedCreditsCost: number;
  maxSelectablePagesByCredit: number;
  pendingPreviewPages: PageStatus[];
  selectablePreviewPages: PageStatus[];
  isDiscovering: boolean;
  reindexCurrentAction: string;
  reindexCrawledCount: number;
  reindexScope: CrawlScopeType;
  hasStartedReindexDiscover: boolean;
  handleReindex: () => Promise<void>;
  handleStartReindexDiscover: () => Promise<void>;
  handleUpdateSelected: () => Promise<void>;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleTogglePage: (id: string, status: EPageStatus) => void;
  handleOpenAddDataSource: () => void;
  handleAddDataSource: (title: string, content: string) => Promise<void>;
  handleAddFileDataSource: (file: File) => Promise<void>;
  handleAddUrlDataSource: (url: string) => Promise<void>;
  handleOpenEditKnowledge: (page: PageListItem) => Promise<void>;
  handleSaveEditKnowledge: (title: string, content: string) => Promise<void>;
  handleOpenDeleteKnowledge: (page: PageListItem) => void;
  handleConfirmDeleteKnowledge: () => Promise<void>;
  clearEditingPage: () => void;
}

export function useKnowledgeBase({
  bot,
  userId,
  planCode,
  totalCredits,
  supabase,
  toast,
  fetchData,
  setTotalCredits,
  onRequireUpgrade,
}: UseKnowledgeBaseParams): UseKnowledgeBaseResult {
  const [isReindexing, setIsReindexing] = useState(false);
  const reindexModalOpen = useBotDetailUIStore((s) => s.reindexModalOpen);
  const setReindexModalOpen = useBotDetailUIStore((s) => s.setReindexModalOpen);
  const reindexScope = useBotDetailUIStore((s) => s.reindexScope);
  const setReindexScope = useBotDetailUIStore((s) => s.setReindexScope);
  const hasStartedReindexDiscover = useBotDetailUIStore((s) => s.hasStartedReindexDiscover);
  const setHasStartedReindexDiscover = useBotDetailUIStore((s) => s.setHasStartedReindexDiscover);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewPages, setPreviewPages] = useState<PageStatus[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [previewErrors, setPreviewErrors] = useState<Array<{ url: string; error: string }>>([]);
  const [reindexDiscoverJobId, setReindexDiscoverJobId] = useState<string | null>(null);

  const addDataSourceOpen = useBotDetailUIStore((s) => s.addDataSourceOpen);
  const setAddDataSourceOpen = useBotDetailUIStore((s) => s.setAddDataSourceOpen);
  const [isSubmittingDataSource, setIsSubmittingDataSource] = useState(false);

  const editKnowledgeOpen = useBotDetailUIStore((s) => s.editKnowledgeOpen);
  const setEditKnowledgeOpen = useBotDetailUIStore((s) => s.setEditKnowledgeOpen);
  const deleteKnowledgeOpen = useBotDetailUIStore((s) => s.deleteKnowledgeOpen);
  const setDeleteKnowledgeOpen = useBotDetailUIStore((s) => s.setDeleteKnowledgeOpen);
  const [editingPage, setEditingPage] = useState<PageType | null>(null);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [isLoadingPageDetail, setIsLoadingPageDetail] = useState(false);

  const [deletingPage, setDeletingPage] = useState<PageListItem | null>(null);
  const [isDeletingKnowledge, setIsDeletingKnowledge] = useState(false);

  const selectedPendingCount = useMemo(
    () =>
      previewPages.filter((p) => selectedUrls.has(p.id) && p.status === EPageStatus.Pending).length,
    [previewPages, selectedUrls]
  );
  const selectedUrlCount = selectedPendingCount;
  const selectedCreditsCost = selectedPendingCount * CREDIT_PER_PAGE;
  const maxSelectablePagesByCredit = Math.floor(totalCredits / CREDIT_PER_PAGE);
  const pendingPreviewPages = useMemo(
    () => previewPages.filter((p) => p.status === EPageStatus.Pending),
    [previewPages]
  );
  const selectablePreviewPages = useMemo(
    () => previewPages.filter((p) => p.status === EPageStatus.Pending),
    [previewPages]
  );

  const handleDiscovered = useCallback(async () => {
    if (!bot) return;
    try {
      const discoveredPages = await getPagePreviewByBotId(supabase, bot.id);
      const preview = discoveredPages
        .filter((p) => p.source_type === EPageSourceType.Website)
        .map((page) => ({
          id: page.id,
          url: page.url,
          title: page.title || page.url,
          status: page.status as EPageStatus,
        })) satisfies PageStatus[];
      setPreviewPages(preview);
      setPreviewErrors(
        discoveredPages
          .filter((p) => p.status === EPageStatus.Failed)
          .map((p) => ({ url: p.url, error: p.error_message || "Failed to discover page" }))
      );
      setSelectedUrls(new Set());
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách trang. Vui lòng thử lại.",
        variant: "destructive",
      });
      setReindexModalOpen(false);
    } finally {
      setReindexDiscoverJobId(null);
      setHasStartedReindexDiscover(false);
      setIsLoadingPreview(false);
    }
  }, [bot, supabase, toast, setReindexModalOpen, setHasStartedReindexDiscover]);

  const {
    isDiscovering,
    currentAction: reindexCurrentAction,
    crawledCount: reindexCrawledCount,
  } = useReindexDiscover({
    botId: bot?.id ?? null,
    discoverJobId: reindexDiscoverJobId,
    onDiscovered: handleDiscovered,
  });

  const handleReindex = useCallback(async () => {
    if (!bot) return;

    setReindexModalOpen(true);
    setIsLoadingPreview(false);
    setPreviewPages([]);
    setSelectedUrls(new Set());
    setPreviewErrors([]);
    setReindexDiscoverJobId(null);
    setHasStartedReindexDiscover(false);
    setReindexScope(CrawlScope.FULL_WEBSITE);

    try {
      if (userId) {
        const summary = await getCreditSummary(supabase, userId);
        setTotalCredits(summary?.totalRemainingCredits ?? 0);
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách trang. Vui lòng thử lại.",
        variant: "destructive",
      });
      setReindexModalOpen(false);
      setIsLoadingPreview(false);
    }
  }, [
    bot,
    setTotalCredits,
    supabase,
    toast,
    userId,
    setReindexModalOpen,
    setHasStartedReindexDiscover,
    setReindexScope,
  ]);

  const handleStartReindexDiscover = useCallback(async () => {
    if (!bot || isDiscovering || isLoadingPreview) return;

    setIsLoadingPreview(true);
    setPreviewPages([]);
    setSelectedUrls(new Set());
    setPreviewErrors([]);
    setHasStartedReindexDiscover(true);

    try {
      const discoverUrl = getDiscoverSeedUrl(bot);
      const { discoverJobId } = await startDiscover(supabase, {
        url: discoverUrl,
        botId: bot.id,
        includeSubdomains: reindexScope === CrawlScope.FULL_WEBSITE,
      });

      setReindexDiscoverJobId(discoverJobId);
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách trang. Vui lòng thử lại.",
        variant: "destructive",
      });
      setHasStartedReindexDiscover(false);
      setIsLoadingPreview(false);
    }
  }, [
    bot,
    isDiscovering,
    isLoadingPreview,
    reindexScope,
    supabase,
    toast,
    setHasStartedReindexDiscover,
  ]);

  const handleUpdateSelected = useCallback(async () => {
    if (!bot || selectedUrlCount === 0) return;
    if (selectedCreditsCost > totalCredits) {
      return;
    }

    setIsReindexing(true);
    try {
      const selectedPageIds = previewPages.filter((p) => selectedUrls.has(p.id)).map((p) => p.id);
      const selectionResult = await submitSelection(supabase, bot.id, selectedPageIds);

      const { jobIds } = selectionResult;
      if (jobIds && jobIds.length > 0) {
        await Promise.all(jobIds.map((jobId) => pollPipelineStatus(supabase, jobId)));
      }

      toast({
        title: "Thành công",
        description: `Đã cập nhật ${selectionResult.queuedCount} trang.`,
      });

      setReindexModalOpen(false);
      setTimeout(() => {
        void fetchData();
      }, 1000);
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsReindexing(false);
    }
  }, [
    bot,
    fetchData,
    previewPages,
    selectedCreditsCost,
    selectedUrlCount,
    selectedUrls,
    supabase,
    toast,
    totalCredits,
    setReindexModalOpen,
  ]);

  const handleSelectAll = useCallback(() => {
    const maxSelectablePending = Math.min(maxSelectablePagesByCredit, pendingPreviewPages.length);
    const pendingSelectedIds = pendingPreviewPages.slice(0, maxSelectablePending).map((p) => p.id);
    setSelectedUrls(new Set(pendingSelectedIds));
  }, [maxSelectablePagesByCredit, pendingPreviewPages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);

  const handleTogglePage = useCallback(
    (id: string, status: EPageStatus) => {
      if (status !== EPageStatus.Pending) return;

      const newSelected = new Set(selectedUrls);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        const selectedPendingAfterToggle = previewPages.filter(
          (p) => p.status === EPageStatus.Pending && (newSelected.has(p.id) || p.id === id)
        ).length;
        if (selectedPendingAfterToggle > maxSelectablePagesByCredit) {
          return;
        }
        newSelected.add(id);
      }
      setSelectedUrls(newSelected);
    },
    [maxSelectablePagesByCredit, previewPages, selectedUrls]
  );

  const handleOpenAddDataSource = useCallback(() => {
    if (planCode === ESubscriptionPlan.Free) {
      onRequireUpgrade();
      return;
    }
    setAddDataSourceOpen(true);
  }, [onRequireUpgrade, planCode, setAddDataSourceOpen]);

  const handleAddDataSource = useCallback(
    async (title: string, content: string) => {
      if (!bot) return;

      if (!title.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập tiêu đề.",
          variant: "destructive",
        });
        return;
      }

      if (!content.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập nội dung.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmittingDataSource(true);
      try {
        await addKnowledge(supabase, {
          botId: bot.id,
          isManual: true,
          title: title.trim(),
          content: content.trim(),
        });

        toast({
          title: "Thành công",
          description: "Đã thêm nội dung vào kiến thức. Đang xử lý...",
        });

        setAddDataSourceOpen(false);

        setTimeout(() => {
          void fetchData();
        }, 2000);
      } catch (error) {
        console.error("Add data source error:", error);
        toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Không thể thêm nguồn dữ liệu.",
          variant: "destructive",
        });
      } finally {
        setIsSubmittingDataSource(false);
      }
    },
    [bot, fetchData, supabase, toast, setAddDataSourceOpen]
  );

  const handleAddFileDataSource = useCallback(
    async (file: File) => {
      if (!bot) return;

      setIsSubmittingDataSource(true);
      try {
        await addKnowledgeFile(supabase, {
          botId: bot.id,
          file,
        });

        toast({
          title: "Thành công",
          description: "Đã tải tệp lên và đưa vào hàng chờ index.",
        });

        setAddDataSourceOpen(false);

        setTimeout(() => {
          void fetchData();
        }, 2000);
      } catch (error) {
        console.error("Add file data source error:", error);
        toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Không thể tải tệp dữ liệu.",
          variant: "destructive",
        });
      } finally {
        setIsSubmittingDataSource(false);
      }
    },
    [bot, fetchData, supabase, toast, setAddDataSourceOpen]
  );

  const handleAddUrlDataSource = useCallback(
    async (url: string) => {
      if (!bot) return;

      const normalizedUrl = normalizeKnowledgeUrl(url);
      if (!normalizedUrl) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://.",
          variant: "destructive",
        });
        return;
      }

      if (totalCredits < CREDIT_PER_PAGE) {
        toast({
          title: "Không đủ credits",
          description: `Bạn cần ${CREDIT_PER_PAGE} credit để thêm URL này.`,
          variant: "destructive",
        });
        return;
      }

      setIsSubmittingDataSource(true);
      try {
        await addKnowledgeUrl(supabase, {
          botId: bot.id,
          url: normalizedUrl,
        });

        toast({
          title: "Thành công",
          description: "Đã đưa URL vào hàng chờ crawl và index.",
        });

        setAddDataSourceOpen(false);

        setTimeout(() => {
          void fetchData();
        }, 2000);
      } catch (error) {
        console.error("Add URL data source error:", error);
        toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Không thể thêm URL dữ liệu.",
          variant: "destructive",
        });
      } finally {
        if (userId) {
          try {
            const summary = await getCreditSummary(supabase, userId);
            setTotalCredits(summary?.totalRemainingCredits ?? 0);
          } catch (creditError) {
            console.error("Credit refresh error:", creditError);
          }
        }
        setIsSubmittingDataSource(false);
      }
    },
    [bot, fetchData, setTotalCredits, supabase, toast, totalCredits, userId, setAddDataSourceOpen]
  );

  const handleOpenEditKnowledge = useCallback(
    async (page: PageListItem) => {
      if (planCode === ESubscriptionPlan.Free) {
        onRequireUpgrade();
        return;
      }
      setEditingPage(null);
      setIsLoadingPageDetail(true);
      setEditKnowledgeOpen(true);

      try {
        const fullPage = await getKnowledge(supabase, page.id);
        setEditingPage(fullPage);
      } catch (error) {
        console.error("Failed to load page detail:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải nội dung trang. Vui lòng thử lại.",
          variant: "destructive",
        });
        setEditKnowledgeOpen(false);
        setEditingPage(null);
      } finally {
        setIsLoadingPageDetail(false);
      }
    },
    [onRequireUpgrade, planCode, supabase, toast, setEditKnowledgeOpen]
  );

  const handleSaveEditKnowledge = useCallback(
    async (title: string, content: string) => {
      if (!editingPage) return;

      if (!title.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập tiêu đề.",
          variant: "destructive",
        });
        return;
      }

      if (!content.trim()) {
        toast({
          title: "Lỗi",
          description: "Vui lòng nhập nội dung.",
          variant: "destructive",
        });
        return;
      }

      setIsSavingKnowledge(true);
      try {
        const result = await editKnowledge(supabase, editingPage.id, {
          title: title.trim(),
          content: content.trim(),
        });

        if (result.changed === false) {
          toast({
            title: "Không có thay đổi",
            description: "Nội dung không thay đổi so với phiên bản trước.",
          });
        } else {
          toast({
            title: "Thành công",
            description: "Đang cập nhật nội dung. Vui lòng chờ trong giây lát...",
          });
        }

        setEditKnowledgeOpen(false);
        setEditingPage(null);

        setTimeout(() => {
          void fetchData();
        }, 1500);
      } catch (error) {
        console.error("Edit knowledge error:", error);
        toast({
          title: "Lỗi",
          description: error instanceof Error ? error.message : "Không thể cập nhật nội dung.",
          variant: "destructive",
        });
      } finally {
        setIsSavingKnowledge(false);
      }
    },
    [editingPage, fetchData, supabase, toast, setEditKnowledgeOpen]
  );

  const handleOpenDeleteKnowledge = useCallback(
    (page: PageListItem) => {
      setDeletingPage(page);
      setDeleteKnowledgeOpen(true);
    },
    [setDeleteKnowledgeOpen]
  );

  const clearEditingPage = useCallback(() => {
    setEditingPage(null);
  }, []);

  const handleConfirmDeleteKnowledge = useCallback(async () => {
    if (!deletingPage) return;

    setIsDeletingKnowledge(true);
    try {
      await deleteKnowledge(supabase, deletingPage.id);

      toast({
        title: "Đã xóa",
        description: "Nguồn dữ liệu đã được xóa.",
      });

      setDeleteKnowledgeOpen(false);
      setDeletingPage(null);

      void fetchData();
    } catch (error) {
      console.error("Delete knowledge error:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể xóa nguồn dữ liệu.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingKnowledge(false);
    }
  }, [deletingPage, fetchData, supabase, toast, setDeleteKnowledgeOpen]);

  return {
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
    deletingPage,
    isDeletingKnowledge,
    selectedPendingCount,
    selectedUrlCount,
    selectedCreditsCost,
    maxSelectablePagesByCredit,
    pendingPreviewPages,
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
  };
}
