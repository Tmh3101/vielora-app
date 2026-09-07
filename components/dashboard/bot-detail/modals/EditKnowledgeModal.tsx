"use client";

import { useEffect, useState } from "react";
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
import { CREDIT_PER_PAGE, MAX_MANUAL_CONTENT_LENGTH, MAX_MANUAL_TITLE_LENGTH } from "@/config";
import { Loader2, Pencil } from "lucide-react";
import { VoiceInputButton } from "@/components/dashboard/shared/VoiceInputButton";
import type { Tables } from "@/lib/supabase/types";
import { useTranslations } from "next-intl";

type PageType = Tables<"pages">;

export interface EditKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageType | null;
  isSaving: boolean;
  isLoadingContent: boolean;
  totalCredits: number;
  botId?: string;
  isPaidPlan?: boolean;
  onConfirm: (title: string, content: string) => Promise<void>;
  onResetPage: () => void;
}

export function EditKnowledgeModal({
  open,
  onOpenChange,
  page,
  isSaving,
  isLoadingContent,
  totalCredits,
  botId,
  isPaidPlan = true,
  onConfirm,
  onResetPage,
}: EditKnowledgeModalProps) {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevPage, setPrevPage] = useState(page);

  if (prevOpen !== open || prevPage !== page) {
    setPrevOpen(open);
    setPrevPage(page);
    if (open && page) {
      setTitle(page.title || "");
      setContent(page.content || "");
    } else if (!open) {
      setTitle("");
      setContent("");
    }
  }

  useEffect(() => {
    if (!open) {
      onResetPage();
    }
  }, [open, onResetPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            {t("dashboard.botDetail.modals.editKnowledge.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.botDetail.modals.editKnowledge.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden px-1">
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              {t("dashboard.botDetail.modals.editKnowledge.fieldTitle")}{" "}
              <span className="font-normal text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              placeholder={t("dashboard.botDetail.modals.editKnowledge.fieldTitlePlaceholder")}
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

          <div className="-mx-1 flex-1 space-y-2 overflow-hidden px-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-content">
                {t("dashboard.botDetail.modals.editKnowledge.fieldContent")}{" "}
                <span className="font-normal text-destructive">*</span>
              </Label>

              {botId && (
                <VoiceInputButton
                  scope="bot"
                  targetId={botId}
                  isPaidPlan={isPaidPlan}
                  disabled={isSaving || isLoadingContent}
                  onTranscript={(text, suggestedTitle) => {
                    setContent((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
                    if (suggestedTitle && !title.trim()) {
                      setTitle(suggestedTitle);
                    }
                  }}
                />
              )}
            </div>
            {isLoadingContent ? (
              <div className="flex h-[300px] items-center justify-center rounded-lg border bg-muted/30">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">
                    {t("dashboard.botDetail.modals.editKnowledge.loadingContent")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <Textarea
                  id="edit-content"
                  placeholder={t(
                    "dashboard.botDetail.modals.editKnowledge.fieldContentPlaceholder"
                  )}
                  value={content}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MANUAL_CONTENT_LENGTH) {
                      setContent(e.target.value);
                    }
                  }}
                  disabled={isSaving}
                  rows={12}
                  maxLength={MAX_MANUAL_CONTENT_LENGTH}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.botDetail.modals.editKnowledge.markdownHint")}
                  </p>
                  <p
                    className={`text-xs ${content.length >= MAX_MANUAL_CONTENT_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {content.length}/{MAX_MANUAL_CONTENT_LENGTH}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {totalCredits < CREDIT_PER_PAGE && (
              <p className="text-xs font-medium text-amber-600">
                {t("dashboard.botDetail.modals.editKnowledge.notEnoughCredits")}
              </p>
            )}
            <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground">
                  {t("dashboard.botDetail.modals.editKnowledge.creditsAvailable")}
                </p>
                <p className="text-xs font-medium text-foreground">
                  {totalCredits.toLocaleString()} credits
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <p className="text-xs text-muted-foreground">
                {t("dashboard.botDetail.modals.editKnowledge.creditsNeeded", {
                  count: CREDIT_PER_PAGE,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="hover:border-red-600 hover:bg-white hover:text-red-600"
            >
              {t("dashboard.botDetail.modals.editKnowledge.cancel")}
            </Button>
            <Button
              onClick={() => void onConfirm(title, content)}
              disabled={
                isSaving ||
                isLoadingContent ||
                !title.trim() ||
                !content.trim() ||
                totalCredits < CREDIT_PER_PAGE
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("dashboard.botDetail.modals.editKnowledge.saving")}
                </>
              ) : (
                t("dashboard.botDetail.modals.editKnowledge.save")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
