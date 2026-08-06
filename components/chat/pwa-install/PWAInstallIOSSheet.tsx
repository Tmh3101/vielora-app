"use client";

import { EIOSBrowser } from "@/types/enums";
import { PWAInstallSheetShell } from "./PWAInstallSheetShell";
import { IOSInstallInstructions } from "./IOSInstallInstructions";

interface PWAInstallIOSSheetProps {
  appName: string;
  browser: EIOSBrowser;
  open: boolean;
  onClose: () => void;
}

export function PWAInstallIOSSheet({ appName, browser, open, onClose }: PWAInstallIOSSheetProps) {
  const isBrave = browser === EIOSBrowser.Brave;

  return (
    <PWAInstallSheetShell
      open={open}
      onClose={onClose}
      titleId="pwa-install-sheet-title"
      title={isBrave ? "Không thể cài đặt trên Brave" : `Cài đặt ${appName}`}
      showSubtitle={!isBrave}
      subtitle="Thêm ứng dụng vào Màn hình chính để truy cập nhanh hơn."
    >
      <IOSInstallInstructions browser={browser} />
    </PWAInstallSheetShell>
  );
}
