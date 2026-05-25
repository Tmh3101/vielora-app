"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayOSCheckout } from "@/components/shared/PayOSCheckout";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Shield,
  CheckCircle2,
  ChevronDown,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";

function formatVND(amount: number): string {
  if (amount === 0) return "0";
  return amount.toLocaleString("vi-VN");
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function CreditCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPackageId = searchParams.get("packageId");
  const { user, isLoading: authLoading } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [packages, setPackages] = useState<Tables<"credit_packages">[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string>("");
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPackagePicker, setShowPackagePicker] = useState(false);

  const [countdown, setCountdown] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    setCheckoutUrl(null);
    setCheckoutPaymentId("");
    setCheckoutReturnUrl("");
    setCountdown(0);
    setIsExpired(false);
  }, [selectedPackageId]);

  useEffect(() => {
    if (!countdown || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          if (checkoutPaymentId) {
            cancelPaymentOnServer(checkoutPaymentId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutUrl]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data: rawData, error } = await supabase
          .from("credit_packages")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        // Sort by VND price in memory since price is now JSONB
        const sortedData = ((rawData as Tables<"credit_packages">[]) || []).sort((a, b) => {
          const priceA = (a.price as { VND?: number })?.VND || 0;
          const priceB = (b.price as { VND?: number })?.VND || 0;
          return priceA - priceB;
        });

        setPackages(sortedData || []);
        if (sortedData && sortedData.length > 0) {
          if (initialPackageId && sortedData.some((p) => p.id === initialPackageId)) {
            setSelectedPackageId(initialPackageId);
          } else {
            setSelectedPackageId(sortedData[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching credit packages:", error);
        toast.error("Không thể tải danh sách gói Credit");
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [supabase, initialPackageId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  const cancelPaymentOnServer = useCallback(async (paymentId: string) => {
    try {
      await fetch("/api/payment/payos-cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
    } catch (e) {
      console.error("Failed to cancel payment on server:", e);
    }
  }, []);

  const handlePayment = async () => {
    if (!selectedPackage) {
      toast.error("Vui lòng chọn một gói nạp");
      return;
    }

    setIsProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/auth");
        return;
      }

      const response = await fetch("/api/payment/payg-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          packageId: selectedPackageId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Có lỗi xảy ra khi tạo thanh toán");
        setIsProcessing(false);
        return;
      }

      setCheckoutUrl(data.paymentUrl);
      setCheckoutReturnUrl(data.returnUrl || window.location.origin);
      setCheckoutPaymentId(data.paymentId);
      setCountdown(15 * 60);
      setIsExpired(false);
      setIsProcessing(false);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      setIsProcessing(false);
    }
  };

  const handleCancelPayment = useCallback(() => {
    if (checkoutPaymentId) {
      cancelPaymentOnServer(checkoutPaymentId);
    }
    setCheckoutUrl(null);
    setCheckoutPaymentId("");
    setCheckoutReturnUrl("");
    setCountdown(0);
    setIsExpired(false);
  }, [checkoutPaymentId, cancelPaymentOnServer]);

  const handlePayOSInternalExit = useCallback(
    (_event?: unknown) => {
      if (checkoutPaymentId) {
        cancelPaymentOnServer(checkoutPaymentId);
      }
      setIsExpired(true);
      setCountdown(0);
    },
    [checkoutPaymentId, cancelPaymentOnServer]
  );

  if (authLoading || isLoadingPackages) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="border-none hover:bg-white hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
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

      <main className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
          Mua Credit Pay-as-you-go
        </h1>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Gói nạp Credit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-primary/50 bg-primary/5 p-4 transition-all hover:border-primary"
                  onClick={() => setShowPackagePicker(!showPackagePicker)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedPackage?.name || "Chọn gói nạp"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPackage?.credits_amount.toLocaleString()} credits
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Thay đổi</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        showPackagePicker ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {showPackagePicker && (
                  <div className="space-y-2 rounded-xl border border-border/60 p-3">
                    {packages.map((pkg) => {
                      const isSelected = pkg.id === selectedPackageId;
                      return (
                        <div
                          key={pkg.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all ${
                            isSelected ? "border border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            setSelectedPackageId(pkg.id);
                            setShowPackagePicker(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-medium">{pkg.name}</p>
                              <p className="text-xs text-muted-foreground">
                                +{pkg.credits_amount.toLocaleString()} credits
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block font-semibold">
                              {formatVND((pkg.price as { VND?: number })?.VND || 0)}đ
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ~ ${(pkg.price as { USD?: number })?.USD || 0} USD
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedPackage && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Thông tin gói nạp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">Số Credits nhận được</p>
                      <p className="text-lg font-semibold text-green-600">
                        +{selectedPackage.credits_amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">Đơn giá</p>
                      <p className="text-lg font-semibold">
                        {formatVND(
                          Math.round(
                            ((selectedPackage.price as { VND?: number })?.VND || 0) /
                              selectedPackage.credits_amount
                          )
                        )}
                        đ / credit
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        ~ $
                        {(
                          ((selectedPackage.price as { USD?: number })?.USD || 0) /
                          selectedPackage.credits_amount
                        ).toFixed(4)}{" "}
                        USD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between space-x-10 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">Thanh toán qua</p>
                    <Image
                      src="/images/partners/payos-logo.png"
                      alt="PayOS Logo"
                      width={80}
                      height={44}
                      className="h-11 w-auto object-contain pr-10"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <Card className="border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPackage && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{selectedPackage.name}</span>
                        <div className="text-right">
                          <span className="block font-medium">
                            {formatVND((selectedPackage.price as { VND?: number })?.VND || 0)}đ
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ~ ${(selectedPackage.price as { USD?: number })?.USD || 0} USD
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">Tổng cộng</span>
                          <div className="text-right">
                            <span className="block text-2xl font-bold text-primary">
                              {formatVND((selectedPackage.price as { VND?: number })?.VND || 0)}đ
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              ~ ${(selectedPackage.price as { USD?: number })?.USD || 0} USD
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!checkoutUrl && (
                    <>
                      <Button
                        className="bg-gradient-primary btn-glow shadow-glow-sm w-full hover:opacity-90"
                        size="lg"
                        onClick={handlePayment}
                        disabled={isProcessing || !selectedPackage}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-5 w-5" />
                            Thanh toán qua payOS
                          </>
                        )}
                      </Button>

                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        <span>Thanh toán an toàn qua PayOS</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {checkoutUrl ? (
                <div className="space-y-3">
                  <div
                    className={`flex items-center justify-center gap-2 rounded-xl border p-3 ${
                      isExpired
                        ? "border-red-300 bg-red-50 text-red-600"
                        : countdown <= 60
                          ? "border-red-300 bg-red-50 text-red-600"
                          : countdown <= 180
                            ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                            : "border-primary/30 bg-primary/5 text-primary"
                    }`}
                  >
                    <Clock className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-500">
                      {isExpired ? (
                        "Mã thanh toán đã hết hạn"
                      ) : (
                        <>
                          Mã thanh toán hết hạn sau:{" "}
                          <span className="font-mono text-base font-bold text-red-500">
                            {formatCountdown(countdown)}
                          </span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-white shadow-sm">
                    {isExpired && (
                      <div
                        className="absolute inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-md"
                        style={{ pointerEvents: "auto" }}
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <Clock className="h-10 w-10 text-red-500" />
                          <p className="text-lg font-semibold text-red-600">
                            Mã thanh toán đã hết hạn
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Vui lòng tạo mã thanh toán mới
                          </p>
                        </div>
                        <Button
                          onClick={handleCancelPayment}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Tạo mã thanh toán mới
                        </Button>
                      </div>
                    )}

                    <PayOSCheckout
                      url={checkoutUrl}
                      returnUrl={checkoutReturnUrl}
                      paymentId={checkoutPaymentId}
                      onCancelPayment={handleCancelPayment}
                      onPayOSInternalExit={handlePayOSInternalExit}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Credits không có hạn sử dụng
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Cộng dồn vào tài khoản PAYG
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreditCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreditCheckoutContent />
    </Suspense>
  );
}
