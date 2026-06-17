"use client";

import { useCallback, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import type { WidgetSettings } from "@/types/widget-api";
import { parseRateLimitInput } from "@/lib/bot-rate-limit";
import { validateAllowedDomains } from "@/lib/security/allowed-domains";
import { WIDGET_LIMITS } from "@/config/widget";
import {
  getActiveBotCount,
  startBot,
  stopBot,
  updateBotRateLimit,
} from "@/lib/services/bot.service";
import { isHexColor } from "@/lib/helpers";
import { EWidgetBackgroundType } from "@/types";
import { useAppearanceStore } from "@/store/useAppearanceStore";
import { useBotDetailUIStore } from "@/store/useBotDetailUIStore";

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

export interface AppearanceSettingsOverrides {
  primaryColor?: string;
  textColor?: string;
  position?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  chatBackgroundType?: EWidgetBackgroundType;
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
  chatIconType?: EWidgetIconType;
  chatIconPreset?: string;
  chatIconUrl?: string | null;
  chatIconColor?: string;
  chatIconBgColor?: string;
}

import { EWidgetIconType } from "@/types";

interface UseBotSettingsParams {
  bot: BotType | null;
  user: UserLike | null;
  botsLimit: number;
  supabase: SupabaseClient;
  toast: ToastFn;
  setBot: Dispatch<SetStateAction<BotType | null>>;
}

export interface UseBotSettingsResult {
  isSaving: boolean;
  isSavingRateLimit: boolean;
  isSavingSlugSettings: boolean;
  isSavingAllowedDomains: boolean;
  isStoppingBot: boolean;
  rateLimitPerDayError: string;
  rateLimitPerIpError: string;
  allowedDomainsError: string;
  isRateLimitFormValid: boolean;
  isAllowedDomainsFormValid: boolean;
  openUpgradeModal: (message?: { title?: string; description?: string }) => void;
  initializeFromBot: (botData: BotType) => void;
  handleSaveAppearance: (overrides?: AppearanceSettingsOverrides) => Promise<void>;
  handleSaveRateLimit: () => Promise<void>;
  handleSaveAllowedDomains: () => Promise<void>;
  handleSaveSlugSettings: () => Promise<void>;
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
  const isSaving = useAppearanceStore((s) => s.isSaving);
  const setIsSaving = useAppearanceStore((s) => s.setIsSaving);
  const isSavingRateLimit = useAppearanceStore((s) => s.isSavingRateLimit);
  const setIsSavingRateLimit = useAppearanceStore((s) => s.setIsSavingRateLimit);
  const isSavingSlugSettings = useAppearanceStore((s) => s.isSavingSlugSettings);
  const setIsSavingSlugSettings = useAppearanceStore((s) => s.setIsSavingSlugSettings);
  const isSavingAllowedDomains = useAppearanceStore((s) => s.isSavingAllowedDomains);
  const setIsSavingAllowedDomains = useAppearanceStore((s) => s.setIsSavingAllowedDomains);
  const isStoppingBot = useAppearanceStore((s) => s.isStoppingBot);
  const setIsStoppingBot = useAppearanceStore((s) => s.setIsStoppingBot);

  const setStopModalOpen = useBotDetailUIStore((s) => s.setStopModalOpen);
  const setUpgradeModalOpen = useBotDetailUIStore((s) => s.setUpgradeModalOpen);
  const setUpgradeModalMessage = useBotDetailUIStore((s) => s.setUpgradeModalMessage);

  const [rateLimitPerDayError, setRateLimitPerDayError] = useState("");
  const [rateLimitPerIpError, setRateLimitPerIpError] = useState("");
  const [allowedDomainsError, setAllowedDomainsError] = useState("");

  const rateLimitPerDay = useAppearanceStore((s) => s.rateLimitPerDay);
  const rateLimitPerIp = useAppearanceStore((s) => s.rateLimitPerIp);
  const allowedDomains = useAppearanceStore((s) => s.allowedDomains);

  useEffect(() => {
    setRateLimitPerDayError(
      parseRateLimitInput(rateLimitPerDay, "Giới hạn tin nhắn / ngày").error || ""
    );
    setRateLimitPerIpError(
      parseRateLimitInput(rateLimitPerIp, "Giới hạn tin nhắn / IP / ngày").error || ""
    );
  }, [rateLimitPerDay, rateLimitPerIp]);

  useEffect(() => {
    const nonEmptyDomains = allowedDomains.map((domain) => domain.trim()).filter(Boolean);
    const validation = validateAllowedDomains(nonEmptyDomains);
    setAllowedDomainsError(validation.error || "");
  }, [allowedDomains]);

  const openUpgradeModal = useCallback(
    (message?: { title?: string; description?: string }) => {
      setUpgradeModalMessage(message ?? {});
      setUpgradeModalOpen(true);
    },
    [setUpgradeModalMessage, setUpgradeModalOpen]
  );

  const initializeFromBot = useCallback((botData: BotType) => {
    useAppearanceStore.getState().initializeFromBot(botData);
  }, []);

  const handleSaveAppearance = useCallback(
    async (overrides?: AppearanceSettingsOverrides) => {
      if (!bot) return;

      const store = useAppearanceStore.getState();
      const trimmedBotName = store.editBotName.trim();
      if (!trimmedBotName) {
        toast({
          title: "Lỗi",
          description: "Tên Bot không được để trống.",
          variant: "destructive",
        });
        return;
      }

      const trimmedWelcomeMessage = store.welcomeMessage.trim();
      if (!trimmedWelcomeMessage) {
        toast({
          title: "Lỗi",
          description: "Tin nhắn chào mừng không được để trống.",
          variant: "destructive",
        });
        return;
      }

      const normalizedPrimaryColor = store.primaryColor.trim();
      if (!isHexColor(normalizedPrimaryColor)) {
        toast({
          title: "Lỗi",
          description: "Màu thương hiệu phải là mã Hex hợp lệ dạng #RRGGBB.",
          variant: "destructive",
        });
        return;
      }

      store.setIsSaving(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }

        const current = { ...store, ...(overrides ?? {}) };

        const filteredQuestions = current.suggestedQuestions
          .map((q) => q.trim().slice(0, WIDGET_LIMITS.SUGGESTED_QUESTIONS_MAX_LENGTH))
          .filter((q) => q.length > 0);

        const updatedSettings = {
          primaryColor: normalizedPrimaryColor,
          textColor: current.textColor,
          position: current.position,
          welcomeMessage: trimmedWelcomeMessage,
          suggestedQuestions: filteredQuestions,
          chatBackgroundType: current.chatBackgroundType,
          chatBackgroundValue: current.chatBackgroundValue,
          chatBackgroundOpacity: current.chatBackgroundOpacity,
          chatIconType: current.chatIconType,
          chatIconPreset: current.chatIconPreset,
          chatIconUrl: current.chatIconUrl,
          chatIconColor: current.chatIconColor,
          chatIconBgColor: current.chatIconBgColor,
        };

        if (
          updatedSettings.chatBackgroundType === EWidgetBackgroundType.Image &&
          (!updatedSettings.chatBackgroundValue ||
            !updatedSettings.chatBackgroundValue.startsWith("http"))
        ) {
          console.warn("Invalid image background configuration", {
            chatBackgroundType: updatedSettings.chatBackgroundType,
            chatBackgroundValue: updatedSettings.chatBackgroundValue,
          });
        }

        const response = await fetch(`/api/bots/${bot.id}/appearance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: trimmedBotName,
            avatarUrl: store.avatarUrl,
            widgetSettings: updatedSettings,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Không thể lưu cài đặt giao diện");
        }

        setBot((prev) =>
          prev
            ? {
                ...prev,
                name: trimmedBotName,
                avatar_url: store.avatarUrl,
                widget_settings: data.data?.widget_settings || updatedSettings,
              }
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
          description: error instanceof Error ? error.message : "Không thể lưu cài đặt.",
          variant: "destructive",
        });
      } finally {
        useAppearanceStore.getState().setIsSaving(false);
      }
    },
    [bot, setBot, supabase, toast]
  );

  const handleSaveRateLimit = useCallback(async () => {
    if (!bot) return;

    const store = useAppearanceStore.getState();

    const parsedRateLimitPerDay = parseRateLimitInput(
      store.rateLimitPerDay,
      "Giới hạn tin nhắn / ngày"
    );
    const parsedRateLimitPerIp = parseRateLimitInput(
      store.rateLimitPerIp,
      "Giới hạn tin nhắn / IP / ngày"
    );

    if (parsedRateLimitPerDay.error || parsedRateLimitPerIp.error) {
      toast({
        title: "Lỗi",
        description:
          parsedRateLimitPerDay.error || parsedRateLimitPerIp.error || "Dữ liệu không hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    store.setIsSavingRateLimit(true);
    try {
      const rateLimitDay = parsedRateLimitPerDay.value;
      const rateLimitIp = parsedRateLimitPerIp.value;

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
        description: error instanceof Error ? error.message : "Không thể lưu cài đặt.",
        variant: "destructive",
      });
    } finally {
      useAppearanceStore.getState().setIsSavingRateLimit(false);
    }
  }, [bot, setBot, supabase, toast]);

  const handleSaveAllowedDomains = useCallback(async () => {
    if (!bot) return;

    const store = useAppearanceStore.getState();
    const nonEmptyDomains = store.allowedDomains.map((domain) => domain.trim()).filter(Boolean);
    const validation = validateAllowedDomains(nonEmptyDomains);

    if (!validation.valid) {
      toast({
        title: "Lỗi",
        description: validation.error || "Danh sách domain không hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    store.setIsSavingAllowedDomains(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}/allowed-domains`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedDomains: validation.domains }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Không thể lưu allowed domains.");
      }

      const nextAllowedDomains = Array.isArray(data.data?.allowed_domains)
        ? data.data.allowed_domains
        : validation.domains;

      useAppearanceStore.getState().setAllowedDomains(nextAllowedDomains);
      setBot((prev) =>
        prev
          ? {
              ...prev,
              allowed_domains: nextAllowedDomains,
            }
          : prev
      );

      toast({
        title: "Thành công",
        description: "Đã lưu danh sách domain được phép.",
      });
    } catch (error) {
      console.error("Save allowed domains error:", error);
      toast({
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể lưu allowed domains.",
        variant: "destructive",
      });
    } finally {
      useAppearanceStore.getState().setIsSavingAllowedDomains(false);
    }
  }, [bot, setBot, toast]);

  const handleSaveSlugSettings = useCallback(async () => {
    if (!bot) return;

    const store = useAppearanceStore.getState();

    store.setIsSavingSlugSettings(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}/slug-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: store.slug || null, isPublic: store.isPublic }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to save slug settings");
      }

      setBot((prev) =>
        prev
          ? {
              ...prev,
              slug: store.slug || null,
              is_public: store.isPublic,
            }
          : prev
      );

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt trang chat độc lập.",
      });
    } catch (error) {
      console.error("Save slug settings error:", error);
      const message = error instanceof Error ? error.message : "Không thể lưu cài đặt.";
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    } finally {
      useAppearanceStore.getState().setIsSavingSlugSettings(false);
    }
  }, [bot, setBot, toast]);

  const handleStopBot = useCallback(async () => {
    if (!bot) return;

    useAppearanceStore.getState().setIsStoppingBot(true);
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
      useAppearanceStore.getState().setIsStoppingBot(false);
    }
  }, [bot, setBot, supabase, toast, setStopModalOpen]);

  const handleStartBot = useCallback(async () => {
    if (!bot || !user) return;

    const store = useAppearanceStore.getState();
    store.setIsSaving(true);
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
      useAppearanceStore.getState().setIsSaving(false);
    }
  }, [bot, botsLimit, setBot, supabase, toast, user, setUpgradeModalMessage, setUpgradeModalOpen]);

  return {
    isSaving,
    isSavingRateLimit,
    isSavingSlugSettings,
    isSavingAllowedDomains,
    isStoppingBot,
    rateLimitPerDayError,
    rateLimitPerIpError,
    allowedDomainsError,
    isRateLimitFormValid: !rateLimitPerDayError && !rateLimitPerIpError,
    isAllowedDomainsFormValid: !allowedDomainsError,
    openUpgradeModal,
    initializeFromBot,
    handleSaveAppearance,
    handleSaveRateLimit,
    handleSaveAllowedDomains,
    handleSaveSlugSettings,
    handleStopBot,
    handleStartBot,
  };
}
