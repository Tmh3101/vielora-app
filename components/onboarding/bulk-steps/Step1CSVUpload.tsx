"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { parseCSVString, validateBulkRows } from "@/lib/services/bulk-bot-validation";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { BULK_IMPORT_MAX_FILE_SIZE } from "@/lib/constants/bulk-import";

import { Loader2 } from "lucide-react";

interface Step1CSVUploadProps {
  workspaceId?: string | null;
}

export function Step1CSVUpload({ workspaceId }: Step1CSVUploadProps) {
  const t = useTranslations("onboarding.bulkSteps.step1");
  const router = useRouter();
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  const bulkValidatedRows = useOnboardingStore((state) => state.bulkValidatedRows);
  const setBulkRawRows = useOnboardingStore((state) => state.setBulkRawRows);
  const setBulkValidatedRows = useOnboardingStore((state) => state.setBulkValidatedRows);
  const setBulkDryRunResult = useOnboardingStore((state) => state.setBulkDryRunResult);
  const setBulkStep = useOnboardingStore((state) => state.setBulkStep);

  const handleFileUpload = (file: File) => {
    setFileError(null);

    if (!file.name.endsWith(".csv")) {
      setFileError(t("errorFormat"));
      return;
    }

    if (file.size > BULK_IMPORT_MAX_FILE_SIZE) {
      setFileError(t("errorSize"));
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setFileError(t("errorEmpty"));
        return;
      }

      const parsedRows = parseCSVString(text);
      if (parsedRows.length === 0) {
        setFileError(t("errorMissingRows"));
        return;
      }

      const validated = validateBulkRows(parsedRows);
      setBulkRawRows(parsedRows);
      setBulkValidatedRows(validated);

      // Perform DB slug uniqueness dry-run check immediately
      if (workspaceId && parsedRows.length > 0) {
        setIsCheckingDb(true);
        fetch("/api/bots/bulk-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            mode: "dry-run",
            rawRows: parsedRows,
          }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data?.rows) {
              setBulkValidatedRows(json.data.rows);
              setBulkDryRunResult(json.data);
            }
          })
          .catch((err) => {
            console.error("DB slug check error at Step 1:", err);
          })
          .finally(() => {
            setIsCheckingDb(false);
          });
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  const validCount = bulkValidatedRows.filter((r) => r.isValid).length;
  const invalidCount = bulkValidatedRows.length - validCount;

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* CSV Spec Guidelines */}
        <div className="space-y-3 rounded-xl border border-primary/20 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">{t("requiredFormat")}</h3>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-primary/30 text-xs font-medium text-primary shadow-sm transition-all duration-200 hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <a
                href="/templates/bulk-bot-import-template.csv"
                download="bulk-bot-import-template.csv"
              >
                <Download className="h-3.5 w-3.5" />
                {t("templateBtn")}
              </a>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-5">
            <div className="rounded-lg border bg-background p-2">
              <span className="font-mono text-[11px] font-bold text-foreground">
                name<span className="font-normal text-destructive">*</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t("colName")}</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <span className="font-mono text-[11px] font-bold text-foreground">
                slug<span className="font-normal text-destructive">*</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t("colSlug")}</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <span className="font-mono text-[11px] font-bold text-foreground">avatar_url</span>
              <p className="text-[10px] text-muted-foreground">{t("colAvatar")}</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <span className="font-mono text-[11px] font-bold text-foreground">
                knowledge_title<span className="font-normal text-destructive">*</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t("colKnowledgeTitle")}</p>
            </div>
            <div className="rounded-lg border bg-background p-2">
              <span className="font-mono text-[11px] font-bold text-foreground">
                knowledge_content<span className="font-normal text-destructive">*</span>
              </span>
              <p className="text-[10px] text-muted-foreground">{t("colKnowledgeContent")}</p>
            </div>
          </div>
        </div>

        {/* Drop Zone */}
        <div className="relative rounded-2xl border-2 border-dashed border-primary/30 bg-muted/10 p-8 text-center transition-colors hover:border-primary/60">
          <input
            type="file"
            accept=".csv"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {t("dragDropText")} <span className="text-primary">{t("clickToSelect")}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("maxFileSize")}</p>
            </div>
            {fileName && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {fileName}
              </span>
            )}
          </div>
        </div>

        {fileError && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {/* Validation Table Summary */}
        {bulkValidatedRows.length > 0 && (
          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{t("checkResults")}</span>
                {isCheckingDb && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("checkingDb")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("validCount", { count: validCount })}
                </span>
                {invalidCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-medium text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t("errorCount", { count: invalidCount })}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto rounded-lg border text-xs">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-muted px-2 py-1 font-medium">
                  <tr>
                    <th className="p-2">{t("colIndex")}</th>
                    <th className="p-2">{t("colBotName")}</th>
                    <th className="p-2">{t("colSlug")}</th>
                    <th className="p-2">{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bulkValidatedRows.map((row, idx) => (
                    <tr key={idx} className={row.isValid ? "" : "bg-destructive/5"}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-medium">{row.name || "—"}</td>
                      <td className="p-2 font-mono text-muted-foreground">{row.slug || "—"}</td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="font-medium text-emerald-600">{t("statusValid")}</span>
                        ) : (
                          <span className="font-medium text-destructive">{row.errorReason}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="hover:border-primary hover:bg-white hover:text-primary sm:min-w-[160px]"
          >
            {t("backToDashboard")}
          </Button>
          <Button
            disabled={validCount === 0 || isCheckingDb}
            onClick={() => setBulkStep(2)}
            className="sm:min-w-[160px]"
          >
            {isCheckingDb ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("checking")}
              </>
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
