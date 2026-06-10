"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import type { WidgetSettings } from "@/types/widget-api";
import { parseRateLimitInput } from "@/lib/bot-rate-limit";
import { getEffectiveAllowedDomains, validateAllowedDomains } from "@/lib/security/allowed-domains";
import { WIDGET_LIMITS, WIDGET_FALLBACK } from "@/config/widget";
import {
  getActiveBotCount,
  startBot,
  stopBot,
  updateBotRateLimit,
} from "@/lib/services/bot.service";
import { isHexColor } from "@/lib/helpers";
import { EWidgetBackgroundType, EWidgetIconType } from "@/types";

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

interface AppearanceSettingsOverrides {
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
  suggestedQuestions: string[];
  chatBackgroundType: EWidgetBackgroundType;
  chatBackgroundValue: string;
  chatBackgroundOpacity: number;
  chatIconType: EWidgetIconType;
  chatIconPreset: string;
  chatIconUrl: string | null;
  chatIconColor: string;
  chatIconBgColor: string;
  editBotName: string;
  avatarUrl: string | null;
  rateLimitPerDay: string;
  rateLimitPerIp: string;
  slug: string;
  isPublic: boolean;
  isSaving: boolean;
  isSavingRateLimit: boolean;
  isSavingSlugSettings: boolean;
  isSavingAllowedDomains: boolean;
  stopModalOpen: boolean;
  isStoppingBot: boolean;
  upgradeModalOpen: boolean;
  upgradeModalMessage: UpgradeModalMessage;
  rateLimitPerDayError: string;
  rateLimitPerIpError: string;
  allowedDomains: string[];
  allowedDomainsError: string;
  isRateLimitFormValid: boolean;
  isAllowedDomainsFormValid: boolean;
  setPrimaryColor: (value: string) => void;
  setTextColor: (value: string) => void;
  setPosition: (value: string) => void;
  setWelcomeMessage: (value: string) => void;
  setSuggestedQuestions: (value: string[]) => void;
  setChatBackgroundType: (value: EWidgetBackgroundType) => void;
  setChatBackgroundValue: (value: string) => void;
  setChatBackgroundOpacity: (value: number) => void;
  setChatIconType: (value: EWidgetIconType) => void;
  setChatIconPreset: (value: string) => void;
  setChatIconUrl: (value: string | null) => void;
  setChatIconColor: (value: string) => void;
  setChatIconBgColor: (value: string) => void;
  setEditBotName: (value: string) => void;
  setAvatarUrl: (value: string | null) => void;
  setRateLimitPerDay: (value: string) => void;
  setRateLimitPerIp: (value: string) => void;
  setAllowedDomains: (value: string[]) => void;
  setSlug: (value: string) => void;
  setIsPublic: (value: boolean) => void;
  setStopModalOpen: (open: boolean) => void;
  setUpgradeModalOpen: (open: boolean) => void;
  openUpgradeModal: (message?: UpgradeModalMessage) => void;
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
  const [primaryColor, setPrimaryColor] = useState(WIDGET_FALLBACK.PRIMARY_COLOR);
  const [textColor, setTextColor] = useState(WIDGET_FALLBACK.TEXT_COLOR);
  const [position, setPosition] = useState(WIDGET_FALLBACK.POSITION);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [chatBackgroundType, setChatBackgroundType] = useState<EWidgetBackgroundType>(
    WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE
  );
  const [chatBackgroundValue, setChatBackgroundValue] = useState(
    WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE
  );
  const [chatBackgroundOpacity, setChatBackgroundOpacity] = useState(
    WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY
  );
  const [chatIconType, setChatIconType] = useState<EWidgetIconType>(WIDGET_FALLBACK.CHAT_ICON_TYPE);
  const [chatIconPreset, setChatIconPreset] = useState(WIDGET_FALLBACK.CHAT_ICON_PRESET);
  const [chatIconUrl, setChatIconUrl] = useState<string | null>(null);
  const [chatIconColor, setChatIconColor] = useState(WIDGET_FALLBACK.CHAT_ICON_COLOR);
  const [chatIconBgColor, setChatIconBgColor] = useState(WIDGET_FALLBACK.CHAT_ICON_BG_COLOR);
  const [editBotName, setEditBotName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rateLimitPerDay, setRateLimitPerDay] = useState<string>("");
  const [rateLimitPerIp, setRateLimitPerIp] = useState<string>("");
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRateLimit, setIsSavingRateLimit] = useState(false);
  const [isSavingSlugSettings, setIsSavingSlugSettings] = useState(false);
  const [isSavingAllowedDomains, setIsSavingAllowedDomains] = useState(false);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState<UpgradeModalMessage>({});
  const [rateLimitPerDayError, setRateLimitPerDayError] = useState("");
  const [rateLimitPerIpError, setRateLimitPerIpError] = useState("");
  const [allowedDomainsError, setAllowedDomainsError] = useState("");

  // Ref to store latest widget settings values to avoid closure issues
  const settingsRef = useRef({
    primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
    textColor: WIDGET_FALLBACK.TEXT_COLOR,
    position: WIDGET_FALLBACK.POSITION,
    welcomeMessage: "",
    suggestedQuestions: [] as string[],
    chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
    chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
    chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
    chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
    chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
    chatIconUrl: null as string | null,
    chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
    chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
  });

  // Update ref whenever any settings change
  useEffect(() => {
    settingsRef.current = {
      primaryColor,
      textColor,
      position,
      welcomeMessage,
      suggestedQuestions,
      chatBackgroundType,
      chatBackgroundValue,
      chatBackgroundOpacity,
      chatIconType,
      chatIconPreset,
      chatIconUrl,
      chatIconColor,
      chatIconBgColor,
    };
  }, [
    primaryColor,
    textColor,
    position,
    welcomeMessage,
    suggestedQuestions,
    chatBackgroundType,
    chatBackgroundValue,
    chatBackgroundOpacity,
    chatIconType,
    chatIconPreset,
    chatIconUrl,
    chatIconColor,
    chatIconBgColor,
  ]);

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

  const openUpgradeModal = useCallback((message?: UpgradeModalMessage) => {
    setUpgradeModalMessage(message ?? {});
    setUpgradeModalOpen(true);
  }, []);

  const initializeFromBot = useCallback((botData: BotType) => {
    setEditBotName(botData.name);
    setAvatarUrl(botData.avatar_url);
    setRateLimitPerDay(botData.rate_limit_per_day?.toString() || "");
    setRateLimitPerIp(botData.rate_limit_per_ip?.toString() || "");
    setAllowedDomains(getEffectiveAllowedDomains(botData.allowed_domains, botData.domain));
    setSlug(botData.slug || "");
    setIsPublic(botData.is_public || false);

    const widgetSettings = botData.widget_settings as WidgetSettings | null;

    if (widgetSettings && typeof widgetSettings === "object" && !Array.isArray(widgetSettings)) {
      setPrimaryColor(widgetSettings.primaryColor || WIDGET_FALLBACK.PRIMARY_COLOR);
      setTextColor(widgetSettings.textColor || WIDGET_FALLBACK.TEXT_COLOR);

      const pos = widgetSettings.position || WIDGET_FALLBACK.POSITION;
      setPosition(pos.startsWith("{") ? pos : WIDGET_FALLBACK.POSITION);

      setWelcomeMessage(widgetSettings.welcomeMessage || "");
      setSuggestedQuestions(
        Array.isArray(widgetSettings.suggestedQuestions) ? widgetSettings.suggestedQuestions : []
      );
      setChatBackgroundType(
        [
          EWidgetBackgroundType.Solid,
          EWidgetBackgroundType.Gradient,
          EWidgetBackgroundType.Image,
        ].includes(widgetSettings.chatBackgroundType)
          ? (widgetSettings.chatBackgroundType as EWidgetBackgroundType)
          : WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE
      );
      setChatBackgroundValue(
        widgetSettings.chatBackgroundValue || WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE
      );
      setChatBackgroundOpacity(
        typeof widgetSettings.chatBackgroundOpacity === "number"
          ? widgetSettings.chatBackgroundOpacity
          : WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY
      );

      setChatIconType(
        widgetSettings.chatIconType === EWidgetIconType.Custom
          ? EWidgetIconType.Custom
          : WIDGET_FALLBACK.CHAT_ICON_TYPE
      );
      setChatIconPreset(widgetSettings.chatIconPreset || WIDGET_FALLBACK.CHAT_ICON_PRESET);
      setChatIconUrl(widgetSettings.chatIconUrl || null);
      setChatIconColor(widgetSettings.chatIconColor || WIDGET_FALLBACK.CHAT_ICON_COLOR);
      setChatIconBgColor(widgetSettings.chatIconBgColor || WIDGET_FALLBACK.CHAT_ICON_BG_COLOR);
    } else {
      setPrimaryColor(WIDGET_FALLBACK.PRIMARY_COLOR);
      setTextColor(WIDGET_FALLBACK.TEXT_COLOR);
      setPosition(WIDGET_FALLBACK.POSITION);
      setWelcomeMessage("");
      setSuggestedQuestions([]);
      setChatBackgroundType(WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE as EWidgetBackgroundType);
      setChatBackgroundValue(WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE);
      setChatBackgroundOpacity(WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY);
      setChatIconType(WIDGET_FALLBACK.CHAT_ICON_TYPE);
      setChatIconPreset(WIDGET_FALLBACK.CHAT_ICON_PRESET);
      setChatIconUrl(null);
      setChatIconColor(WIDGET_FALLBACK.CHAT_ICON_COLOR);
      setChatIconBgColor(WIDGET_FALLBACK.CHAT_ICON_BG_COLOR);
    }
  }, []);

  const handleSaveAppearance = useCallback(
    async (overrides?: AppearanceSettingsOverrides) => {
      if (!bot) return;

      const trimmedBotName = editBotName.trim();
      if (!trimmedBotName) {
        toast({
          title: "Lỗi",
          description: "Tên Bot không được để trống.",
          variant: "destructive",
        });
        return;
      }

      const trimmedWelcomeMessage = welcomeMessage.trim();
      if (!trimmedWelcomeMessage) {
        toast({
          title: "Lỗi",
          description: "Tin nhắn chào mừng không được để trống.",
          variant: "destructive",
        });
        return;
      }

      const normalizedPrimaryColor = primaryColor.trim();
      if (!isHexColor(normalizedPrimaryColor)) {
        toast({
          title: "Lỗi",
          description: "Màu thương hiệu phải là mã Hex hợp lệ dạng #RRGGBB.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }

        const current = { ...settingsRef.current, ...(overrides ?? {}) };
        settingsRef.current = current;

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
            avatarUrl,
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
                avatar_url: avatarUrl,
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
        setIsSaving(false);
      }
    },
    [editBotName, avatarUrl, bot, primaryColor, setBot, supabase, toast, welcomeMessage]
  );

  const handleSaveRateLimit = useCallback(async () => {
    if (!bot) return;

    const parsedRateLimitPerDay = parseRateLimitInput(rateLimitPerDay, "Giới hạn tin nhắn / ngày");
    const parsedRateLimitPerIp = parseRateLimitInput(
      rateLimitPerIp,
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

    setIsSavingRateLimit(true);
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
      setIsSavingRateLimit(false);
    }
  }, [bot, rateLimitPerDay, rateLimitPerIp, setBot, supabase, toast]);

  const handleSaveAllowedDomains = useCallback(async () => {
    if (!bot) return;

    const nonEmptyDomains = allowedDomains.map((domain) => domain.trim()).filter(Boolean);
    const validation = validateAllowedDomains(nonEmptyDomains);

    if (!validation.valid) {
      toast({
        title: "Lỗi",
        description: validation.error || "Danh sách domain không hợp lệ.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAllowedDomains(true);
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

      setAllowedDomains(nextAllowedDomains);
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
      setIsSavingAllowedDomains(false);
    }
  }, [allowedDomains, bot, setBot, toast]);

  const handleSaveSlugSettings = useCallback(async () => {
    if (!bot) return;

    setIsSavingSlugSettings(true);
    try {
      const response = await fetch(`/api/bots/${bot.id}/slug-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug || null, isPublic }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to save slug settings");
      }

      setBot((prev) =>
        prev
          ? {
              ...prev,
              slug: slug || null,
              is_public: isPublic,
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
      setIsSavingSlugSettings(false);
    }
  }, [bot, slug, isPublic, setBot, toast]);

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
    suggestedQuestions,
    chatBackgroundType,
    chatBackgroundValue,
    chatBackgroundOpacity,
    chatIconType,
    chatIconPreset,
    chatIconUrl,
    chatIconColor,
    chatIconBgColor,
    editBotName,
    avatarUrl,
    rateLimitPerDay,
    rateLimitPerIp,
    slug,
    isPublic,
    isSaving,
    isSavingRateLimit,
    isSavingSlugSettings,
    isSavingAllowedDomains,
    stopModalOpen,
    isStoppingBot,
    upgradeModalOpen,
    upgradeModalMessage,
    rateLimitPerDayError,
    rateLimitPerIpError,
    allowedDomains,
    allowedDomainsError,
    isRateLimitFormValid: !rateLimitPerDayError && !rateLimitPerIpError,
    isAllowedDomainsFormValid: !allowedDomainsError,
    setPrimaryColor,
    setTextColor,
    setPosition,
    setWelcomeMessage,
    setSuggestedQuestions,
    setChatBackgroundType,
    setChatBackgroundValue,
    setChatBackgroundOpacity,
    setChatIconType,
    setChatIconPreset,
    setChatIconUrl,
    setChatIconColor,
    setChatIconBgColor,
    setEditBotName,
    setAvatarUrl,
    setRateLimitPerDay,
    setRateLimitPerIp,
    setAllowedDomains,
    setSlug,
    setIsPublic,
    setStopModalOpen,
    setUpgradeModalOpen,
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
