"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ALLOWED_KNOWLEDGE_FILE_EXTENSIONS } from "@/config/knowledge";
import { validateKnowledgeFile } from "@/lib/helpers";

interface KnowledgeFileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}

export function KnowledgeFileDropzone({
  files,
  onFilesChange,
  disabled = false,
  multiple = false,
  maxFiles,
  className,
}: KnowledgeFileDropzoneProps) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyFiles = (nextFiles: FileList | File[] | null) => {
    if (!nextFiles || disabled) return;

    const acceptedFiles: File[] = [];

    for (const file of Array.from(nextFiles)) {
      const validation = validateKnowledgeFile(file);
      if (!validation.valid) {
        setFileError(validation.error ?? "Tệp không hợp lệ.");
        setIsDraggingFile(false);
        return;
      }
      acceptedFiles.push(file);
    }

    const mergedFiles = multiple ? [...files, ...acceptedFiles] : acceptedFiles.slice(0, 1);
    const uniqueFiles = mergedFiles.filter(
      (file, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified
        ) === index
    );
    const limitedFiles = maxFiles ? uniqueFiles.slice(0, maxFiles) : uniqueFiles;

    if (maxFiles && uniqueFiles.length > maxFiles) {
      setFileError(`Bạn chỉ có thể chọn tối đa ${maxFiles} tệp với số credits hiện tại.`);
    } else {
      setFileError(null);
    }

    onFilesChange(limitedFiles);
    setIsDraggingFile(false);
  };

  const removeFile = (indexToRemove: number) => {
    onFilesChange(files.filter((_, index) => index !== indexToRemove));
    setFileError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        id="knowledge-file"
        type="file"
        accept={ALLOWED_KNOWLEDGE_FILE_EXTENSIONS.join(",")}
        disabled={disabled}
        multiple={multiple}
        className="hidden"
        onChange={(event) => applyFiles(event.target.files)}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(event) => {
          event.preventDefault();
          applyFiles(event.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          isDraggingFile
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-primary" />
        <p className="text-sm font-medium text-foreground">Thả tệp vào đây</p>
        <p className="mt-1 text-xs text-muted-foreground">hoặc bấm để chọn tệp từ máy tính</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Định dạng hỗ trợ: {ALLOWED_KNOWLEDGE_FILE_EXTENSIONS.join(", ")}. Tối đa 10MB.
        </p>
      </div>

      {fileError ? <p className="text-xs font-medium text-destructive">{fileError}</p> : null}

      {files.length > 0 ? (
        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs transition-colors hover:bg-primary/10"
              onClick={() => removeFile(index)}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">Đã chọn tệp: {file.name}</p>
                <p className="text-muted-foreground">
                  Kích thước: {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-red-500"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                aria-label={`Bỏ chọn ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
