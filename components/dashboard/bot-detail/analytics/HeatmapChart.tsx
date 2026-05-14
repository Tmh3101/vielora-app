"use client";

import { Clock3 } from "lucide-react";
import { Fragment, useMemo } from "react";
import type { AnalyticsHeatmapCell } from "@/lib/services/analytics.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DAY_LABELS_BY_INDEX, DISPLAY_DAYS } from "@/lib/constants/analytics";

export interface HeatmapChartProps {
  data: AnalyticsHeatmapCell[];
}

/**
 * Computes a CSS HSL color for a heatmap cell based on its value relative to the maximum value.
 *
 * @param value - The cell's numeric value (e.g., messages count for that hour/day).
 * @param maxValue - The maximum cell value across the dataset used for scaling.
 * @returns `hsl(var(--muted))` when `value` is 0 or `maxValue` is 0; otherwise `hsl(var(--primary) / OPACITY)` where `OPACITY` is 0.2 + (value / maxValue) * 0.8, clamped to a maximum of 1.
 */
function getIntensity(value: number, maxValue: number) {
  if (value === 0 || maxValue === 0) {
    return "hsl(var(--muted))";
  }

  const opacity = 0.2 + (value / maxValue) * 0.8;
  return `hsl(var(--primary) / ${Math.min(opacity, 1)})`;
}

/**
 * Render a compact 7-day × 24-hour heatmap of messaging activity.
 *
 * Renders a card containing either an empty-state when there is no activity or a horizontally scrollable grid of 7 rows (days) × 24 columns (hours). Each cell's background color encodes its value relative to the dataset maximum; a legend and optional badges (peak hour and strongest day) are shown when activity exists.
 *
 * @param data - Array of analytics cells, each with `{ day: number, hour: number, value: number }`
 * @returns The rendered heatmap chart component
 */
export function HeatmapChart({ data }: HeatmapChartProps) {
  const maxValue = Math.max(...data.map((cell) => cell.value), 0);
  const hasActivity = maxValue > 0;
  const cellMap = useMemo(
    () => new Map(data.map((cell) => [`${cell.day}-${cell.hour}`, cell.value] as const)),
    [data]
  );
  const peakCell = useMemo(
    () =>
      data.reduce(
        (max, cell) => (cell.value > max.value ? cell : max),
        data[0] ?? { day: 0, hour: 0, value: 0 }
      ),
    [data]
  );
  const peakDayTotal = useMemo(() => {
    return DISPLAY_DAYS.map(({ label, index }) => ({
      label,
      total: data.filter((cell) => cell.day === index).reduce((sum, cell) => sum + cell.value, 0),
    })).sort((a, b) => b.total - a.total)[0];
  }, [data]);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Khung giờ hoạt động</CardTitle>
            {/* <CardDescription>
              Heatmap rút gọn để xem nhanh lúc người dùng nhắn nhiều nhất
            </CardDescription> */}
          </div>
          {hasActivity && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                Thời gian cao điểm: {DAY_LABELS_BY_INDEX[peakCell.day]} {peakCell.hour}:00
              </Badge>
              <Badge variant="outline">
                Ngày hoạt động nhiều nhất: {peakDayTotal?.label ?? "CN"}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="flex h-[220px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Clock3 className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p className="text-sm">Chưa có hoạt động để hiển thị heatmap</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 overflow-x-auto">
            <TooltipProvider delayDuration={120}>
              <div className="grid min-w-[620px] grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1.5">
                <div />
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="text-center text-[10px] text-muted-foreground">
                    {`${hour}h`}
                  </div>
                ))}
                {DISPLAY_DAYS.map((dayItem) => (
                  <Fragment key={dayItem.label}>
                    <div className="flex items-center text-[11px] font-medium text-muted-foreground">
                      {dayItem.label}
                    </div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const value = cellMap.get(`${dayItem.index}-${hour}`) ?? 0;

                      return (
                        <Tooltip key={`${dayItem.label}-${hour}`}>
                          <TooltipTrigger asChild>
                            <div
                              className="h-4 rounded-[6px] border border-border/30"
                              style={{ backgroundColor: getIntensity(value, maxValue) }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">
                              {dayItem.label} {hour}:00 - {value} tin nhắn
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </TooltipProvider>

            <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
              <span>Thấp</span>
              <div className="flex items-center gap-1">
                {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                  <div
                    key={opacity}
                    className="h-2.5 w-5 rounded-sm border border-border/40"
                    style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
                  />
                ))}
              </div>
              <span>Cao</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
