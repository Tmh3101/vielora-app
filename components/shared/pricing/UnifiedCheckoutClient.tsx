"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  CheckCircle2,
  Package,
  CalendarDays,
  Clock,
  Building2,
  ChevronDown,
  Zap,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { PayOSCheckout } from "@/components/shared/PayOSCheckout";
import { ESubscriptionStatus, ESubscriptionCycle, ESubscriptionPlan } from "@/types";
import { PaymentAction } from "@/lib/constants/payment";
import { InvoiceForm, type InvoiceFormHandle } from "@/components/shared/InvoiceForm";
import {
  calculateEnterprisePrice,
  ENTERPRISE_PRICE,
  clampValue,
} from "@/config/pricing-enterprise";
import { useWorkspace } from "@/hooks/useWorkspace";
import { OrderSummaryCard } from "@/components/shared/OrderSummaryCard";

function formatVND(amount: number): string {
  if (amount === 0) return "0";
  return amount.toLocaleString("vi-VN");
}

function getPriceFromPlan(plan: Tables<"plans">, cycle: ESubscriptionCycle): number {
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

export interface UnifiedCheckoutClientProps {
  mode: "subscription" | "credits";
}

export function UnifiedCheckoutClient({ mode }: UnifiedCheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Workspace display fallback
  const workspaceName = activeWorkspace?.name || "Workspace hiện tại";

  // Subscription state
  const queryPlan = searchParams.get("plan") || ESubscriptionPlan.Standard;
  const queryCycle = searchParams.get("cycle") || ESubscriptionCycle.Monthly;
  const queryAction = searchParams.get("action") || PaymentAction.Upgrade;
  const queryBots = searchParams.get("bots");
  const queryCredits = searchParams.get("credits");
  const queryDeltaBots = searchParams.get("deltaBots");
  const queryDeltaCredits = searchParams.get("deltaCredits");
  const queryIsIncremental = searchParams.get("isIncremental") === "true";

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(queryPlan);
  const [billingCycle] = useState<ESubscriptionCycle>(
    queryCycle === ESubscriptionCycle.Yearly
      ? ESubscriptionCycle.Yearly
      : ESubscriptionCycle.Monthly
  );
  const action = queryAction as (typeof PaymentAction)[keyof typeof PaymentAction];

  const [plans, setPlans] = useState<Tables<"plans">[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(mode === "subscription");

  // Credits state
  const initialPackageId = searchParams.get("packageId");
  const [packages, setPackages] = useState<Tables<"credit_packages">[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [isLoadingPackages, setIsLoadingPackages] = useState(mode === "credits");
  const [showPackagePicker, setShowPackagePicker] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [quantityError, setQuantityError] = useState(false);

  // Common payment state
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string>("");
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const [prorationDiscount, setProrationDiscount] = useState<number>(0);
  const [isCalculatingProration, setIsCalculatingProration] = useState(false);

  const [countdown, setCountdown] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const invoiceFormRef = useRef<InvoiceFormHandle>(null);

  // Sync query params for subscription plan code
  useEffect(() => {
    if (mode === "subscription" && queryPlan) {
      setSelectedPlanCode(queryPlan);
    }
  }, [mode, queryPlan]);

  // Reset checkout on selection change
  useEffect(() => {
    setCheckoutUrl(null);
    setCheckoutPaymentId("");
    setCheckoutReturnUrl("");
    setCountdown(0);
    setIsExpired(false);
  }, [selectedPlanCode, billingCycle, selectedPackageId, quantity]);

  // Countdown timer
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

  // Fetch Subscription Plans
  useEffect(() => {
    if (mode !== "subscription") return;
    const fetchPlans = async () => {
      try {
        const data = await getActivePlans(supabase);
        // Store all active plans
        setPlans(data.filter((p) => p.code !== ESubscriptionPlan.Free));
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [supabase, mode]);

  // Fetch Credit Packages
  useEffect(() => {
    if (mode !== "credits") return;
    const fetchPackages = async () => {
      try {
        const { data: rawData, error } = await supabase
          .from("credit_packages")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

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
  }, [supabase, mode, initialPackageId]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Fetch Proration (Subscription mode)
  useEffect(() => {
    if (mode !== "subscription" || action !== "upgrade" || !user) return;

    const fetchProration = async () => {
      setIsCalculatingProration(true);
      try {
        const workspaceId = activeWorkspace?.id ?? null;

        const subQuery = supabase
          .from("subscriptions")
          .select("*, plans(monthly_credits, pricing)")
          .eq("status", ESubscriptionStatus.Active);
        const { data: subData } = workspaceId
          ? await subQuery.eq("workspace_id", workspaceId).maybeSingle()
          : await subQuery.eq("user_id", user.id).maybeSingle();

        const sub = subData as
          | (Tables<"subscriptions"> & { plans: Tables<"plans"> | Tables<"plans">[] | null })
          | null;
        if (!sub || !sub.plans) return;

        const plansData = sub.plans;
        const planData = (
          Array.isArray(plansData) ? plansData[0] : plansData
        ) as Tables<"plans"> | null;

        if (!planData || !planData.monthly_credits) return;

        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        if (now >= periodEnd) return;

        const walletQuery = supabase.from("wallets").select("subscription_credits");
        const { data: walletData } = workspaceId
          ? await walletQuery.eq("workspace_id", workspaceId).maybeSingle()
          : await walletQuery.eq("user_id", user.id).maybeSingle();

        const wallet = walletData as Tables<"wallets"> | null;
        const currentCredits = wallet?.subscription_credits ?? 0;
        const pricing = planData.pricing as Record<string, Record<string, number>> | null;
        const pricePaid = pricing?.VND?.[sub.billing_cycle || ESubscriptionCycle.Monthly] ?? 0;
        if (pricePaid <= 0) return;

        const isYearly = sub.billing_cycle === ESubscriptionCycle.Yearly;
        const totalCreditsPeriod = planData.monthly_credits * (isYearly ? 12 : 1);

        let fullMonthsLeft = 0;
        if (sub.next_credit_reset_at) {
          const nextReset = new Date(sub.next_credit_reset_at);
          if (nextReset < periodEnd && nextReset >= now) {
            const monthsDiff =
              (periodEnd.getFullYear() - nextReset.getFullYear()) * 12 +
              (periodEnd.getMonth() - nextReset.getMonth());
            fullMonthsLeft = Math.max(0, monthsDiff);
          } else if (nextReset >= periodEnd) {
            fullMonthsLeft = 0;
          } else if (nextReset < now && isYearly) {
            const remainingTime = periodEnd.getTime() - now.getTime();
            fullMonthsLeft = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 30));
          }
        }

        const remainingCredits =
          fullMonthsLeft * planData.monthly_credits + Math.max(0, currentCredits);
        const discount = Math.floor((remainingCredits / totalCreditsPeriod) * pricePaid);
        setProrationDiscount(discount);
      } catch (e) {
        console.error(e);
      } finally {
        setIsCalculatingProration(false);
      }
    };

    fetchProration();
  }, [user, action, supabase, mode, activeWorkspace]);

  // Resolve Selected Plan (Support Enterprise Virtual Plan object to fix inactive button bug)
  const selectedPlan = useMemo(() => {
    if (mode !== "subscription") return null;
    if (selectedPlanCode === ESubscriptionPlan.Enterprise) {
      const bots = clampValue(
        Number(queryBots || ENTERPRISE_PRICE.bots.min),
        ENTERPRISE_PRICE.bots.min,
        ENTERPRISE_PRICE.bots.max,
        ENTERPRISE_PRICE.bots.step
      );
      const credits = clampValue(
        Number(queryCredits || ENTERPRISE_PRICE.monthlyCredits.min),
        ENTERPRISE_PRICE.monthlyCredits.min,
        ENTERPRISE_PRICE.monthlyCredits.max,
        ENTERPRISE_PRICE.monthlyCredits.step
      );
      return {
        id: "enterprise-plan-virtual-id",
        code: ESubscriptionPlan.Enterprise,
        name: "Enterprise",
        description: "Gói Enterprise tự cấu hình theo yêu cầu",
        monthly_credits: credits,
        bots_limit: bots,
        pricing: { VND: { monthly: 1900000, yearly: 19000000 } },
        is_active: true,
        created_at: "",
        updated_at: "",
      } as Tables<"plans">;
    }
    return plans.find((p) => p.code === selectedPlanCode) || null;
  }, [mode, selectedPlanCode, plans, queryBots, queryCredits]);

  // Selected Credit Package
  const selectedPackage = useMemo(() => {
    if (mode !== "credits") return null;
    return packages.find((p) => p.id === selectedPackageId) || null;
  }, [mode, selectedPackageId, packages]);

  // Price Calculations
  const calculatedBasePrice = useMemo(() => {
    if (mode === "subscription") {
      if (!selectedPlan) return 0;
      if (selectedPlanCode === ESubscriptionPlan.Enterprise) {
        if (queryIsIncremental || queryDeltaBots || queryDeltaCredits) {
          const { calculateEnterpriseUpgradePrice } = require("@/config/pricing-enterprise");
          const { calculateRemainingMonths } = require("@/lib/helpers/payment-helpers");
          const dBots = Number(queryDeltaBots || 0);
          const dCredits = Number(queryDeltaCredits || 0);
          // If we can get remaining months from query or default 1
          const remMonths = searchParams.get("remainingMonths")
            ? Number(searchParams.get("remainingMonths"))
            : 1;
          return calculateEnterpriseUpgradePrice(dBots, dCredits, billingCycle, remMonths);
        }
        const bots = clampValue(
          Number(queryBots || ENTERPRISE_PRICE.bots.min),
          ENTERPRISE_PRICE.bots.min,
          ENTERPRISE_PRICE.bots.max,
          ENTERPRISE_PRICE.bots.step
        );
        const credits = clampValue(
          Number(queryCredits || ENTERPRISE_PRICE.monthlyCredits.min),
          ENTERPRISE_PRICE.monthlyCredits.min,
          ENTERPRISE_PRICE.monthlyCredits.max,
          ENTERPRISE_PRICE.monthlyCredits.step
        );
        return calculateEnterprisePrice(bots, credits, billingCycle);
      }
      return getPriceFromPlan(selectedPlan, billingCycle);
    } else {
      if (!selectedPackage) return 0;
      return ((selectedPackage.price as { VND?: number })?.VND || 0) * quantity;
    }
  }, [
    mode,
    selectedPlan,
    selectedPlanCode,
    billingCycle,
    queryBots,
    queryCredits,
    selectedPackage,
    quantity,
  ]);

  const finalTotalPrice = Math.max(0, calculatedBasePrice - prorationDiscount);

  // Cancel payment API helper
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

  // Payment Submit Handler
  const handlePayment = async () => {
    if (mode === "subscription" && (!selectedPlan || finalTotalPrice < 0)) {
      toast.error("Vui lòng chọn gói trả phí hợp lệ");
      return;
    }
    if (mode === "credits" && (!selectedPackage || finalTotalPrice <= 0)) {
      toast.error("Vui lòng chọn một gói nạp hợp lệ");
      return;
    }

    if (!invoiceFormRef.current?.validate()) {
      toast.error("Vui lòng kiểm tra lại thông tin xuất hóa đơn");
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

      const invoiceData = invoiceFormRef.current.getInvoiceData();
      const endpoint =
        mode === "subscription" ? "/api/payment/payos-create" : "/api/payment/payg-create";
      const payload =
        mode === "subscription"
          ? {
              planCode: selectedPlanCode,
              billingCycle,
              action,
              workspaceId: activeWorkspace?.id ?? null,
              requestInvoice: invoiceData.requestInvoice,
              invoice: invoiceData.invoice,
              botsLimit: queryBots ? Number(queryBots) : undefined,
              monthlyCredits: queryCredits ? Number(queryCredits) : undefined,
              deltaBots: queryDeltaBots ? Number(queryDeltaBots) : undefined,
              deltaCredits: queryDeltaCredits ? Number(queryDeltaCredits) : undefined,
              isIncrementalUpgrade:
                queryIsIncremental || Boolean(queryDeltaBots || queryDeltaCredits),
            }
          : {
              packageId: selectedPackageId,
              quantity,
              requestInvoice: invoiceData.requestInvoice,
              invoice: invoiceData.invoice,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.fieldErrors) {
          invoiceFormRef.current.setServerErrors(data.fieldErrors);
        }
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

  const isLoading = authLoading || (mode === "subscription" ? isLoadingPlans : isLoadingPackages);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pickerPlans = plans.filter((p) => p.code !== ESubscriptionPlan.Enterprise);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
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

      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <h1 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          {mode === "subscription" ? "Xác nhận thanh toán" : "Mua Credit Pay-as-you-go"}
        </h1>

        {/* Read-Only Workspace Banner (Requirement 1) */}
        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-2 sm:p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Workspace hiện tại:
                </span>
                <span className="text-sm font-bold text-foreground">{workspaceName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left Column: Form / Item details */}
          <div className="space-y-6 lg:col-span-3">
            {/* Item Card: Subscription vs Credits */}
            {mode === "subscription" ? (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Gói dịch vụ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-primary/50 bg-primary/5 p-4">
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
                  </div>

                  {showPlanPicker && (
                    <div className="space-y-2 rounded-xl border border-border/60 p-3">
                      {pickerPlans.map((plan) => {
                        const planPrice = getPriceFromPlan(plan, billingCycle);
                        const isSelected = plan.code === selectedPlanCode;
                        return (
                          <div
                            key={plan.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all ${
                              isSelected
                                ? "border border-primary bg-primary/5"
                                : "hover:bg-muted/50"
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

                  <div className="flex gap-3">
                    {billingCycle === ESubscriptionCycle.Monthly ? (
                      <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 p-3 text-sm font-medium text-primary">
                        <Package className="h-4 w-4" />
                        Gói tháng
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 p-3 text-sm font-medium text-primary">
                        <CalendarDays className="h-4 w-4" />
                        Gói năm
                        <Badge
                          variant="secondary"
                          className="bg-green-500/20 text-xs text-green-600"
                        >
                          -17%
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                              isSelected
                                ? "border border-primary bg-primary/5"
                                : "hover:bg-muted/50"
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
                            <span className="font-semibold">
                              {formatVND((pkg.price as { VND?: number })?.VND || 0)}đ
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedPackage && (
                    <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                      <span className="text-sm font-medium text-foreground">Số lượng</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:border-primary hover:bg-white hover:text-primary"
                          onClick={() => {
                            const next = Math.max(1, quantity - 1);
                            setQuantity(next);
                            setQuantityInput(String(next));
                            setQuantityError(false);
                          }}
                          disabled={isProcessing || quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={quantityInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setQuantityInput("");
                              setQuantityError(true);
                              return;
                            }
                            if (!/^\d+$/.test(raw)) return;
                            if (raw.startsWith("0") && raw.length > 1) return;
                            const num = parseInt(raw, 10);
                            if (num > 100) return;
                            setQuantityInput(raw);
                            setQuantityError(num < 1);
                            if (num >= 1) setQuantity(num);
                          }}
                          onBlur={() => {
                            const num = parseInt(quantityInput, 10);
                            if (isNaN(num) || num < 1) {
                              setQuantity(1);
                              setQuantityInput("1");
                              setQuantityError(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          disabled={isProcessing}
                          className={`h-8 w-12 rounded-md border text-center text-sm font-semibold outline-none transition-colors ${
                            quantityError
                              ? "border-red-500 focus:border-red-500"
                              : "border-border/60 focus:border-primary"
                          } bg-background`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:border-primary hover:bg-white hover:text-primary"
                          onClick={() => {
                            const next = Math.min(100, quantity + 1);
                            setQuantity(next);
                            setQuantityInput(String(next));
                          }}
                          disabled={isProcessing || quantity >= 100}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Feature details */}
            {mode === "subscription" && selectedPlan && (
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

            {mode === "credits" && selectedPackage && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Thông tin gói nạp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">Số Credits nhận được</p>
                      <p className="text-lg font-semibold text-green-600">
                        +{(selectedPackage.credits_amount * quantity).toLocaleString()}
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

            {/* Invoice Form */}
            {!checkoutUrl && (
              <InvoiceForm ref={invoiceFormRef} disabled={isProcessing} userEmail={user?.email} />
            )}
          </div>

          {/* Right Column: Order summary / PayOS Iframe */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              {!checkoutUrl ? (
                <OrderSummaryCard
                  title="Tóm tắt đơn hàng"
                  subtitle={
                    mode === "subscription"
                      ? selectedPlan
                        ? `Gói ${selectedPlan.name}`
                        : undefined
                      : selectedPackage
                        ? selectedPackage.name
                        : undefined
                  }
                  items={
                    mode === "subscription"
                      ? [
                          ...(selectedPlan
                            ? [
                                {
                                  label: `Gói ${selectedPlan.name} (${
                                    billingCycle === ESubscriptionCycle.Monthly ? "tháng" : "năm"
                                  }):`,
                                  value: `${formatVND(calculatedBasePrice)}đ`,
                                },
                                {
                                  label: "Số lượng chatbot:",
                                  value: `${selectedPlan.bots_limit} bots`,
                                },
                                {
                                  label: "Credits hàng tháng:",
                                  value: `${selectedPlan.monthly_credits.toLocaleString("vi-VN")} credits`,
                                },
                              ]
                            : []),
                          ...(prorationDiscount > 0
                            ? [
                                {
                                  label: "Trừ bù gói cũ (còn dư):",
                                  value: `- ${formatVND(prorationDiscount)}đ`,
                                  isHighlighted: true,
                                },
                              ]
                            : []),
                          ...(billingCycle === ESubscriptionCycle.Yearly
                            ? [
                                {
                                  label: "Ưu đãi thanh toán năm:",
                                  value: "-17%",
                                  isHighlighted: true,
                                },
                              ]
                            : []),
                        ]
                      : [
                          ...(selectedPackage
                            ? [
                                {
                                  label: `${selectedPackage.name} × ${quantity}:`,
                                  value: `${formatVND(calculatedBasePrice)}đ`,
                                },
                                {
                                  label: "Credits nhận được:",
                                  value: `+${(
                                    selectedPackage.credits_amount * quantity
                                  ).toLocaleString("vi-VN")} credits`,
                                  isHighlighted: true,
                                },
                              ]
                            : []),
                        ]
                  }
                  totalPrice={`${formatVND(finalTotalPrice)}đ`}
                  totalLabel="Tổng cộng:"
                  monthlyEquivalentPrice={
                    mode === "subscription" &&
                    billingCycle === ESubscriptionCycle.Yearly &&
                    finalTotalPrice > 0
                      ? `~ ${formatVND(Math.round(finalTotalPrice / 12))}đ/tháng`
                      : undefined
                  }
                  ctaText="Thanh toán ngay"
                  isProcessing={isProcessing}
                  disabled={
                    mode === "subscription"
                      ? !selectedPlan || finalTotalPrice < 0 || isCalculatingProration
                      : !selectedPackage
                  }
                  onCheckout={handlePayment}
                />
              ) : null}

              {checkoutUrl && (
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
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
