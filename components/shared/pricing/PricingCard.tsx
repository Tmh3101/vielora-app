"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingCycle, PricingVariant } from "@/config/pricing";
import { formatVND, getPriceFromPlan } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";
import { ESubscriptionCycle } from "@/types";

interface PricingCardProps {
  variant: PricingVariant;
  plan: Tables<"plans">;
  features: string[];
  ctaText: string;
  billingCycle: BillingCycle;
  onAction: () => void;
  isDisabled: boolean;
  isLoading: boolean;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  isHighlighted?: boolean;
  animationDelay?: number;
}

export function PricingCard({
  variant,
  plan,
  features,
  ctaText,
  billingCycle,
  onAction,
  isDisabled,
  isLoading,
  isPopular = false,
  isCurrentPlan = false,
  isHighlighted = false,
  animationDelay = 0,
}: PricingCardProps) {
  const isEnterprise = plan.code === "enterprise";
  const price = getPriceFromPlan(plan, billingCycle);

  if (variant === "landing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: animationDelay }}
        className={cn(
          "relative flex min-h-[390px] flex-col overflow-visible rounded-3xl p-5 transition-all duration-300",
          isPopular && !isDisabled
            ? "border-2 border-primary bg-card/95 shadow-xl shadow-primary/15 ring-1 ring-primary/30 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/25"
            : isEnterprise
              ? "border border-primary/40 bg-card/90 shadow-md hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg"
              : "glass border border-border/80 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
        )}
      >
        {isPopular && !isDisabled && !isEnterprise && (
          <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
            <span className="bg-gradient-primary whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/30">
              Phổ biến nhất
            </span>
          </div>
        )}

        <div className="mb-4 text-center">
          <h3 className="mb-1 text-lg font-bold text-foreground">{plan.name}</h3>
          <p className="mb-3 text-xs text-muted-foreground">{plan.description}</p>
          <div className="flex items-baseline justify-center gap-1">
            {isEnterprise ? (
              <span className="text-2xl font-bold text-foreground">Tùy chỉnh</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-foreground">{formatVND(price)}</span>
                <span className="text-xs text-muted-foreground">
                  {price === 0
                    ? ""
                    : billingCycle === ESubscriptionCycle.Monthly
                      ? "đ/tháng"
                      : "đ/năm"}
                </span>
              </>
            )}
          </div>
          {billingCycle === ESubscriptionCycle.Yearly && price > 0 && !isEnterprise && (
            <p className="mt-1 text-xs text-muted-foreground">
              ~ {formatVND(Math.round(price / 12))}đ/tháng
            </p>
          )}
        </div>

        <ul className="mb-6 flex-1 space-y-2 text-xs">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-xs leading-snug text-muted-foreground"
            >
              <div className="bg-gradient-primary mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-primary-foreground">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            "mt-auto w-full text-xs font-semibold transition-all duration-200",
            isPopular || isEnterprise
              ? "bg-gradient-primary btn-glow text-white shadow-md shadow-primary/25 hover:scale-[1.02] hover:opacity-95 hover:shadow-lg hover:shadow-primary/40 active:scale-[0.98]"
              : "hover:scale-[1.01] hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-[0.99]"
          )}
          variant={isDisabled ? "outline" : isPopular || isEnterprise ? "default" : "outline"}
          disabled={isDisabled || isLoading}
          onClick={onAction}
        >
          {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          {ctaText}
        </Button>
      </motion.div>
    );
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col p-4 transition-all duration-300",
        isEnterprise
          ? "border-2 border-primary/40 bg-primary/5 shadow-md hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg"
          : isHighlighted || (isPopular && !isCurrentPlan)
            ? "border-2 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20"
            : isCurrentPlan
              ? "border-2 border-primary/50 bg-primary/5 shadow-sm"
              : "border border-border/80 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md"
      )}
    >
      {isPopular && !isCurrentPlan && !isEnterprise && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20">
            Phổ biến nhất
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow-md">
            Đang sử dụng
          </span>
        </div>
      )}

      <CardHeader className="p-2 pb-3 text-center">
        <CardTitle className="text-lg font-bold">{plan.name}</CardTitle>
        <CardDescription className="text-xs">{plan.description}</CardDescription>
        <div className="mt-3 flex items-baseline justify-center gap-1">
          {isEnterprise ? (
            <span className="text-2xl font-bold text-foreground">Tùy chỉnh</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-foreground">{formatVND(price)}</span>
              <span className="text-xs text-muted-foreground">
                {price === 0
                  ? ""
                  : billingCycle === ESubscriptionCycle.Monthly
                    ? "đ/tháng"
                    : "đ/năm"}
              </span>
            </>
          )}
        </div>
        {billingCycle === ESubscriptionCycle.Yearly && price > 0 && !isEnterprise && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            ~ {formatVND(Math.round(price / 12))}đ/tháng
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-2 pt-2">
        <ul className="flex-1 space-y-2 text-xs">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-xs leading-snug text-muted-foreground"
            >
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            "mt-4 w-full text-xs font-semibold transition-all duration-200",
            isPopular || isHighlighted || isEnterprise
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/35 active:scale-[0.98]"
              : "hover:scale-[1.01] hover:border-primary hover:bg-primary/10 hover:text-primary active:scale-[0.99]"
          )}
          variant={
            isDisabled
              ? "outline"
              : isPopular || isHighlighted || isEnterprise
                ? "default"
                : "outline"
          }
          disabled={isDisabled || isLoading}
          onClick={onAction}
        >
          {isLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
}
