"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export interface DeleteNoteConfirmModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  noteTitle: string;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;

  // Aliases for compatibility
  isOpen?: boolean;
  onClose?: () => void;
}

export function DeleteNoteConfirmModal({
  open,
  onOpenChange,
  noteTitle,
  onConfirm,
  isDeleting = false,
  isOpen: legacyIsOpen,
  onClose,
}: DeleteNoteConfirmModalProps) {
  const showModal = open ?? legacyIsOpen ?? false;

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-rose-600 dark:text-rose-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span>Xác nhận xóa ghi chú</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1 text-xs leading-relaxed text-muted-foreground">
          <p>
            Bạn có chắc chắn muốn xóa vĩnh viễn ghi chú{" "}
            <strong className="text-foreground">&ldquo;{noteTitle}&rdquo;</strong>?
          </p>
          <div className="rounded-lg border border-border/80 bg-muted/30 p-2.5 text-[11px]">
            <p className="font-semibold text-foreground">Hành động này sẽ:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Xóa hoàn toàn ghi chú khỏi danh sách nhóm.</li>
              <li>Xóa tài liệu khỏi bộ nhớ RAG — Bot sẽ không còn nhớ nội dung này.</li>
              <li className="text-muted-foreground">
                Không hoàn lại credit đã sử dụng khi tạo ghi chú.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="text-xs transition-colors duration-200 hover:border-red-600 hover:bg-white hover:text-red-600 dark:hover:border-red-500 dark:hover:bg-background dark:hover:text-red-400"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5 text-xs"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            <span>Xóa ghi chú</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
