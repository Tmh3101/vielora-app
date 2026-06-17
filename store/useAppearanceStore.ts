"use client";

import { create } from "zustand";
import type { Tables } from "@/lib/supabase/types";
import type { WidgetSettings } from "@/types/widget-api";
import { EWidgetBackgroundType, EWidgetIconType } from "@/types";
import { WIDGET_FALLBACK } from "@/config/widget";
import { getEffectiveAllowedDomains } from "@/lib/security/allowed-domains";

type BotType = Tables<"bots">;

export interface AppearanceState {
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
  allowedDomains: string[];
  isSaving: boolean;
  isSavingRateLimit: boolean;
  isSavingSlugSettings: boolean;
  isSavingAllowedDomains: boolean;
  isStoppingBot: boolean;
  rateLimitPerDayError: string;
  rateLimitPerIpError: string;
  allowedDomainsError: string;

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
  setIsSaving: (value: boolean) => void;
  setIsSavingRateLimit: (value: boolean) => void;
  setIsSavingSlugSettings: (value: boolean) => void;
  setIsSavingAllowedDomains: (value: boolean) => void;
  setIsStoppingBot: (value: boolean) => void;
  setRateLimitPerDayError: (value: string) => void;
  setRateLimitPerIpError: (value: string) => void;
  setAllowedDomainsError: (value: string) => void;
  initializeFromBot: (bot: BotType) => void;
  resetAppearance: () => void;
}

export const useAppearanceStore = create<AppearanceState>()((set) => ({
  primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
  textColor: WIDGET_FALLBACK.TEXT_COLOR,
  position: WIDGET_FALLBACK.POSITION,
  welcomeMessage: "",
  suggestedQuestions: [],
  chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
  chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
  chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
  chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
  chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
  chatIconUrl: null,
  chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
  chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
  editBotName: "",
  avatarUrl: null,
  rateLimitPerDay: "",
  rateLimitPerIp: "",
  slug: "",
  isPublic: false,
  allowedDomains: [],
  isSaving: false,
  isSavingRateLimit: false,
  isSavingSlugSettings: false,
  isSavingAllowedDomains: false,
  isStoppingBot: false,
  rateLimitPerDayError: "",
  rateLimitPerIpError: "",
  allowedDomainsError: "",

  setPrimaryColor: (value) => set({ primaryColor: value }),
  setTextColor: (value) => set({ textColor: value }),
  setPosition: (value) => set({ position: value }),
  setWelcomeMessage: (value) => set({ welcomeMessage: value }),
  setSuggestedQuestions: (value) => set({ suggestedQuestions: value }),
  setChatBackgroundType: (value) => set({ chatBackgroundType: value }),
  setChatBackgroundValue: (value) => set({ chatBackgroundValue: value }),
  setChatBackgroundOpacity: (value) => set({ chatBackgroundOpacity: value }),
  setChatIconType: (value) => set({ chatIconType: value }),
  setChatIconPreset: (value) => set({ chatIconPreset: value }),
  setChatIconUrl: (value) => set({ chatIconUrl: value }),
  setChatIconColor: (value) => set({ chatIconColor: value }),
  setChatIconBgColor: (value) => set({ chatIconBgColor: value }),
  setEditBotName: (value) => set({ editBotName: value }),
  setAvatarUrl: (value) => set({ avatarUrl: value }),
  setRateLimitPerDay: (value) => set({ rateLimitPerDay: value }),
  setRateLimitPerIp: (value) => set({ rateLimitPerIp: value }),
  setAllowedDomains: (value) => set({ allowedDomains: value }),
  setSlug: (value) => set({ slug: value }),
  setIsPublic: (value) => set({ isPublic: value }),
  setIsSaving: (value) => set({ isSaving: value }),
  setIsSavingRateLimit: (value) => set({ isSavingRateLimit: value }),
  setIsSavingSlugSettings: (value) => set({ isSavingSlugSettings: value }),
  setIsSavingAllowedDomains: (value) => set({ isSavingAllowedDomains: value }),
  setIsStoppingBot: (value) => set({ isStoppingBot: value }),
  setRateLimitPerDayError: (value) => set({ rateLimitPerDayError: value }),
  setRateLimitPerIpError: (value) => set({ rateLimitPerIpError: value }),
  setAllowedDomainsError: (value) => set({ allowedDomainsError: value }),

  initializeFromBot: (bot) => {
    const settings = bot.widget_settings as WidgetSettings | null;

    set({
      editBotName: bot.name,
      avatarUrl: bot.avatar_url,
      rateLimitPerDay: bot.rate_limit_per_day?.toString() || "",
      rateLimitPerIp: bot.rate_limit_per_ip?.toString() || "",
      allowedDomains: getEffectiveAllowedDomains(bot.allowed_domains, bot.domain),
      slug: bot.slug || "",
      isPublic: bot.is_public || false,
    });

    if (settings && typeof settings === "object" && !Array.isArray(settings)) {
      set({
        primaryColor: settings.primaryColor || WIDGET_FALLBACK.PRIMARY_COLOR,
        textColor: settings.textColor || WIDGET_FALLBACK.TEXT_COLOR,
        position:
          settings.position && settings.position.startsWith("{")
            ? settings.position
            : WIDGET_FALLBACK.POSITION,
        welcomeMessage: settings.welcomeMessage || "",
        suggestedQuestions: Array.isArray(settings.suggestedQuestions)
          ? settings.suggestedQuestions
          : [],
        chatBackgroundType: [
          EWidgetBackgroundType.Solid,
          EWidgetBackgroundType.Gradient,
          EWidgetBackgroundType.Image,
        ].includes(settings.chatBackgroundType)
          ? (settings.chatBackgroundType as EWidgetBackgroundType)
          : WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
        chatBackgroundValue: settings.chatBackgroundValue || WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
        chatBackgroundOpacity:
          typeof settings.chatBackgroundOpacity === "number"
            ? settings.chatBackgroundOpacity
            : WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
        chatIconType:
          settings.chatIconType === EWidgetIconType.Custom
            ? EWidgetIconType.Custom
            : WIDGET_FALLBACK.CHAT_ICON_TYPE,
        chatIconPreset: settings.chatIconPreset || WIDGET_FALLBACK.CHAT_ICON_PRESET,
        chatIconUrl: settings.chatIconUrl || null,
        chatIconColor: settings.chatIconColor || WIDGET_FALLBACK.CHAT_ICON_COLOR,
        chatIconBgColor: settings.chatIconBgColor || WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
      });
    } else {
      set({
        primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
        textColor: WIDGET_FALLBACK.TEXT_COLOR,
        position: WIDGET_FALLBACK.POSITION,
        welcomeMessage: "",
        suggestedQuestions: [],
        chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
        chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
        chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
        chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
        chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
        chatIconUrl: null,
        chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
        chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
      });
    }
  },

  resetAppearance: () =>
    set({
      primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
      textColor: WIDGET_FALLBACK.TEXT_COLOR,
      position: WIDGET_FALLBACK.POSITION,
      welcomeMessage: "",
      suggestedQuestions: [],
      chatBackgroundType: WIDGET_FALLBACK.CHAT_BACKGROUND_TYPE,
      chatBackgroundValue: WIDGET_FALLBACK.CHAT_BACKGROUND_VALUE,
      chatBackgroundOpacity: WIDGET_FALLBACK.CHAT_BACKGROUND_OPACITY,
      chatIconType: WIDGET_FALLBACK.CHAT_ICON_TYPE,
      chatIconPreset: WIDGET_FALLBACK.CHAT_ICON_PRESET,
      chatIconUrl: null,
      chatIconColor: WIDGET_FALLBACK.CHAT_ICON_COLOR,
      chatIconBgColor: WIDGET_FALLBACK.CHAT_ICON_BG_COLOR,
      editBotName: "",
      avatarUrl: null,
      rateLimitPerDay: "",
      rateLimitPerIp: "",
      slug: "",
      isPublic: false,
      allowedDomains: [],
      isSaving: false,
      isSavingRateLimit: false,
      isSavingSlugSettings: false,
      isSavingAllowedDomains: false,
      isStoppingBot: false,
      rateLimitPerDayError: "",
      rateLimitPerIpError: "",
      allowedDomainsError: "",
    }),
}));
