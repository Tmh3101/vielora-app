"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ENTERPRISE_PRICE, calculateEnterprisePrice } from "@/config/pricing-enterprise";
import { ESubscriptionCycle, ESubscriptionPlan } from "@/types";
import { PaymentAction } from "@/lib/constants/payment";
import { Bot, Zap, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { formatVND } from "@/lib/utils/currency";

interface EnterpriseBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCycle?: ESubscriptionCycle;
  currentPlanCode?: string;
}

export function EnterpriseBuilderModal({
  isOpen,
  onClose,
  initialCycle = ESubscriptionCycle.Monthly,
  currentPlanCode,
}: EnterpriseBuilderModalProps) {
  const router = useRouter();
  const [botsLimit, setBotsLimit] = useState<number>(ENTERPRISE_PRICE.bots.min);
  const [monthlyCredits, setMonthlyCredits] = useState<number>(ENTERPRISE_PRICE.monthlyCredits.min);
  const [billingCycle, setBillingCycle] = useState<ESubscriptionCycle>(initialCycle);
  const [computedPrice, setComputedPrice] = useState<number>(() =>
    calculateEnterprisePrice(
      ENTERPRISE_PRICE.bots.min,
      ENTERPRISE_PRICE.monthlyCredits.min,
      initialCycle
    )
  );
  const [isQuoting, setIsQuoting] = useState<boolean>(false);

  const fetchQuote = useCallback(
    async (bots: number, credits: number, cycle: ESubscriptionCycle) => {
      setIsQuoting(true);
      try {
        const res = await fetch("/api/enterprise/quote-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botsLimit: bots,
            monthlyCredits: credits,
            billingCycle: cycle,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setComputedPrice(json.data.price);
          }
        }
      } catch (err) {
        console.error("Error fetching price quote:", err);
        // Fallback local calc
        setComputedPrice(calculateEnterprisePrice(bots, credits, cycle));
      } finally {
        setIsQuoting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchQuote(botsLimit, monthlyCredits, billingCycle);
    }, 200);
    return () => clearTimeout(timer);
  }, [botsLimit, monthlyCredits, billingCycle, isOpen, fetchQuote]);

  const handleProceedCheckout = () => {
    const action =
      currentPlanCode === ESubscriptionPlan.Enterprise
        ? PaymentAction.Renew
        : PaymentAction.Upgrade;
    router.push(
      `/dashboard/checkout?plan=${ESubscriptionPlan.Enterprise}&cycle=${billingCycle}&bots=${botsLimit}&credits=${monthlyCredits}&action=${action}`
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden border-border/60 bg-background/95 p-6 backdrop-blur-xl sm:rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
            >
              <Sparkles className="mr-1 h-3 w-3 text-slate-500" />
              Tự cấu hình trả phí
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Cấu hình gói Enterprise của bạn
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Tự chọn giới hạn Bots và Credits hàng tháng phù hợp với nhu cầu. Hệ thống tự động tính
            giá và áp dụng ngay lập tức.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-6">
          {/* Billing Cycle Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex items-center rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setBillingCycle(ESubscriptionCycle.Monthly)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === ESubscriptionCycle.Monthly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Thanh toán Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle(ESubscriptionCycle.Yearly)}
                className={`flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  billingCycle === ESubscriptionCycle.Yearly
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Thanh toán Theo Năm</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Tiết kiệm 10%
                </span>
              </button>
            </div>
          </div>

          {/* Slider 1: Bots Limit */}
          <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Số lượng Bots tối đa</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {botsLimit} bots
              </span>
            </div>
            <input
              type="range"
              min={ENTERPRISE_PRICE.bots.min}
              max={ENTERPRISE_PRICE.bots.max}
              step={ENTERPRISE_PRICE.bots.step}
              value={botsLimit}
              onChange={(e) => setBotsLimit(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Tối thiểu: {ENTERPRISE_PRICE.bots.min} bots</span>
              <span>Tối đa: {ENTERPRISE_PRICE.bots.max} bots</span>
            </div>
          </div>

          {/* Slider 2: Monthly Credits */}
          <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Credits hàng tháng</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {monthlyCredits.toLocaleString("vi-VN")} credits
              </span>
            </div>
            <input
              type="range"
              min={ENTERPRISE_PRICE.monthlyCredits.min}
              max={ENTERPRISE_PRICE.monthlyCredits.max}
              step={ENTERPRISE_PRICE.monthlyCredits.step}
              value={monthlyCredits}
              onChange={(e) => setMonthlyCredits(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                Tối thiểu: {ENTERPRISE_PRICE.monthlyCredits.min.toLocaleString("vi-VN")} credits
              </span>
              <span>
                Tối đa: {ENTERPRISE_PRICE.monthlyCredits.max.toLocaleString("vi-VN")} credits
              </span>
            </div>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Áp dụng ngay sau thanh toán</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Không giới hạn Knowledge Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Hỗ trợ Voice Chat & Mobile App</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Gia hạn tự động theo cấu hình</span>
            </div>
          </div>

          {/* Pricing Calculation Summary Box */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-gradient-to-r from-muted/50 via-card to-muted/30 p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Tổng chi phí (
                {billingCycle === ESubscriptionCycle.Yearly ? "Theo năm" : "Theo tháng"})
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-foreground">
                  {formatVND(computedPrice)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">VND</span>
                {isQuoting && (
                  <span className="ml-2 animate-pulse text-xs text-primary">Đang tính…</span>
                )}
              </div>
            </div>
            <Button
              onClick={handleProceedCheckout}
              className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <span>Thanh toán ngay</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
