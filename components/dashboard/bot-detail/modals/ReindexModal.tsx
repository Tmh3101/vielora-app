"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CREDIT_PER_PAGE } from "@/config";
import { EPageStatus } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { PageStatus } from "@/hooks/dashboard/bot-detail/useKnowledgeBase";
import { ElegantProgress } from "@/components/onboarding/shared/ElegantProgress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CrawlScopeType } from "@/types/scrape";
import { CrawlScope } from "@/lib/constants";

export interface ReindexModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingPreview: boolean;
  isReindexing: boolean;
  isDiscovering: boolean;
  currentAction: string;
  crawledCount: number;
  reindexScope: CrawlScopeType;
  hasStartedDiscover: boolean;
  previewPages: PageStatus[];
  selectedUrls: Set<string>;
  previewErrors: Array<{ url: string; error: string }>;
  selectedPendingCount: number;
  selectedUrlCount: number;
  selectedCreditsCost: number;
  totalCredits: number;
  maxSelectablePagesByCredit: number;
  selectablePreviewPagesCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onScopeChange: (scope: CrawlScopeType) => void;
  onStartDiscover: () => Promise<void>;
  onTogglePage: (id: string, status: EPageStatus) => void;
  onConfirm: () => Promise<void>;
  renderStatusBadge: (status: EPageStatus) => ReactNode;
}

export function ReindexModal({
  open,
  onOpenChange,
  isLoadingPreview,
  isReindexing,
  isDiscovering,
  currentAction,
  crawledCount,
  reindexScope,
  hasStartedDiscover,
  previewPages,
  selectedUrls,
  previewErrors,
  selectedPendingCount,
  selectedUrlCount,
  selectedCreditsCost,
  totalCredits,
  maxSelectablePagesByCredit,
  selectablePreviewPagesCount,
  onSelectAll,
  onDeselectAll,
  onScopeChange,
  onStartDiscover,
  onTogglePage,
  onConfirm,
  renderStatusBadge,
}: ReindexModalProps) {
  const showScopeSelection = !hasStartedDiscover && previewPages.length === 0 && !isDiscovering;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {showScopeSelection ? (
          <>
            <DialogHeader>
              <DialogTitle>Cập nhật nội dung</DialogTitle>
              <DialogDescription>Chọn phạm vi crawl trước khi quét lại website.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4">
              <Label>Phạm vi</Label>
              <RadioGroup
                value={reindexScope}
                onValueChange={(value) => onScopeChange(value as CrawlScopeType)}
                className="gap-3"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                  <RadioGroupItem
                    value={CrawlScope.FULL_WEBSITE}
                    id="reindex-scope-full"
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">Toàn bộ website</span>
                    <span className="block text-xs text-muted-foreground">
                      Crawl nội dung của toàn bộ website.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                  <RadioGroupItem
                    value={CrawlScope.SUBDOMAIN_ONLY}
                    id="reindex-scope-subdomain"
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">Chỉ hostname hiện tại</span>
                    <span className="block text-xs text-muted-foreground">
                      Chỉ crawl đúng hostname của URL bot hiện tại.
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="hover:border-red-600 hover:bg-white hover:text-red-600"
              >
                Hủy
              </Button>
              <Button onClick={() => void onStartDiscover()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Bắt đầu crawl
              </Button>
            </DialogFooter>
          </>
        ) : isLoadingPreview || isDiscovering ? (
          <>
            <DialogHeader>
              <DialogTitle>Cập nhật nội dung</DialogTitle>
              <DialogDescription>
                Đang được thực hiện crawl nội dung mới nhất. Vui lòng chờ trong giây lát...
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted/50 p-2">
              <ElegantProgress
                title="Đang quét website..."
                currentAction={currentAction}
                crawledCount={crawledCount}
              />
            </div>
            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isReindexing}
                className="hover:border-red-600 hover:bg-white hover:text-red-600"
              >
                Hủy
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cập nhật nội dung</DialogTitle>
              <DialogDescription>
                Chọn các trang đã discover để đưa vào quá trình indexing.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-amber-100 text-amber-800">
                  {
                    previewPages.filter(
                      (p) => p.status === EPageStatus.Pending || p.status === EPageStatus.Ignored
                    ).length
                  }
                </Badge>
                <span className="text-muted-foreground">Chưa index</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800">
                  {previewPages.filter((p) => p.status === EPageStatus.Completed).length}
                </Badge>
                <span className="text-muted-foreground">Đã index</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-red-100 text-red-700">
                  {previewPages.filter((p) => p.status === EPageStatus.Failed).length}
                </Badge>
                <span className="text-muted-foreground">Discover lỗi</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Đã chọn {selectedUrls.size}/{selectablePreviewPagesCount} trang
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAll}
                  disabled={isLoadingPreview || maxSelectablePagesByCredit === 0}
                  className="hover:border-primary hover:bg-white hover:text-primary"
                >
                  Chọn tất cả
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeselectAll}
                  className="hover:border-primary hover:bg-white hover:text-primary"
                >
                  Bỏ chọn tất cả
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] rounded-lg border">
              <div className="space-y-1 p-2">
                {previewPages.map((page) => {
                  const isSelectable = page.status === EPageStatus.Pending;
                  return (
                    <div
                      key={page.id}
                      className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                        !isSelectable
                          ? "cursor-not-allowed opacity-60"
                          : selectedUrls.has(page.id)
                            ? "cursor-pointer border border-primary/20 bg-primary/5"
                            : "cursor-pointer hover:bg-muted"
                      }`}
                      onClick={() => {
                        if (isSelectable) {
                          onTogglePage(page.id, page.status);
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedUrls.has(page.id)}
                        onCheckedChange={() => onTogglePage(page.id, page.status)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={
                          !isSelectable ||
                          (!selectedUrls.has(page.id) &&
                            selectedPendingCount >= maxSelectablePagesByCredit)
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{page.title || page.url}</p>
                        <p className="truncate text-xs text-muted-foreground">{page.url}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {page.status === EPageStatus.Completed && (
                          <Badge className="bg-slate-100 text-slate-700">Không có thay đổi</Badge>
                        )}
                        {renderStatusBadge(page.status)}
                      </div>
                    </div>
                  );
                })}

                {previewErrors.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm font-medium text-destructive">
                      Lỗi khi quét ({previewErrors.length})
                    </p>
                    {previewErrors.map((error, idx) => (
                      <div
                        key={idx}
                        className="rounded bg-destructive/5 p-2 text-xs text-muted-foreground"
                      >
                        <span className="block truncate">{error.url}</span>
                        <span className="text-destructive">{error.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                {selectedPendingCount >= maxSelectablePagesByCredit &&
                  selectablePreviewPagesCount > 0 && (
                    <p className="text-xs font-medium text-amber-600">
                      Không thể chọn thêm trang vì đã đạt giới hạn credits hiện tại.
                    </p>
                  )}
                <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-[11px] tracking-wide text-muted-foreground">
                      Credits sử dụng
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {selectedCreditsCost.toLocaleString()} / {totalCredits.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <p className="text-xs text-muted-foreground">
                    {CREDIT_PER_PAGE} credit/trang • tối đa{" "}
                    {Math.max(0, maxSelectablePagesByCredit)} trang
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isReindexing}
                  className="hover:border-red-600 hover:bg-white hover:text-red-600"
                >
                  Hủy
                </Button>
                <Button
                  onClick={() => void onConfirm()}
                  disabled={
                    isLoadingPreview ||
                    isReindexing ||
                    selectedUrlCount === 0 ||
                    selectedCreditsCost > totalCredits
                  }
                >
                  {isReindexing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Cập nhật {selectedUrls.size > 0 && `(${selectedUrls.size})`}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
