"use client";

import { PWAInstallSheetShell } from "./PWAInstallSheetShell";
import { RefreshCw } from "lucide-react";

interface PWAUpdateSheetProps {
  appName: string;
  open: boolean;
  onClose: () => void;
}

export function PWAUpdateSheet({ appName, open, onClose }: PWAUpdateSheetProps) {
  return (
    <PWAInstallSheetShell
      open={open}
      onClose={onClose}
      titleId="pwa-update-sheet-title"
      title="Cập nhật phiên bản mới"
      showSubtitle
      subtitle="Vừa có bản cập nhật tên hoặc ảnh đại diện."
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900">{appName} có bản cập nhật mới</p>
            <p className="text-xs leading-relaxed text-amber-700">
              Để cập nhật phiên bản mới nhất, vui lòng xóa ứng dụng này và cài đặt lại vào màn hình
              chính.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-foreground py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          Đã hiểu
        </button>
      </div>
    </PWAInstallSheetShell>
  );
}
