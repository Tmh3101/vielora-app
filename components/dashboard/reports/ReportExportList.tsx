"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Share2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]);
  }
  return result;
}

export interface ReportExportItem {
  id: string;
  workspace_id: string;
  bot_id: string;
  template_id: string;
  status: "pending" | "rendering" | "awaiting_review" | "approved" | "issued" | "failed";
  language: string;
  scope?: {
    reportTitle?: string;
    [key: string]: unknown;
  };
  file_path?: string | null;
  error_message?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  downloadUrl?: string | null;
  report_templates?: {
    id?: string;
    key?: string;
    name?: string;
  };
  bots?: {
    id?: string;
    name?: string;
  };
}

export interface ReportExportListProps {
  workspaceId: string;
}

const LANGUAGE_MAP: Record<string, { label: string; flag: string }> = {
  vi: { label: "Tiếng Việt", flag: "🇻🇳" },
  en: { label: "English", flag: "🇬🇧" },
  ar: { label: "العربية", flag: "🇸🇦" },
};

export function ReportExportList({ workspaceId }: ReportExportListProps) {
  const t = useTranslations("dashboard.reports");
  const tCommon = useTranslations("dashboard.common");
  // Data states
  const [reports, setReports] = useState<ReportExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [botFilter, setBotFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageItems = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  // Modal states
  const [shareModalItem, setShareModalItem] = useState<ReportExportItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch reports list
  const fetchReports = useCallback(
    async (showRefreshingSpinner = false) => {
      if (!workspaceId) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (showRefreshingSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "20");

        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (botFilter && botFilter !== "all") {
          params.set("botId", botFilter);
        }

        const res = await fetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/reports?${params.toString()}`
        );

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || `Failed to load report list (${res.status})`);
        }

        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setReports(json.data);
          if (json.pagination) {
            setTotalPages(json.pagination.totalPages || 1);
            setTotalCount(json.pagination.total || json.data.length);
          }
        } else {
          setReports([]);
        }
      } catch (err: unknown) {
        console.error("[ReportExportList] fetchReports error:", err);
        setError(err instanceof Error ? err.message : "Failed to load report list");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [workspaceId, page, statusFilter, botFilter]
  );

  useEffect(() => {
    if (!workspaceId) {
      setIsLoading(false);
      return;
    }
    void fetchReports();
  }, [workspaceId, fetchReports]);

  // Unique bots list for dropdown filter
  const uniqueBots = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((r) => {
      if (r.bot_id) {
        const name = r.bots?.name || `Bot (${r.bot_id.slice(0, 6)})`;
        map.set(r.bot_id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [reports]);

  // Filtered by local search query (title, template, bot name)
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();

    return reports.filter((item) => {
      const title = (item.scope?.reportTitle || "").toLowerCase();
      const tplName = (item.report_templates?.name || "").toLowerCase();
      const tplKey = (item.report_templates?.key || "").toLowerCase();
      const botName = (item.bots?.name || "").toLowerCase();
      const id = item.id.toLowerCase();

      return (
        title.includes(q) ||
        tplName.includes(q) ||
        tplKey.includes(q) ||
        botName.includes(q) ||
        id.includes(q)
      );
    });
  }, [reports, searchQuery]);

  // Copy shareable download URL to clipboard
  const handleCopyLink = async (reportItem: ReportExportItem) => {
    if (!reportItem.downloadUrl) {
      toast.error(t("copyLinkError"));
      return;
    }

    try {
      const fullUrl = reportItem.downloadUrl.startsWith("http")
        ? reportItem.downloadUrl
        : `${window.location.origin}${reportItem.downloadUrl}`;

      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(reportItem.id);
      toast.success(t("copyLinkSuccess"));
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  };

  // Helper status badge renderer
  const renderStatusBadge = (status: ReportExportItem["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400"
          >
            <Clock className="mr-1 h-3 w-3" />
            {t("statusPending")}
          </Badge>
        );
      case "rendering":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {t("statusProcessing")}
          </Badge>
        );
      case "awaiting_review":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/15 text-xs font-semibold text-amber-700 dark:text-amber-300"
          >
            <Clock className="mr-1 h-3 w-3 text-amber-600 dark:text-amber-400" />
            {t("statusReview")}
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("statusCompleted")}
          </Badge>
        );
      case "issued":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {t("statusCompleted")}
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-xs font-medium text-destructive"
          >
            <XCircle className="mr-1 h-3 w-3" />
            {t("statusFailed")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Filters, Search, Tabs & Refresh */}
      <div className="flex flex-col gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-muted/60 p-1 sm:flex sm:h-9 sm:w-auto">
              <TabsTrigger value="all" className="rounded-lg px-3 text-xs">
                {tCommon("all")}
              </TabsTrigger>
              <TabsTrigger value="issued" className="rounded-lg px-3 text-xs">
                {t("statusCompleted")}
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg px-3 text-xs">
                {t("statusProcessing")}
              </TabsTrigger>
              <TabsTrigger value="failed" className="rounded-lg px-3 text-xs">
                {t("statusFailed")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchReports(true)}
            disabled={isLoading || isRefreshing}
            className="shadow-xs group h-9 gap-2 self-end rounded-xl border border-border/60 bg-background/80 px-3.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-sm active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 transition-transform duration-500 ease-in-out ${
                isRefreshing
                  ? "animate-spin text-primary"
                  : "group-hover:rotate-180 group-hover:text-primary"
              }`}
            />
            <span>{t("refresh")}</span>
          </Button>
        </div>

        {/* Search & Bot Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs focus-visible:ring-primary"
            />
          </div>

          {uniqueBots.length > 0 && (
            <Select
              value={botFilter}
              onValueChange={(val) => {
                setBotFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl border-border/60 bg-muted/30 text-xs sm:w-[220px]">
                <SelectValue placeholder={t("filterBotPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/60 shadow-lg">
                <SelectItem value="all" className="text-xs">
                  {t("allBots")} ({uniqueBots.length})
                </SelectItem>
                {uniqueBots.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      {isLoading ? (
        <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">{t("loadingList")}</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border border-destructive/30 bg-destructive/10 p-6 text-center shadow-md">
          <div className="flex flex-col items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <p className="text-sm font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchReports()}
              className="mt-2 text-xs"
            >
              {t("retry")}
            </Button>
          </div>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card className="border border-dashed border-border/60 bg-card/40 p-12 text-center shadow-sm">
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <FileDown className="h-6 w-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{t("noReports")}</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery || statusFilter !== "all" || botFilter !== "all"
                  ? t("noReportsFiltered")
                  : t("noReportsEmpty")}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/50 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">{t("colBot")}</th>
                    <th className="px-6 py-4">{t("colTemplate")}</th>
                    <th className="px-6 py-4">{t("colLanguage")}</th>
                    <th className="px-6 py-4">{t("colStatus")}</th>
                    <th className="px-6 py-4">{t("colRequestedAt")}</th>
                    <th className="px-6 py-4 text-right">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredReports.map((item) => {
                    const templateName = item.report_templates?.name || t("defaultReportName");
                    const botName = item.bots?.name || `Bot (${item.bot_id.slice(0, 8)})`;

                    // Extract languages from scope.languages, scope.files, or item.language
                    const scope = item.scope as Record<string, unknown> | undefined;
                    let targetLangs: string[] = [];
                    if (Array.isArray(scope?.languages) && scope.languages.length > 0) {
                      targetLangs = scope.languages as string[];
                    } else if (Array.isArray(scope?.files) && scope.files.length > 0) {
                      const extracted = (scope.files as Array<{ lang?: string }>)
                        .map((f) => f.lang)
                        .filter((l): l is string => Boolean(l));
                      if (extracted.length > 0) {
                        targetLangs = Array.from(new Set(extracted));
                      }
                    }
                    if (targetLangs.length === 0) {
                      targetLangs = item.language ? [item.language] : ["vi"];
                    }

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/20">
                        {/* Bot Column */}
                        <td className="px-6 py-4">
                          <span className="font-semibold text-foreground">{botName}</span>
                        </td>

                        {/* Template Column */}
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-foreground">
                            {templateName}
                          </span>
                        </td>

                        {/* Language Column (Flags only with tooltip) */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            {targetLangs.map((langCode) => {
                              const langInfo = LANGUAGE_MAP[langCode] || {
                                label: langCode.toUpperCase(),
                                flag: "🌐",
                              };
                              return (
                                <TooltipProvider key={langCode}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        className="cursor-default text-base transition-transform hover:scale-125"
                                        role="img"
                                        aria-label={langInfo.label}
                                      >
                                        {langInfo.flag}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {langInfo.label}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </td>

                        {/* Status Column (Badge only) */}
                        <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>

                        {/* Date Column */}
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">
                              {new Date(item.created_at).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[11px]">
                              {new Date(item.created_at).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </td>

                        {/* Actions Column (Icon-only buttons with Tooltips) */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Download & Share Actions (when downloadUrl is available) */}
                            {item.downloadUrl && (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShareModalItem(item)}
                                        className="h-8 w-8 rounded-xl border border-border/60 bg-transparent text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                                      >
                                        <Share2 className="h-4 w-4" />
                                        <span className="sr-only">{t("shareTooltip")}</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {t("shareTooltip")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        asChild
                                        size="icon"
                                        className="shadow-xs h-8 w-8 rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                                      >
                                        <a
                                          href={item.downloadUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download
                                        >
                                          <Download className="h-4 w-4" />
                                          <span className="sr-only">{t("downloadTooltip")}</span>
                                        </a>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {t("downloadTooltip")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}

                            {/* In-progress indicator for pending / rendering */}
                            {(item.status === "pending" || item.status === "rendering") &&
                              !item.downloadUrl && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {t("processingTooltip")}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                            {/* Failed Action with error tooltip */}
                            {item.status === "failed" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex h-8 w-8 cursor-help items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20">
                                      <AlertCircle className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    className="max-w-xs rounded-xl bg-destructive p-2.5 text-xs text-destructive-foreground shadow-lg"
                                  >
                                    <p className="font-semibold">{t("errorTitle")}</p>
                                    <p className="mt-0.5">
                                      {item.error_message || t("statusFailed")}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Pending / Rendering Progress */}
                            {(item.status === "pending" || item.status === "rendering") && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/40 text-primary">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {item.status === "rendering"
                                      ? t("renderingTooltip")
                                      : t("queueTooltip")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer (Inside Card) */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border/40 px-6 py-3.5 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  {t("pageInfo")} <span className="font-semibold text-foreground">{page}</span> /{" "}
                  <span className="font-semibold text-foreground">{totalPages}</span> ({t("of")}{" "}
                  <span className="font-semibold text-foreground">{totalCount}</span>{" "}
                  {t("totalReports")})
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page > 1) setPage(page - 1);
                    }}
                    disabled={page <= 1 || isLoading}
                    className="shadow-xs group h-8 gap-1 rounded-lg border-border/60 bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                    <span>{t("prevPage")}</span>
                  </Button>

                  {pageItems.map((p, index) =>
                    p === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <Button
                        key={p}
                        size="sm"
                        variant={p === page ? "default" : "outline"}
                        onClick={() => setPage(p)}
                        disabled={isLoading}
                        className={cn(
                          "shadow-xs h-8 w-8 rounded-lg p-0 text-xs font-medium transition-all",
                          p === page
                            ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
                            : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
                        )}
                      >
                        {p}
                      </Button>
                    )
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (page < totalPages) setPage(page + 1);
                    }}
                    disabled={page >= totalPages || isLoading}
                    className="shadow-xs group h-8 gap-1 rounded-lg border-border/60 bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span>{t("nextPage")}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share / Copy Download Link Modal */}
      {shareModalItem && (
        <Dialog
          open={Boolean(shareModalItem)}
          onOpenChange={(open) => {
            if (!open) setShareModalItem(null);
          }}
        >
          <DialogContent className="rounded-2xl border-border/80 bg-card p-6 shadow-xl sm:max-w-md">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Share2 className="h-4 w-4 text-primary" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {t("shareTitle")}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("shareDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5 rounded-xl border border-border/50 bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("shareReportTemplate")}</span>
                  <span className="font-semibold text-foreground">
                    {shareModalItem.report_templates?.name || t("defaultReportName")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("shareBot")}</span>
                  <span className="font-semibold text-foreground">
                    {shareModalItem.bots?.name || `Bot (${shareModalItem.bot_id.slice(0, 8)})`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("shareLinkExpiry")}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 dark:text-emerald-400"
                  >
                    7 ngày
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  {t("shareDirectLink")}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      shareModalItem.downloadUrl?.startsWith("http")
                        ? shareModalItem.downloadUrl
                        : `${typeof window !== "undefined" ? window.location.origin : ""}${shareModalItem.downloadUrl || ""}`
                    }
                    className="focus:outline-hidden h-9 min-w-[200px] flex-1 rounded-xl border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopyLink(shareModalItem)}
                      className="shadow-xs h-9 gap-1.5 rounded-xl border-border/60 bg-background px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                    >
                      {copiedId === shareModalItem.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shadow-xs h-9 gap-1.5 rounded-xl border-border/60 bg-background px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                    >
                      <a
                        href={
                          shareModalItem.downloadUrl?.startsWith("http")
                            ? shareModalItem.downloadUrl
                            : `${typeof window !== "undefined" ? window.location.origin : ""}${shareModalItem.downloadUrl || ""}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShareModalItem(null)}
                className="h-9 rounded-xl border-border/60 bg-background px-4 text-xs font-medium transition-all hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
              >
                {t("close")}
              </Button>
              {shareModalItem.downloadUrl && (
                <Button
                  asChild
                  size="sm"
                  className="shadow-xs h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-sm active:scale-95"
                >
                  <a
                    href={shareModalItem.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("downloadNow")}
                  </a>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
