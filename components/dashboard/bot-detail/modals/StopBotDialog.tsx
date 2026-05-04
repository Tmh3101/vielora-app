"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Square } from "lucide-react";

export interface StopBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isStoppingBot: boolean;
  onConfirm: () => Promise<void>;
}

export function StopBotDialog({
  open,
  onOpenChange,
  isStoppingBot,
  onConfirm,
}: StopBotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Square className="h-5 w-5" />
            Dừng Bot
          </DialogTitle>
          <DialogDescription>
            Bot sẽ ngừng trả lời tin nhắn từ người dùng. Bạn có thể khởi động lại bot bằng nút
            &quot;Khởi động Bot&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                <Square className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-destructive">Xác nhận dừng bot</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Sau khi dừng, widget sẽ hiển thị thông báo bot tạm ngưng hoạt động.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStoppingBot}
            className="hover:border-primary hover:bg-white hover:text-primary"
          >
            Hủy
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={isStoppingBot}>
            {isStoppingBot ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang dừng...
              </>
            ) : (
              <>
                <Square className="mr-2 h-4 w-4" />
                Dừng Bot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
