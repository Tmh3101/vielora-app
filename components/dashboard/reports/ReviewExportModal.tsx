"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Bot,
  Calendar,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

export interface ReportExportDetail {
  id: string;
  workspace_id: string;
  bot_id: string;
  template_id: string;
  status: string;
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
  previewUrl?: string | null;
  report_templates?:
    | {
        id?: string;
        key?: string;
        name?: string;
      }
    | Array<{ id?: string; key?: string; name?: string }>;
  bots?:
    | {
        id?: string;
        name?: string;
      }
    | Array<{ id?: string; name?: string }>;
}

export interface ReviewExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  exportId: string | null;
  onSuccess?: () => void;
}

const LANGUAGE_FLAGS: Record<string, { label: string; flag: string }> = {
  vi: { label: "Tiếng Việt (VI)", flag: "🇻🇳" },
  en: { label: "English (EN)", flag: "🇬🇧" },
  ar: { label: "العربية (AR)", flag: "🇸🇦" },
};

export function ReviewExportModal({
  open,
  onOpenChange,
  workspaceId,
  exportId,
  onSuccess,
}: ReviewExportModalProps) {
  const t = useTranslations("dashboard.reports");
  const tCommon = useTranslations("dashboard.common");
  const [report, setReport] = useState<ReportExportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Review actions state
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<{
    type: "approved" | "rejected";
    downloadUrl?: string | null;
    message?: string;
  } | null>(null);

  // Load report detail
  const loadReportDetail = useCallback(async () => {
    if (!workspaceId || !exportId) return;

    setIsLoading(true);
    setFetchError(null);
    setShowRejectForm(false);
    setRejectionNotes("");
    setActionSuccess(null);

    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(exportId)}`
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `Không thể tải thông tin báo cáo (${res.status})`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || "Không thể tìm thấy báo cáo");
      }

      setReport(json.data);
    } catch (err: unknown) {
      console.error("[ReviewExportModal] loadReportDetail error:", err);
      setFetchError(err instanceof Error ? err.message : "Lỗi khi tải dữ liệu báo cáo");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, exportId]);

  useEffect(() => {
    if (open && exportId) {
      void loadReportDetail();
    } else {
      setReport(null);
      setFetchError(null);
      setShowRejectForm(false);
      setRejectionNotes("");
      setActionSuccess(null);
      setIsCopied(false);
    }
  }, [open, exportId, loadReportDetail]);

  // Handle Approve
  const handleApprove = async () => {
    if (!workspaceId || !exportId) return;

    setIsApproving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(exportId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Không thể phê duyệt báo cáo. Vui lòng thử lại.");
      }

      toast.success("Báo cáo đã được phê duyệt và phát hành thành công");
      setActionSuccess({
        type: "approved",
        downloadUrl: json.data?.downloadUrl || report?.downloadUrl,
        message: "Báo cáo đã được phê duyệt và chuyển sang trạng thái đã phát hành.",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("[ReviewExportModal] handleApprove error:", err);
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi phê duyệt báo cáo");
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!workspaceId || !exportId) return;

    const trimmedNotes = rejectionNotes.trim();
    if (!trimmedNotes) {
      toast.error("Vui lòng nhập lý do từ chối báo cáo");
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/reports/${encodeURIComponent(exportId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            notes: trimmedNotes,
          }),
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Không thể từ chối báo cáo. Vui lòng thử lại.");
      }

      toast.success("Đã từ chối báo cáo");
      setActionSuccess({
        type: "rejected",
        message: `Đã từ chối báo cáo. Lý do: "${trimmedNotes}"`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("[ReviewExportModal] handleReject error:", err);
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra khi từ chối báo cáo");
    } finally {
      setIsRejecting(false);
    }
  };

  const copyDownloadUrl = async (url: string) => {
    try {
      const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      toast.success("Đã sao chép liên kết tải báo cáo (Hiệu lực 7 ngày)");
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  // Helper getters
  const templateName = report?.report_templates
    ? Array.isArray(report.report_templates)
      ? report.report_templates[0]?.name || report.report_templates[0]?.key
      : report.report_templates.name || report.report_templates.key
    : "Báo cáo";

  const botName = report?.bots
    ? Array.isArray(report.bots)
      ? report.bots[0]?.name
      : report.bots.name
    : report?.bot_id
      ? `Bot (${report.bot_id.slice(0, 8)})`
      : "Bot";

  const languageInfo = LANGUAGE_FLAGS[report?.language || "vi"] || {
    label: (report?.language || "vi").toUpperCase(),
    flag: "🌐",
  };

  const reportTitle = report?.scope?.reportTitle || templateName;
  const isAwaitingReview = report?.status === "awaiting_review";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:max-w-3xl">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Phê Duyệt Báo Cáo PDF
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Xem trước bản PDF và quyết định phê duyệt hoặc từ chối phát hành.
                </DialogDescription>
              </div>
            </div>

            {report && (
              <Badge
                variant="outline"
                className={
                  report.status === "awaiting_review"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : report.status === "issued" || report.status === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : report.status === "failed"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-border bg-muted text-muted-foreground"
                }
              >
                {report.status === "awaiting_review" && <Clock className="mr-1 h-3 w-3" />}
                {report.status === "issued" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                {report.status === "failed" && <XCircle className="mr-1 h-3 w-3" />}
                <span className="capitalize">
                  {report.status === "awaiting_review"
                    ? "Chờ duyệt"
                    : report.status === "issued"
                      ? "Đã phát hành"
                      : report.status === "approved"
                        ? "Đã duyệt"
                        : report.status === "failed"
                          ? "Thất bại"
                          : report.status}
                </span>
              </Badge>
            )}
          </div>

          {/* Meta Information Bar */}
          {report && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs sm:grid-cols-4">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Mẫu:</span>
                <p className="truncate font-semibold text-foreground">{templateName}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Bot:</span>
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3 text-primary" />
                  <p className="truncate font-semibold text-foreground">{botName}</p>
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Ngôn ngữ:</span>
                <p className="font-semibold text-foreground">
                  {languageInfo.flag} {languageInfo.label}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground">Thời gian tạo:</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(report.created_at).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Modal Body */}
        {isLoading ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium text-foreground">Đang tải bản xem trước PDF...</p>
          </div>
        ) : fetchError ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Lỗi tải dữ liệu</AlertTitle>
            <AlertDescription className="text-xs">
              {fetchError}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadReportDetail()}
                className="mt-2 block text-xs"
              >
                Thử lại
              </Button>
            </AlertDescription>
          </Alert>
        ) : actionSuccess ? (
          <div className="space-y-4 py-4 text-center">
            {actionSuccess.type === "approved" ? (
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Phê duyệt thành công!</h4>
                  <p className="text-xs text-muted-foreground">{actionSuccess.message}</p>
                </div>

                {actionSuccess.downloadUrl && (
                  <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-left">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Share2 className="h-3.5 w-3.5 text-primary" />
                        Liên kết tải về chính thức
                      </span>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Hiệu lực 7 ngày
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          actionSuccess.downloadUrl.startsWith("http")
                            ? actionSuccess.downloadUrl
                            : `${typeof window !== "undefined" ? window.location.origin : ""}${actionSuccess.downloadUrl}`
                        }
                        className="focus:outline-hidden h-8 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-muted-foreground"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyDownloadUrl(actionSuccess.downloadUrl!)}
                        className="h-8 rounded-lg text-xs"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5">{isCopied ? "Đã chép" : "Sao chép"}</span>
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Bạn có thể gửi liên kết này qua Zalo, Email hoặc tin nhắn. Người nhận có thể
                      tải về file PDF mà không cần đăng nhập hệ thống.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-destructive">Đã từ chối báo cáo</h4>
                  <p className="text-xs text-muted-foreground">{actionSuccess.message}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF Preview Container */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Bản xem trước tài liệu:
                </span>
                {report?.previewUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 px-2 text-xs text-primary hover:text-primary/80"
                  >
                    <a href={report.previewUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Mở trong tab mới
                    </a>
                  </Button>
                )}
              </div>

              {report?.previewUrl ? (
                <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-inner">
                  <iframe
                    src={report.previewUrl}
                    className="h-full w-full rounded-2xl"
                    title={`Preview - ${reportTitle}`}
                  />
                </div>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  <FileText className="h-10 w-10 opacity-40" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Không thể hiển thị xem trước trực tiếp trên trình duyệt
                    </p>
                    <p>
                      Bản PDF đã được lưu trữ an toàn trong kho bảo mật. Nhấn nút bên dưới để mở
                      file xem chi tiết.
                    </p>
                  </div>
                  {report?.downloadUrl && (
                    <Button asChild size="sm" variant="outline" className="mt-2 rounded-xl text-xs">
                      <a
                        href={report.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        {t("download")}
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Rejection Form Drawer */}
            {showRejectForm && (
              <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 transition-all">
                <Label htmlFor="rejection-notes" className="text-xs font-semibold text-destructive">
                  Lý do từ chối <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejection-notes"
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Nhập lý do từ chối hoặc các điểm cần chỉnh sửa để người yêu cầu nắm thông tin..."
                  className="rounded-xl border-destructive/30 bg-background text-xs focus-visible:ring-destructive"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {rejectionNotes.length}/500 ký tự
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectForm(false)}
                      disabled={isRejecting}
                      className="rounded-xl text-xs"
                    >
                      Quay lại
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={isRejecting || !rejectionNotes.trim()}
                      className="rounded-xl text-xs font-semibold"
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Đang từ chối...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Xác nhận từ chối
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="border-t border-border/50 pt-3">
          {actionSuccess ? (
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold"
            >
              {tCommon("close")}
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isApproving || isRejecting}
                className="rounded-xl text-xs"
              >
                {tCommon("close")}
              </Button>

              {isAwaitingReview && !showRejectForm && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isApproving || isRejecting}
                    className="hover:shadow-xs rounded-xl border border-destructive/40 text-xs font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-95"
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Từ chối
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="hover:shadow-xs rounded-xl bg-emerald-600 text-xs font-semibold text-white transition-all hover:bg-emerald-700 active:scale-95"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        {tCommon("loading")}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Phê duyệt & Phát hành
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
