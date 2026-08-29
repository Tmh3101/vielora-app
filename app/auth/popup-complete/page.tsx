"use client";

import { useEffect } from "react";

export default function PopupCompletePage() {
  useEffect(() => {
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "OAUTH_COMPLETE" }, window.location.origin);
      }
    } catch (e) {
      console.error("[OAuthPopup] Failed to postMessage to opener:", e);
    }

    const timer = setTimeout(() => {
      window.close();
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-foreground">Đăng nhập thành công!</p>
        <p className="animate-pulse text-xs text-muted-foreground">
          Đang hoàn tất và quay lại ứng dụng...
        </p>
      </div>
    </div>
  );
}
