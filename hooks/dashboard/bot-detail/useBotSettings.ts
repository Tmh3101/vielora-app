"use client";

import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/lib/supabase/types";
import {
  getActiveBotCount,
  startBot,
  stopBot,
  updateBotAppearance,
  updateBotRateLimit,
} from "@/lib/services/bot.service";

type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
type BotType = Tables<"bots">;

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (payload: ToastPayload) => void;

interface UserLike {
  id: string;
}

interface UpgradeModalMessage {
  title?: string;
  description?: string;
}

interface UseBotSettingsParams {
  bot: BotType | null;
  user: UserLike | null;
  botsLimit: number;
  supabase: SupabaseClient;
  toast: ToastFn;
  setBot: Dispatch<SetStateAction<BotType | null>>;
}

export interface UseBotSettingsResult {
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  editBotName: string;
  avatarUrl: string | null;
  rateLimitPerDay: string;
  rateLimitPerIp: string;
  isSaving: boolean;
  stopModalOpen: boolean;
  isStoppingBot: boolean;
  upgradeModalOpen: boolean;
  upgradeModalMessage: UpgradeModalMessage;
  setPrimaryColor: (value: string) => void;
  setTextColor: (value: string) => void;
  setPosition: (value: string) => void;
  setWelcomeMessage: (value: string) => void;
  setEditBotName: (value: string) => void;
  setAvatarUrl: (value: string | null) => void;
  setRateLimitPerDay: (value: string) => void;
  setRateLimitPerIp: (value: string) => void;
  setStopModalOpen: (open: boolean) => void;
  setUpgradeModalOpen: (open: boolean) => void;
  openUpgradeModal: (message?: UpgradeModalMessage) => void;
  initializeFromBot: (botData: BotType) => void;
  handleSaveAppearance: () => Promise<void>;
  handleSaveRateLimit: () => Promise<void>;
  handleStopBot: () => Promise<void>;
  handleStartBot: () => Promise<void>;
}

export function useBotSettings({
  bot,
  user,
  botsLimit,
  supabase,
  toast,
  setBot,
}: UseBotSettingsParams): UseBotSettingsResult {
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [textColor, setTextColor] = useState("#1f2937");
  const [position, setPosition] = useState("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [editBotName, setEditBotName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rateLimitPerDay, setRateLimitPerDay] = useState<string>("");
  const [rateLimitPerIp, setRateLimitPerIp] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<UpgradeModalMessage>({});

  const openUpgradeModal = useCallback((message?: UpgradeModalMessage) => {
    setUpgradeModalMessage(message ?? {});
    setUpgradeModalOpen(true);
  }, []);

  const initializeFromBot = useCallback((botData: BotType) => {
    setEditBotName(botData.name);
    setAvatarUrl(botData.avatar_url);
    setRateLimitPerDay(botData.rate_limit_per_day?.toString() || "");
    setRateLimitPerIp(botData.rate_limit_per_ip?.toString() || "");

    const widgetSettings = botData.widget_settings;
    if (widgetSettings && typeof widgetSettings === "object" && !Array.isArray(widgetSettings)) {
      const settings = widgetSettings as Record<string, unknown>;
      const primaryColorValue =
        typeof settings.primaryColor === "string" ? settings.primaryColor : "#3B82F6";
      const textColorValue =
        typeof settings.textColor === "string" ? settings.textColor : "#1f2937";
      const positionValue =
        typeof settings.position === "string" ? settings.position : "bottom-right";
      const safePosition = positionValue === "bottom-left" ? "bottom-left" : "bottom-right";
      const welcomeValue =
        typeof settings.welcomeMessage === "string" ? settings.welcomeMessage : "";

      setPrimaryColor(primaryColorValue);
      setTextColor(textColorValue);
      setPosition(safePosition);
      setWelcomeMessage(welcomeValue);
    } else {
      setPrimaryColor("#3B82F6");
      setTextColor("#1f2937");
      setPosition("bottom-right");
      setWelcomeMessage("");
    }
  }, []);

  const handleSaveAppearance = useCallback(async () => {
    if (!bot) return;

    setIsSaving(true);
    try {
      const widgetSettings: Json = {
        primaryColor,
        textColor,
        position,
        welcomeMessage,
      };

      await updateBotAppearance(supabase, bot.id, {
        name: editBotName,
        avatarUrl,
        widgetSettings,
      });

      setBot((prev) =>
        prev
          ? { ...prev, name: editBotName, avatar_url: avatarUrl, widget_settings: widgetSettings }
          : prev
      );

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt giao diện.",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    avatarUrl,
    bot,
    editBotName,
    position,
    primaryColor,
    setBot,
    supabase,
    textColor,
    toast,
    welcomeMessage,
  ]);

  const handleSaveRateLimit = useCallback(async () => {
    if (!bot) return;

    setIsSaving(true);
    try {
      const rateLimitDay = rateLimitPerDay ? parseInt(rateLimitPerDay, 10) : null;
      const rateLimitIp = rateLimitPerIp ? parseInt(rateLimitPerIp, 10) : null;

      await updateBotRateLimit(supabase, bot.id, {
        rateLimitPerDay: rateLimitDay,
        rateLimitPerIp: rateLimitIp,
      });

      setBot((prev) =>
        prev
          ? {
              ...prev,
              rate_limit_per_day: rateLimitDay,
              rate_limit_per_ip: rateLimitIp,
            }
          : prev
      );

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt giới hạn.",
      });
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể lưu cài đặt.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [bot, rateLimitPerDay, rateLimitPerIp, setBot, supabase, toast]);

  const handleStopBot = useCallback(async () => {
    if (!bot) return;

    setIsStoppingBot(true);
    try {
      await stopBot(supabase, bot.id);
      setBot((prev) => (prev ? { ...prev, is_stopped: true } : prev));
      setStopModalOpen(false);

      toast({
        title: "Thành công",
        description: "Bot đã được dừng hoạt động.",
      });
    } catch (error) {
      console.error("Stop bot error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể dừng bot. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsStoppingBot(false);
    }
  }, [bot, setBot, supabase, toast]);

  const handleStartBot = useCallback(async () => {
    if (!bot || !user) return;

    setIsSaving(true);
    try {
      const activeCount = await getActiveBotCount(supabase, user.id);

      if (activeCount >= botsLimit) {
        setUpgradeModalMessage({
          title: "Đã đạt giới hạn chatbot",
          description: `Gói hiện tại cho phép tối đa ${botsLimit} chatbot hoạt động. Nâng cấp gói để kích hoạt thêm chatbot.`,
        });
        setUpgradeModalOpen(true);
        return;
      }

      await startBot(supabase, bot.id);
      setBot((prev) => (prev ? { ...prev, is_stopped: false } : prev));

      toast({
        title: "Thành công",
        description: "Bot đã được khởi động lại.",
      });
    } catch (error) {
      console.error("Start bot error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể khởi động bot. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [bot, botsLimit, setBot, supabase, toast, user]);

  return {
    primaryColor,
    textColor,
    position,
    welcomeMessage,
    editBotName,
    avatarUrl,
    rateLimitPerDay,
    rateLimitPerIp,
    isSaving,
    stopModalOpen,
    isStoppingBot,
    upgradeModalOpen,
    upgradeModalMessage,
    setPrimaryColor,
    setTextColor,
    setPosition,
    setWelcomeMessage,
    setEditBotName,
    setAvatarUrl,
    setRateLimitPerDay,
    setRateLimitPerIp,
    setStopModalOpen,
    setUpgradeModalOpen,
    openUpgradeModal,
    initializeFromBot,
    handleSaveAppearance,
    handleSaveRateLimit,
    handleStopBot,
    handleStartBot,
  };
}
