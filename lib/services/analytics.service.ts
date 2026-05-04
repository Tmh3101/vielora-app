import type { ServiceClient } from "@/lib/services/types";
import type { Tables } from "@/lib/supabase/types";
import {
  getConversationsByBotId,
  getMessagesByConversationIds,
} from "@/lib/services/conversations.service";

export interface AnalyticsData {
  messagesToday: number;
  messagesMonth: number;
  conversationsCount: number;
  noAnswerCount: number;
  topQuestions: Array<{ content: string; count: number }>;
}

export interface ChartDataPoint {
  date: string;
  messages: number;
  conversations: number;
}

export interface AnalyticsWithCharts extends AnalyticsData {
  chartData: ChartDataPoint[];
}

export interface FetchAnalyticsOptions {
  botId: string;
  chartPeriod?: "today" | "7days" | "30days" | "year";
}

/**
 * Fetch comprehensive analytics data for a bot.
 */
export async function fetchBotAnalytics(
  client: ServiceClient,
  options: FetchAnalyticsOptions
): Promise<AnalyticsWithCharts> {
  const { botId, chartPeriod = "7days" } = options;

  try {
    const conversations = await getConversationsByBotId(client, botId);

    if (conversations.length === 0) {
      return {
        messagesToday: 0,
        messagesMonth: 0,
        conversationsCount: 0,
        noAnswerCount: 0,
        topQuestions: [],
        chartData: generateEmptyChartData(chartPeriod),
      };
    }

    const conversationIds = conversations.map((c) => c.id);
    const allMessages = await getMessagesByConversationIds(client, conversationIds);

    const analytics = calculateBasicAnalytics(allMessages);
    const chartData = generateChartData(conversations, allMessages, chartPeriod);

    return {
      ...analytics,
      conversationsCount: conversations.length,
      chartData,
    };
  } catch (error) {
    console.error("Error fetching bot analytics:", error);
    throw error;
  }
}

/**
 * Get analytics summary for a bot (numbers only, no chart data).
 */
export async function fetchAnalyticsSummary(
  client: ServiceClient,
  botId: string
): Promise<AnalyticsData> {
  const fullAnalytics = await fetchBotAnalytics(client, { botId });
  const { chartData, ...summary } = fullAnalytics;
  return summary;
}

/**
 * Calculate basic analytics from messages.
 */
function calculateBasicAnalytics(
  messages: Tables<"messages">[]
): Omit<AnalyticsData, "conversationsCount"> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const userMessages = messages.filter((m) => m.role === "user");
  const todayMessages = userMessages.filter((m) => new Date(m.created_at) >= todayStart);
  const monthMessages = userMessages.filter((m) => new Date(m.created_at) >= monthStart);

  const noAnswerMessages = messages.filter((m) => m.no_answer === true);

  const recentUserMessages = userMessages.slice(0, 50);
  const questionCounts: Record<string, number> = {};

  recentUserMessages.forEach((m) => {
    const question = m.content;
    questionCounts[question] = (questionCounts[question] || 0) + 1;
  });

  const topQuestions = Object.entries(questionCounts)
    .map(([content, count]) => ({ content, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    messagesToday: todayMessages.length,
    messagesMonth: monthMessages.length,
    noAnswerCount: noAnswerMessages.length,
    topQuestions,
  };
}

/**
 * Generate chart data for the specified period.
 */
function generateChartData(
  conversations: Array<Pick<Tables<"conversations">, "id" | "started_at">>,
  messages: Array<Pick<Tables<"messages">, "id" | "created_at" | "conversation_id" | "role">>,
  period: "today" | "7days" | "30days" | "year"
): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];

  if (period === "today") {
    for (let i = 23; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i, 0, 0, 0);

      const nextHour = new Date(date);
      nextHour.setHours(date.getHours() + 1);

      const hourMessages = messages.filter(
        (m) =>
          m.role === "user" && new Date(m.created_at) >= date && new Date(m.created_at) < nextHour
      ).length;

      const hourConversations = conversations.filter((c) => {
        const conversationDate = new Date(c.started_at);
        return conversationDate >= date && conversationDate < nextHour;
      }).length;

      chartData.push({
        date: date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        messages: hourMessages,
        conversations: hourConversations,
      });
    }
  } else if (period === "year") {
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setUTCHours(0, 0, 0, 0);

      const nextMonth = new Date(date);
      nextMonth.setMonth(date.getMonth() + 1);

      const monthMessages = messages.filter(
        (m) =>
          m.role === "user" && new Date(m.created_at) >= date && new Date(m.created_at) < nextMonth
      ).length;

      const monthConversations = conversations.filter((c) => {
        const conversationDate = new Date(c.started_at);
        return conversationDate >= date && conversationDate < nextMonth;
      }).length;

      chartData.push({
        date: `${date.getMonth() + 1}/${date.getFullYear()}`,
        messages: monthMessages,
        conversations: monthConversations,
      });
    }
  } else {
    const days = period === "7days" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setUTCHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      const dayMessages = messages.filter(
        (m) =>
          m.role === "user" && new Date(m.created_at) >= date && new Date(m.created_at) < nextDay
      ).length;

      const dayConversations = conversations.filter((c) => {
        const conversationDate = new Date(c.started_at);
        return conversationDate >= date && conversationDate < nextDay;
      }).length;

      const currentYear = new Date().getFullYear();
      const dateYear = date.getFullYear();
      const showYear = dateYear !== currentYear;

      chartData.push({
        date: showYear
          ? `${date.getDate()}/${date.getMonth() + 1}/${dateYear}`
          : `${date.getDate()}/${date.getMonth() + 1}`,
        messages: dayMessages,
        conversations: dayConversations,
      });
    }
  }

  return chartData;
}

/**
 * Generate empty chart data for when there's no data.
 */
function generateEmptyChartData(period: "today" | "7days" | "30days" | "year"): ChartDataPoint[] {
  const chartData: ChartDataPoint[] = [];

  if (period === "today") {
    for (let i = 23; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i, 0, 0, 0);

      chartData.push({
        date: date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        messages: 0,
        conversations: 0,
      });
    }
  } else if (period === "year") {
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);

      chartData.push({
        date: `${date.getMonth() + 1}/${date.getFullYear()}`,
        messages: 0,
        conversations: 0,
      });
    }
  } else {
    const days = period === "7days" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const currentYear = new Date().getFullYear();
      const dateYear = date.getFullYear();
      const showYear = dateYear !== currentYear;

      chartData.push({
        date: showYear
          ? `${date.getDate()}/${date.getMonth() + 1}/${dateYear}`
          : `${date.getDate()}/${date.getMonth() + 1}`,
        messages: 0,
        conversations: 0,
      });
    }
  }

  return chartData;
}
