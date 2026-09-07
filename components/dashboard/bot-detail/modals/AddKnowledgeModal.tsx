"use client";

import { useState } from "react";
import { KnowledgeFileDropzone } from "@/components/shared/KnowledgeFileDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CREDIT_PER_PAGE, MAX_MANUAL_CONTENT_LENGTH, MAX_MANUAL_TITLE_LENGTH } from "@/config";
import { FileText, Link, Loader2, Plus, Upload } from "lucide-react";
import { VoiceInputButton } from "@/components/dashboard/shared/VoiceInputButton";
import { useTranslations } from "next-intl";

export interface AddKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  totalCredits: number;
  botId?: string;
  isPaidPlan?: boolean;
  onConfirmManual: (title: string, content: string) => Promise<void>;
  onConfirmFile: (files: File[]) => Promise<void>;
  onConfirmUrl: (url: string) => Promise<void>;
}

export function AddKnowledgeModal({
  open,
  onOpenChange,
  isSubmitting,
  totalCredits,
  botId,
  isPaidPlan = true,
  onConfirmManual,
  onConfirmFile,
  onConfirmUrl,
}: AddKnowledgeModalProps) {
  const t = useTranslations();
  const [inputMode, setInputMode] = useState<"manual" | "file" | "url">("manual");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setInputMode("manual");
      setTitle("");
      setContent("");
      setUrl("");
      setUrlError(null);
      setSelectedFiles([]);
    }
  }

  const maxSelectableFilesByCredit = Math.floor(totalCredits / CREDIT_PER_PAGE);
  const fileCreditsCost = selectedFiles.length * CREDIT_PER_PAGE;
  const requiredCredits =
    inputMode === "file" ? Math.max(1, selectedFiles.length) * CREDIT_PER_PAGE : CREDIT_PER_PAGE;

  const validateUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t("dashboard.botDetail.modals.addKnowledge.urlRequired");

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return t("dashboard.botDetail.modals.addKnowledge.urlMustStartWithHttp");
      }
      return null;
    } catch {
      return t("dashboard.botDetail.modals.addKnowledge.urlInvalid");
    }
  };

  const currentUrlError = inputMode === "url" ? validateUrl(url) : null;

  const handleSubmit = () => {
    if (inputMode === "manual") {
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      const finalContent = trimmedTitle ? `${trimmedTitle}\n\n${trimmedContent}` : trimmedContent;
      void onConfirmManual(title, finalContent);
      return;
    }
    if (inputMode === "file" && selectedFiles.length > 0) {
      void onConfirmFile(selectedFiles);
      return;
    }
    if (inputMode === "url") {
      const error = validateUrl(url);
      setUrlError(error);
      if (!error) void onConfirmUrl(url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("dashboard.botDetail.modals.addKnowledge.title")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.botDetail.modals.addKnowledge.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs
            value={inputMode}
            onValueChange={(value) => setInputMode(value as "manual" | "file" | "url")}
          >
            <TabsList className="grid w-full grid-cols-3 bg-muted/60">
              <TabsTrigger
                value="manual"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {t("dashboard.botDetail.modals.addKnowledge.tabText")}
              </TabsTrigger>
              <TabsTrigger value="file" disabled={isSubmitting} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {t("dashboard.botDetail.modals.addKnowledge.tabFile")}
              </TabsTrigger>
              <TabsTrigger value="url" disabled={isSubmitting} className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                {t("dashboard.botDetail.modals.addKnowledge.tabUrl")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {inputMode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-title">
                  {t("dashboard.botDetail.modals.addKnowledge.fieldTitle")}{" "}
                  <span className="font-normal text-destructive">*</span>
                </Label>
                <Input
                  id="manual-title"
                  placeholder={t("dashboard.botDetail.modals.addKnowledge.fieldTitlePlaceholder")}
                  value={title}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MANUAL_TITLE_LENGTH) {
                      setTitle(e.target.value);
                    }
                  }}
                  disabled={isSubmitting}
                  maxLength={MAX_MANUAL_TITLE_LENGTH}
                />
                <div className="flex items-center justify-end">
                  <p
                    className={`text-xs ${title.length >= MAX_MANUAL_TITLE_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {title.length}/{MAX_MANUAL_TITLE_LENGTH}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="manual-content">
                    {t("dashboard.botDetail.modals.addKnowledge.fieldContent")}{" "}
                    <span className="font-normal text-destructive">*</span>
                  </Label>
                  {botId && (
                    <VoiceInputButton
                      scope="bot"
                      targetId={botId}
                      isPaidPlan={isPaidPlan}
                      disabled={isSubmitting}
                      onTranscript={(text, suggestedTitle) => {
                        setContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
                        if (suggestedTitle && !title.trim()) {
                          setTitle(suggestedTitle);
                        }
                      }}
                    />
                  )}
                </div>
                <Textarea
                  id="manual-content"
                  placeholder={t("dashboard.botDetail.modals.addKnowledge.fieldContentPlaceholder")}
                  value={content}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MANUAL_CONTENT_LENGTH) {
                      setContent(e.target.value);
                    }
                  }}
                  disabled={isSubmitting}
                  rows={8}
                  maxLength={MAX_MANUAL_CONTENT_LENGTH}
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.botDetail.modals.addKnowledge.markdownHint")}
                  </p>
                  <p
                    className={`text-xs ${content.length >= MAX_MANUAL_CONTENT_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {content.length}/{MAX_MANUAL_CONTENT_LENGTH}
                  </p>
                </div>
              </div>
            </>
          ) : inputMode === "file" ? (
            <div className="space-y-2">
              <Label>
                {t("dashboard.botDetail.modals.addKnowledge.fieldFile")}{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>
              <KnowledgeFileDropzone
                files={selectedFiles}
                onFilesChange={setSelectedFiles}
                disabled={isSubmitting}
                multiple
                maxFiles={maxSelectableFilesByCredit}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="knowledge-url">
                {t("dashboard.botDetail.modals.addKnowledge.fieldUrl")}{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>

              <Input
                id="knowledge-url"
                type="url"
                placeholder="https://example.com/blog/article"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                onBlur={() => setUrlError(validateUrl(url))}
                disabled={isSubmitting}
              />
              {urlError ? (
                <p className="text-xs font-medium text-destructive">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.botDetail.modals.addKnowledge.urlHint")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {totalCredits < requiredCredits && (
              <p className="text-xs font-medium text-amber-600">
                {t("dashboard.botDetail.modals.addKnowledge.notEnoughCredits")}
              </p>
            )}
            <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground">
                  {t("dashboard.botDetail.modals.addKnowledge.creditsAvailable")}
                </p>
                <p className="text-xs font-medium text-foreground">
                  {totalCredits.toLocaleString()} credits
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <p className="text-xs text-muted-foreground">
                {inputMode === "file" && selectedFiles.length > 1
                  ? t("dashboard.botDetail.modals.addKnowledge.creditsNeededForFiles", {
                      cost: fileCreditsCost,
                      count: selectedFiles.length,
                    })
                  : t("dashboard.botDetail.modals.addKnowledge.creditsNeeded", {
                      count: CREDIT_PER_PAGE,
                    })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="hover:border-red-600 hover:bg-white hover:text-red-600"
            >
              {t("dashboard.botDetail.modals.addKnowledge.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                totalCredits < requiredCredits ||
                (inputMode === "manual"
                  ? !title.trim() || !content.trim()
                  : inputMode === "file"
                    ? selectedFiles.length === 0
                    : !url.trim() || Boolean(currentUrlError))
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {inputMode === "url"
                    ? t("dashboard.botDetail.modals.addKnowledge.sending")
                    : t("dashboard.botDetail.modals.addKnowledge.adding")}
                </>
              ) : (
                <>
                  {inputMode === "manual" ? (
                    <Plus className="mr-0 h-4 w-4" />
                  ) : inputMode === "file" ? (
                    <Upload className="mr-2 h-4 w-4" />
                  ) : (
                    <Link className="mr-2 h-4 w-4" />
                  )}
                  {t("dashboard.botDetail.modals.addKnowledge.add")}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
