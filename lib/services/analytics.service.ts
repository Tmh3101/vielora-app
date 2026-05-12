import { CREDIT_PER_MESSAGE } from "@/config";
import type { ServiceClient } from "@/lib/services/types";
import { EUsageAction } from "@/types";
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

interface UsageLogRow {
  count: number | null;
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

/**
 * Sum the `count` values from usage log rows, treating `null` counts as 1.
 *
 * @param logs - Array of usage log rows; if a row's `count` is `null` it is counted as 1
 * @returns The total sum of counts
 */
function sumUsageCounts(logs: UsageLogRow[]): number {
  return logs.reduce((sum, log) => sum + (log.count ?? 1), 0);
}

/**
 * Fetches conversation ids and start timestamps for a bot within an ISO timestamp range.
 *
 * Queries the `conversations` table for rows where `bot_id` equals `botId` and
 * `started_at` is between `fromIso` and `toIso` (inclusive), ordered by `started_at`
 * ascending.
 *
 * @param botId - The bot identifier to filter conversations by
 * @param fromIso - Inclusive start of the time range as an ISO timestamp
 * @param toIso - Inclusive end of the time range as an ISO timestamp
 * @returns An array of conversation rows containing `id` and `started_at`; returns an empty array when no rows match
 * @throws Error when the database query returns an error (message forwarded)
 */
async function getConversationRows(
  client: ServiceClient,
  botId: string,
  fromIso: string,
  toIso: string
): Promise<ConversationTimestampRow[]> {
  const { data, error } = await client
    .from("conversations")
    .select("id, started_at")
    .eq("bot_id", botId)
    .gte("started_at", fromIso)
    .lte("started_at", toIso)
    .order("started_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Fetches message rows for the specified bot within the inclusive time range.
 *
 * @param botId - The bot's identifier used to filter conversations.
 * @param fromIso - Inclusive start of the time range as an ISO 8601 string.
 * @param toIso - Inclusive end of the time range as an ISO 8601 string.
 * @returns An array of message rows containing `content`, `created_at`, `role`, and `no_answer`.
 * @throws Error when the underlying database query returns an error.
 */
async function getMessageRows(
  client: ServiceClient,
  botId: string,
  fromIso: string,
  toIso: string
): Promise<MessageAnalyticsRow[]> {
  const { data, error } = await client
    .from("messages")
    .select(
      `
      conversation_id,
      content,
      created_at,
      role,
      no_answer,
      conversations!inner(bot_id)
    `
    )
    .eq("conversations.bot_id", botId)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    conversation_id: row.conversation_id,
    content: row.content,
    created_at: row.created_at,
    role: row.role,
    no_answer: row.no_answer,
  }));
}

/**
 * Fetches usage log rows for chat-message actions for a bot within a time range.
 *
 * @param botId - Bot identifier to filter logs
 * @param fromIso - Inclusive start timestamp in ISO format
 * @param toIso - Inclusive end timestamp in ISO format
 * @returns An array of usage log rows; each row may include a `count` field
 * @throws Error when the database query returns an error
 */
async function getUsageRows(
  client: ServiceClient,
  botId: string,
  fromIso: string,
  toIso: string
): Promise<UsageLogRow[]> {
  const { data, error } = await client
    .from("usage_logs")
    .select("count")
    .eq("bot_id", botId)
    .eq("action", EUsageAction.ChatMessage)
    .gte("created_at", fromIso)
    .lte("created_at", toIso);

  if (error) throw new Error(error.message);
  return data ?? [];
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

  const [
    currentConversations,
    previousConversations,
    currentMessages,
    previousMessages,
    currentUsageLogs,
    previousUsageLogs,
  ] = await Promise.all([
    getConversationRows(client, botId, range.from, range.to),
    getConversationRows(client, botId, range.previousFrom, range.previousTo),
    getMessageRows(client, botId, range.from, range.to),
    getMessageRows(client, botId, range.previousFrom, range.previousTo),
    getUsageRows(client, botId, range.from, range.to),
    getUsageRows(client, botId, range.previousFrom, range.previousTo),
  ]);

  const currentCreditsUsed = sumUsageCounts(currentUsageLogs) * CREDIT_PER_MESSAGE;
  const previousCreditsUsed = sumUsageCounts(previousUsageLogs) * CREDIT_PER_MESSAGE;
  const kpis = calculateAnalyticsKpis(
    currentMessages,
    currentConversations.length,
    currentCreditsUsed
  );
  const previousKpis = calculateAnalyticsKpis(
    previousMessages,
    previousConversations.length,
    previousCreditsUsed
  );

  return {
    kpis,
    comparison: {
      conversations: calculateComparison(kpis.totalConversations, previousKpis.totalConversations),
      messages: calculateComparison(kpis.totalMessages, previousKpis.totalMessages),
      fallbacks: calculateComparison(kpis.fallbackCount, previousKpis.fallbackCount),
      creditsUsed: calculateComparison(kpis.creditsUsed, previousKpis.creditsUsed),
    },
    trends: buildTrendSeries(currentConversations, currentMessages, from, to),
    heatmap: buildHeatmapSeries(currentMessages, from, to),
    recentQuestions: buildRecentQuestions(currentMessages),
    range,
  };
}
