"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  Home,
  Loader2,
} from "lucide-react";

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

type InvoiceStatus = "pending" | "issuing" | "issued" | "failed" | null;

interface InvoiceInfo {
  id: string;
  status: InvoiceStatus;
  invoiceNo: string | null;
  lookupCode: string | null;
  errorMessage: string | null;
}

function useInvoiceStatus(paymentId: string | null, enabled: boolean) {
  const [invoice, setInvoice] = useState<InvoiceInfo | null>(null);
  const [hasInvoice, setHasInvoice] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    if (!paymentId || !enabled) {
      setLoading(false);
      setHasInvoice(false);
      return;
    }
    try {
      const res = await fetch(`/api/invoices/by-payment?paymentId=${paymentId}`);
      const data = await res.json();
      if (data.hasInvoice) {
        setHasInvoice(true);
        setInvoice(data.invoice);
      } else {
        setHasInvoice(false);
        setInvoice(null);
      }
    } catch {
      // keep previous state on network error
    } finally {
      setLoading(false);
    }
  }, [paymentId, enabled]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Poll while pending/issuing
  useEffect(() => {
    if (!enabled || !hasInvoice || !invoice) return;
    if (invoice.status !== "pending" && invoice.status !== "issuing") return;

    const interval = setInterval(fetchInvoice, 3000);
    return () => clearInterval(interval);
  }, [enabled, hasInvoice, invoice, fetchInvoice]);

  return { invoice, hasInvoice, loading };
}

function ProcessingIndicator() {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Hóa đơn đang được xử lý...</span>
    </div>
  );
}

function InvoicePdfPanel({ invoice }: { invoice: InvoiceInfo }) {
  const isFailed = invoice.status === "failed";

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
        {isFailed && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Xuất hóa đơn thất bại</p>
            {invoice.errorMessage && (
              <p className="mt-1 max-w-xs text-center text-xs text-red-500">
                {invoice.errorMessage}
              </p>
            )}
          </div>
        )}

        {invoice.status === "issued" && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Hóa đơn: {invoice.invoiceNo || ""}
              </span>
              <a
                href={`/api/invoices/${invoice.id}/download`}
                className="text-xs font-medium text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Tải hóa đơn (PDF)
              </a>
            </div>
            <iframe
              src={`/api/invoices/${invoice.id}/pdf`}
              className="h-[600px] w-full border-0"
              title={`Hóa đơn ${invoice.invoiceNo || ""}`}
            />
          </div>
        )}

        {(invoice.status === "pending" || invoice.status === "issuing") && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Hóa đơn đang được xuất...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hệ thống đang xử lý, vui lòng đợi trong giây lát.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentResultPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status");
  const paymentId = searchParams.get("paymentId");
  const errorCode = searchParams.get("code") || searchParams.get("reason");
  const warning = searchParams.get("warning");

  const isSuccess = status === "success";
  const { invoice, hasInvoice } = useInvoiceStatus(paymentId, isSuccess);

  const isInvoiceReady = Boolean(
    hasInvoice && invoice && (invoice.status === "issued" || invoice.status === "failed")
  );
  const isInvoiceProcessing = Boolean(
    hasInvoice && (!invoice || invoice.status === "pending" || invoice.status === "issuing")
  );

  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto max-w-6xl px-4 py-20 lg:py-32">
        {/* Back link */}
        <div className="mb-4 w-full">
          {isSuccess ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Về Dashboard
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </Link>
          )}
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            {/* Success Card */}
            <div
              className={`w-full ${hasInvoice && isInvoiceReady ? "lg:w-2/5" : "mx-auto max-w-lg"}`}
            >
              <Card className="w-full">
                <CardContent className="p-8">
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
                    </div>

                    {/* Single CTA button */}
                    <Button onClick={() => router.push("/dashboard/upgrade")}>
                      Xem gói của tôi
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Support footer */}
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

              {/* Below card: processing indicator if user requested an invoice */}
              {hasInvoice && isInvoiceProcessing && !isInvoiceReady && <ProcessingIndicator />}
            </div>

            {/* PDF Panel — show when invoice is ready */}
            {hasInvoice && isInvoiceReady && invoice && (
              <div className="w-full lg:w-3/5">
                <InvoicePdfPanel invoice={invoice} />
              </div>
            )}
          </div>
        ) : (
          /* Failed state - full width */
          <Card className="mx-auto w-full max-w-lg">
            <CardContent className="p-8">
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
        )}
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
