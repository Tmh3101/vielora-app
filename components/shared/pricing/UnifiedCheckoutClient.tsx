"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
  calculateEnterpriseUpgradePrice,
  ENTERPRISE_PRICE,
  clampValue,
} from "@/config/pricing-enterprise";
import { useWorkspace } from "@/hooks/useWorkspace";
import { OrderSummaryCard } from "@/components/shared/OrderSummaryCard";
import { calculateRemainingMonths } from "@/lib/helpers/payment-helpers";
import { CREDIT_UNIT_PRICE_PRORATION } from "@/config/credit-pricing";

function formatVND(amount: number): string {
  if (amount === 0) return "0";
  return amount.toLocaleString();
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
  const t = useTranslations("dashboard.checkout");

  // Workspace display fallback
  const workspaceName = activeWorkspace?.name || t("currentWorkspace");

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
        toast.error(t("errorLoadPackages"));
      } finally {
        setIsLoadingPackages(false);
      }
    };
    fetchPackages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, mode, initialPackageId]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Fetch Proration (Subscription mode)
  // Công thức đơn giản: subscription_credits_còn_lại × CREDIT_UNIT_PRICE_PRORATION (100đ/credit)
  useEffect(() => {
    if (mode !== "subscription" || action !== "upgrade" || !user || !activeWorkspace?.id) return;

    const fetchProration = async () => {
      setIsCalculatingProration(true);
      try {
        const workspaceId = activeWorkspace.id;

        // Kiểm tra subscription hiện tại còn hiệu lực
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*, plans(code)")
          .eq("workspace_id", workspaceId)
          .eq("status", ESubscriptionStatus.Active)
          .maybeSingle();

        const sub = subData as
          | (Tables<"subscriptions"> & { plans: Tables<"plans"> | Tables<"plans">[] | null })
          | null;

        if (!sub || !sub.plans) return;

        const plansData = sub.plans;
        const planData = (
          Array.isArray(plansData) ? plansData[0] : plansData
        ) as Tables<"plans"> | null;

        if (!planData || planData.code === "free") return;

        const now = new Date();
        const periodEnd = new Date(sub.current_period_end);
        if (now >= periodEnd) return;

        // Lấy subscription_credits từ API (để tránh bị RLS chặn trên browser)
        let subscriptionCredits = 0;
        try {
          const creditRes = await fetch(`/api/workspaces/${workspaceId}/credits`);
          if (creditRes.ok) {
            const creditJson = await creditRes.json();
            if (creditJson.success && creditJson.data) {
              subscriptionCredits = Math.max(0, creditJson.data.subscriptionCredits ?? 0);
            }
          }
        } catch (fetchErr) {
          console.error("Error fetching credits for proration:", fetchErr);
        }

        const finalDiscount = subscriptionCredits * CREDIT_UNIT_PRICE_PRORATION;
        setProrationDiscount(finalDiscount);
      } catch (e) {
        console.error("Error calculating proration:", e);
      } finally {
        setIsCalculatingProration(false);
      }
    };

    fetchProration();
  }, [user, action, supabase, mode, activeWorkspace]);

  // Fetch Active Subscription for Workspace
  const [activeSub, setActiveSub] = useState<{
    bots_limit_override: number | null;
    monthly_credits_override: number | null;
    current_period_end: string | null;
    billing_cycle: string | null;
  } | null>(null);

  useEffect(() => {
    if (!activeWorkspace?.id || mode !== "subscription") return;
    const fetchActiveSub = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select(
            "bots_limit_override, monthly_credits_override, current_period_end, billing_cycle, plans(code)"
          )
          .eq("workspace_id", activeWorkspace.id)
          .eq("status", ESubscriptionStatus.Active)
          .order("current_period_end", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setActiveSub(data);
        }
      } catch (err) {
        console.error("Error fetching active sub in checkout:", err);
      }
    };
    fetchActiveSub();
  }, [activeWorkspace?.id, supabase, mode]);

  const isIncrementalUpgrade = useMemo(() => {
    return (
      selectedPlanCode === ESubscriptionPlan.Enterprise &&
      (queryIsIncremental || Boolean(queryDeltaBots || queryDeltaCredits))
    );
  }, [selectedPlanCode, queryIsIncremental, queryDeltaBots, queryDeltaCredits]);

  const deltaBotsVal = useMemo(() => Number(queryDeltaBots || 0), [queryDeltaBots]);
  const deltaCreditsVal = useMemo(() => Number(queryDeltaCredits || 0), [queryDeltaCredits]);

  const activeBots = activeSub?.bots_limit_override ?? ENTERPRISE_PRICE.bots.min;
  const activeCredits = activeSub?.monthly_credits_override ?? ENTERPRISE_PRICE.monthlyCredits.min;

  const resolvedBots = useMemo(() => {
    if (selectedPlanCode !== ESubscriptionPlan.Enterprise) return 0;
    if (isIncrementalUpgrade) {
      return activeBots + deltaBotsVal;
    }
    if (queryBots) {
      return clampValue(
        Number(queryBots),
        ENTERPRISE_PRICE.bots.min,
        ENTERPRISE_PRICE.bots.max,
        ENTERPRISE_PRICE.bots.step
      );
    }
    return activeBots;
  }, [selectedPlanCode, isIncrementalUpgrade, activeBots, deltaBotsVal, queryBots]);

  const resolvedCredits = useMemo(() => {
    if (selectedPlanCode !== ESubscriptionPlan.Enterprise) return 0;
    if (isIncrementalUpgrade) {
      return activeCredits + deltaCreditsVal;
    }
    if (queryCredits) {
      return clampValue(
        Number(queryCredits),
        ENTERPRISE_PRICE.monthlyCredits.min,
        ENTERPRISE_PRICE.monthlyCredits.max,
        ENTERPRISE_PRICE.monthlyCredits.step
      );
    }
    return activeCredits;
  }, [selectedPlanCode, isIncrementalUpgrade, activeCredits, deltaCreditsVal, queryCredits]);

  const remainingMonthsVal = useMemo(() => {
    if (searchParams.get("remainingMonths")) {
      return Number(searchParams.get("remainingMonths"));
    }
    if (activeSub?.current_period_end) {
      return calculateRemainingMonths(activeSub.current_period_end);
    }
    return 1;
  }, [searchParams, activeSub?.current_period_end]);

  // Resolve Selected Plan (Support Enterprise Virtual Plan object)
  const selectedPlan = useMemo(() => {
    if (mode !== "subscription") return null;
    const dbEnterprisePlan = plans.find((p) => p.code === ESubscriptionPlan.Enterprise) || null;

    if (selectedPlanCode === ESubscriptionPlan.Enterprise) {
      let desc = dbEnterprisePlan?.description || t("errorSelectPlan");
      if (isIncrementalUpgrade) {
        desc = `Nâng cấp bổ sung (+${deltaBotsVal} bots, +${deltaCreditsVal.toLocaleString()} credits)`;
      } else if (action === PaymentAction.Renew) {
        desc = t("renewPlan");
      }

      const planObj = {
        id: dbEnterprisePlan?.id || "enterprise-plan-virtual-id",
        code: ESubscriptionPlan.Enterprise,
        name: dbEnterprisePlan?.name || "Enterprise",
        description: desc,
        monthly_credits: resolvedCredits,
        bots_limit: resolvedBots,
        pricing: dbEnterprisePlan?.pricing || null,
        is_active: true,
        created_at: dbEnterprisePlan?.created_at || "",
        updated_at: dbEnterprisePlan?.updated_at || "",
      } as Tables<"plans">;

      return planObj;
    }
    return plans.find((p) => p.code === selectedPlanCode) || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    selectedPlanCode,
    plans,
    isIncrementalUpgrade,
    deltaBotsVal,
    deltaCreditsVal,
    action,
    resolvedCredits,
    resolvedBots,
  ]);

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
        const dbEnterprisePlan = plans.find((p) => p.code === ESubscriptionPlan.Enterprise) || null;

        if (queryIsIncremental || queryDeltaBots || queryDeltaCredits) {
          const dBots = Number(queryDeltaBots || 0);
          const dCredits = Number(queryDeltaCredits || 0);
          // If we can get remaining months from query or default 1
          const remMonths = searchParams.get("remainingMonths")
            ? Number(searchParams.get("remainingMonths"))
            : 1;
          const upgradePrice = calculateEnterpriseUpgradePrice(
            dBots,
            dCredits,
            billingCycle,
            remMonths
          );
          return upgradePrice;
        }

        const minBots = dbEnterprisePlan?.bots_limit ?? ENTERPRISE_PRICE.bots.min;
        const minCredits = dbEnterprisePlan?.monthly_credits ?? ENTERPRISE_PRICE.monthlyCredits.min;

        const bots = clampValue(
          Number(queryBots || activeSub?.bots_limit_override || minBots),
          minBots,
          ENTERPRISE_PRICE.bots.max,
          ENTERPRISE_PRICE.bots.step
        );
        const credits = clampValue(
          Number(queryCredits || activeSub?.monthly_credits_override || minCredits),
          minCredits,
          ENTERPRISE_PRICE.monthlyCredits.max,
          ENTERPRISE_PRICE.monthlyCredits.step
        );
        const fullPrice = calculateEnterprisePrice(bots, credits, billingCycle, {
          pricing: (dbEnterprisePlan?.pricing || selectedPlan.pricing) as Record<
            string,
            Record<string, number>
          > | null,
          minBots,
          minCredits,
        });
        return fullPrice;
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
    queryDeltaBots,
    queryDeltaCredits,
    queryIsIncremental,
    searchParams,
    selectedPackage,
    quantity,
    activeSub,
    plans,
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
      toast.error(t("errorSelectPlan"));
      return;
    }
    if (mode === "credits" && (!selectedPackage || finalTotalPrice <= 0)) {
      toast.error(t("errorSelectPackage"));
      return;
    }

    if (!invoiceFormRef.current?.validate()) {
      toast.error(t("errorInvoiceInfo"));
      return;
    }

    setIsProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error(t("errorSessionExpired"));
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
        toast.error(data.error || t("errorPaymentFailed"));
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
      toast.error(t("errorGeneric"));
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
              {t("back")}
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
          {mode === "subscription" ? t("confirmPayment") : t("buyCreditsPayg")}
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
                  {t("currentWorkspace")}
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
                  <CardTitle className="text-lg">{t("subscriptionPlan")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-primary/50 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {selectedPlan?.name || t("selectPlan")}
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
                        {t("monthlyPlan")}
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 p-3 text-sm font-medium text-primary">
                        <CalendarDays className="h-4 w-4" />
                        {t("yearlyPlan")}
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
                  <CardTitle className="text-lg">{t("creditPackage")}</CardTitle>
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
                          {selectedPackage?.name || t("selectCreditPackage")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPackage?.credits_amount.toLocaleString()} credits
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("change")}</span>
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
                      <span className="text-sm font-medium text-foreground">{t("quantity")}</span>
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {t("planDetails", { name: selectedPlan.name })}
                    </CardTitle>
                    {selectedPlanCode === ESubscriptionPlan.Enterprise && isIncrementalUpgrade && (
                      <Badge className="bg-primary font-semibold text-primary-foreground">
                        {t("incrementalUpgrade")}
                      </Badge>
                    )}
                    {selectedPlanCode === ESubscriptionPlan.Enterprise &&
                      action === PaymentAction.Renew && (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 font-semibold text-emerald-600 dark:text-emerald-400"
                        >
                          {t("renewPlan")}
                        </Badge>
                      )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPlanCode === ESubscriptionPlan.Enterprise && isIncrementalUpgrade ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">{t("additionalBots")}</p>
                          <p className="text-base font-bold text-primary">+{deltaBotsVal} bots</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            (Tổng mới: {resolvedBots} bots)
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">{t("additionalCredits")}</p>
                          <p className="text-base font-bold text-primary">
                            +{deltaCreditsVal.toLocaleString()} credits
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            (Tổng mới: {resolvedCredits.toLocaleString()} cr/tháng)
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-xs">
                        <span className="text-muted-foreground">{t("remainingBillingMonths")}</span>
                        <span className="font-semibold text-foreground">
                          {remainingMonthsVal} tháng
                        </span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-xs">
                        <span className="text-muted-foreground">{t("planExpiryDate")}</span>
                        <span className="font-semibold text-primary">{t("keepCurrent")}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground">{t("creditsPerMonth")}</p>
                        <p className="text-lg font-semibold">
                          {selectedPlan.monthly_credits.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground">{t("maxBots")}</p>
                        <p className="text-lg font-semibold">{selectedPlan.bots_limit}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between space-x-10 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">{t("payVia")}</p>
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
                  <CardTitle className="text-lg">{t("creditPackageInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">{t("creditsReceived")}</p>
                      <p className="text-lg font-semibold text-green-600">
                        +{(selectedPackage.credits_amount * quantity).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">{t("unitPrice")}</p>
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
                    <p className="text-sm text-muted-foreground">{t("payVia")}</p>
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
                  title={t("orderSummary")}
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
                      ? selectedPlanCode === ESubscriptionPlan.Enterprise && isIncrementalUpgrade
                        ? [
                            {
                              label: t("currentConfig"),
                              value: `${activeBots} bots · ${activeCredits.toLocaleString()} credits`,
                            },
                            { label: t("additionalBotsLabel"), value: `+${deltaBotsVal} bots` },
                            {
                              label: t("additionalCreditsLabel"),
                              value: `+${deltaCreditsVal.toLocaleString()} credits`,
                            },
                            {
                              label: t("newConfig"),
                              value: `${resolvedBots} bots · ${resolvedCredits.toLocaleString()} credits`,
                              isHighlighted: true,
                            },
                            {
                              label: t("remainingMonths"),
                              value: `${remainingMonthsVal} ${t("months")}`,
                            },
                            {
                              label: t("planExpiryLabel"),
                              value: t("keepCurrent"),
                              isHighlighted: true,
                            },
                          ]
                        : [
                            ...(selectedPlan
                              ? [
                                  {
                                    label: t("planNameLabel", {
                                      name: selectedPlan.name,
                                      cycle:
                                        billingCycle === ESubscriptionCycle.Monthly
                                          ? t("monthlyPlan")
                                          : t("yearlyPlan"),
                                    }),
                                    value: `${formatVND(calculatedBasePrice)}đ`,
                                  },
                                  {
                                    label: t("chatbotCountLabel"),
                                    value: `${selectedPlan.bots_limit} bots`,
                                  },
                                  {
                                    label: t("monthlyCreditsLabel"),
                                    value: `${selectedPlan.monthly_credits.toLocaleString()} credits`,
                                  },
                                ]
                              : []),
                            ...(prorationDiscount > 0
                              ? [
                                  {
                                    label: t("prorationDiscount"),
                                    value: `- ${formatVND(prorationDiscount)}đ`,
                                    isHighlighted: true,
                                  },
                                ]
                              : []),
                            ...(billingCycle === ESubscriptionCycle.Yearly
                              ? [
                                  {
                                    label: t("yearlyDiscount"),
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
                                  label: t("creditsReceivedLabel"),
                                  value: `+${(
                                    selectedPackage.credits_amount * quantity
                                  ).toLocaleString()} credits`,
                                  isHighlighted: true,
                                },
                              ]
                            : []),
                        ]
                  }
                  totalPrice={`${formatVND(finalTotalPrice)}đ`}
                  totalLabel={t("totalLabel")}
                  monthlyEquivalentPrice={
                    mode === "subscription" &&
                    billingCycle === ESubscriptionCycle.Yearly &&
                    finalTotalPrice > 0
                      ? `~ ${formatVND(Math.round(finalTotalPrice / 12))}đ/tháng`
                      : undefined
                  }
                  ctaText={t("payNow")}
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
                        t("paymentExpired")
                      ) : (
                        <>
                          {t("paymentExpiresIn")}{" "}
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
                            {t("paymentExpired")}
                          </p>
                          <p className="text-sm text-muted-foreground">{t("createNewPayment")}</p>
                        </div>
                        <Button
                          onClick={handleCancelPayment}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          {t("createNewPayment")}
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
