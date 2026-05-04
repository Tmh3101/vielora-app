"use client";

import { useState } from "react";
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
import { Loader2, Plus } from "lucide-react";

export interface AddKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  totalCredits: number;
  onConfirm: (title: string, content: string) => Promise<void>;
}

export function AddKnowledgeModal({
  open,
  onOpenChange,
  isSubmitting,
  totalCredits,
  onConfirm,
}: AddKnowledgeModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setTitle("");
      setContent("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Thêm dữ liệu</DialogTitle>
          <DialogDescription>Thêm văn bản thủ công vào kiến thức của bot.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-title">Tiêu đề *</Label>
            <Input
              id="manual-title"
              placeholder="VD: Hướng dẫn sử dụng sản phẩm"
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
            <Label htmlFor="manual-content">Nội dung *</Label>
            <Textarea
              id="manual-content"
              placeholder="Nhập nội dung văn bản hoặc markdown..."
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
              <p className="text-xs text-muted-foreground">Hỗ trợ định dạng Markdown.</p>
              <p
                className={`text-xs ${content.length >= MAX_MANUAL_CONTENT_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
              >
                {content.length}/{MAX_MANUAL_CONTENT_LENGTH}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {totalCredits < CREDIT_PER_PAGE && (
              <p className="text-xs font-medium text-amber-600">
                Không đủ credits để thêm dữ liệu mới.
              </p>
            )}
            <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div>
                <p className="text-[11px] tracking-wide text-muted-foreground">Credits hiện có</p>
                <p className="text-xs font-medium text-foreground">
                  {totalCredits.toLocaleString()} credits
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <p className="text-xs text-muted-foreground">Cần {CREDIT_PER_PAGE} credit để thêm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="hover:border-red-600 hover:bg-white hover:text-red-600"
            >
              Hủy
            </Button>
            <Button
              onClick={() => void onConfirm(title, content)}
              disabled={
                isSubmitting || !title.trim() || !content.trim() || totalCredits < CREDIT_PER_PAGE
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm dữ liệu
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
