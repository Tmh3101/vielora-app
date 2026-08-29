import React from "react";
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

interface DeleteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  templateName,
  isDeleting,
  onConfirm,
}: DeleteTemplateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-border/60">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-foreground">
            Vô hiệu hoá mẫu báo cáo?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            Mẫu báo cáo &quot;{templateName}&quot; sẽ được đưa vào trạng thái không hoạt động. Bạn
            có thể giải phóng slot mẫu để tạo hoặc nhập mẫu mới. Các báo cáo đã xuất trước đó vẫn
            được lưu trữ an toàn.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-9 rounded-xl border-border/60 text-xs font-medium transition-colors hover:border-border hover:bg-muted hover:text-foreground">
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="shadow-xs h-9 rounded-xl bg-destructive px-4 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            {isDeleting ? "Đang xử lý..." : "Xác nhận xoá"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
