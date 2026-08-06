"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, CheckCircle2 } from "lucide-react";

export interface OrderSummaryItem {
  label: string;
  value: ReactNode;
  isHighlighted?: boolean;
}

export interface OrderSummaryCardProps {
  title?: string;
  subtitle?: string;
  badge?: ReactNode;
  items: OrderSummaryItem[];
  totalPrice: string;
  totalLabel?: string;
  monthlyEquivalentPrice?: string;
  benefitsTitle?: string;
  benefits?: string[];
  ctaText?: string;
  isProcessing?: boolean;
  onCheckout: () => void;
  disabled?: boolean;
  securityText?: string;
  children?: ReactNode;
}

export function OrderSummaryCard({
  title = "Tóm tắt đơn hàng",
  subtitle,
  badge,
  items,
  totalPrice,
  totalLabel = "Tổng thanh toán:",
  monthlyEquivalentPrice,
  benefitsTitle,
  benefits,
  ctaText = "Tiếp tục thanh toán",
  isProcessing = false,
  onCheckout,
  disabled = false,
  securityText = "",
  children,
}: OrderSummaryCardProps) {
  return (
    <Card className="border-2 border-primary/30 bg-card shadow-lg transition-all">
      <CardHeader className="bg-muted/40 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-foreground">{title}</CardTitle>
          {badge}
        </div>
        {subtitle && (
          <CardDescription className="text-xs text-muted-foreground">{subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {/* Items list */}
        <div className="space-y-2.5 text-xs">
          {items.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between gap-2 ${
                item.isHighlighted
                  ? "font-medium text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={
                  item.isHighlighted
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "text-right font-semibold text-foreground"
                }
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Total Price Section */}
        <div className="border-t border-border pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">{totalLabel}</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{totalPrice}</div>
              {monthlyEquivalentPrice && (
                <div className="text-[11px] font-medium text-muted-foreground">
                  {monthlyEquivalentPrice}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Benefits List */}
        {benefits && benefits.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3.5">
            {benefitsTitle && (
              <p className="text-xs font-semibold text-foreground">{benefitsTitle}</p>
            )}
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {children}

        {/* Action Button */}
        <Button
          className="btn-glow h-11 w-full text-sm font-semibold shadow-md"
          onClick={onCheckout}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>{ctaText}</>
          )}
        </Button>

        {securityText && (
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>{securityText}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
