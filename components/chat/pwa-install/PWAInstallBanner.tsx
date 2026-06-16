"use client";

import { usePWAInstall } from "@/providers/PWAInstallProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function PWAInstallBanner({ className }: { className?: string }) {
  const {
    appName,
    isBannerVisible,
    dismissBanner,
    handleInstallClick,
    primaryColor,
    headerForeground,
  } = usePWAInstall();

  if (!isBannerVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 border-b border-border bg-muted px-3 text-xs text-foreground",
        className
      )}
    >
      <p className="min-w-0 flex-1 leading-tight">
        Tải ứng dụng <strong>{appName}</strong> về điện thoại để có trải nghiệm tốt hơn.
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 shrink-0 px-2 text-xs"
        style={{ backgroundColor: primaryColor, color: headerForeground }}
        onClick={handleInstallClick}
      >
        Cài đặt
      </Button>
      <button
        type="button"
        onClick={dismissBanner}
        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Đóng thông báo cài đặt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
