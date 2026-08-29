"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VoiceInputButton } from "@/components/dashboard/shared/VoiceInputButton";
import { CREDIT_PER_REPORT } from "@/config/credit";
import {
  MAX_REPORT_TITLE_LENGTH,
  MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH,
  REPORT_POLLING_INTERVAL_MS,
  REPORT_INITIAL_POLL_DELAY_MS,
  PLAN_UPGRADE_REQUIRED,
  DEFAULT_REPORT_TEMPLATE_KEY,
  EReportExportStatus,
  EExportErrorCode,
} from "@/config/report";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface ReportTemplateItem {
  id: string;
  workspace_id: string;
  key: string;
  name: string;
  version: number;
  schema: Record<string, unknown>;
  languages: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceBrandingData {
  workspace_id: string;
  brand_name?: string | null;
  default_language?: string;
  supported_languages?: string[];
}

export interface InProgressExportItem {
  id: string;
  status: EReportExportStatus | string;
  template_id?: string;
  created_at: string;
}

export interface ExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string;
  workspaceId?: string;
  groupId?: string;
  requestedByDisplayName?: string | null;
}

const LANGUAGE_LABELS: Record<string, { label: string; flag: string; name: string }> = {
  vi: { label: "Tiếng Việt (VI)", flag: "🇻🇳", name: "Tiếng Việt" },
  en: { label: "English (EN)", flag: "🇬🇧", name: "English" },
  ar: { label: "العربية (AR)", flag: "🇸🇦", name: "العربية" },
};

const PROMPT_SUGGESTIONS = [
  "Tập trung phân tích các giải pháp kỹ thuật & năng lực AI",
  "Trình bày theo văn phong báo cáo chuyên gia cao cấp",
  "Tóm tắt các chỉ số hiệu suất và thế mạnh nổi bật",
  "Nhấn mạnh vào khả năng ứng dụng thực tế và dự án tiêu biểu",
];

export function ExportReportModal({
  open,
  onOpenChange,
  botId,
  workspaceId,
  groupId,
  requestedByDisplayName,
}: ExportReportModalProps) {
  // 4-step wizard: 1. Chọn mẫu -> 2. Tùy chỉnh & AI -> 3. Xác nhận -> 4. Trạng thái
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const { activeWorkspace } = useWorkspace();
  const [internalWsId, setInternalWsId] = useState<string>(
    workspaceId || activeWorkspace?.id || ""
  );

  useEffect(() => {
    if (workspaceId) {
      setInternalWsId(workspaceId);
      return;
    }
    if (activeWorkspace?.id) {
      setInternalWsId(activeWorkspace.id);
      return;
    }
    async function resolveBotWs() {
      if (!botId) return;
      try {
        // 1. Try group endpoint first (accessible to group members and bot managers)
        const groupRes = await fetch(`/api/bots/${encodeURIComponent(botId)}/group`);
        if (groupRes.ok) {
          const groupJson = await groupRes.json();
          if (groupJson.success && groupJson.data?.bot?.workspace_id) {
            setInternalWsId(groupJson.data.bot.workspace_id);
            return;
          }
        }
        // 2. Fallback to bot endpoint (accessible to workspace members/owners)
        const botRes = await fetch(`/api/bots/${encodeURIComponent(botId)}`);
        if (botRes.ok) {
          const botJson = await botRes.json();
          if (botJson.success && botJson.data?.workspace_id) {
            setInternalWsId(botJson.data.workspace_id);
            return;
          }
        }
      } catch (err) {
        console.error("[ExportReportModal] resolveBotWs error:", err);
      }
    }
    void resolveBotWs();
  }, [workspaceId, botId, activeWorkspace?.id]);

  const effectiveWorkspaceId = workspaceId || internalWsId || activeWorkspace?.id || "";

  // Data fetching states
  const [templates, setTemplates] = useState<ReportTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [inProgressExports, setInProgressExports] = useState<InProgressExportItem[]>([]);

  // Selection states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("vi");
  const [reportTitle, setReportTitle] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  // Export submission states
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportErrorCode, setExportErrorCode] = useState<EExportErrorCode | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);

  // Polling states
  const [exportStatus, setExportStatus] = useState<EReportExportStatus | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [zipDownloadUrl, setZipDownloadUrl] = useState<string | null>(null);
  const [exportFiles, setExportFiles] = useState<
    Array<{ lang: string; filename: string; downloadUrl: string }>
  >([]);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputId = useId();

  // Clean polling timer
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Fetch templates, in-progress exports, and workspace branding
  const loadInitialData = useCallback(async () => {
    if (!botId) return;

    setLoadingTemplates(true);
    setTemplatesError(null);

    let targetWsId = effectiveWorkspaceId;
    if (!targetWsId) {
      try {
        const groupRes = await fetch(`/api/bots/${encodeURIComponent(botId)}/group`);
        if (groupRes.ok) {
          const groupJson = await groupRes.json();
          if (groupJson.success && groupJson.data?.bot?.workspace_id) {
            targetWsId = groupJson.data.bot.workspace_id;
            setInternalWsId(targetWsId);
          }
        }
      } catch {
        // Fall through to error below
      }
    }

    if (!targetWsId) {
      setLoadingTemplates(false);
      setTemplatesError("Không tìm thấy thông tin không gian làm việc của bot này.");
      return;
    }

    try {
      // 1. Fetch in-progress exports for this bot
      const reportsPromise = fetch(
        `/api/workspaces/${encodeURIComponent(targetWsId)}/reports?botId=${encodeURIComponent(botId)}`
      )
        .then((res) => (res.ok ? res.json() : { success: false, data: [] }))
        .catch(() => ({ success: false, data: [] }));

      // 2. Fetch templates
      const templatesPromise = fetch(
        `/api/workspaces/${encodeURIComponent(targetWsId)}/bots/${encodeURIComponent(botId)}/templates`
      )
        .then((res) => (res.ok ? res.json() : { success: false, message: "Lỗi tải mẫu báo cáo" }))
        .catch((err) => ({ success: false, message: err.message || "Lỗi tải mẫu báo cáo" }));

      const [reportsRes, templatesRes] = await Promise.all([reportsPromise, templatesPromise]);

      // Handle in-progress exports check
      if (reportsRes.success && Array.isArray(reportsRes.data)) {
        const pendingOrRendering = reportsRes.data.filter(
          (r: InProgressExportItem) =>
            r.status === EReportExportStatus.Pending || r.status === EReportExportStatus.Rendering
        );
        setInProgressExports(pendingOrRendering);
      }

      // Handle templates
      if (templatesRes.success && Array.isArray(templatesRes.data)) {
        setTemplates(templatesRes.data);
        if (templatesRes.data.length > 0) {
          const firstTpl = templatesRes.data[0];
          setSelectedTemplateId(firstTpl.id);
          setSelectedTemplateKey(firstTpl.key);

          // Determine initial language directly from template
          const firstTplLangs = firstTpl.languages || ["vi"];
          setSelectedLanguage(firstTplLangs[0] || "vi");
        }
      } else {
        setTemplates([]);
        setTemplatesError(templatesRes.message || "Không thể tải danh sách mẫu báo cáo.");
      }
    } catch (err) {
      console.error("[ExportReportModal] loadInitialData error:", err);
      setTemplatesError("Không thể kết nối đến máy chủ.");
    } finally {
      setLoadingTemplates(false);
    }
  }, [effectiveWorkspaceId, botId]);

  // Reset state when opening modal
  useEffect(() => {
    if (open) {
      setStep(1);
      setReportTitle("");
      setCustomInstructions("");
      setExportError(null);
      setExportErrorCode(null);
      setExportId(null);
      setExportStatus(null);
      setDownloadUrl(null);
      setZipDownloadUrl(null);
      setExportFiles([]);
      setStatusErrorMessage(null);
      void loadInitialData();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [open, loadInitialData, stopPolling]);

  // Calculate selected template and effective languages from template config
  const selectedTemplate = useMemo(
    () =>
      templates.find((t) => t.id === selectedTemplateId) ||
      templates.find((t) => t.key === selectedTemplateKey) ||
      templates[0] ||
      null,
    [templates, selectedTemplateId, selectedTemplateKey]
  );

  const effectiveLanguages = useMemo(() => {
    if (Array.isArray(selectedTemplate?.languages) && selectedTemplate.languages.length > 0) {
      return selectedTemplate.languages;
    }
    return ["vi"];
  }, [selectedTemplate]);

  const fileCount = effectiveLanguages.length || 1;
  const dynamicCreditCost = fileCount * CREDIT_PER_REPORT;

  // Update selected language fallback when template changes
  useEffect(() => {
    if (effectiveLanguages.length > 0 && !effectiveLanguages.includes(selectedLanguage)) {
      setSelectedLanguage(effectiveLanguages[0]);
    }
  }, [effectiveLanguages, selectedLanguage]);

  // Handle append quick prompt suggestion
  const handleAddSuggestion = (suggestion: string) => {
    setCustomInstructions((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return suggestion;
      if (trimmed.includes(suggestion)) return trimmed;
      return `${trimmed}\n- ${suggestion}`;
    });
  };

  // Handle Export Trigger (POST)
  const handleTriggerExport = async () => {
    if (!effectiveWorkspaceId || !botId || (!selectedTemplateId && !selectedTemplateKey)) return;

    setIsExporting(true);
    setExportError(null);
    setExportErrorCode(null);

    try {
      const payload = {
        templateId: selectedTemplate?.id || selectedTemplateId || undefined,
        templateKey: selectedTemplate?.key || selectedTemplateKey || DEFAULT_REPORT_TEMPLATE_KEY,
        scope: {
          reportTitle: reportTitle.trim() || undefined,
          languages: effectiveLanguages,
          customInstructions: customInstructions.trim() || undefined,
          groupId: groupId || undefined,
          requestedByDisplayName: requestedByDisplayName || undefined,
        },
        language: selectedLanguage || effectiveLanguages[0] || "vi",
      };

      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/bots/${encodeURIComponent(botId)}/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json().catch(() => null);

      if (res.status === 403) {
        const isPlanError = json?.code === PLAN_UPGRADE_REQUIRED;
        setExportErrorCode(
          isPlanError ? EExportErrorCode.PlanUpgradeRequired : EExportErrorCode.Forbidden
        );
        setExportError(
          json?.message ||
            "Tính năng xuất báo cáo chỉ khả dụng cho gói Pro và Enterprise. Vui lòng nâng cấp gói để sử dụng."
        );
        return;
      }

      if (res.status === 402) {
        setExportErrorCode(EExportErrorCode.InsufficientCredits);
        setExportError(
          json?.message ||
            `Không đủ credits trong workspace (Yêu cầu: ${dynamicCreditCost} credits cho ${fileCount} file). Vui lòng nạp thêm credits hoặc nâng cấp gói.`
        );
        return;
      }

      if (res.status === 429) {
        setExportErrorCode(EExportErrorCode.RateLimit);
        setExportError(
          json?.message ||
            "Bạn đang yêu cầu xuất báo cáo quá nhanh. Vui lòng đợi trong giây lát rồi thử lại."
        );
        return;
      }

      if (!res.ok || !json?.success) {
        setExportError(json?.message || `Lỗi xuất báo cáo (${res.status}). Vui lòng thử lại.`);
        return;
      }

      // Success: status 202 Accepted with exportId -> Advance to step 4
      const newExportId = json.exportId;
      setExportId(newExportId);
      setExportStatus(EReportExportStatus.Pending);
      setStep(4);
    } catch (err) {
      console.error("[ExportReportModal] Trigger export error:", err);
      setExportError("Đã xảy ra lỗi kết nối mạng. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  // Status Polling Effect for Step 4
  useEffect(() => {
    if (step !== 4 || !exportId || !effectiveWorkspaceId) return;

    let isSubscribed = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${encodeURIComponent(effectiveWorkspaceId)}/reports/${encodeURIComponent(exportId)}`
        );
        if (!res.ok) {
          if (isSubscribed) {
            pollingRef.current = setTimeout(pollStatus, REPORT_POLLING_INTERVAL_MS);
          }
          return;
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          if (isSubscribed) {
            pollingRef.current = setTimeout(pollStatus, REPORT_POLLING_INTERVAL_MS);
          }
          return;
        }

        const data = json.data;
        if (!isSubscribed) return;

        setExportStatus(data.status);
        if (data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
        }
        if (data.zipDownloadUrl) {
          setZipDownloadUrl(data.zipDownloadUrl);
        }
        if (Array.isArray(data.files)) {
          setExportFiles(data.files);
        }
        if (data.error_message) {
          setStatusErrorMessage(data.error_message);
        }

        // Continue polling only if pending or rendering
        if (
          data.status === EReportExportStatus.Pending ||
          data.status === EReportExportStatus.Rendering
        ) {
          pollingRef.current = setTimeout(pollStatus, REPORT_POLLING_INTERVAL_MS);
        }
      } catch (err) {
        console.error("[ExportReportModal] Status polling error:", err);
        if (isSubscribed) {
          pollingRef.current = setTimeout(pollStatus, REPORT_POLLING_INTERVAL_MS);
        }
      }
    };

    // Initial poll after delay, then fixed intervals
    pollingRef.current = setTimeout(pollStatus, REPORT_INITIAL_POLL_DELAY_MS);

    return () => {
      isSubscribed = false;
      stopPolling();
    };
  }, [step, exportId, effectiveWorkspaceId, stopPolling]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[85vh] sm:w-full">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/50 bg-muted/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <FileDown className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground sm:text-lg">
              Xuất Báo Cáo Bot
            </DialogTitle>
          </div>

          {/* Stepper Progress Indicator (4 steps) */}
          <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-xs">
            <div
              className={`flex items-center gap-1 sm:gap-1.5 ${
                step >= 1 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step > 1
                    ? "bg-primary text-primary-foreground"
                    : "border border-primary bg-primary/10 text-primary"
                }`}
              >
                1
              </span>
              <span className="hidden sm:inline">Chọn mẫu</span>
            </div>
            <div className="h-0.5 w-3 bg-border/60 sm:w-6" />
            <div
              className={`flex items-center gap-1 sm:gap-1.5 ${
                step >= 2 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step > 2
                    ? "bg-primary text-primary-foreground"
                    : step === 2
                      ? "border border-primary bg-primary/10 text-primary"
                      : "border border-border bg-muted text-muted-foreground"
                }`}
              >
                2
              </span>
              <span className="hidden sm:inline">Tùy chỉnh</span>
            </div>
            <div className="h-0.5 w-3 bg-border/60 sm:w-6" />
            <div
              className={`flex items-center gap-1 sm:gap-1.5 ${
                step >= 3 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step > 3
                    ? "bg-primary text-primary-foreground"
                    : step === 3
                      ? "border border-primary bg-primary/10 text-primary"
                      : "border border-border bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
              <span className="hidden sm:inline">Xác nhận</span>
            </div>
            <div className="h-0.5 w-3 bg-border/60 sm:w-6" />
            <div
              className={`flex items-center gap-1 sm:gap-1.5 ${
                step === 4 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  step === 4
                    ? "border border-primary bg-primary/10 text-primary"
                    : "border border-border bg-muted text-muted-foreground"
                }`}
              >
                4
              </span>
              <span className="hidden sm:inline">Trạng thái</span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          {/* Warning Banner: Export already in progress */}
          {inProgressExports.length > 0 && step !== 4 && (
            <Alert className="mb-3 rounded-xl border-amber-500/30 bg-amber-500/10 py-2.5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold">
                Đang có yêu cầu xuất báo cáo
              </AlertTitle>
              <AlertDescription className="text-xs">
                Bot này đang có {inProgressExports.length} yêu cầu báo cáo đang được xử lý trong
                hàng đợi. Bạn vẫn có thể tiếp tục tạo yêu cầu mới nếu cần.
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Select Template */}
          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chọn mẫu báo cáo phù hợp
                </h4>
              </div>

              {loadingTemplates ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Đang tải danh sách mẫu báo cáo...</span>
                </div>
              ) : templatesError ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Lỗi tải mẫu báo cáo</AlertTitle>
                  <AlertDescription className="text-xs">
                    {templatesError}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadInitialData()}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border-destructive/30 bg-destructive/10 text-xs font-medium text-destructive transition-all hover:border-destructive/60 hover:bg-destructive/20 active:scale-[0.98]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Thử lại
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="font-semibold text-foreground">Không có mẫu báo cáo nào khả dụng</p>
                  <p className="mt-1">
                    Workspace này hiện chưa được cấu hình mẫu báo cáo nào hoặc các mẫu đã bị vô hiệu
                    hóa.
                  </p>
                </div>
              ) : (
                <RadioGroup
                  value={selectedTemplateId || selectedTemplate?.id || ""}
                  onValueChange={(val) => {
                    setSelectedTemplateId(val);
                    const target = templates.find((t) => t.id === val);
                    if (target) {
                      setSelectedTemplateKey(target.key);
                    }
                  }}
                  className="space-y-2"
                >
                  {templates.map((tpl) => {
                    const isSelected = (selectedTemplateId || selectedTemplate?.id) === tpl.id;

                    return (
                      <label
                        key={tpl.id}
                        htmlFor={`tpl-${tpl.id}`}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "shadow-xs border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                            : "border-border/50 bg-card/60 hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={tpl.id}
                            id={`tpl-${tpl.id}`}
                            className="shrink-0"
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(tpl.languages || ["vi"]).map((lang) => {
                                const meta = LANGUAGE_LABELS[lang] || {
                                  label: lang.toUpperCase(),
                                  flag: "🌐",
                                  name: lang.toUpperCase(),
                                };
                                return (
                                  <span
                                    key={lang}
                                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-foreground/85"
                                  >
                                    <span className="select-none text-xs">{meta.flag}</span>
                                    <span>{meta.name}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              )}
            </div>
          )}

          {/* Step 2: Configure Report Title & Custom AI Directive (with Voice Input) */}
          {step === 2 && (
            <div className="space-y-4 py-2">
              {/* Selected Template Mini-Summary */}
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedTemplate?.name || "Mẫu báo cáo"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {effectiveLanguages.map((lang) => {
                        const meta = LANGUAGE_LABELS[lang] || {
                          name: lang.toUpperCase(),
                          flag: "🌐",
                        };
                        return (
                          <span key={lang} className="text-xs" title={meta.name}>
                            {meta.flag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={titleInputId} className="text-xs font-semibold text-foreground">
                    Tiêu đề báo cáo{" "}
                    <span className="font-normal text-muted-foreground">(Tùy chọn)</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {reportTitle.length}/{MAX_REPORT_TITLE_LENGTH}
                  </span>
                </div>
                <Input
                  id={titleInputId}
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={`Ví dụ: ${selectedTemplate?.name || "Báo cáo tổng kết"} - ${new Date().toLocaleDateString("vi-VN")}`}
                  className="shadow-xs h-9 rounded-xl bg-background text-xs transition-all focus-visible:ring-primary"
                  maxLength={MAX_REPORT_TITLE_LENGTH}
                />
                <p className="text-[11px] text-muted-foreground">
                  Để trống nếu muốn sử dụng tiêu đề của mẫu báo cáo.
                </p>
              </div>

              {/* Custom Prompt Directive & Voice Input */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="custom-instructions"
                    className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Yêu cầu phân tích
                    <span className="font-normal text-muted-foreground">(Tùy chọn)</span>
                  </Label>
                  <VoiceInputButton
                    scope="bot"
                    targetId={botId}
                    disabled={isExporting}
                    isPaidPlan={true}
                    onTranscript={(text, suggestedTitle) => {
                      setCustomInstructions((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed}\n${text}` : text;
                      });
                      if (suggestedTitle && !reportTitle.trim()) {
                        setReportTitle(suggestedTitle);
                      }
                    }}
                  />
                </div>

                <Textarea
                  id="custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Nhập yêu cầu để định hướng phân tích cho AI"
                  rows={4}
                  className="shadow-xs resize-none rounded-xl bg-background text-xs leading-relaxed transition-all focus-visible:ring-primary"
                  maxLength={MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH}
                />

                <div className="flex justify-end text-[10.5px] text-muted-foreground">
                  <span>
                    {customInstructions.length}/{MAX_REPORT_CUSTOM_INSTRUCTIONS_LENGTH}
                  </span>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Gợi ý nhanh:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddSuggestion(suggestion)}
                        className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Summary & Trigger */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">Mẫu báo cáo:</span>
                  <span className="text-xs font-semibold text-foreground">
                    {selectedTemplate?.name || selectedTemplateKey}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">Ngôn ngữ xuất:</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-right">
                    {effectiveLanguages.map((lang) => {
                      const meta = LANGUAGE_LABELS[lang] || {
                        name: lang.toUpperCase(),
                        flag: "🌐",
                      };
                      return (
                        <span
                          key={lang}
                          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground"
                        >
                          <span className="text-xs">{meta.flag}</span>
                          <span>{meta.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-xs text-muted-foreground">Tiêu đề:</span>
                  <span className="max-w-[240px] truncate text-right text-xs font-semibold text-foreground">
                    {reportTitle.trim() || "(Tiêu đề mặc định)"}
                  </span>
                </div>
                {customInstructions.trim() && (
                  <div className="flex items-start justify-between border-b border-border/40 pb-2">
                    <span className="text-xs text-muted-foreground">Yêu cầu riêng:</span>
                    <span className="max-w-[240px] text-right text-xs font-medium italic text-foreground">
                      &ldquo;{customInstructions.trim()}&rdquo;
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Chi phí xuất ({fileCount} file PDF):
                  </span>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-xs font-bold text-primary"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {dynamicCreditCost} Credits
                  </Badge>
                </div>
              </div>

              {/* Error alerts */}
              {exportError && (
                <Alert
                  variant={
                    exportErrorCode === EExportErrorCode.InsufficientCredits
                      ? "default"
                      : "destructive"
                  }
                  className={`rounded-xl ${
                    exportErrorCode === EExportErrorCode.InsufficientCredits
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                      : ""
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">
                    {exportErrorCode === EExportErrorCode.InsufficientCredits
                      ? "Không đủ Credits"
                      : exportErrorCode === EExportErrorCode.RateLimit
                        ? "Giới hạn yêu cầu"
                        : "Không thể tạo báo cáo"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">{exportError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Status Polling & Result */}
          {step === 4 && (
            <div className="space-y-6 pb-2 pt-6 text-center">
              {exportStatus === EReportExportStatus.Pending && (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-7 w-7 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">Đang chờ xử lý...</h4>
                    <p className="text-xs text-muted-foreground">
                      Yêu cầu xuất báo cáo đang được tiếp nhận và xử lý.
                    </p>
                  </div>
                </div>
              )}

              {exportStatus === EReportExportStatus.Rendering && (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <RefreshCw className="h-7 w-7 animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">
                      Đang tổng hợp dữ liệu...
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      AI đang trích xuất, phân tích dữ liệu và tạo báo cáo theo mẫu.
                    </p>
                  </div>
                </div>
              )}

              {exportStatus === EReportExportStatus.AwaitingReview && (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">Báo cáo đã tạo xong</h4>
                    <p className="text-xs text-muted-foreground">
                      Báo cáo đang chờ quản trị viên phê duyệt trước khi phát hành chính thức.
                    </p>
                  </div>
                </div>
              )}

              {(exportStatus === EReportExportStatus.Approved ||
                exportStatus === EReportExportStatus.Issued) && (
                <div className="space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">
                      Xuất báo cáo thành công!
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Báo cáo đã sẵn sàng để tải về theo từng ngôn ngữ hoặc toàn bộ gói nén.
                    </p>
                  </div>

                  {/* Per-language file list */}
                  {exportFiles.length > 0 ? (
                    <div className="space-y-2.5 pt-2 text-left">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Danh sách file báo cáo ({exportFiles.length})
                        </p>
                        {zipDownloadUrl && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="shadow-2xs h-7 gap-1.5 rounded-lg border-primary/30 bg-primary/5 px-2.5 text-[11px] font-medium text-primary transition-all hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
                          >
                            <a
                              href={zipDownloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Tải tất cả (.zip)
                            </a>
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {exportFiles.map((file) => {
                          const meta = LANGUAGE_LABELS[file.lang] || {
                            name: file.lang.toUpperCase(),
                          };
                          return (
                            <div
                              key={file.lang}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all hover:border-border hover:bg-muted/40"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                                  <FileText className="h-4.5 w-4.5" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="truncate text-xs font-semibold text-foreground">
                                    {meta.name}
                                  </p>
                                  <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                                    {file.filename}
                                  </p>
                                </div>
                              </div>
                              <Button
                                asChild
                                size="icon"
                                variant="outline"
                                className="shadow-2xs group h-8 w-8 shrink-0 rounded-xl border-border/70 bg-background transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-90"
                                title={`Tải file PDF (${meta.name})`}
                              >
                                <a
                                  href={file.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={file.filename}
                                >
                                  <Download className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                                  <span className="sr-only">Tải PDF</span>
                                </a>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : downloadUrl ? (
                    <div className="pt-1">
                      <Button asChild className="shadow-xs rounded-xl">
                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-4 w-4" />
                          Tải báo cáo
                        </a>
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              {exportStatus === EReportExportStatus.Failed && (
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-destructive">Xuất báo cáo thất bại</h4>
                    <p className="text-xs text-muted-foreground">
                      {statusErrorMessage || "Đã xảy ra lỗi trong quá trình render báo cáo."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setExportStatus(null);
                      setExportError(null);
                      setStatusErrorMessage(null);
                      setStep(3);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border-border/80 bg-muted/20 px-4 py-2 text-xs font-medium text-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Thử lại
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="flex shrink-0 flex-row items-center justify-end gap-2 border-t border-border/50 bg-muted/10 px-4 py-3 sm:px-6 sm:py-3.5">
          {step === 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!selectedTemplateKey || templates.length === 0}
                className="shadow-xs rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                Tiếp tục
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="rounded-xl border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                className="shadow-xs rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                Tiếp tục
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                disabled={isExporting}
                className="rounded-xl border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.98]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại
              </Button>
              <Button
                size="sm"
                onClick={() => void handleTriggerExport()}
                disabled={isExporting || !selectedTemplateKey}
                className="shadow-xs rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    Xác nhận xuất
                  </>
                )}
              </Button>
            </>
          )}

          {step === 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-xl border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.98] sm:w-auto"
            >
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
