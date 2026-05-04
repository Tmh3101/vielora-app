"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingCycle, PricingVariant } from "@/config/pricing";
import { formatVND, getPriceFromPlan } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/types";

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
  const price = getPriceFromPlan(plan, billingCycle);

  if (variant === "landing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: animationDelay }}
        className={cn(
          "relative flex min-h-[420px] flex-col overflow-visible rounded-3xl p-8 pt-10 transition-all duration-300",
          isPopular && !isDisabled
            ? "card-highlighted animate-pulse-glow"
            : "glass hover:-translate-y-1 hover:border-primary/40"
        )}
      >
        {isPopular && !isDisabled && (
          <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
            <span className="bg-gradient-primary shadow-glow-sm whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-primary-foreground">
              Phổ biến nhất
            </span>
          </div>
        )}

        <div className="mb-8 text-center">
          <h3 className="mb-2 text-xl font-semibold text-foreground">{plan.name}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{plan.description}</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-foreground">{formatVND(price)}</span>
            <span className="text-muted-foreground">
              {price === 0 ? "" : billingCycle === "monthly" ? "đ/tháng" : "đ/năm"}
            </span>
          </div>
          {billingCycle === "yearly" && price > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              ~ {formatVND(Math.round(price / 12))}đ/tháng
            </p>
          )}
        </div>

        <ul className="mb-8 flex-1 space-y-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div className="bg-gradient-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            "mt-auto w-full",
            isPopular && !isDisabled ? "bg-gradient-primary btn-glow" : ""
          )}
          variant={isDisabled ? "outline" : isPopular ? "default" : "outline"}
          disabled={isDisabled || isLoading}
          onClick={onAction}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ctaText}
        </Button>
      </motion.div>
    );
  }

  return (
    <Card
      className={cn(
        "relative",
        isHighlighted
          ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
          : isPopular
            ? "border-primary shadow-lg shadow-primary/10"
            : isCurrentPlan
              ? "border-primary/50 bg-primary/5"
              : "border-border/60"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
            Phổ biến nhất
          </span>
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
            Đang sử dụng
          </span>
        </div>
      )}

      <CardHeader className="pb-4 text-center">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-foreground">{formatVND(price)}</span>
          <span className="text-muted-foreground">
            {price === 0 ? "" : billingCycle === "monthly" ? "đ/tháng" : "đ/năm"}
          </span>
        </div>
        {billingCycle === "yearly" && price > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            ~ {formatVND(Math.round(price / 12))}đ/tháng
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col space-y-6">
        <ul className="flex-1 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className={cn(
            "mt-auto w-full",
            isHighlighted && !isDisabled
              ? ""
              : isPopular
                ? ""
                : "hover:border-primary hover:bg-white hover:text-primary"
          )}
          variant={isDisabled ? "outline" : isPopular || isHighlighted ? "default" : "outline"}
          disabled={isDisabled || isLoading}
          onClick={onAction}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {ctaText}
        </Button>
      </CardContent>
    </Card>
  );
}
