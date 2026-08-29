"use client";

import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearPwaAuthReturnPath,
  isIOS,
  isStandaloneMode,
  readPwaAuthReturnPath,
} from "@/lib/helpers/pwa-helpers";

export function PwaAuthReturnOverlay() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("pwa_return") === "1";
    const fromStorage = Boolean(readPwaAuthReturnPath());
    if (isStandaloneMode()) return false;
    return fromQuery || fromStorage;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("pwa_return") === "1";

    const stripReturnParam = () => {
      if (!fromQuery) return;
      params.delete("pwa_return");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    };

    if (isStandaloneMode()) {
      clearPwaAuthReturnPath();
      stripReturnParam();
    }
  }, []);

  const dismiss = () => {
    clearPwaAuthReturnPath();
    const params = new URLSearchParams(window.location.search);
    params.delete("pwa_return");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Đăng nhập thành công</h2>
            <p className="text-xs text-muted-foreground">Tiếp tục trong ứng dụng đã cài trên máy</p>
          </div>
        </div>

        <div className="mb-5 flex gap-3 rounded-xl bg-muted/50 p-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isIOS()
              ? "Chạm icon chatbot trên màn hình chính để quay lại ứng dụng. Phiên đăng nhập đã được lưu."
              : "Mở lại ứng dụng từ màn hình chính. Nếu Chrome không tự chuyển, hãy chạm icon đã cài đặt."}
          </p>
        </div>

        <Button
          variant="outline"
          className="h-11 w-full rounded-xl text-xs font-semibold"
          onClick={dismiss}
        >
          Tiếp tục trên trình duyệt này
        </Button>
      </div>
    </div>
  );
}
