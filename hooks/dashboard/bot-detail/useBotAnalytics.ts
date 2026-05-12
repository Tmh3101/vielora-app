"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BOT_ANALYTICS_KEY } from "@/lib/constants/react-query-key";
import type { BotAnalyticsResponse } from "@/lib/services/analytics.service";

interface UseBotAnalyticsParams {
  botId: string;
  from: Date;
  to: Date;
}

/**
 * Retrieve the current Supabase session's access token from the browser client.
 *
 * @returns The session access token as a string, or `null` if no session or token is available.
 */
async function getAccessToken() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

/**
 * Fetches bot analytics for the given bot and date range and exposes the result via React Query.
 *
 * @param botId - Identifier of the bot to fetch analytics for.
 * @param from - Start of the date range to query (converted to ISO string for the request).
 * @param to - End of the date range to query (converted to ISO string for the request).
 * @returns A React Query result containing the `BotAnalyticsResponse` payload when the query succeeds.
 */
export function useBotAnalytics({ botId, from, to }: UseBotAnalyticsParams) {
  const queryKey = useMemo(
    () => [BOT_ANALYTICS_KEY, botId, from.toISOString(), to.toISOString()],
    [botId, from, to]
  );

  return useQuery({
    queryKey,
    queryFn: async (): Promise<BotAnalyticsResponse> => {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Unauthorized");
      }

      const response = await fetch(
        `/api/bots/${botId}/analytics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: BotAnalyticsResponse;
      };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || "Failed to fetch analytics");
      }

      return payload.data;
    },
    enabled: !!botId,
    retry: 1,
  });
}
