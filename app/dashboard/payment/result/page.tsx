"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCcw, Home } from "lucide-react";

const errorMessages: Record<string, string> = {
  "07": "Trừ tiền thành công nhưng giao dịch bị nghi ngờ",
  "09": "Thẻ/Tài khoản chưa đăng ký Internet Banking",
  "10": "Xác thực thông tin thẻ sai quá 3 lần",
  "11": "Đã hết hạn chờ thanh toán",
  "12": "Thẻ/Tài khoản bị khóa",
  "13": "Nhập sai mật khẩu OTP",
  "24": "Bạn đã hủy giao dịch",
  "51": "Tài khoản không đủ số dư",
  "65": "Vượt quá hạn mức giao dịch trong ngày",
  "75": "Ngân hàng đang bảo trì",
  "79": "Nhập sai mật khẩu quá số lần cho phép",
  "99": "Lỗi không xác định",
  invalid_signature: "Chữ ký không hợp lệ",
  missing_ref: "Thiếu mã giao dịch",
  server_error: "Lỗi hệ thống",
};

function PaymentResultPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status");
  const paymentId = searchParams.get("paymentId");
  const errorCode = searchParams.get("code") || searchParams.get("reason");
  const warning = searchParams.get("warning");

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen items-center bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="grid-pattern absolute inset-0 opacity-30" />

      {/* Floating orbs */}
      <div className="orb orb-primary animate-float-slow -left-48 -top-48 h-96 w-96" />
      <div className="orb orb-accent animate-float-delayed -bottom-40 -right-40 h-80 w-80" />
      <div className="orb orb-primary animate-float right-1/4 top-1/4 h-48 w-48 opacity-50" />

      {/* Header - only for failed state */}
      {!isSuccess && (
        <header className="border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-12 items-center justify-center">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/images/logo-full.png"
                  alt="Vielora"
                  width={120}
                  height={40}
                  className="h-16 w-auto"
                  priority
                />
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto flex max-w-lg flex-col justify-center px-4 py-60">
        {/* Back link */}
        <div className="mb-4 w-full">
          {isSuccess ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Về Dashboard
            </button>
          ) : (
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Quay lại trang chủ
            </Link>
          )}
        </div>

        <Card className="relative w-full">
          {/* Gradient accent line */}
          <div className={`bg-gradient-primary absolute left-0 right-0 top-0 h-1 rounded-t-lg`} />
          <CardContent className="p-8">
            {isSuccess ? (
              <>
                <div className="flex flex-col items-center space-y-6 py-4">
                  {/* Logo */}
                  <Link href="/" className="flex items-center justify-center">
                    <Image
                      src="/images/logo-icon.png"
                      alt="Vielora"
                      width={80}
                      height={80}
                      className="h-20 w-20"
                      priority
                    />
                  </Link>

                  {/* Icon + Title inline */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-7 w-7 text-green-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Thanh toán thành công!
                    </h2>
                  </div>

                  {/* Package info + transaction ID */}
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      Gói dịch vụ của bạn đã được kích hoạt thành công.
                    </p>
                    {warning === "processing_delayed" && (
                      <p className="text-sm text-amber-500">
                        Hệ thống đang xử lý, gói của bạn sẽ được cập nhật trong vài phút.
                      </p>
                    )}
                    {paymentId && (
                      <p className="text-sm text-muted-foreground">
                        Mã giao dịch:{" "}
                        <span className="font-medium text-foreground">{paymentId}</span>
                      </p>
                    )}
                  </div>

                  {/* Single CTA button */}
                  <Button onClick={() => router.push("/dashboard/upgrade")}>
                    Xem gói của tôi
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Failed state */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-foreground">
                  Thanh toán không thành công
                </h1>
                <p className="mb-2 text-muted-foreground">
                  {errorCode
                    ? errorMessages[errorCode] || `Lỗi: ${errorCode}`
                    : "Giao dịch đã bị hủy hoặc gặp lỗi."}
                </p>
                {paymentId && (
                  <p className="mb-6 text-xs text-muted-foreground">Mã giao dịch: {paymentId}</p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1" onClick={() => router.push("/dashboard/upgrade")}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Thử lại
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/dashboard")}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Về Dashboard
                  </Button>
                </div>
              </>
            )}

            <div className="mt-8 border-t border-border/60 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Cần hỗ trợ?{" "}
                <a href="mailto:contact@titops.com" className="text-primary hover:underline">
                  Liên hệ support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <PaymentResultPageContent />
    </Suspense>
  );
}
