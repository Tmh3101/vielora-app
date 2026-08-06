"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bot, Zap, Minus, Plus, RefreshCw, Sparkles, Lock } from "lucide-react";
import {
  ENTERPRISE_PRICE,
  calculateEnterprisePrice,
  calculateEnterpriseUpgradePrice,
  clampValue,
} from "@/config/pricing-enterprise";
import { getPlanTheme } from "@/config/plan-theme";
import { formatVND } from "@/lib/utils/currency";
import { ESubscriptionCycle, ESubscriptionPlan } from "@/types";
import { InvoiceForm, type InvoiceFormHandle } from "@/components/shared/InvoiceForm";
import { PricingToggle } from "@/components/shared/pricing/PricingToggle";
import { OrderSummaryCard } from "@/components/shared/OrderSummaryCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WorkspaceUpgradeSelector } from "@/components/dashboard/upgrade/WorkspaceUpgradeSelector";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateRemainingMonths, formatPaymentDate } from "@/lib/helpers/payment-helpers";
import { toast } from "sonner";

function setWorkspaceCookie(wsId: string) {
  if (typeof document !== "undefined") {
    document.cookie = `active_workspace_id=${wsId}; path=/; max-age=2592000; SameSite=Lax`;
  }
}

type EnterpriseActionTab = "upgrade" | "renew";

export default function EnterpriseUpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaces, activeWorkspace } = useWorkspace();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const enterpriseTheme = getPlanTheme(ESubscriptionPlan.Enterprise);

  const initialCycle: ESubscriptionCycle =
    searchParams.get("cycle") === ESubscriptionCycle.Yearly
      ? ESubscriptionCycle.Yearly
      : ESubscriptionCycle.Monthly;

  const querySlug = searchParams.get("slug");
  const queryWsId = searchParams.get("workspace_id");
  const initialWs =
    workspaces.find((w) => w.slug === querySlug || w.id === queryWsId) || activeWorkspace || null;

  // Active subscription state
  const [currentSubscription, setCurrentSubscription] = useState<{
    id: string;
    billing_cycle: ESubscriptionCycle | null;
    bots_limit_override: number | null;
    monthly_credits_override: number | null;
    current_period_end: string;
    plans?: { code?: string; bots_limit?: number; monthly_credits?: number } | null;
  } | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(true);

  // Form states for first-time registration
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(initialCycle);
  const [botsLimit, setBotsLimit] = useState<number>(ENTERPRISE_PRICE.bots.min);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(ENTERPRISE_PRICE.monthlyCredits.min);

  // Form states for incremental upgrade (+delta)
  const [actionTab, setActionTab] = useState<EnterpriseActionTab>("upgrade");
  const [deltaBots, setDeltaBots] = useState<number>(0);
  const [deltaCredits, setDeltaCredits] = useState<number>(0);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const invoiceFormRef = useRef<InvoiceFormHandle>(null);

  const currentSlug = selectedSlug || initialWs?.slug || activeWorkspace?.slug || null;

  // Fetch current active workspace subscription
  useEffect(() => {
    if (!activeWorkspace?.id) {
      setIsLoadingSub(false);
      return;
    }
    const fetchSub = async () => {
      try {
        setIsLoadingSub(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select("id, billing_cycle, bots_limit_override, monthly_credits_override, current_period_end, plans(code, bots_limit, monthly_credits)")
          .eq("workspace_id", activeWorkspace.id)
          .eq("status", "active")
          .order("current_period_end", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const planObj = Array.isArray(data.plans) ? data.plans[0] : data.plans;
          setCurrentSubscription({
            ...data,
            plans: planObj,
          });
          if (data.billing_cycle) {
            setBillingCycle(data.billing_cycle as ESubscriptionCycle);
          }
        }
      } catch (err) {
        console.error("Error fetching workspace subscription:", err);
      } finally {
        setIsLoadingSub(false);
      }
    };
    fetchSub();
  }, [activeWorkspace?.id, supabase]);

  const isCurrentSubEnterprise =
    currentSubscription?.plans?.code === ESubscriptionPlan.Enterprise;

  const currentBots =
    currentSubscription?.bots_limit_override ?? ENTERPRISE_PRICE.bots.min;
  const currentMonthlyCredits =
    currentSubscription?.monthly_credits_override ?? ENTERPRISE_PRICE.monthlyCredits.min;
  const activeCycle =
    (currentSubscription?.billing_cycle as ESubscriptionCycle) || billingCycle;

  const remainingMonths = useMemo(() => {
    if (!currentSubscription?.current_period_end) return 1;
    return calculateRemainingMonths(currentSubscription.current_period_end);
  }, [currentSubscription?.current_period_end]);

  const handleWorkspaceChange = (slug: string, id: string) => {
    setSelectedSlug(slug);
    setWorkspaceCookie(id);
    window.location.href = `/${encodeURIComponent(slug)}/upgrade/enterprise?cycle=${billingCycle}`;
  };

  // Price calculations
  const renewalPrice = useMemo(() => {
    return calculateEnterprisePrice(currentBots, currentMonthlyCredits, activeCycle);
  }, [currentBots, currentMonthlyCredits, activeCycle]);

  const upgradePrice = useMemo(() => {
    return calculateEnterpriseUpgradePrice(deltaBots, deltaCredits, activeCycle, remainingMonths);
  }, [deltaBots, deltaCredits, activeCycle, remainingMonths]);

  const firstTimePrice = useMemo(() => {
    return calculateEnterprisePrice(botsLimit, monthlyCredits, billingCycle);
  }, [botsLimit, monthlyCredits, billingCycle]);

  const monthlyBasePrice = useMemo(() => {
    return calculateEnterprisePrice(botsLimit, monthlyCredits, ESubscriptionCycle.Monthly);
  }, [botsLimit, monthlyCredits]);

  const handleCheckout = () => {
    if (invoiceFormRef.current && !invoiceFormRef.current.validate()) {
      return;
    }

    if (isCurrentSubEnterprise && actionTab === "upgrade" && deltaBots <= 0 && deltaCredits <= 0) {
      toast.error("Vui lòng chọn số lượng Bot hoặc Credit muốn nâng cấp bổ sung.");
      return;
    }

    setIsNavigating(true);
    const targetSlug = currentSlug || "dashboard";
    const targetBase =
      targetSlug === "dashboard" ? "/dashboard" : `/${encodeURIComponent(targetSlug)}`;

    let checkoutUrl = "";
    if (isCurrentSubEnterprise) {
      if (actionTab === "renew") {
        checkoutUrl = `${targetBase}/checkout?plan=enterprise&cycle=${activeCycle}&action=renew`;
      } else {
        checkoutUrl = `${targetBase}/checkout?plan=enterprise&cycle=${activeCycle}&action=upgrade&deltaBots=${deltaBots}&deltaCredits=${deltaCredits}&isIncremental=true&remainingMonths=${remainingMonths}`;
      }
    } else {
      checkoutUrl = `${targetBase}/checkout?plan=enterprise&cycle=${billingCycle}&bots=${botsLimit}&credits=${monthlyCredits}&action=upgrade`;
    }

    router.push(checkoutUrl);
  };

  if (isLoadingSub) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Consistent Plus/Minus button styling with smooth hover transitions
  const stepButtonClass =
    "h-8 w-8 shrink-0 rounded-lg border border-border bg-background text-foreground transition-all duration-150 hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-40 shadow-2xs";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header Navigation */}
      <div>
        <Link
          href="/dashboard/upgrade"
          className="group inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Quay lại danh sách gói
        </Link>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Cấu hình gói Enterprise
            </h1>
            <p className="text-xs text-muted-foreground">
              {isCurrentSubEnterprise
                ? "Gia hạn hoặc nâng cấp bổ sung cấu hình cho gói Enterprise hiện tại"
                : "Tùy chỉnh số lượng chatbot và lượng credit theo nhu cầu của bạn."}
            </p>
          </div>
        </div>
      </div>

      <WorkspaceUpgradeSelector
        workspaces={workspaces}
        selectedSlug={currentSlug}
        onSelectWorkspace={handleWorkspaceChange}
      />

      {isCurrentSubEnterprise ? (
        /* UI Mode for Active Enterprise Users */
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            {/* Active Plan Banner (Sleek Slate/Grey Theme matching Enterprise & Free) */}
            <Card className={`border ${enterpriseTheme.borderClass} ${enterpriseTheme.bgGradientClass}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold">
                        Gói Enterprise đang hoạt động
                      </Badge>
                      <Badge
                        variant="outline"
                        className={enterpriseTheme.badgeClass}
                      >
                        Chu kỳ {activeCycle === ESubscriptionCycle.Monthly ? "Tháng" : "Năm"}
                      </Badge>
                    </div>
                    <p className="pt-1 text-xs text-muted-foreground">
                      Cấu hình hiện tại:{" "}
                      <strong className="text-foreground">{currentBots} bots</strong> •{" "}
                      <strong className="text-foreground">
                        {currentMonthlyCredits.toLocaleString("vi-VN")} credits/tháng
                      </strong>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Thời hạn hiện tại:{" "}
                      <strong>{formatPaymentDate(currentSubscription.current_period_end)}</strong> (
                      {remainingMonths} tháng còn lại)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Mode Switcher: Renew vs Incremental Upgrade */}
            <Tabs
              value={actionTab}
              onValueChange={(val) => setActionTab(val as EnterpriseActionTab)}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
                <TabsTrigger
                  value="upgrade"
                  className="flex items-center justify-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  Nâng cấp bổ sung cấu hình
                </TabsTrigger>
                <TabsTrigger
                  value="renew"
                  className="flex items-center justify-center gap-2 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <RefreshCw className="h-4 w-4 text-emerald-500" />
                  Gia hạn gói hiện tại
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upgrade" className="space-y-4">
                {/* Incremental Bots Control (System Primary Theme) */}
                <Card className="border-border/80">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">
                            Bổ sung thêm Số Bot
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Hiện tại có {currentBots} bots. Tăng thêm cho chu kỳ này.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold border-primary/30 bg-primary/5 text-primary">
                        Mới: {currentBots + deltaBots} bots
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Số bot tăng thêm:
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={stepButtonClass}
                          onClick={() => setDeltaBots((prev) => Math.max(0, prev - 1))}
                          disabled={deltaBots <= 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          value={deltaBots}
                          onChange={(e) =>
                            setDeltaBots(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="h-8 w-20 text-center text-sm font-bold text-primary focus-visible:ring-primary/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={stepButtonClass}
                          onClick={() => setDeltaBots((prev) => prev + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-semibold text-foreground">bots</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Incremental Credits Control (System Primary Theme) */}
                <Card className="border-border/80">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">
                            Bổ sung thêm Credits
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Hiện tại có {currentMonthlyCredits.toLocaleString("vi-VN")}{" "}
                            credits/tháng.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs font-bold border-primary/30 bg-primary/5 text-primary">
                        Mới: {(currentMonthlyCredits + deltaCredits).toLocaleString("vi-VN")}{" "}
                        credits
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Credits tăng thêm:
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={stepButtonClass}
                          onClick={() => setDeltaCredits((prev) => Math.max(0, prev - 1000))}
                          disabled={deltaCredits <= 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          value={deltaCredits}
                          onChange={(e) =>
                            setDeltaCredits(Math.max(0, parseInt(e.target.value, 10) || 0))
                          }
                          className="h-8 w-28 text-center text-sm font-bold text-primary focus-visible:ring-primary/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={stepButtonClass}
                          onClick={() => setDeltaCredits((prev) => prev + 1000)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-semibold text-foreground">credits</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="renew" className="space-y-4">
                <Card className="border-border/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      <Lock className="h-4 w-4 text-emerald-500" />
                      Gia hạn cùng chu kỳ hiện tại (
                      {activeCycle === ESubscriptionCycle.Monthly ? "Hàng Tháng" : "Hàng Năm"})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gia hạn kéo dài thêm 1{" "}
                      {activeCycle === ESubscriptionCycle.Monthly ? "tháng" : "năm"} kể từ ngày kết
                      thúc hiện tại ({formatPaymentDate(currentSubscription.current_period_end)}).
                      Cấu hình gói giữ nguyên.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-xs">
                      <span className="text-muted-foreground">Số lượng chatbot:</span>
                      <span className="font-semibold text-foreground">{currentBots} bots</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-muted/40 p-3 text-xs">
                      <span className="text-muted-foreground">Credits hàng tháng:</span>
                      <span className="font-semibold text-foreground">
                        {currentMonthlyCredits.toLocaleString("vi-VN")} credits
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <InvoiceForm ref={invoiceFormRef} />
          </div>

          {/* Right Summary for Active Enterprise User */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <OrderSummaryCard
                title={actionTab === "upgrade" ? "Tóm tắt nâng cấp" : "Tóm tắt gia hạn"}
                subtitle={
                  actionTab === "upgrade"
                    ? "Nâng cấp bổ sung cấu hình cho chu kỳ hiện tại"
                    : "Gia hạn trọn vẹn chu kỳ tiếp theo"
                }
                items={
                  actionTab === "upgrade"
                    ? [
                        {
                          label: "Cấu hình hiện tại:",
                          value: `${currentBots} bots · ${currentMonthlyCredits.toLocaleString("vi-VN")} credits`,
                        },
                        { label: "Bot tăng thêm:", value: `+${deltaBots} bots` },
                        {
                          label: "Credits tăng thêm:",
                          value: `+${deltaCredits.toLocaleString("vi-VN")} credits`,
                        },
                        {
                          label: "Cấu hình mới:",
                          value: `${currentBots + deltaBots} bots · ${(currentMonthlyCredits + deltaCredits).toLocaleString("vi-VN")} credits`,
                          isHighlighted: true,
                        },
                        { label: "Số tháng tính phí còn lại:", value: `${remainingMonths} tháng` },
                        {
                          label: "Ngày hết hạn gói:",
                          value: "Giữ nguyên không đổi",
                          isHighlighted: true,
                        },
                      ]
                    : [
                        {
                          label: "Cấu hình gia hạn:",
                          value: `${currentBots} bots · ${currentMonthlyCredits.toLocaleString("vi-VN")} credits`,
                        },
                        {
                          label: "Chu kỳ tính phí:",
                          value:
                            activeCycle === ESubscriptionCycle.Monthly
                              ? "Hàng tháng"
                              : "Hàng năm (12 tháng)",
                        },
                        {
                          label: "Thời hạn mới đến:",
                          value: "Cộng thêm 1 chu kỳ nối tiếp",
                          isHighlighted: true,
                        },
                      ]
                }
                totalPrice={`${formatVND(actionTab === "upgrade" ? upgradePrice : renewalPrice)}đ`}
                totalLabel="Tổng thanh toán:"
                ctaText={actionTab === "upgrade" ? "Thanh toán nâng cấp" : "Thanh toán gia hạn"}
                isProcessing={isNavigating}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>
      ) : (
        /* First-Time Enterprise Purchase Builder (System Primary Theme for Controls) */
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Form Controls */}
          <div className="space-y-5 lg:col-span-7">
            {/* Card 1: Chatbot Limit */}
            <Card className="shadow-2xs border-border/80 transition-all hover:border-primary/30">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Số lượng Bot</h2>
                      <p className="text-xs text-muted-foreground">
                        Giới hạn bot hoạt động đồng thời
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    Min {ENTERPRISE_PRICE.bots.min} • Max {ENTERPRISE_PRICE.bots.max}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
                  <span className="pl-1 text-xs font-medium text-muted-foreground">
                    Số bot đăng ký:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={stepButtonClass}
                      onClick={() =>
                        setBotsLimit((prev) => Math.max(ENTERPRISE_PRICE.bots.min, prev - 1))
                      }
                      disabled={botsLimit <= ENTERPRISE_PRICE.bots.min}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min={ENTERPRISE_PRICE.bots.min}
                        max={ENTERPRISE_PRICE.bots.max}
                        value={botsLimit || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setBotsLimit(isNaN(val) ? 0 : val);
                        }}
                        onBlur={() => {
                          setBotsLimit((prev) =>
                            clampValue(
                              prev || ENTERPRISE_PRICE.bots.min,
                              ENTERPRISE_PRICE.bots.min,
                              ENTERPRISE_PRICE.bots.max,
                              ENTERPRISE_PRICE.bots.step
                            )
                          );
                        }}
                        className="h-8 w-20 text-center text-sm font-bold text-primary focus-visible:ring-primary/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={stepButtonClass}
                      onClick={() =>
                        setBotsLimit((prev) => Math.min(ENTERPRISE_PRICE.bots.max, prev + 1))
                      }
                      disabled={botsLimit >= ENTERPRISE_PRICE.bots.max}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="pl-1 pr-1 text-xs font-semibold text-foreground">bots</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <span>Bao gồm 10 bot cơ bản</span>
                  <span className="font-medium text-foreground">
                    +{formatVND(ENTERPRISE_PRICE.perBotPerMonth)}đ/tháng mỗi bot thêm
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Monthly Credits */}
            <Card className="shadow-2xs border-border/80 transition-all hover:border-primary/30">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Credits hàng tháng</h2>
                      <p className="text-xs text-muted-foreground">Tự động làm mới mỗi tháng</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    Min {ENTERPRISE_PRICE.monthlyCredits.min.toLocaleString("vi-VN")} • Max{" "}
                    {ENTERPRISE_PRICE.monthlyCredits.max.toLocaleString("vi-VN")}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
                  <span className="pl-1 text-xs font-medium text-muted-foreground">
                    Lượng credits:
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={stepButtonClass}
                      onClick={() =>
                        setMonthlyCredits((prev) =>
                          Math.max(
                            ENTERPRISE_PRICE.monthlyCredits.min,
                            prev - ENTERPRISE_PRICE.monthlyCredits.step
                          )
                        )
                      }
                      disabled={monthlyCredits <= ENTERPRISE_PRICE.monthlyCredits.min}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <div className="relative flex items-center">
                      <Input
                        type="number"
                        min={ENTERPRISE_PRICE.monthlyCredits.min}
                        max={ENTERPRISE_PRICE.monthlyCredits.max}
                        step={ENTERPRISE_PRICE.monthlyCredits.step}
                        value={monthlyCredits || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setMonthlyCredits(isNaN(val) ? 0 : val);
                        }}
                        onBlur={() => {
                          setMonthlyCredits((prev) =>
                            clampValue(
                              prev || ENTERPRISE_PRICE.monthlyCredits.min,
                              ENTERPRISE_PRICE.monthlyCredits.min,
                              ENTERPRISE_PRICE.monthlyCredits.max,
                              ENTERPRISE_PRICE.monthlyCredits.step
                            )
                          );
                        }}
                        className="h-8 w-28 text-center text-sm font-bold text-primary focus-visible:ring-primary/30"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={stepButtonClass}
                      onClick={() =>
                        setMonthlyCredits((prev) =>
                          Math.min(
                            ENTERPRISE_PRICE.monthlyCredits.max,
                            prev + ENTERPRISE_PRICE.monthlyCredits.step
                          )
                        )
                      }
                      disabled={monthlyCredits >= ENTERPRISE_PRICE.monthlyCredits.max}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="pl-1 pr-1 text-xs font-semibold text-foreground">credits</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <span>Bao gồm 20.000 credits cơ bản</span>
                  <span className="font-medium text-foreground">
                    +{formatVND(ENTERPRISE_PRICE.perCreditUnitPerMonth)}đ/tháng mỗi 1.000 credits
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Billing Cycle Toggle */}
            <Card className="shadow-2xs border-border/80">
              <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row sm:p-5">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Chu kỳ thanh toán</h2>
                  <p className="text-xs text-muted-foreground">
                    Chọn gói năm để nhận ưu đãi giảm 2 tháng (~17%)
                  </p>
                </div>
                <PricingToggle
                  billingCycle={billingCycle}
                  setBillingCycle={setBillingCycle}
                  yearlyBadgeText="-17%"
                />
              </CardContent>
            </Card>

            {/* Card 4: Invoice VAT Form */}
            <InvoiceForm ref={invoiceFormRef} />
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <OrderSummaryCard
                title="Tóm tắt đơn hàng"
                subtitle="Gói Enterprise tự cấu hình theo yêu cầu"
                items={[
                  {
                    label: "Số lượng chatbot:",
                    value: `${botsLimit} bots`,
                  },
                  {
                    label: "Credits hàng tháng:",
                    value: `${monthlyCredits.toLocaleString("vi-VN")} credits`,
                  },
                  {
                    label: "Chu kỳ tính phí:",
                    value:
                      billingCycle === ESubscriptionCycle.Monthly
                        ? "Hàng tháng"
                        : "Hàng năm (12 tháng)",
                  },
                  ...(billingCycle === ESubscriptionCycle.Yearly
                    ? [
                        {
                          label: "Giá gốc (12 tháng):",
                          value: `${formatVND(monthlyBasePrice * 12)}đ`,
                        },
                        {
                          label: "Ưu đãi thanh toán năm (tặng 2 tháng):",
                          value: `- ${formatVND(monthlyBasePrice * 2)}đ`,
                          isHighlighted: true,
                        },
                      ]
                    : []),
                ]}
                totalPrice={`${formatVND(firstTimePrice)}đ`}
                totalLabel={
                  billingCycle === ESubscriptionCycle.Yearly
                    ? "Tổng thanh toán sau ưu đãi:"
                    : "Tổng thanh toán:"
                }
                monthlyEquivalentPrice={
                  billingCycle === ESubscriptionCycle.Yearly
                    ? `~ ${formatVND(Math.round(firstTimePrice / 12))}đ/tháng`
                    : undefined
                }
                ctaText="Tiếp tục thanh toán"
                isProcessing={isNavigating}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
