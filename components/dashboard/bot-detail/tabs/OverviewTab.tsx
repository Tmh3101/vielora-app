"use client";

import { useMemo, useState } from "react";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { Bot, Coins, MessageCircle, MessagesSquare, TimerReset, UserPlus } from "lucide-react";
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
import { getBotStatusLabel } from "@/lib/helpers";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard.botDetail.overviewTab");
  const tBots = useTranslations("dashboard.overview.botsSection");
  const defaultRange = useMemo(
    () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
    []
  );
  const [range, setRange] = useState(defaultRange);
  const statusMeta = getBotStatusLabel(bot, tBots);
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
      analyticsQuery.error instanceof Error ? analyticsQuery.error.message : "An error occurred.";

    return <OverviewErrorState message={message} />;
  }

  const { comparison, kpis, trends, heatmap } = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardDescription>{t("testDescription")}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Bot className="h-3 w-3" />
                {pagesCount} {tBots("pages")}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <TimerReset className="h-3 w-3" />
                {bot.last_crawl_at ? new Date(bot.last_crawl_at).toLocaleDateString() : "-"}
              </Badge>
            </div>
          </div>

          <DateRangePicker from={range.from} to={range.to} onChange={setRange} />
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard
          title={t("totalConversations")}
          value={kpis.totalConversations.toLocaleString()}
          // description={t("totalConversations")}
          icon={MessagesSquare}
          deltaPercent={comparison.conversations.deltaPercent}
        />
        <AnalyticsCard
          title={t("totalMessages")}
          value={kpis.totalMessages.toLocaleString()}
          // description={t("totalMessages")}
          icon={MessageCircle}
          deltaPercent={comparison.messages.deltaPercent}
        />
        <AnalyticsCard
          title={t("totalLeads")}
          value={kpis.leadCount.toLocaleString()}
          // description={t("totalLeads")}
          icon={UserPlus}
          deltaPercent={comparison.leads.deltaPercent}
        />
        <AnalyticsCard
          title={tBots("tableColKnowledge")}
          value={kpis.creditsUsed.toLocaleString()}
          // description={tBots("tableColKnowledge")}
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
