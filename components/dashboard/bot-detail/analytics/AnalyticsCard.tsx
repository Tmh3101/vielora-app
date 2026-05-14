"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AnalyticsCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  deltaPercent: number | null;
  tone?: "default" | "danger";
}

/**
 * Produce metadata for rendering a delta/trend pill based on a percentage change and visual tone.
 *
 * @param deltaPercent - The percentage change to display; may be `null` to indicate missing/unknown data.
 * @param tone - Visual tone that determines which direction is treated as positive; `"default"` treats positive percentages as positive, `"danger"` inverts that interpretation.
 * @returns An object with:
 *  - `icon`: the icon component for the trend indicator,
 *  - `label`: a localized label (`"- Không có dữ liệu"` when `deltaPercent` is null, `"Không đổi"` when `deltaPercent` is 0, otherwise `"+{n}%"` for positive or `"{n}%"` for negative where `n` is the absolute percentage),
 *  - `className`: CSS classes describing the pill's background and text color appropriate to the interpreted positivity.
 */
function getTrendMeta(deltaPercent: number | null, tone: "default" | "danger") {
  if (deltaPercent === null || deltaPercent === undefined) {
    return {
      icon: Minus,
      label: "Không có dữ liệu",
      className: "bg-muted text-muted-foreground",
    };
  }

  if (deltaPercent === 0) {
    return {
      icon: Minus,
      label: "Không đổi",
      className: "bg-muted text-muted-foreground",
    };
  }

  const isPositive = deltaPercent > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const isPositiveTone = tone === "danger" ? !isPositive : isPositive;

  return {
    icon: Icon,
    label: `${isPositive ? "+" : ""}${Math.abs(deltaPercent)}%`,
    className: isPositiveTone ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
  };
}

/**
 * Renders a compact analytics card showing a title, value, description, icon, and a trend badge.
 *
 * @param deltaPercent - The percentage change to display in the trend badge; pass `null` or `undefined` to indicate missing data (renders a muted "no data" state).
 * @param tone - Visual tone for the trend badge. Use `"default"` for normal semantics (positive = good) or `"danger"` to invert the semantic mapping (higher values rendered with a danger visual tone). Defaults to `"default"`.
 * @returns A card element containing the provided title, value, description, icon, and a trend pill reflecting `deltaPercent` and `tone`.
 */
export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  deltaPercent,
  tone = "default",
}: AnalyticsCardProps) {
  const trend = getTrendMeta(deltaPercent, tone);
  const TrendIcon = trend.icon;

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            trend.className
          )}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trend.label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
