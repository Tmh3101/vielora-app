"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "destructive",
  isLoading = false,
  icon,
}: ConfirmActionModalProps) {
  const isDestructive = variant === "destructive";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-2xl border-border/80 bg-card p-6 shadow-2xl sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                isDestructive
                  ? "border border-destructive/20 bg-destructive/10 text-destructive"
                  : "border border-amber-500/20 bg-amber-500/10 text-amber-500"
              }`}
            >
              {icon || <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onClose}
            className="cursor-pointer rounded-xl border-border/60 bg-transparent text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted hover:text-foreground active:scale-95"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
            className={`cursor-pointer rounded-xl text-xs font-semibold shadow-md transition-all duration-200 active:scale-95 ${
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-destructive/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
