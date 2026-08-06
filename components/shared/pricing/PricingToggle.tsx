"use client";

import { CalendarDays, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ESubscriptionCycle } from "@/types";

interface PricingToggleProps {
  billingCycle: ESubscriptionCycle;
  setBillingCycle: (cycle: ESubscriptionCycle) => void;
  variant?: "default" | "landing";
  yearlyBadgeText?: string;
}

export function PricingToggle({
  billingCycle,
  setBillingCycle,
  yearlyBadgeText = "-17%",
}: PricingToggleProps) {
  return (
    <Tabs
      value={billingCycle}
      onValueChange={(value) => setBillingCycle(value as ESubscriptionCycle)}
      className="flex justify-center"
    >
      <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground shadow-inner">
        <TabsTrigger
          value={ESubscriptionCycle.Monthly}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-1.5 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Package className="h-4 w-4" />
          Theo tháng
        </TabsTrigger>
        <TabsTrigger
          value={ESubscriptionCycle.Yearly}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-1.5 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <CalendarDays className="h-4 w-4" />
          Theo năm
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            {yearlyBadgeText}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
