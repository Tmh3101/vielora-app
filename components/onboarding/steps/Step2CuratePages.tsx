"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { submitSelection } from "@/lib/services/bot.service";
import { getCreditSummary } from "@/lib/services/credit.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoverPipeline } from "@/hooks/onboarding/useDiscoverPipeline";
import { CREDIT_PER_PAGE } from "@/config";
import { EBotStatus } from "@/types";
import { DiscoveringView } from "@/components/onboarding/views/DiscoveringView";
import { FailedPipelineView } from "@/components/onboarding/views/FailedPipelineView";
import { getPhaseBadgeClass, getPhaseLabel } from "@/components/onboarding/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ONBOARDING_CREDIT_SUMMARY_KEY } from "@/lib/constants/react-query-key";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { CrawlScope } from "@/lib/constants";

export interface Step2CuratePagesProps {
  botId: string;
  onNext: () => void;
}

export function Step2CuratePages({ botId, onNext }: Step2CuratePagesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const crawlScope = useOnboardingStore((state) => state.crawlScope);

  const {
    botStatus,
    pagesFailed,
    pipelineError,
    curationRows,
    isLoadingPages,
    retryDiscover,
    currentAction,
    crawledCount,
    progress,
  } = useDiscoverPipeline(botId);

  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const creditSummaryQuery = useQuery({
    queryKey: [ONBOARDING_CREDIT_SUMMARY_KEY, user?.id],
    queryFn: () => getCreditSummary(supabase, user!.id),
    enabled: !!user,
    retry: 1,
  });

  const allRowsSelected = useMemo(() => {
    if (curationRows.length === 0) return false;
    return curationRows.every((row) => selectedPageIds.has(row.id));
  }, [curationRows, selectedPageIds]);

  const totalCredits = creditSummaryQuery.data?.totalRemainingCredits ?? 0;
  const maxSelectablePagesByCredit = Math.floor(totalCredits / CREDIT_PER_PAGE);
  const selectedCount = selectedPageIds.size;
  const selectedCreditsCost = selectedCount * CREDIT_PER_PAGE;

  const toggleRowSelection = (id: string) => {
    const next = new Set(selectedPageIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= maxSelectablePagesByCredit) {
        toast({
          title: "Không đủ credits",
          description: `Bạn chỉ có thể chọn tối đa ${maxSelectablePagesByCredit} trang với ${totalCredits} credits hiện tại.`,
          variant: "destructive",
        });
        return;
      }
      next.add(id);
    }
    setSelectedPageIds(next);
  };

  const handleSelectAll = () => {
    const maxSelectable = Math.min(maxSelectablePagesByCredit, curationRows.length);
    const pageIds = curationRows.slice(0, maxSelectable).map((row) => row.id);
    setSelectedPageIds(new Set(pageIds));
  };

  const handleDeselectAll = () => {
    setSelectedPageIds(new Set());
  };

  const handleSubmitSelection = async () => {
    setIsSubmittingSelection(true);

    try {
      setSubmitError(null);
      await submitSelection(supabase, botId, Array.from(selectedPageIds));
      onNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể gửi lựa chọn index.";
      setSubmitError(message);
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  const mergedError = submitError || pipelineError;

  if (botStatus === EBotStatus.Discovering || botStatus === EBotStatus.Pending) {
    return (
      <DiscoveringView
        pipelineError={pipelineError}
        pagesFailed={pagesFailed}
        currentAction={currentAction}
        crawledCount={crawledCount}
        progress={progress}
        scopeLabel={
          crawlScope === CrawlScope.FULL_WEBSITE ? "Toàn bộ website" : "Chỉ hostname hiện tại"
        }
      />
    );
  }

  if (botStatus === EBotStatus.Failed) {
    return (
      <FailedPipelineView
        pipelineError={pipelineError}
        onRetry={() => {
          void retryDiscover();
        }}
        onBackToDashboard={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Chọn trang để index
          </span>
          <Badge className={getPhaseBadgeClass(EBotStatus.Discovered)}>
            {getPhaseLabel(EBotStatus.Discovered)}
          </Badge>
        </CardTitle>
        <CardDescription>Chọn những URL cần index trước khi bắt đầu xử lý AI.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {mergedError && (
          <Alert variant="destructive">
            <AlertTitle>Lỗi pipeline</AlertTitle>
            <AlertDescription>{mergedError}</AlertDescription>
          </Alert>
        )}

        {pagesFailed > 0 && (
          <Alert>
            <AlertTitle>Lưu ý</AlertTitle>
            <AlertDescription>
              Có {pagesFailed} trang discover thất bại và sẽ không xuất hiện trong danh sách chọn.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Đã chọn {selectedCount}/{curationRows.length} pages
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={creditSummaryQuery.isLoading || maxSelectablePagesByCredit === 0}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              Chọn tất cả
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={creditSummaryQuery.isLoading}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              Bỏ chọn tất cả
            </Button>
          </div>
        </div>

        <Separator />

        <div className="relative max-h-[400px] w-full overflow-auto rounded-md border">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-[56px]">Chọn</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPages && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Đang tải danh sách trang...
                  </TableCell>
                </TableRow>
              )}

              {!isLoadingPages && curationRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Không có trang phù hợp để chọn.
                  </TableCell>
                </TableRow>
              )}

              {curationRows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => toggleRowSelection(row.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedPageIds.has(row.id)}
                      onCheckedChange={() => toggleRowSelection(row.id)}
                      disabled={
                        !selectedPageIds.has(row.id) &&
                        (creditSummaryQuery.isLoading ||
                          selectedCount >= maxSelectablePagesByCredit)
                      }
                      aria-label={`select-${row.id}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-medium">{row.title}</TableCell>
                  <TableCell className="max-w-[560px] truncate">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.url}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <span className="block text-xs text-muted-foreground">
              {allRowsSelected ? "Đã chọn tất cả trang" : ""}
            </span>
            {selectedCount >= maxSelectablePagesByCredit && curationRows.length > 0 && (
              <p className="text-xs font-medium text-amber-600">
                Không thể chọn thêm trang vì đã đạt giới hạn credits hiện tại.
              </p>
            )}
            <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground">Credits sử dụng</p>
                <p className="text-xs font-medium text-foreground">
                  {selectedCreditsCost.toLocaleString()} / {totalCredits.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <p className="text-xs text-muted-foreground">
                {CREDIT_PER_PAGE} credit/trang • tối đa {Math.max(0, maxSelectablePagesByCredit)}{" "}
                trang
              </p>
            </div>
          </div>
          <Button
            onClick={handleSubmitSelection}
            disabled={
              creditSummaryQuery.isLoading ||
              selectedCount === 0 ||
              selectedCount * CREDIT_PER_PAGE > totalCredits ||
              isSubmittingSelection
            }
          >
            {isSubmittingSelection ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                Bắt đầu Index
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {pagesFailed > 0 && (
          <div className="flex items-center gap-2 pt-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Có {pagesFailed} trang gặp lỗi discover.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
