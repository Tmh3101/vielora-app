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
import { FileText, Link, Loader2, Pencil, Plus, Upload } from "lucide-react";
import { VoiceInputButton } from "@/components/dashboard/shared/VoiceInputButton";
import { useTranslations } from "next-intl";

export interface WorkspaceKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  isEdit?: boolean;
  totalCredits?: number;
  workspaceId?: string;
  isPaidPlan?: boolean;
  initialTitle?: string;
  initialContent?: string;
  onConfirmManual: (title: string, content: string) => Promise<void>;
  onConfirmFile: (files: File[]) => Promise<void>;
  onConfirmUrl: (url: string) => Promise<void>;
}

export function WorkspaceKnowledgeModal({
  open,
  onOpenChange,
  isSaving,
  isEdit = false,
  totalCredits,
  workspaceId,
  isPaidPlan = true,
  initialTitle = "",
  initialContent = "",
  onConfirmManual,
  onConfirmFile,
  onConfirmUrl,
}: WorkspaceKnowledgeModalProps) {
  const t = useTranslations("dashboard.workspaceKnowledge");
  const tCommon = useTranslations("dashboard.common");
  const [inputMode, setInputMode] = useState<"manual" | "file" | "url">("manual");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setInputMode("manual");
      setTitle(initialTitle);
      setContent(initialContent);
      setUrl("");
      setUrlError(null);
      setSelectedFiles([]);
    }
  }

  const validateUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t("urlErrorRequired");

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return t("urlErrorProtocol");
      }
      return null;
    } catch {
      return t("urlErrorInvalid");
    }
  };

  const currentUrlError = inputMode === "url" ? validateUrl(url) : null;

  const fileCreditsCost = selectedFiles.length * CREDIT_PER_PAGE;
  const requiredCredits =
    inputMode === "file" ? Math.max(1, selectedFiles.length) * CREDIT_PER_PAGE : CREDIT_PER_PAGE;
  const hasEnoughCredits = !isEdit && (totalCredits ?? 0) >= requiredCredits;

  const handleSubmit = () => {
    if (isEdit || inputMode === "manual") {
      void onConfirmManual(title.trim(), content.trim());
      return;
    }
    if (inputMode === "file" && selectedFiles.length > 0) {
      void onConfirmFile(selectedFiles);
      return;
    }
    if (inputMode === "url") {
      const error = validateUrl(url);
      setUrlError(error);
      if (!error) void onConfirmUrl(url.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                {t("knowledgeTitle")}
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                {t("addKnowledge")}
              </>
            )}
          </DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <Tabs
              value={inputMode}
              onValueChange={(value) => setInputMode(value as "manual" | "file" | "url")}
            >
              <TabsList className="grid w-full grid-cols-3 bg-muted/60">
                <TabsTrigger value="manual" disabled={isSaving} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("sourceText")}
                </TabsTrigger>
                <TabsTrigger value="file" disabled={isSaving} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {t("sourceFile")}
                </TabsTrigger>
                <TabsTrigger value="url" disabled={isSaving} className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isEdit || inputMode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ws-knowledge-title">
                  {t("titleLabel")} <span className="font-normal text-destructive">*</span>
                </Label>
                <Input
                  id="ws-knowledge-title"
                  placeholder={t("titlePlaceholder")}
                  value={title}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MANUAL_TITLE_LENGTH) {
                      setTitle(e.target.value);
                    }
                  }}
                  disabled={isSaving}
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
                  <Label htmlFor="ws-knowledge-content">
                    {t("contentLabel")} <span className="font-normal text-destructive">*</span>
                  </Label>
                  {workspaceId && (
                    <VoiceInputButton
                      scope="workspace"
                      targetId={workspaceId}
                      isPaidPlan={isPaidPlan}
                      disabled={isSaving}
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
                  id="ws-knowledge-content"
                  placeholder={t("contentPlaceholder")}
                  value={content}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MANUAL_CONTENT_LENGTH) {
                      setContent(e.target.value);
                    }
                  }}
                  disabled={isSaving}
                  rows={8}
                  maxLength={MAX_MANUAL_CONTENT_LENGTH}
                  className="resize-none"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{t("markdownSupported")}</p>
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
                {t("filesLabel")} <span className="font-normal text-destructive">*</span>
              </Label>
              <KnowledgeFileDropzone
                files={selectedFiles}
                onFilesChange={setSelectedFiles}
                disabled={isSaving}
                multiple
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ws-knowledge-url">
                {t("urlLabel")} <span className="font-normal text-destructive">*</span>
              </Label>

              <Input
                id="ws-knowledge-url"
                type="url"
                placeholder={t("urlPlaceholder")}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                onBlur={() => setUrlError(validateUrl(url))}
                disabled={isSaving}
              />
              {urlError ? (
                <p className="text-xs font-medium text-destructive">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("urlHint")}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {!isEdit && (
            <div className="space-y-2">
              {!hasEnoughCredits && totalCredits !== undefined && (
                <p className="text-xs font-medium text-amber-600">{t("notEnoughCredits")}</p>
              )}
              <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-[11px] tracking-wide text-muted-foreground">
                    {t("currentCredits")}
                  </p>
                  <p className="text-xs font-medium text-foreground">
                    {(totalCredits ?? 0).toLocaleString()} credits
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <p className="text-xs text-muted-foreground">
                  {inputMode === "file" && selectedFiles.length > 1
                    ? t("costMultipleFiles", {
                        cost: fileCreditsCost,
                        count: selectedFiles.length,
                      })
                    : t("costSingleFile", { cost: CREDIT_PER_PAGE })}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="hover:border-red-600 hover:bg-white hover:text-red-600"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSaving ||
                (isEdit
                  ? !title.trim() || !content.trim()
                  : !hasEnoughCredits ||
                    (inputMode === "manual"
                      ? !title.trim() || !content.trim()
                      : inputMode === "file"
                        ? selectedFiles.length === 0
                        : !url.trim() || Boolean(currentUrlError)))
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </>
              ) : isEdit ? (
                tCommon("save")
              ) : inputMode === "file" ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("sourceFile")}
                </>
              ) : inputMode === "url" ? (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  URL
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addKnowledge")}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
