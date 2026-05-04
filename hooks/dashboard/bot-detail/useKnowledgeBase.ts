"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  addKnowledge,
  deleteKnowledge,
  editKnowledge,
  pollPipelineStatus,
  startDiscover,
  submitSelection,
} from "@/lib/services/bot.service";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getPagePreviewByBotId } from "@/lib/services/page.service";
import { CREDIT_PER_PAGE } from "@/config";
import { EPageSourceType, EPageStatus, ESubscriptionPlan } from "@/types";

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
  deleteKnowledgeOpen: boolean;
  deletingPage: PageType | null;
  isDeletingKnowledge: boolean;
  selectedPendingCount: number;
  selectedUrlCount: number;
  selectedCreditsCost: number;
  maxSelectablePagesByCredit: number;
  pendingPreviewPages: PageStatus[];
  selectablePreviewPages: PageStatus[];
  setReindexModalOpen: (open: boolean) => void;
  setAddDataSourceOpen: (open: boolean) => void;
  setEditKnowledgeOpen: (open: boolean) => void;
  setDeleteKnowledgeOpen: (open: boolean) => void;
  handleReindex: () => Promise<void>;
  handleUpdateSelected: () => Promise<void>;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleTogglePage: (id: string, status: EPageStatus) => void;
  handleOpenAddDataSource: () => void;
  handleAddDataSource: (title: string, content: string) => Promise<void>;
  handleOpenEditKnowledge: (page: PageType) => void;
  handleSaveEditKnowledge: (title: string, content: string) => Promise<void>;
  handleOpenDeleteKnowledge: (page: PageType) => void;
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
  const [reindexModalOpen, setReindexModalOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewPages, setPreviewPages] = useState<PageStatus[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [previewErrors, setPreviewErrors] = useState<Array<{ url: string; error: string }>>([]);

  const [addDataSourceOpen, setAddDataSourceOpen] = useState(false);
  const [isSubmittingDataSource, setIsSubmittingDataSource] = useState(false);

  const [editKnowledgeOpen, setEditKnowledgeOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PageType | null>(null);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  const [deleteKnowledgeOpen, setDeleteKnowledgeOpen] = useState(false);
  const [deletingPage, setDeletingPage] = useState<PageType | null>(null);
  const [isDeletingKnowledge, setIsDeletingKnowledge] = useState(false);

  const selectedPendingCount = useMemo(
    () =>
      previewPages.filter((p) => selectedUrls.has(p.id) && p.status !== EPageStatus.Failed).length,
    [previewPages, selectedUrls]
  );
  const selectedUrlCount = selectedUrls.size;
  const selectedCreditsCost = selectedPendingCount * CREDIT_PER_PAGE;
  const maxSelectablePagesByCredit = Math.floor(totalCredits / CREDIT_PER_PAGE);
  const pendingPreviewPages = useMemo(
    () => previewPages.filter((p) => p.status === EPageStatus.Pending),
    [previewPages]
  );
  const selectablePreviewPages = useMemo(
    () => previewPages.filter((p) => p.status !== EPageStatus.Failed),
    [previewPages]
  );

  const handleReindex = useCallback(async () => {
    if (!bot) return;

    setReindexModalOpen(true);
    setIsLoadingPreview(true);
    setPreviewPages([]);
    setSelectedUrls(new Set());
    setPreviewErrors([]);

    try {
      if (userId) {
        const summary = await getCreditSummary(supabase, userId);
        setTotalCredits(summary?.totalRemainingCredits ?? 0);
      }

      const { discoverJobId } = await startDiscover(supabase, {
        url: bot.domain,
        botId: bot.id,
      });

      await pollPipelineStatus(supabase, discoverJobId);

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
      setIsLoadingPreview(false);
    }
  }, [bot, setTotalCredits, supabase, toast, userId]);

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
  ]);

  const handleSelectAll = useCallback(() => {
    const maxSelectablePending = Math.min(maxSelectablePagesByCredit, pendingPreviewPages.length);
    const pendingSelectedIds = pendingPreviewPages.slice(0, maxSelectablePending).map((p) => p.id);
    const nonPendingSelectedIds = selectablePreviewPages
      .filter((p) => p.status !== EPageStatus.Pending)
      .map((p) => p.id);
    const selectableUrls = new Set([...nonPendingSelectedIds, ...pendingSelectedIds]);
    setSelectedUrls(selectableUrls);
  }, [maxSelectablePagesByCredit, pendingPreviewPages, selectablePreviewPages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);

  const handleTogglePage = useCallback(
    (id: string, status: EPageStatus) => {
      if (status === EPageStatus.Failed) return;

      const newSelected = new Set(selectedUrls);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        const selectedPendingAfterToggle = previewPages.filter(
          (p) => (newSelected.has(p.id) || p.id === id) && p.status !== EPageStatus.Failed
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
  }, [onRequireUpgrade, planCode]);

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
    [bot, fetchData, supabase, toast]
  );

  const handleOpenEditKnowledge = useCallback(
    (page: PageType) => {
      if (planCode === ESubscriptionPlan.Free) {
        onRequireUpgrade();
        return;
      }

      setEditingPage(page);
      setEditKnowledgeOpen(true);
    },
    [onRequireUpgrade, planCode]
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
    [editingPage, fetchData, supabase, toast]
  );

  const handleOpenDeleteKnowledge = useCallback((page: PageType) => {
    setDeletingPage(page);
    setDeleteKnowledgeOpen(true);
  }, []);

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
  }, [deletingPage, fetchData, supabase, toast]);

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
    deleteKnowledgeOpen,
    deletingPage,
    isDeletingKnowledge,
    selectedPendingCount,
    selectedUrlCount,
    selectedCreditsCost,
    maxSelectablePagesByCredit,
    pendingPreviewPages,
    selectablePreviewPages,
    setReindexModalOpen,
    setAddDataSourceOpen,
    setEditKnowledgeOpen,
    setDeleteKnowledgeOpen,
    handleReindex,
    handleUpdateSelected,
    handleSelectAll,
    handleDeselectAll,
    handleTogglePage,
    handleOpenAddDataSource,
    handleAddDataSource,
    handleOpenEditKnowledge,
    handleSaveEditKnowledge,
    handleOpenDeleteKnowledge,
    handleConfirmDeleteKnowledge,
    clearEditingPage,
  };
}
