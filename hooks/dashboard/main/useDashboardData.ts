"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/lib/supabase/types";
import type { CreditSummary } from "@/lib/services/credit.service";
import { getCreditSummary } from "@/lib/services/credit.service";
import { getBotsByUserId } from "@/lib/services/bot.service";
import { getTotalConversationCount } from "@/lib/services/conversations.service";
import { getIndexedPageCountsByBotIds } from "@/lib/services/page.service";
import { getSubscriptionByUserId } from "@/lib/services/subscription.service";
import { getPlanById } from "@/lib/services/plan.service";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type BotType = Tables<"bots">;
type PlanType = Tables<"plans">;
type SubscriptionType = Tables<"subscriptions">;
type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

interface RouterLike {
  push: (href: string) => void;
}

interface UseDashboardDataParams {
  user: User | null;
  authLoading: boolean;
  router: RouterLike;
  supabase: SupabaseClient;
  initialData?: DashboardInitialData;
}

export interface DashboardInitialData {
  bots: BotType[];
  subscription: SubscriptionType | null;
  plan: PlanType | null;
  creditSummary: CreditSummary | null;
  messagesThisMonth: number;
  totalConversations: number;
  indexedPagesByBot: Record<string, number>;
}

export interface UseDashboardDataResult {
  isLoading: boolean;
  bots: BotType[];
  subscription: SubscriptionType | null;
  plan: PlanType | null;
  creditSummary: CreditSummary | null;
  messagesThisMonth: number;
  totalConversations: number;
  indexedPagesByBot: Record<string, number>;
  setBots: Dispatch<SetStateAction<BotType[]>>;
  setIndexedPagesByBot: Dispatch<SetStateAction<Record<string, number>>>;
  fetchData: () => Promise<void>;
}

export function useDashboardData({
  user,
  authLoading,
  router,
  supabase,
  initialData,
}: UseDashboardDataParams): UseDashboardDataResult {
  const [bots, setBots] = useState<BotType[]>(initialData?.bots ?? []);
  const [indexedPagesByBot, setIndexedPagesByBot] = useState<Record<string, number>>(
    initialData?.indexedPagesByBot ?? {}
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [subscription, setSubscription] = useState<SubscriptionType | null>(
    initialData?.subscription ?? null
  );
  const [plan, setPlan] = useState<PlanType | null>(initialData?.plan ?? null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(
    initialData?.creditSummary ?? null
  );
  const [messagesThisMonth, setMessagesThisMonth] = useState(initialData?.messagesThisMonth ?? 0);
  const [totalConversations, setTotalConversations] = useState(
    initialData?.totalConversations ?? 0
  );
  const skipInitialFetchRef = useRef(Boolean(initialData));

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [botsData, subData] = await Promise.all([
        getBotsByUserId(supabase, user.id),
        getSubscriptionByUserId(supabase, user.id),
      ]);

      setBots(botsData);
      setSubscription(subData);

      const botIds = botsData.map((b) => b.id);
      const planId = subData?.plan_id;

      const [indexedCounts, convCount, planData, creditData] = await Promise.all([
        botIds.length > 0 ? getIndexedPageCountsByBotIds(supabase, botIds) : Promise.resolve({}),
        botIds.length > 0 ? getTotalConversationCount(supabase, botIds) : Promise.resolve(0),
        planId ? getPlanById(supabase, planId) : Promise.resolve(null),
        planId ? getCreditSummary(supabase, user.id) : Promise.resolve(null),
      ]);

      setIndexedPagesByBot(indexedCounts);
      setTotalConversations(convCount);
      setPlan(planData);
      setCreditSummary(creditData ?? null);
      setMessagesThisMonth(creditData?.messageCreditsUsedThisMonth ?? 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }

    if (user) {
      if (skipInitialFetchRef.current) {
        skipInitialFetchRef.current = false;
      } else {
        void fetchData();
      }
    }
  }, [authLoading, fetchData, router, user]);

  return {
    isLoading,
    bots,
    subscription,
    plan,
    creditSummary,
    messagesThisMonth,
    totalConversations,
    indexedPagesByBot,
    setBots,
    setIndexedPagesByBot,
    fetchData,
  };
}
