"use client";

import { CalendarDays, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ESubscriptionCycle } from "@/types";

interface PricingToggleProps {
  billingCycle: ESubscriptionCycle;
  setBillingCycle: (cycle: ESubscriptionCycle) => void;
}

export function PricingToggle({ billingCycle, setBillingCycle }: PricingToggleProps) {
  return (
    <Tabs
      value={billingCycle}
      onValueChange={(value) => setBillingCycle(value as ESubscriptionCycle)}
      className="w-auto"
    >
      <TabsList className="glass grid w-[400px] grid-cols-2 p-1">
        <TabsTrigger
          value={ESubscriptionCycle.Monthly}
          className="data-[state=active]:bg-gradient-primary flex items-center gap-2 data-[state=active]:text-primary-foreground"
        >
          <Package className="h-4 w-4" />
          Gói tháng
        </TabsTrigger>
        <TabsTrigger
          value={ESubscriptionCycle.Yearly}
          className="data-[state=active]:bg-gradient-primary flex items-center gap-2 data-[state=active]:text-primary-foreground"
        >
          <CalendarDays className="h-4 w-4" />
          Gói năm
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
            -17%
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
