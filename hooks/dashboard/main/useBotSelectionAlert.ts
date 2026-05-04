"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { activateBots, stopBots } from "@/lib/services/bot.service";
import {
  useDashboardData,
  type DashboardInitialData,
} from "@/hooks/dashboard/main/useDashboardData";

type BotType = Tables<"bots">;
type SubscriptionType = Tables<"subscriptions">;
type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

interface UseBotSelectionAlertParams {
  isLoading: boolean;
  bots: BotType[];
  botsLimit: number;
  subscription: SubscriptionType | null;
  supabase: SupabaseClient;
  onRefresh: () => Promise<void>;
}

export interface UseBotSelectionAlertResult {
  limitDialogOpen: boolean;
  setLimitDialogOpen: (open: boolean) => void;
  botSelectorOpen: boolean;
  setBotSelectorOpen: (open: boolean) => void;
  selectedBotIds: Set<string>;
  handleToggleBotSelection: (botId: string) => void;
  handleConfirmBotSelection: () => Promise<void>;
  isSavingBotSelection: boolean;
}

export function useBotSelectionAlert({
  isLoading,
  bots,
  botsLimit,
  subscription,
  supabase,
  onRefresh,
}: UseBotSelectionAlertParams): UseBotSelectionAlertResult {
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [botSelectorOpen, setBotSelectorOpen] = useState(false);
  const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(new Set());
  const [isSavingBotSelection, setIsSavingBotSelection] = useState(false);

  useEffect(() => {
    if (isLoading || !subscription || bots.length === 0) return;

    if (subscription.needs_bot_selection) {
      const activeBots = bots.filter((b) => !b.is_stopped);
      setSelectedBotIds(new Set(activeBots.map((b) => b.id)));
      setBotSelectorOpen(true);
    }
  }, [isLoading, subscription, bots]);

  const handleToggleBotSelection = useCallback(
    (botId: string) => {
      setSelectedBotIds((prev) => {
        const next = new Set(prev);
        if (next.has(botId)) {
          next.delete(botId);
        } else {
          if (next.size >= botsLimit) return prev;
          next.add(botId);
        }
        return next;
      });
    },
    [botsLimit]
  );

  const handleConfirmBotSelection = useCallback(async () => {
    setIsSavingBotSelection(true);
    try {
      await activateBots(supabase, Array.from(selectedBotIds));

      const unselectedBotIds = bots.filter((b) => !selectedBotIds.has(b.id)).map((b) => b.id);
      await stopBots(supabase, unselectedBotIds);

      if (subscription) {
        const response = await fetch("/api/subscriptions/clear-bot-selection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscriptionId: subscription.id }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to clear bot selection flag");
        }

        subscription.needs_bot_selection = false;
      }

      setBotSelectorOpen(false);
      toast.success("Đã cập nhật trạng thái chatbot");
      setTimeout(async () => {
        await onRefresh();
      }, 1500);
    } catch (error) {
      console.error("Error updating bot selection:", error);
      toast.error("Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setIsSavingBotSelection(false);
    }
  }, [bots, onRefresh, selectedBotIds, subscription, supabase]);

  return {
    limitDialogOpen,
    setLimitDialogOpen,
    botSelectorOpen,
    setBotSelectorOpen,
    selectedBotIds,
    handleToggleBotSelection,
    handleConfirmBotSelection,
    isSavingBotSelection,
  };
}
