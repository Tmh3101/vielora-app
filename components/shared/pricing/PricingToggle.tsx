"use client";

import { CalendarDays, Package } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ESubscriptionCycle } from "@/types";

interface PricingToggleProps {
  billingCycle: ESubscriptionCycle;
  setBillingCycle: (cycle: ESubscriptionCycle) => void;
  variant?: "default" | "landing";
}

export function PricingToggle({
  billingCycle,
  setBillingCycle,
  variant = "default",
}: PricingToggleProps) {
  if (variant === "landing") {
    return (
      <Tabs
        value={billingCycle}
        onValueChange={(value) => setBillingCycle(value as ESubscriptionCycle)}
        className="pb-4"
      >
        <TabsList className="glass grid h-auto w-full max-w-xl grid-cols-2">
          <TabsTrigger
            value={ESubscriptionCycle.Monthly}
            className="data-[state=active]:bg-gradient-primary flex min-h-10 items-center gap-2 whitespace-normal px-8 py-0 text-center text-sm leading-snug data-[state=active]:text-primary-foreground sm:text-base"
          >
            <Package className="h-4 w-4 shrink-0" />
            Gói tháng
          </TabsTrigger>
          <TabsTrigger
            value={ESubscriptionCycle.Yearly}
            className="data-[state=active]:bg-gradient-primary flex min-h-10 items-center gap-2 whitespace-normal px-8 py-0 text-center text-sm leading-snug data-[state=active]:text-primary-foreground sm:text-base"
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            Gói năm
            <span
              className={
                billingCycle === ESubscriptionCycle.Yearly
                  ? "rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white"
                  : "rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 opacity-50"
              }
            >
              -17%
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  }

  return (
    <RadioGroup
      value={billingCycle}
      onValueChange={(value) => setBillingCycle(value as ESubscriptionCycle)}
      className="grid pb-4 sm:grid-cols-2"
    >
      <div className="flex items-center gap-3 rounded-lg text-left transition-colors">
        <RadioGroupItem
          value={ESubscriptionCycle.Monthly}
          id="billing-cycle-monthly"
          className="shrink-0"
        />
        <label
          htmlFor="billing-cycle-monthly"
          className="flex min-w-0 cursor-pointer items-center gap-2"
        >
          <Package className="h-4 w-4 shrink-0" />
          <span className="font-medium">Gói tháng</span>
        </label>
      </div>

      <div className="flex items-center gap-3 rounded-lg text-left transition-colors">
        <RadioGroupItem
          value={ESubscriptionCycle.Yearly}
          id="billing-cycle-yearly"
          className="shrink-0"
        />
        <label
          htmlFor="billing-cycle-yearly"
          className="flex min-w-0 cursor-pointer flex-wrap items-center gap-2"
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="font-medium">Gói năm</span>
          <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600">
            -17%
          </span>
        </label>
      </div>
    </RadioGroup>
  );
}
