"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { DashboardMobileNav } from "@/components/dashboard/shared/DashboardMobileNav";
import { PageHeader } from "@/components/dashboard/shared/PageHeader";
import { KnowledgeBaseTab } from "@/components/dashboard/bot-detail/tabs/KnowledgeBaseTab";
import { DeleteKnowledgeDialog } from "@/components/dashboard/bot-detail/modals/DeleteKnowledgeDialog";
import { WorkspaceKnowledgeModal } from "@/components/dashboard/workspace-knowledge/WorkspaceKnowledgeModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, RefreshCw, Building2 } from "lucide-react";
import { EPageSourceType, EPageStatus } from "@/types";
import type { PageListItem } from "@/lib/services/page.service";

interface WorkspaceKnowledgeItem {
  id: string;
  title: string;
  content: string;
  source_type?: EPageSourceType;
  created_by?: string;
  created_at: string;
  metadata?: {
    url?: string;
    file_name?: string;
  } | null;
}

const toPageListItem = (item: WorkspaceKnowledgeItem): PageListItem => {
  const isUrl = item.source_type === EPageSourceType.SingleUrl;
  const isFile = item.source_type === EPageSourceType.File;
  return {
    id: item.id,
    title: item.title,
    url: isFile ? `file://${item.id}` : (item.metadata?.url ?? item.title),
    source_type: isFile
      ? EPageSourceType.File
      : isUrl
        ? EPageSourceType.SingleUrl
        : EPageSourceType.ManualText,
    status: EPageStatus.Completed,
    crawled_at: item.created_at,
    error_message: null,
    error_type: null,
  };
};

export interface WorkspaceKnowledgeClientProps {
  initialWorkspaceId?: string;
}

export function WorkspaceKnowledgeClient({ initialWorkspaceId }: WorkspaceKnowledgeClientProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { signOut } = useAuth();
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();

  const workspaceId = activeWorkspace?.id ?? initialWorkspaceId;

  const [items, setItems] = useState<WorkspaceKnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkspaceKnowledgeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WorkspaceKnowledgeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalCredits, setTotalCredits] = useState<number | undefined>(undefined);

  const fetchKnowledge = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể tải danh sách kiến thức dùng chung");
      }
      const data = await res.json();
      setItems(data.knowledge || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const refreshCredits = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/credits`);
      if (!res.ok) {
        setTotalCredits(undefined);
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setTotalCredits(data.data.totalCredits as number);
      } else {
        setTotalCredits(undefined);
      }
    } catch (err) {
      console.error("Error fetching workspace credits:", err);
      setTotalCredits(undefined);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchKnowledge();
    void refreshCredits();
  }, [fetchKnowledge, refreshCredits]);

  const handleAdd = async (title: string, content: string) => {
    if (!workspaceId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thêm kiến thức mới");

      if (data.knowledge) {
        setItems((prev) => [data.knowledge, ...prev]);
      } else {
        await fetchKnowledge();
      }
      setIsAddOpen(false);
      void refreshCredits();
      toast.success("Đã thêm kiến thức dùng chung");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi thêm kiến thức");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFile = async (files: File[]) => {
    if (!workspaceId || files.length === 0) return;
    setIsSaving(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`/api/workspaces/${workspaceId}/knowledge/upload`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Không thể tải tệp lên");

          if (data.knowledge) {
            setItems((prev) => [data.knowledge, ...prev]);
            successCount++;
          } else {
            await fetchKnowledge();
            successCount++;
          }
        } catch (error) {
          console.error("Add file knowledge error for file:", file.name, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          failCount > 0
            ? `Đã thêm ${successCount}/${files.length} tệp.`
            : `Đã thêm ${files.length} tệp vào kiến thức dùng chung.`
        );
        setIsAddOpen(false);
        void refreshCredits();
      } else {
        throw new Error("Không thể tải tệp dữ liệu.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải tệp lên");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUrl = async (url: string) => {
    if (!workspaceId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "url", url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể thêm URL");

      if (data.knowledge) {
        setItems((prev) => [data.knowledge, ...prev]);
      } else {
        await fetchKnowledge();
      }
      setIsAddOpen(false);
      void refreshCredits();
      toast.success("Đã thêm URL vào kiến thức dùng chung");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi thêm URL");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (item: WorkspaceKnowledgeItem, title: string, content: string) => {
    if (!workspaceId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể cập nhật kiến thức");

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, title, content, ...(data.knowledge ?? {}) } : it
        )
      );
      setEditingItem(null);
      toast.success("Đã cập nhật kiến thức dùng chung");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi cập nhật kiến thức");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId || !deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể xóa kiến thức");
      }
      setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));
      setDeletingItem(null);
      toast.success("Đã xóa kiến thức dùng chung");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa kiến thức");
    } finally {
      setIsDeleting(false);
    }
  };

  const pages: PageListItem[] = items.map(toPageListItem);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onSignOut={signOut}
      />

      <DashboardMobileHeader
        fullName={user?.user_metadata?.full_name}
        email={user?.email}
        onNavigateSettings={() => router.push("/dashboard/settings")}
        onSignOut={signOut}
      />

      <main className="lg:pl-64">
        <div className="container mx-auto space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {/* Header Banner */}
          <PageHeader
            title="Kiến thức chung"
            description={
              <>
                Quản lý kiến thức dùng chung cho tất cả bot trong{" "}
                <span className="font-semibold text-foreground">
                  {activeWorkspace?.name || "workspace"}
                </span>
              </>
            }
          >
            {!workspaceId && (
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Chọn workspace
              </Button>
            )}
          </PageHeader>

          {workspaceLoading ? (
            <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Đang tải workspace...</p>
              </div>
            </Card>
          ) : !workspaceId ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Vui lòng chọn workspace để quản lý kiến thức chung.
              </p>
            </div>
          ) : isLoading ? (
            <Card className="border border-border/50 bg-card/50 p-12 text-center shadow-md backdrop-blur-sm">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">
                  Đang tải kiến thức dùng chung...
                </p>
              </div>
            </Card>
          ) : error ? (
            <Card className="border border-destructive/30 bg-destructive/10 p-6 text-center shadow-md">
              <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                <p className="text-sm font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void fetchKnowledge()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            </Card>
          ) : (
            <KnowledgeBaseTab
              pages={pages}
              onOpenAddDataSource={() => setIsAddOpen(true)}
              onOpenEditKnowledge={async (page) => {
                const item = items.find((it) => it.id === page.id);
                if (item) setEditingItem(item);
              }}
              onOpenDeleteKnowledge={(page) => {
                const item = items.find((it) => it.id === page.id);
                if (item) setDeletingItem(item);
              }}
            />
          )}
        </div>
      </main>

      <WorkspaceKnowledgeModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        isSaving={isSaving}
        totalCredits={totalCredits}
        onConfirmManual={handleAdd}
        onConfirmFile={handleAddFile}
        onConfirmUrl={handleAddUrl}
      />

      <WorkspaceKnowledgeModal
        open={Boolean(editingItem)}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        isSaving={isSaving}
        isEdit
        initialTitle={editingItem?.title ?? ""}
        initialContent={editingItem?.content ?? ""}
        onConfirmManual={(title, content) => {
          if (editingItem) return handleEdit(editingItem, title, content);
          return handleAdd(title, content);
        }}
        onConfirmFile={handleAddFile}
        onConfirmUrl={handleAddUrl}
      />

      <DeleteKnowledgeDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />

      <DashboardMobileNav />
    </div>
  );
}
