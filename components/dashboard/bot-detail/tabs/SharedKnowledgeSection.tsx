"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

export interface SharedKnowledgeItem {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  source_type?: string;
  created_by?: string;
  created_at: string;
}

export interface SharedKnowledgeSectionProps {
  workspaceId: string;
}

export function SharedKnowledgeSection({ workspaceId }: SharedKnowledgeSectionProps) {
  const [items, setItems] = useState<SharedKnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => {
    void fetchKnowledge();
  }, [fetchKnowledge]);

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể thêm kiến thức mới");
      }

      const data = await res.json();
      if (data.knowledge) {
        setItems((prev) => [data.knowledge, ...prev]);
      } else {
        await fetchKnowledge();
      }

      setTitle("");
      setContent("");
      setIsAdding(false);
    } catch (err: unknown) {
      alert((err as Error).message || "Đã xảy ra lỗi khi thêm kiến thức");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa mục kiến thức này?")) {
      return;
    }

    setDeletingId(itemId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/knowledge/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Không thể xóa mục kiến thức");
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: unknown) {
      alert((err as Error).message || "Đã xảy ra lỗi khi xóa kiến thức");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>Kiến thức dùng chung</CardTitle>
            <CardDescription>
              Quản lý các thông tin và tài liệu dùng chung trong workspace
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              onClick={() => void fetchKnowledge()}
              disabled={isLoading}
              variant="outline"
              className="w-full hover:border-primary hover:bg-white hover:text-primary sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Làm mới
                </>
              )}
            </Button>
            <Button onClick={() => setIsAdding((prev) => !prev)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Thêm kiến thức
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form
              onSubmit={handleAddKnowledge}
              className="mb-6 space-y-4 rounded-xl border border-border/50 bg-card p-4"
            >
              <h4 className="font-semibold text-foreground">Thêm kiến thức mới</h4>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tiêu đề</label>
                <Input
                  placeholder="Nhập tiêu đề kiến thức..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nội dung</label>
                <Textarea
                  placeholder="Nhập nội dung chi tiết..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdding(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu kiến thức"
                  )}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Đang tải kiến thức dùng chung...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-destructive">
              <p className="mb-4 text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchKnowledge()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="pb-8 pt-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="mb-2">Chưa có kiến thức dùng chung nào.</p>
              <p className="text-xs text-muted-foreground">
                Nhấn &quot;Thêm kiến thức&quot; để bắt đầu tạo tài liệu dùng chung.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-0 bg-purple-100 text-[10px] text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        >
                          Kiến thức
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        title="Xóa"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <h4
                      className="mb-1 line-clamp-1 font-semibold text-foreground"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {item.content}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                    <span>
                      {new Date(item.created_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SharedKnowledgeSection;
