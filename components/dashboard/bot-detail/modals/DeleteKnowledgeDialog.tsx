"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

export interface DeleteKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteKnowledgeDialog({
  open,
  onOpenChange,
  isDeleting,
  onConfirm,
}: DeleteKnowledgeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Xác nhận xóa
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>Bạn có chắc chắn muốn xóa nguồn dữ liệu này?</span>
            <br />
            <span>Chatbot sẽ ngay lập tức quên kiến thức này và không thể khôi phục.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="hover:border-red-600 hover:bg-white hover:text-red-600"
          >
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
