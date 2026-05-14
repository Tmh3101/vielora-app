"use client";

import { Activity } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { AnalyticsTrendPoint } from "@/lib/services/analytics.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export interface DualLineChartProps {
  data: AnalyticsTrendPoint[];
}

const CONVERSATIONS_COLOR = "#14b8a6";

/**
 * Renders a card titled "Xu hướng hội thoại" that shows either an empty state or a dual-line time series chart.
 *
 * @param data - Array of trend points for the chart. Each point should include `date` (x-axis), `messages` (left y-axis), and `conversations` (right y-axis).
 * @returns The card element containing the empty-state view when no data is available, or a dual-line chart plotting `messages` and `conversations` over time.
 */
export function DualLineChart({ data }: DualLineChartProps) {
  const hasNoData =
    !data ||
    data.length === 0 ||
    data.every((point) => point.messages === 0 && point.conversations === 0);

  return (
    <Card className="glass border-border/60">
      <CardHeader>
        <CardTitle>Biểu đồ tương tác</CardTitle>
        <CardDescription>Tin nhắn người dùng và cuộc hội thoại mới theo thời gian</CardDescription>
      </CardHeader>
      <CardContent>
        {hasNoData ? (
          <div className="flex h-[320px] items-center justify-center text-muted-foreground">
            <div className="max-w-md space-y-2 text-center">
              <Activity className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p className="text-sm">Chưa có dữ liệu để hiển thị biểu đồ</p>
              <p className="text-xs leading-5">
                Bot của bạn đã sẵn sàng! Hãy gắn mã nhúng lên website hoặc chat thử tại mục
                Playground để xem dữ liệu tại đây.
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={{
              messages: { label: "Tin nhắn", color: "hsl(var(--primary))" },
              conversations: { label: "Hội thoại", color: CONVERSATIONS_COLOR },
            }}
            className="h-[320px] w-full"
          >
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="messages"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                dot={{ r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversations"
                stroke={CONVERSATIONS_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={{ r: 2.5, fill: CONVERSATIONS_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
