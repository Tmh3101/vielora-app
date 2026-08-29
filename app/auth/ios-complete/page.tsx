"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function IOSCompleteContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const isError = Boolean(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-lg border-border/60 shadow-lg backdrop-blur-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center space-y-6 py-2 text-center">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center justify-center transition-opacity hover:opacity-90"
            >
              <Image
                src="/images/logo-icon.png"
                alt="Vielora"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20"
                priority
              />
            </Link>

            {/* Icon + Title inline */}
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
              {isError ? (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20">
                  <AlertCircle className="h-7 w-7 text-amber-500" />
                </div>
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
              )}
              <h2 className="text-xl font-semibold text-foreground">
                {isError ? "Xác thực không thành công" : "Đăng nhập thành công"}
              </h2>
            </div>

            {/* Content info */}
            <div className="w-full space-y-3 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isError
                  ? "Quá trình đăng nhập đã bị hủy hoặc gặp sự cố. Bạn có thể quay lại app để thử lại."
                  : "Tài khoản của bạn đã được xác thực an toàn. Phiên làm việc đã sẵn sàng trên ứng dụng PWA."}
              </p>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-left">
                <div className="flex gap-3">
                  <Smartphone
                    className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? "text-amber-500" : "text-emerald-500"}`}
                  />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-foreground">Quay lại ứng dụng PWA</p>
                    <p className="leading-relaxed text-muted-foreground">
                      Vui lòng nhấn nút{" "}
                      <strong className="text-foreground">&quot;Xong&quot;</strong> hoặc{" "}
                      <strong className="text-foreground">&quot;Done&quot;</strong> ở góc trên màn
                      hình để quay lại ứng dụng chatbot.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support footer */}
            <div className="w-full border-t border-border/60 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Cần hỗ trợ?{" "}
                <a
                  href="mailto:contact@vielora.vn"
                  className="font-medium text-primary hover:underline"
                >
                  Liên hệ support
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IOSCompletePage() {
  return (
    <Suspense fallback={null}>
      <IOSCompleteContent />
    </Suspense>
  );
}
