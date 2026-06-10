"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getBotById } from "@/lib/services/bot.service";
import { getPagesByBotId } from "@/lib/services/page.service";
import { getUserSubscriptionPlan } from "@/lib/services/subscription.service";
import type { Tables } from "@/lib/supabase/types";
import { EPageStatus, ESubscriptionPlan } from "@/types";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
type BotType = Tables<"bots">;
type PageType = Tables<"pages">;

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (payload: ToastPayload) => void;

interface RouterLike {
  push: (href: string) => void;
}

interface UserLike {
  id: string;
}

interface UseBotDataParams {
  botId: string;
  user: UserLike | null;
  authLoading: boolean;
  supabase: SupabaseClient;
  router: RouterLike;
  toast: ToastFn;
  onAfterFetch?: (botId: string) => Promise<void>;
  onBotLoaded?: (bot: BotType) => void;
  initialBot?: BotType;
  initialUserId?: string;
  initialPagesCount?: number;
}

interface FetchDataOptions {
  refreshBot?: boolean;
}

interface LoadBotDetailDataParams {
  botId: string;
  userId?: string;
  supabase: SupabaseClient;
  initialBot?: BotType;
  refreshBot?: boolean;
}

export async function loadBotDetailData({
  botId,
  userId,
  supabase,
  initialBot,
  refreshBot = true,
}: LoadBotDetailDataParams) {
  const shouldFetchBot = refreshBot || !initialBot;

  const [botData, pagesData, summary, planInfo] = await Promise.all([
    shouldFetchBot ? getBotById(supabase, botId) : Promise.resolve(initialBot),
    getPagesByBotId(supabase, botId, [
      EPageStatus.Completed,
      EPageStatus.PendingIndex,
      EPageStatus.Processing,
    ]),
    userId ? getCreditSummary(supabase, userId) : Promise.resolve(null),
    userId ? getUserSubscriptionPlan(supabase, userId) : Promise.resolve(null),
  ]);

  return { botData, pagesData, summary, planInfo };
}

export interface UseBotDataResult {
  bot: BotType | null;
  pages: PageType[];
  isLoading: boolean;
  totalCredits: number;
  planCode: ESubscriptionPlan;
  botsLimit: number;
  botLoadVersion: number;
  pagesCount: number;
  fetchData: () => Promise<void>;
  setBot: Dispatch<SetStateAction<BotType | null>>;
  setTotalCredits: Dispatch<SetStateAction<number>>;
}

export function useBotData({
  botId,
  user,
  authLoading,
  supabase,
  router,
  toast,
  onAfterFetch,
  onBotLoaded,
  initialBot,
  initialUserId,
  initialPagesCount = 0,
}: UseBotDataParams): UseBotDataResult {
  const hasFetchedInitialDataRef = useRef(false);
  const [bot, setBot] = useState<BotType | null>(initialBot ?? null);
  const [pages, setPages] = useState<PageType[]>([]);
  const [pagesCount, setPagesCount] = useState(initialPagesCount);
  const [isLoading, setIsLoading] = useState(!initialBot);
  const [totalCredits, setTotalCredits] = useState(0);
  const [planCode, setPlanCode] = useState<ESubscriptionPlan>(ESubscriptionPlan.Free);
  const [botsLimit, setBotsLimit] = useState<number>(1);
  const [botLoadVersion, setBotLoadVersion] = useState(initialBot ? 1 : 0);

  const fetchData = useCallback(
    async (options: FetchDataOptions = {}) => {
      if (!botId) return;

      try {
        const userId = user?.id ?? initialUserId;
        const { botData, pagesData, summary, planInfo } = await loadBotDetailData({
          botId,
          userId,
          supabase,
          initialBot,
          refreshBot: options.refreshBot ?? true,
        });

        if (!botData) throw new Error("Bot not found");
        setBot(botData);
        setBotLoadVersion((prev) => prev + 1);
        onBotLoaded?.(botData);

        setPages(pagesData);
        setPagesCount(pagesData.length);

        if (userId) {
          setTotalCredits(summary?.totalRemainingCredits ?? 0);

          if (planInfo) {
            setPlanCode(planInfo.planCode);
            setBotsLimit(planInfo.botsLimit);
          }
        }

        if (onAfterFetch) {
          await onAfterFetch(botId);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin bot.",
          variant: "destructive",
        });
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    },
    [botId, initialBot, initialUserId, onAfterFetch, onBotLoaded, router, supabase, toast, user?.id]
  );

  useEffect(() => {
    if (!authLoading && !user && !initialUserId) {
      router.push("/auth");
      return;
    }

    if (botId && (initialBot || (!authLoading && user))) {
      if (hasFetchedInitialDataRef.current) return;
      hasFetchedInitialDataRef.current = true;
      void fetchData({ refreshBot: !initialBot });
    }
  }, [authLoading, botId, fetchData, initialBot, initialUserId, router, user]);

  return {
    bot,
    pages,
    isLoading,
    totalCredits,
    planCode,
    botsLimit,
    botLoadVersion,
    pagesCount,
    fetchData,
    setBot,
    setTotalCredits,
  };
}
