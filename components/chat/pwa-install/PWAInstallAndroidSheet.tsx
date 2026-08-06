"use client";

import { EAndroidBrowser } from "@/types/enums";
import { PWAInstallSheetShell } from "./PWAInstallSheetShell";
import { AndroidInstallInstructions } from "./AndroidInstallInstructions";

interface PWAInstallAndroidSheetProps {
  appName: string;
  browser: EAndroidBrowser;
  open: boolean;
  onClose: () => void;
}

export function PWAInstallAndroidSheet({
  appName,
  browser,
  open,
  onClose,
}: PWAInstallAndroidSheetProps) {
  const isUnsupported = browser === EAndroidBrowser.Other;

  return (
    <PWAInstallSheetShell
      open={open}
      onClose={onClose}
      titleId="pwa-install-android-sheet-title"
      title={isUnsupported ? "Mở bằng Chrome để cài đặt" : `Cài đặt ${appName}`}
      showSubtitle={!isUnsupported}
      subtitle="Thêm ứng dụng vào Màn hình chính để truy cập nhanh hơn."
    >
      <AndroidInstallInstructions browser={browser} appName={appName} />
    </PWAInstallSheetShell>
  );
}
