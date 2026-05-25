"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EPageSourceType, EPageStatus } from "@/types";
import { FileText, Globe, Link, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";

type PageType = Tables<"pages">;

export interface KnowledgeBaseTabProps {
  pages: PageType[];
  isReindexing: boolean;
  onReindex: () => Promise<void>;
  onOpenAddDataSource: () => void;
  onOpenEditKnowledge: (page: PageType) => void;
  onOpenDeleteKnowledge: (page: PageType) => void;
}

export function KnowledgeBaseTab({
  pages,
  isReindexing,
  onReindex,
  onOpenAddDataSource,
  onOpenEditKnowledge,
  onOpenDeleteKnowledge,
}: KnowledgeBaseTabProps) {
  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle> Kiến thức hiện tại</CardTitle>
            <CardDescription>Quản lý nguồn dữ liệu cho chatbot của bạn</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void onReindex()}
              disabled={isReindexing}
              variant="outline"
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              {isReindexing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang reindex...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reindex
                </>
              )}
            </Button>
            <Button onClick={onOpenAddDataSource}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm dữ liệu
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="pb-8 pt-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="mb-2">Chưa có nguồn dữ liệu nào được thêm.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {
                          pages.filter(
                            (p) =>
                              p.source_type === EPageSourceType.ManualText ||
                              p.source_type === EPageSourceType.File ||
                              p.url.startsWith("file://")
                          ).length
                        }
                      </p>
                      <p className="-mt-1 text-xs text-muted-foreground">Tài liệu</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {
                          pages.filter(
                            (p) =>
                              p.source_type !== EPageSourceType.ManualText &&
                              p.source_type !== EPageSourceType.File &&
                              p.source_type !== EPageSourceType.SingleUrl &&
                              !p.url.startsWith("file://")
                          ).length
                        }
                      </p>
                      <p className="-mt-1 text-xs text-muted-foreground">Website</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <Link className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {pages.filter((p) => p.source_type === EPageSourceType.SingleUrl).length}
                      </p>
                      <p className="-mt-1 text-xs text-muted-foreground">URL</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tổng cộng</p>
                  <p className="text-sm font-medium text-muted-foreground">{pages.length} nguồn</p>
                </div>
              </div>

              <div className="space-y-3">
                {pages.map((page) => {
                  const isManual = page.source_type === EPageSourceType.ManualText;
                  const isFile =
                    page.source_type === EPageSourceType.File || page.url.startsWith("file://");
                  const isSingleUrl = page.source_type === EPageSourceType.SingleUrl;
                  const isTextLike = isManual || isFile;
                  const isProcessing =
                    page.status === EPageStatus.PendingIndex ||
                    page.status === EPageStatus.Processing;
                  return (
                    <div
                      key={page.id}
                      className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card px-4 py-3 transition-all duration-200 ${
                        isProcessing ? "opacity-70" : "hover:border-primary/30 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isManual
                              ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                              : isFile
                                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                : isSingleUrl
                                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : isTextLike ? (
                            <FileText className="h-5 w-5" />
                          ) : isSingleUrl ? (
                            <Link className="h-5 w-5" />
                          ) : (
                            <Globe className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate font-semibold text-foreground">
                              {isTextLike ? page.title : page.title || page.url}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`shrink-0 border-0 text-[10px] font-medium uppercase tracking-wide ${
                                isManual
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                  : isFile
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                    : isSingleUrl
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              }`}
                            >
                              {isManual
                                ? "Văn bản"
                                : isFile
                                  ? "Tệp"
                                  : isSingleUrl
                                    ? "URL"
                                    : "Website"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {isManual ? "Đã thêm thủ công" : isFile ? "Tệp đã tải lên" : page.url}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {new Date(page.crawled_at).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                          {isProcessing ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Đang xử lý
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Đã index
                            </span>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-1 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            onClick={() => onOpenEditKnowledge(page)}
                            title="Chỉnh sửa"
                            disabled={isProcessing}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onOpenDeleteKnowledge(page)}
                            title="Xóa"
                            disabled={isProcessing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
