"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/providers/PWAInstallProvider";

export function PWAInstallHeaderButton({ className }: { className?: string }) {
  const { isVisible, handleInstallClick } = usePWAInstall();

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      aria-label="Cài đặt ứng dụng"
      className={cn(
        "ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15",
        className
      )}
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
