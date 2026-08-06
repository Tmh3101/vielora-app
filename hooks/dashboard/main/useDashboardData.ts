"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/lib/supabase/types";
import type { CreditSummary, WorkspaceCreditSummary } from "@/lib/services/credit.service";

type BotType = Tables<"bots">;
type PlanType = Tables<"plans">;
type SubscriptionType = Tables<"subscriptions">;

interface RouterLike {
  push: (href: string) => void;
}

interface UseDashboardDataParams {
  user: User | null;
  authLoading: boolean;
  router: RouterLike;
  initialData?: DashboardInitialData;
  workspaceId?: string;
}

export interface DashboardInitialData {
  bots: BotType[];
  subscription: SubscriptionType | null;
  plan: PlanType | null;
  creditSummary: CreditSummary | WorkspaceCreditSummary | null;
  messagesThisMonth: number;
  totalConversations: number;
  indexedPagesByBot: Record<string, number>;
  workspaceId?: string;
}

export interface UseDashboardDataResult {
  isLoading: boolean;
  bots: BotType[];
  subscription: SubscriptionType | null;
  plan: PlanType | null;
  creditSummary: CreditSummary | WorkspaceCreditSummary | null;
  messagesThisMonth: number;
  totalConversations: number;
  indexedPagesByBot: Record<string, number>;
  setBots: Dispatch<SetStateAction<BotType[]>>;
  setIndexedPagesByBot: Dispatch<SetStateAction<Record<string, number>>>;
  fetchData: (workspaceId?: string) => Promise<void>;
}

export function useDashboardData({
  user,
  authLoading,
  router,
  initialData,
  workspaceId,
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
  const [creditSummary, setCreditSummary] = useState<CreditSummary | WorkspaceCreditSummary | null>(
    initialData?.creditSummary ?? null
  );
  const [messagesThisMonth, setMessagesThisMonth] = useState(initialData?.messagesThisMonth ?? 0);
  const [totalConversations, setTotalConversations] = useState(
    initialData?.totalConversations ?? 0
  );
  const fetchData = useCallback(
    async (overrideWorkspaceId?: string) => {
      const activeWsId = overrideWorkspaceId || workspaceId || initialData?.workspaceId;

      try {
        if (!activeWsId) return;

        const res = await fetch(`/api/workspaces/${activeWsId}/dashboard?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const dashData = await res.json();
          setBots(dashData.bots || []);
          setSubscription(dashData.subscription || null);
          setPlan(dashData.plan || null);
          setCreditSummary(dashData.creditSummary || null);
          setMessagesThisMonth(dashData.messagesThisMonth || 0);
          setTotalConversations(dashData.totalConversations || 0);
          setIndexedPagesByBot(dashData.indexedPagesByBot || {});
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, initialData?.workspaceId]
  );

  const prevWorkspaceIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
      return;
    }

    if (!user) return;

    const activeWsId = workspaceId ?? initialData?.workspaceId;
    if (!activeWsId) return;

    if (prevWorkspaceIdRef.current === activeWsId) return;
    prevWorkspaceIdRef.current = activeWsId;
    void fetchData(activeWsId);
  }, [authLoading, user, workspaceId, initialData?.workspaceId, fetchData, router]);

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
