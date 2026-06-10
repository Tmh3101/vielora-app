"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Loader2, Upload } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { addOnboardingKnowledgeFile } from "@/lib/services/bot.service";
import { getCreditSummary } from "@/lib/services/credit.service";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeFileDropzone } from "@/components/shared/KnowledgeFileDropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT_PER_PAGE } from "@/config";
import { ONBOARDING_CREDIT_SUMMARY_KEY } from "@/lib/constants/react-query-key";

export interface Step2UploadFilesProps {
  botId: string;
  onNext: () => void;
}

type UploadStatus = "pending" | "uploading" | "done" | "failed";

interface FileUploadState {
  status: UploadStatus;
  error?: string;
}

export function Step2UploadFiles({ botId, onNext }: Step2UploadFilesProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<Record<string, FileUploadState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const creditSummaryQuery = useQuery({
    queryKey: [ONBOARDING_CREDIT_SUMMARY_KEY, user?.id],
    queryFn: () => getCreditSummary(supabase, user!.id),
    enabled: !!user,
    retry: 1,
  });

  const totalCredits = creditSummaryQuery.data?.totalRemainingCredits ?? 0;
  const maxSelectableFilesByCredit = Math.floor(totalCredits / CREDIT_PER_PAGE);
  const selectedCreditsCost = selectedFiles.length * CREDIT_PER_PAGE;

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
    setSubmitError(null);
    setFileStates((current) => {
      const next: Record<string, FileUploadState> = {};
      for (const file of files) {
        next[getFileKey(file)] = current[getFileKey(file)] ?? { status: "pending" };
      }
      return next;
    });
  };

  const handleSubmitFiles = async () => {
    if (selectedFiles.length === 0) return;
    if (selectedCreditsCost > totalCredits) {
      toast({
        title: "Không đủ credits",
        description: `Bạn chỉ có thể tải tối đa ${maxSelectableFilesByCredit} tệp với ${totalCredits} credits hiện tại.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let hasFailed = false;

      for (const file of selectedFiles) {
        const fileKey = getFileKey(file);
        if (fileStates[fileKey]?.status === "done") {
          continue;
        }

        setFileStates((current) => ({
          ...current,
          [fileKey]: { status: "uploading" },
        }));

        try {
          await addOnboardingKnowledgeFile(supabase, { botId, file });
          setFileStates((current) => ({
            ...current,
            [fileKey]: { status: "done" },
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Không thể tải tệp dữ liệu.";
          setFileStates((current) => ({
            ...current,
            [fileKey]: { status: "failed", error: message },
          }));
          hasFailed = true;
        }
      }

      if (hasFailed) {
        throw new Error("Một số tệp không thể tải lên. Vui lòng kiểm tra lại.");
      }

      toast({
        title: "Thành công",
        description: `Đã tải ${selectedFiles.length} tệp lên và đưa vào hàng chờ index.`,
      });
      onNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải tệp dữ liệu.";
      setSubmitError(message);
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Tải tệp dữ liệu
          </span>
          <Badge variant="secondary">Tệp</Badge>
        </CardTitle>
        <CardDescription>
          Chọn một hoặc nhiều tệp để bot học trước khi bắt đầu index.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitError && (
          <Alert variant="destructive">
            <AlertTitle>Lỗi tải tệp</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {maxSelectableFilesByCredit === 0 && !creditSummaryQuery.isLoading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Không đủ credits</AlertTitle>
            <AlertDescription>
              Bạn cần ít nhất {CREDIT_PER_PAGE} credits để tải một tệp dữ liệu.
            </AlertDescription>
          </Alert>
        )}

        <KnowledgeFileDropzone
          files={selectedFiles}
          onFilesChange={handleFilesChange}
          disabled={
            isSubmitting || creditSummaryQuery.isLoading || maxSelectableFilesByCredit === 0
          }
          multiple
          maxFiles={maxSelectableFilesByCredit}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
            <div>
              <p className="text-[11px] tracking-wide text-muted-foreground">Credits sử dụng</p>
              <p className="text-xs font-medium text-foreground">
                {selectedCreditsCost.toLocaleString()} / {totalCredits.toLocaleString()}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <p className="text-xs text-muted-foreground">
              {CREDIT_PER_PAGE} credit/tệp • tối đa {Math.max(0, maxSelectableFilesByCredit)} tệp
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={isSubmitting}
              className="hover:border-primary hover:bg-white hover:text-primary"
            >
              Về Dashboard
            </Button>
            <Button
              onClick={handleSubmitFiles}
              disabled={
                creditSummaryQuery.isLoading ||
                selectedFiles.length === 0 ||
                selectedCreditsCost > totalCredits ||
                isSubmitting
              }
            >
              {isSubmitting ? (
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
        </div>
      </CardContent>
    </Card>
  );
}

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}
