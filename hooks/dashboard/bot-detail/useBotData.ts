"use client";

import { useCallback, useEffect, useState } from "react";
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
}

export interface UseBotDataResult {
  bot: BotType | null;
  pages: PageType[];
  isLoading: boolean;
  totalCredits: number;
  planCode: string;
  botsLimit: number;
  botLoadVersion: number;
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
}: UseBotDataParams): UseBotDataResult {
  const [bot, setBot] = useState<BotType | null>(null);
  const [pages, setPages] = useState<PageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCredits, setTotalCredits] = useState(0);
  const [planCode, setPlanCode] = useState<string>(ESubscriptionPlan.Free);
  const [botsLimit, setBotsLimit] = useState<number>(1);
  const [botLoadVersion, setBotLoadVersion] = useState(0);

  const fetchData = useCallback(async () => {
    if (!botId) return;

    try {
      const botData = await getBotById(supabase, botId);

      if (!botData) throw new Error("Bot not found");
      setBot(botData);
      setBotLoadVersion((prev) => prev + 1);
      onBotLoaded?.(botData);

      const pagesData = await getPagesByBotId(supabase, botId, [
        EPageStatus.Completed,
        EPageStatus.PendingIndex,
        EPageStatus.Processing,
      ]);
      setPages(pagesData);

      if (user?.id) {
        const summary = await getCreditSummary(supabase, user.id);
        setTotalCredits(summary?.totalRemainingCredits ?? 0);

        const planInfo = await getUserSubscriptionPlan(supabase, user.id);
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
  }, [botId, onAfterFetch, onBotLoaded, router, supabase, toast, user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }

    if (user && botId) {
      void fetchData();
    }
  }, [authLoading, botId, fetchData, router, user]);

  return {
    bot,
    pages,
    isLoading,
    totalCredits,
    planCode,
    botsLimit,
    botLoadVersion,
    fetchData,
    setBot,
    setTotalCredits,
  };
}
