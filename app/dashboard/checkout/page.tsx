"use client";

import { useState, useEffect, Suspense, useCallback, memo, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActivePlans } from "@/lib/services/plan.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Shield,
  CheckCircle2,
  Package,
  CalendarDays,
  ChevronDown,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { usePayOS, PayOSConfig } from "@payos/payos-checkout";

function formatVND(amount: number): string {
  if (amount === 0) return "0";
  return amount.toLocaleString("vi-VN");
}

function getPriceFromPlan(plan: Tables<"plans">, cycle: "monthly" | "yearly"): number {
  try {
    const pricing = plan.pricing as Record<string, Record<string, number>> | null;
    return pricing?.VND?.[cycle] ?? 0;
  } catch {
    return 0;
  }
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const queryPlan = searchParams.get("plan") || "standard";
  const queryCycle = searchParams.get("cycle") || "monthly";

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(queryPlan);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    queryCycle === "yearly" ? "yearly" : "monthly"
  );

  // Embedded Checkout URL
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string>("");
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string>("");
  const [plans, setPlans] = useState<Tables<"plans">[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  // Countdown timer (15 minutes = 900 seconds)
  const [countdown, setCountdown] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Reset checkout khi thay đổi gói hoặc chu kỳ
  useEffect(() => {
    setCheckoutUrl(null);
    setCheckoutPaymentId("");
    setCheckoutReturnUrl("");
    setCountdown(0);
    setIsExpired(false);
  }, [selectedPlanCode, billingCycle]);

  // Countdown timer effect
  useEffect(() => {
    if (!countdown || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          // Cancel payment on server khi hết hạn
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

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await getActivePlans(supabase);
        setPlans(data.filter((p) => p.code !== "enterprise" && p.code !== "free"));
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [supabase]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode);
  const price = selectedPlan ? getPriceFromPlan(selectedPlan, billingCycle) : 0;

  const handlePayment = async () => {
    if (!selectedPlan || price <= 0) {
      toast.error("Vui lòng chọn gói trả phí");
      return;
    }

    setIsProcessing(true);

    try {
      // Get session token for API auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/auth");
        return;
      }

      const response = await fetch("/api/payment/payos-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planCode: selectedPlanCode,
          billingCycle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Có lỗi xảy ra khi tạo thanh toán");
        setIsProcessing(false);
        return;
      }

      // Initialize PayOS checkout form instead of redirecting
      setCheckoutUrl(data.paymentUrl);
      setCheckoutReturnUrl(data.returnUrl || window.location.origin);
      setCheckoutPaymentId(data.paymentId);
      setCountdown(15 * 60); // Start 15-minute countdown
      setIsExpired(false); // Reset trạng thái expired
      setIsProcessing(false);
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Có lỗi xảy ra. Vui lòng thử lại.");
      setIsProcessing(false);
    }
  };

  // Gọi API cancel payment trên server
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

  // Gọi khi user bấm nút "Hủy thanh toán" hoặc "Tạo mã thanh toán mới"
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

  // Gọi khi iframe PayOS tự động hết hạn hoặc user bấm hủy bên trong iframe
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

  if (authLoading || isLoadingPlans) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          Xác nhận thanh toán
        </h1>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Order details */}
          <div className="space-y-6 lg:col-span-3">
            {/* Plan selection */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Gói dịch vụ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selected plan */}
                <div
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-primary/50 bg-primary/5 p-4 transition-all hover:border-primary"
                  onClick={() => setShowPlanPicker(!showPlanPicker)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedPlan?.name || "Chọn gói"}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedPlan?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Thay đổi</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        showPlanPicker ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Plan picker dropdown */}
                {showPlanPicker && (
                  <div className="space-y-2 rounded-xl border border-border/60 p-3">
                    {plans.map((plan) => {
                      const planPrice = getPriceFromPlan(plan, billingCycle);
                      const isSelected = plan.code === selectedPlanCode;
                      return (
                        <div
                          key={plan.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all ${
                            isSelected ? "border border-primary bg-primary/5" : "hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            setSelectedPlanCode(plan.code);
                            setShowPlanPicker(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-medium">{plan.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {plan.monthly_credits.toLocaleString()} credits/tháng ·{" "}
                                {plan.bots_limit} bot
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold">{formatVND(planPrice)}đ</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Billing cycle toggle */}
                <div className="flex gap-3">
                  <button
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                      billingCycle === "monthly"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                    onClick={() => setBillingCycle("monthly")}
                  >
                    <Package className="h-4 w-4" />
                    Gói tháng
                  </button>
                  <button
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all ${
                      billingCycle === "yearly"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                    onClick={() => setBillingCycle("yearly")}
                  >
                    <CalendarDays className="h-4 w-4" />
                    Gói năm
                    <Badge variant="secondary" className="bg-green-500/20 text-xs text-green-600">
                      -17%
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Plan features */}
            {selectedPlan && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Chi tiết gói {selectedPlan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">Credits/tháng</p>
                      <p className="text-lg font-semibold">
                        {selectedPlan.monthly_credits.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">Số bot tối đa</p>
                      <p className="text-lg font-semibold">{selectedPlan.bots_limit}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between space-x-10 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">Thanh toán</p>
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

          {/* Right: Payment summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <Card className="border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Tóm tắt đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPlan && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Gói {selectedPlan.name} ({billingCycle === "monthly" ? "tháng" : "năm"})
                        </span>
                        <span className="font-medium">{formatVND(price)}đ</span>
                      </div>

                      {billingCycle === "yearly" && price > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Tương đương/tháng</span>
                          <span className="text-muted-foreground">
                            ~{formatVND(Math.round(price / 12))}đ
                          </span>
                        </div>
                      )}

                      <div className="border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold">Tổng cộng</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatVND(price)}đ
                          </span>
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
                        disabled={isProcessing || !selectedPlan || price <= 0}
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
                  {/* Countdown timer */}
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

                  {/* PayOS checkout frame */}
                  <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-white shadow-sm">
                    {/* Expired overlay */}
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
                      Hoàn tiền 100% trong 7 ngày
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Hủy bất cứ lúc nào</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Kích hoạt ngay sau thanh toán
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

const PayOSCheckout = memo(
  ({
    url,
    returnUrl,
    paymentId,
    onCancelPayment,
    onPayOSInternalExit,
  }: {
    url: string;
    returnUrl: string;
    paymentId: string;
    onCancelPayment: () => void;
    onPayOSInternalExit: (_event?: unknown) => void;
  }) => {
    const payOSConfig = {
      RETURN_URL: returnUrl,
      ELEMENT_ID: "payos-checkout-frame",
      CHECKOUT_URL: url,
      embedded: true,
      onSuccess: (event: Record<string, unknown>) => {
        console.log("PayOS onSuccess event:", event);
        const params = new URLSearchParams({
          paymentId: paymentId,
          code: "00",
          status: "PAID",
          orderCode: String(event?.orderCode || ""),
        });
        window.location.href = `/api/payment/payos-return?${params.toString()}`;
      },
      onCancel: (event: Record<string, unknown>) => {
        console.log("PayOS onCancel event:", event);
        onPayOSInternalExit(event);
      },
      onExit: (event: Record<string, unknown>) => {
        console.log("PayOS onExit event:", event);
        onPayOSInternalExit(event);
      },
    } satisfies PayOSConfig;

    const { open, exit } = usePayOS(payOSConfig);

    useEffect(() => {
      open();

      return () => {
        exit();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, returnUrl, paymentId]);

    return (
      <div className="relative flex w-full flex-col items-center justify-center bg-white">
        <div
          id="payos-checkout-frame"
          className="relative z-20 flex h-[400px] w-full items-center justify-center overflow-hidden"
          style={{ margin: "-10px 0" }}
        ></div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancelPayment}
          className="relative z-20 mb-4 mt-2 text-muted-foreground hover:text-foreground"
        >
          Hủy thanh toán
        </Button>
      </div>
    );
  }
);

PayOSCheckout.displayName = "PayOSCheckout";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
