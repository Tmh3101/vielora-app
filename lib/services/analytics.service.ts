import type { ServiceClient } from "@/lib/services/types";
import { DAY_MS } from "@/lib/constants/analytics";

export interface AnalyticsRange {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export interface AnalyticsKpis {
  totalConversations: number;
  totalMessages: number;
  fallbackCount: number;
  fallbackRate: number;
  creditsUsed: number;
}

export interface AnalyticsComparisonItem {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
}

export interface AnalyticsComparison {
  conversations: AnalyticsComparisonItem;
  messages: AnalyticsComparisonItem;
  fallbacks: AnalyticsComparisonItem;
  creditsUsed: AnalyticsComparisonItem;
}

export interface AnalyticsTrendPoint {
  date: string;
  messages: number;
  conversations: number;
}

export interface AnalyticsHeatmapCell {
  day: number;
  hour: number;
  value: number;
}

export interface RecentQuestionInsight {
  content: string;
  createdAt: string;
  answer: string;
  hasFallback: boolean;
}

export interface BotAnalyticsResponse {
  kpis: AnalyticsKpis;
  comparison: AnalyticsComparison;
  trends: AnalyticsTrendPoint[];
  heatmap: AnalyticsHeatmapCell[];
  recentQuestions: RecentQuestionInsight[];
  range: AnalyticsRange;
}

interface ConversationTimestampRow {
  id: string;
  started_at: string;
}

interface MessageAnalyticsRow {
  conversation_id: string;
  content: string;
  created_at: string;
  role: string;
  no_answer: boolean | null;
}

/**
 * Compute ISO timestamp range for the current window and the immediately preceding window of equal duration.
 *
 * @param from - Start of the current window
 * @param to - End of the current window
 * @returns An object with ISO strings: `from` and `to` for the current window, and `previousFrom` and `previousTo` for the previous window. `previousTo` is set to one millisecond before `from` and the previous window spans the same duration as the current window.
 */
export function buildAnalyticsRange(from: Date, to: Date): AnalyticsRange {
  const currentFrom = new Date(from);
  const currentTo = new Date(to);
  const periodDurationMs = currentTo.getTime() - currentFrom.getTime();
  const previousTo = new Date(currentFrom.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodDurationMs);

  return {
    from: currentFrom.toISOString(),
    to: currentTo.toISOString(),
    previousFrom: previousFrom.toISOString(),
    previousTo: previousTo.toISOString(),
  };
}

/**
 * Compute KPI totals and rates for a given time window from message and conversation data.
 *
 * @param messages - Message rows to analyze; only entries with `role === "user"` are considered. Each row may include `no_answer`.
 * @param conversationsCount - Total number of conversations in the analyzed window.
 * @param creditsUsed - Total credits consumed in the analyzed window.
 * @returns An object containing `totalConversations`, `totalMessages`, `fallbackCount`, `fallbackRate` (percentage rounded to one decimal place), and `creditsUsed`.
 */
export function calculateAnalyticsKpis(
  messages: MessageAnalyticsRow[],
  conversationsCount: number,
  creditsUsed: number
): AnalyticsKpis {
  const userMessages = messages.filter((message) => message.role === "user");
  const fallbackCount = userMessages.filter((message) => message.no_answer === true).length;
  const totalMessages = userMessages.length;

  return {
    totalConversations: conversationsCount,
    totalMessages,
    fallbackCount,
    fallbackRate:
      totalMessages > 0 ? Number(((fallbackCount / totalMessages) * 100).toFixed(1)) : 0,
    creditsUsed,
  };
}

/**
 * Calculate absolute and percentage change from a previous value to a current value.
 *
 * @returns An object with `current` and `previous` values, `delta` (current − previous), and `deltaPercent` — the percentage change rounded to one decimal place; `deltaPercent` is `null` when `previous` is 0.
 */
export function calculateComparison(current: number, previous: number): AnalyticsComparisonItem {
  const delta = current - previous;

  return {
    current,
    previous,
    delta,
    deltaPercent: previous === 0 ? null : Number(((delta / previous) * 100).toFixed(1)),
  };
}

/**
 * Builds a daily time series of message and conversation counts for the specified date range.
 *
 * @param conversations - Conversation rows to aggregate (each must include `started_at`)
 * @param messages - Message rows to aggregate (each must include `created_at` and `role`)
 * @param from - Start of the inclusive range
 * @param to - End of the inclusive range
 * @returns An array of daily points where each point's `date` is formatted as `DD/MM` and `messages` and `conversations` are the counts for that day
 */
export function buildTrendSeries(
  conversations: ConversationTimestampRow[],
  messages: MessageAnalyticsRow[],
  from: Date,
  to: Date
): AnalyticsTrendPoint[] {
  const points: AnalyticsTrendPoint[] = [];
  const userMessageTimestamps = messages
    .filter((message) => message.role === "user")
    .map((message) => new Date(message.created_at).getTime());
  const conversationTimestamps = conversations.map((conversation) =>
    new Date(conversation.started_at).getTime()
  );

  for (let bucketStart = from.getTime(); bucketStart <= to.getTime(); bucketStart += DAY_MS) {
    const bucketEnd = Math.min(bucketStart + DAY_MS, to.getTime() + 1);
    const pointDate = new Date(bucketStart);

    points.push({
      date: pointDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      messages: userMessageTimestamps.filter(
        (timestamp) => timestamp >= bucketStart && timestamp < bucketEnd
      ).length,
      conversations: conversationTimestamps.filter(
        (timestamp) => timestamp >= bucketStart && timestamp < bucketEnd
      ).length,
    });
  }

  return points;
}

/**
 * Builds a 7×24 heatmap of user message counts grouped by day of week and hour within the given time range.
 *
 * Filters out non-user messages and only counts messages whose `created_at` timestamp is greater than or equal to `from`
 * and less than or equal to `to`. The result contains one cell for each day (0–6) and hour (0–23).
 *
 * @param messages - Array of message rows to aggregate; only rows with `role === "user"` are counted
 * @param from - Start of the time range (inclusive)
 * @param to - End of the time range (inclusive)
 * @returns An array of heatmap cells where each cell contains `day`, `hour`, and `value` (message count for that slot)
 */
export function buildHeatmapSeries(
  messages: MessageAnalyticsRow[],
  from: Date,
  to: Date
): AnalyticsHeatmapCell[] {
  const cells = new Map<string, number>();
  const fromTime = from.getTime();
  const toTime = to.getTime();

  messages.forEach((message) => {
    if (message.role !== "user") return;

    const messageDate = new Date(message.created_at);
    const timestamp = messageDate.getTime();

    if (timestamp < fromTime || timestamp > toTime) return;

    const key = `${messageDate.getDay()}-${messageDate.getHours()}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  });

  const heatmap: AnalyticsHeatmapCell[] = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      heatmap.push({
        day,
        hour,
        value: cells.get(`${day}-${hour}`) ?? 0,
      });
    }
  }

  return heatmap;
}

/**
 * Produce a list of the most recent user questions.
 *
 * @param messages - Array of message rows; only items with `role === "user"` are considered
 * @param limit - Maximum number of questions to return (default: 6)
 * @returns An array of recent questions ordered newest first; each item contains `content`, the original `createdAt` timestamp, and `hasFallback` indicating whether the message had no answer
 */
export function buildRecentQuestions(
  messages: MessageAnalyticsRow[],
  limit = 100
): RecentQuestionInsight[] {
  const sortedMessages = messages
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((message) => message.role === "user")
    .slice(0, limit);

  return sortedMessages.map((message) => {
    const questionTime = new Date(message.created_at).getTime();
    const nearestAssistantReply = messages
      .filter(
        (item) =>
          item.role === "assistant" &&
          item.conversation_id === message.conversation_id &&
          new Date(item.created_at).getTime() >= questionTime
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

    return {
      content: message.content,
      createdAt: message.created_at,
      answer: nearestAssistantReply?.content ?? "Bot chưa có câu trả lời cho câu hỏi này.",
      hasFallback: message.no_answer === true,
    };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : asNumber(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function mapComparisonItem(value: unknown): AnalyticsComparisonItem {
  const item = asRecord(value);
  return {
    current: asNumber(item.current),
    previous: asNumber(item.previous),
    delta: asNumber(item.delta),
    deltaPercent: asNullableNumber(item.deltaPercent),
  };
}

function mapAnalyticsResponse(value: unknown, fallbackRange: AnalyticsRange): BotAnalyticsResponse {
  const root = asRecord(value);
  const kpis = asRecord(root.kpis);
  const comparison = asRecord(root.comparison);
  const range = asRecord(root.range);

  return {
    kpis: {
      totalConversations: asNumber(kpis.totalConversations),
      totalMessages: asNumber(kpis.totalMessages),
      fallbackCount: asNumber(kpis.fallbackCount),
      fallbackRate: asNumber(kpis.fallbackRate),
      creditsUsed: asNumber(kpis.creditsUsed),
    },
    comparison: {
      conversations: mapComparisonItem(comparison.conversations),
      messages: mapComparisonItem(comparison.messages),
      fallbacks: mapComparisonItem(comparison.fallbacks),
      creditsUsed: mapComparisonItem(comparison.creditsUsed),
    },
    trends: asArray(root.trends).map((point) => {
      const row = asRecord(point);
      return {
        date: asString(row.date),
        messages: asNumber(row.messages),
        conversations: asNumber(row.conversations),
      };
    }),
    heatmap: asArray(root.heatmap).map((cell) => {
      const row = asRecord(cell);
      return {
        day: asNumber(row.day),
        hour: asNumber(row.hour),
        value: asNumber(row.value),
      };
    }),
    recentQuestions: asArray(root.recentQuestions).map((question) => {
      const row = asRecord(question);
      return {
        content: asString(row.content),
        createdAt: asString(row.createdAt),
        answer: asString(row.answer),
        hasFallback: asBoolean(row.hasFallback),
      };
    }),
    range: {
      from: asString(range.from) || fallbackRange.from,
      to: asString(range.to) || fallbackRange.to,
      previousFrom: asString(range.previousFrom) || fallbackRange.previousFrom,
      previousTo: asString(range.previousTo) || fallbackRange.previousTo,
    },
  };
}

/**
 * Assembles analytics for a bot over a specified time window.
 *
 * @param botId - The bot's identifier.
 * @param from - Start of the current analytics window (inclusive).
 * @param to - End of the current analytics window (inclusive).
 * @returns An object containing:
 *  - `kpis`: aggregated totals for the current window (conversations, user messages, fallback count/rate, credits used),
 *  - `comparison`: current vs previous window comparisons with absolute delta and percent delta,
 *  - `trends`: daily series of message and conversation counts across the current window,
 *  - `heatmap`: 7×24 day/hour activity grid for user messages,
 *  - `recentQuestions`: most recent user messages with fallback flags,
 *  - `range`: ISO timestamps for the current and computed previous windows.
 */
export async function getBotAnalytics(
  client: ServiceClient,
  botId: string,
  from: Date,
  to: Date
): Promise<BotAnalyticsResponse> {
  const range = buildAnalyticsRange(from, to);

  const { data, error } = await client.rpc("get_bot_analytics_v2", {
    p_bot_id: botId,
    p_start_date: range.from,
    p_end_date: range.to,
  });

  if (error) {
    console.error("Failed to resolve bot analytics pipeline:", error);
    throw new Error(`Failed to fetch bot analytics: ${error.message}`);
  }

  return mapAnalyticsResponse(data, range);
}
