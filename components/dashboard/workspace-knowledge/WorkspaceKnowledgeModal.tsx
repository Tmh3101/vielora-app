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

export interface WorkspaceKnowledgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  isEdit?: boolean;
  totalCredits?: number;
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
  initialTitle = "",
  initialContent = "",
  onConfirmManual,
  onConfirmFile,
  onConfirmUrl,
}: WorkspaceKnowledgeModalProps) {
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
    if (!trimmed) return "Vui lòng nhập URL.";

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "URL phải bắt đầu bằng http:// hoặc https://.";
      }
      return null;
    } catch {
      return "URL không hợp lệ.";
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Chỉnh sửa kiến thức
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-primary" />
                Thêm kiến thức
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật tiêu đề và nội dung kiến thức dùng chung."
              : "Thêm văn bản, tệp hoặc đường dẫn cho kiến thức dùng chung của workspace."}
          </DialogDescription>
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
                  Văn bản
                </TabsTrigger>
                <TabsTrigger value="file" disabled={isSaving} className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Tệp
                </TabsTrigger>
                <TabsTrigger value="url" disabled={isSaving} className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Đường dẫn
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isEdit || inputMode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="ws-knowledge-title">Tiêu đề *</Label>
                <Input
                  id="ws-knowledge-title"
                  placeholder="VD: Hướng dẫn sử dụng sản phẩm"
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
                <Label htmlFor="ws-knowledge-content">Nội dung *</Label>
                <Textarea
                  id="ws-knowledge-content"
                  placeholder="Nhập nội dung chi tiết..."
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
                  <p className="text-xs text-muted-foreground">Hỗ trợ định dạng Markdown.</p>
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
              <Label>Tệp *</Label>
              <KnowledgeFileDropzone
                files={selectedFiles}
                onFilesChange={setSelectedFiles}
                disabled={isSaving}
                multiple
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ws-knowledge-url">URL bài viết/tài liệu *</Label>
              <Input
                id="ws-knowledge-url"
                type="url"
                placeholder="https://example.com/blog/article"
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
                <p className="text-xs text-muted-foreground">
                  Dùng cho một trang cụ thể như bài viết, blog hoặc tài liệu online.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {!isEdit && (
            <div className="space-y-2">
              {!hasEnoughCredits && totalCredits !== undefined && (
                <p className="text-xs font-medium text-amber-600">
                  Không đủ credits để thêm dữ liệu mới.
                </p>
              )}
              <div className="inline-flex min-w-[250px] items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-[11px] tracking-wide text-muted-foreground">Credits hiện có</p>
                  <p className="text-xs font-medium text-foreground">
                    {(totalCredits ?? 0).toLocaleString()} credits
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <p className="text-xs text-muted-foreground">
                  {inputMode === "file" && selectedFiles.length > 1
                    ? `Cần ${fileCreditsCost} credits cho ${selectedFiles.length} tệp`
                    : `Cần ${CREDIT_PER_PAGE} credit để thêm`}
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
              Hủy
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
                  Đang lưu...
                </>
              ) : isEdit ? (
                "Lưu thay đổi"
              ) : inputMode === "file" ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Thêm tệp
                </>
              ) : inputMode === "url" ? (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Thêm URL
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm kiến thức
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
