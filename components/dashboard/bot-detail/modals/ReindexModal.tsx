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
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
  const showScopeSelection = !hasStartedDiscover && previewPages.length === 0 && !isDiscovering;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {showScopeSelection ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("dashboard.botDetail.modals.reindex.title")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.botDetail.modals.reindex.scopeDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4">
              <Label>{t("dashboard.botDetail.modals.reindex.scopeLabel")}</Label>
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
                    <span className="block text-sm font-medium">
                      {t("dashboard.botDetail.modals.reindex.scopeFull")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("dashboard.botDetail.modals.reindex.scopeFullDesc")}
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
                    <span className="block text-sm font-medium">
                      {t("dashboard.botDetail.modals.reindex.scopeHostname")}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("dashboard.botDetail.modals.reindex.scopeHostnameDesc")}
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
                {t("dashboard.botDetail.modals.reindex.cancel")}
              </Button>
              <Button onClick={() => void onStartDiscover()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("dashboard.botDetail.modals.reindex.startCrawl")}
              </Button>
            </DialogFooter>
          </>
        ) : isLoadingPreview || isDiscovering ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("dashboard.botDetail.modals.reindex.title")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.botDetail.modals.reindex.crawlingDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-muted/50 p-2">
              <ElegantProgress
                title={t("dashboard.botDetail.modals.reindex.scanningTitle")}
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
                {t("dashboard.botDetail.modals.reindex.cancel")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("dashboard.botDetail.modals.reindex.title")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.botDetail.modals.reindex.selectPagesDesc")}
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
                <span className="text-muted-foreground">
                  {t("dashboard.botDetail.modals.reindex.notIndexed")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800">
                  {previewPages.filter((p) => p.status === EPageStatus.Completed).length}
                </Badge>
                <span className="text-muted-foreground">
                  {t("dashboard.botDetail.modals.reindex.indexed")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-red-100 text-red-700">
                  {previewPages.filter((p) => p.status === EPageStatus.Failed).length}
                </Badge>
                <span className="text-muted-foreground">
                  {t("dashboard.botDetail.modals.reindex.discoverError")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("dashboard.botDetail.modals.reindex.selected", {
                  selected: selectedUrls.size,
                  total: selectablePreviewPagesCount,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAll}
                  disabled={isLoadingPreview || maxSelectablePagesByCredit === 0}
                  className="hover:border-primary hover:bg-white hover:text-primary"
                >
                  {t("dashboard.botDetail.modals.reindex.selectAll")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDeselectAll}
                  className="hover:border-primary hover:bg-white hover:text-primary"
                >
                  {t("dashboard.botDetail.modals.reindex.deselectAll")}
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
                          <Badge className="bg-slate-100 text-slate-700">
                            {t("dashboard.botDetail.modals.reindex.noChange")}
                          </Badge>
                        )}
                        {renderStatusBadge(page.status)}
                      </div>
                    </div>
                  );
                })}

                {previewErrors.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm font-medium text-destructive">
                      {t("dashboard.botDetail.modals.reindex.scanError", {
                        count: previewErrors.length,
                      })}
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
                      {t("dashboard.botDetail.modals.reindex.cannotSelectMore")}
                    </p>
                  )}
                <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-[11px] tracking-wide text-muted-foreground">
                      {t("dashboard.botDetail.modals.reindex.creditsUsage")}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {selectedCreditsCost.toLocaleString()} / {totalCredits.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.botDetail.modals.reindex.creditsPerPage", {
                      count: CREDIT_PER_PAGE,
                      max: Math.max(0, maxSelectablePagesByCredit),
                    })}
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
                  {t("dashboard.botDetail.modals.reindex.cancel")}
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
                      {t("dashboard.botDetail.modals.reindex.updating")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {selectedUrls.size > 0
                        ? t("dashboard.botDetail.modals.reindex.updateWithCount", {
                            count: selectedUrls.size,
                          })
                        : t("dashboard.botDetail.modals.reindex.update")}
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
