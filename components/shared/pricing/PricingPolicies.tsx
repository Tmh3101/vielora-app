"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { policies, type PricingVariant } from "@/config/pricing";
import { cn } from "@/lib/utils";

interface PricingPoliciesProps {
  variant: PricingVariant;
}

export function PricingPolicies({ variant }: PricingPoliciesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {policies.map((policy, index) => (
        <motion.div
          key={policy.title}
          initial={variant === "landing" ? { opacity: 0, y: 10 } : false}
          whileInView={variant === "landing" ? { opacity: 1, y: 0 } : undefined}
          viewport={variant === "landing" ? { once: true } : undefined}
          transition={
            variant === "landing" ? { duration: 0.3, delay: 0.4 + index * 0.1 } : undefined
          }
          className={cn(
            "flex gap-4",
            variant === "landing"
              ? "glass group rounded-2xl p-5 transition-all hover:border-primary/40"
              : "rounded-lg bg-muted/50 p-4"
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
              variant === "landing"
                ? "bg-gradient-primary shadow-glow-sm group-hover:shadow-glow h-10 w-10 rounded-xl transition-shadow"
                : "bg-primary/10"
            )}
          >
            <Check
              className={cn(
                variant === "landing" ? "h-5 w-5 text-primary-foreground" : "h-4 w-4 text-primary"
              )}
            />
          </div>
          <div>
            <h3
              className={cn(
                "mb-1 font-semibold text-foreground",
                variant === "landing" ? "" : "text-base"
              )}
            >
              {policy.title}
            </h3>
            <p className="text-sm text-muted-foreground">{policy.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
