"use client";

import { useMemo, useState } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { AlertCircle, Bot, Coins, MessageCircle, MessagesSquare, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/types";
import { useBotAnalytics } from "@/hooks/dashboard/bot-detail/useBotAnalytics";
import { AnalyticsCard } from "@/components/dashboard/bot-detail/analytics/AnalyticsCard";
import { DateRangePicker } from "@/components/dashboard/bot-detail/analytics/DateRangePicker";
import { DualLineChart } from "@/components/dashboard/bot-detail/analytics/DualLineChart";
import { HeatmapChart } from "@/components/dashboard/bot-detail/analytics/HeatmapChart";
import { RecentQuestionsCard } from "@/components/dashboard/bot-detail/analytics/RecentQuestionsCard";
import { OverviewLoadingState } from "@/components/dashboard/bot-detail/tabs/OverviewLoadingState";
import { OverviewErrorState } from "@/components/dashboard/bot-detail/tabs/OverviewErrorState";
import { getBotStatusLabel } from "@/lib/helpers/bot-helpers";

export interface OverviewTabProps {
  bot: Tables<"bots">;
  pagesCount: number;
}

/**
 * Render the analytics overview tab for a bot, including status badges, KPI cards, time-range selector, trends and recent activity.
 *
 * @param bot - Bot record used to derive status, last crawl time, and the bot ID for analytics queries
 * @param pagesCount - Number of pages indexed for the bot shown in the header
 * @returns A React element containing the bot analytics overview UI
 */
export function OverviewTab({ bot, pagesCount }: OverviewTabProps) {
  const defaultRange = useMemo(
    () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
    []
  );
  const [range, setRange] = useState(defaultRange);
  const statusMeta = getBotStatusLabel(bot);
  const analyticsQuery = useBotAnalytics({
    botId: bot.id,
    from: range.from,
    to: range.to,
  });

  if (analyticsQuery.isLoading) {
    return <OverviewLoadingState />;
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    const message =
      analyticsQuery.error instanceof Error
        ? analyticsQuery.error.message
        : "Đã xảy ra lỗi không xác định.";

    return <OverviewErrorState message={message} />;
  }

  const { comparison, kpis, trends, heatmap } = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardDescription>
              Theo dõi tương tác người dùng, fallback và mức sử dụng credits theo từng giai đoạn.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Bot className="h-3 w-3" />
                {pagesCount} trang đã index
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <TimerReset className="h-3 w-3" />
                {bot.last_crawl_at
                  ? new Date(bot.last_crawl_at).toLocaleString("vi-VN")
                  : "Chưa crawl"}
              </Badge>
            </div>
          </div>

          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard
          title="Cuộc hội thoại"
          value={kpis.totalConversations.toLocaleString("vi-VN")}
          description="Số cuộc hội thoại mới"
          icon={MessagesSquare}
          deltaPercent={comparison.conversations.deltaPercent}
        />
        <AnalyticsCard
          title="Tin nhắn người dùng"
          value={kpis.totalMessages.toLocaleString("vi-VN")}
          description="Tổng số tin nhắn"
          icon={MessageCircle}
          deltaPercent={comparison.messages.deltaPercent}
        />
        <AnalyticsCard
          title="Fallback rate"
          value={`${kpis.fallbackRate.toLocaleString("vi-VN")}%`}
          description={`câu hỏi không thể trả lời`}
          icon={AlertCircle}
          deltaPercent={comparison.fallbacks.deltaPercent}
          tone="danger"
        />
        <AnalyticsCard
          title="Credits đã dùng"
          value={kpis.creditsUsed.toLocaleString("vi-VN")}
          description="Credits tiêu thụ bởi chat"
          icon={Coins}
          deltaPercent={comparison.creditsUsed.deltaPercent}
        />
      </div>

      <DualLineChart data={trends} />
      <HeatmapChart data={heatmap} />
      <RecentQuestionsCard questions={analyticsQuery.data.recentQuestions} />
    </div>
  );
}
