"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createBot, startDiscover, updateBotStatus } from "@/lib/services/bot.service";
import { uploadBotAvatar } from "@/lib/supabase/upload";
import { normalizeSeedUrl, validateWebsiteUrl } from "@/lib/helpers";
import { EBotStatus } from "@/types";
import { ONBOARDING_SOURCE_MODE } from "@/lib/constants";

import { useWorkspace } from "@/hooks/useWorkspace";

export interface BotAvatarInput {
  url: string | null;
  file?: File;
}

export interface CreateBotAndStartDiscoverInput {
  userId: string;
  workspaceId?: string;
  websiteUrl: string;
  botName: string;
  botAvatar: BotAvatarInput;
  includeSubdomains: boolean;
}

export interface CreateFileOnboardingBotInput {
  userId: string;
  workspaceId?: string;
  botName: string;
  botAvatar: BotAvatarInput;
}

export interface UseBotCreationReturn {
  isCreating: boolean;
  createBotAndStartDiscover: (input: CreateBotAndStartDiscoverInput) => Promise<string>;
  createFileOnboardingBot: (input: CreateFileOnboardingBotInput) => Promise<string>;
}

export function useBotCreation(): UseBotCreationReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { activeWorkspace } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);

  const createBotAndStartDiscover = async (
    input: CreateBotAndStartDiscoverInput
  ): Promise<string> => {
    const { websiteUrl, botName, botAvatar, includeSubdomains } = input;

    setIsCreating(true);

    try {
      const validation = validateWebsiteUrl(websiteUrl);
      if (validation.error || !validation.formattedUrl || !validation.hostname) {
        throw new Error("Domain không hợp lệ");
      }

      const formattedUrl = validation.formattedUrl;
      const domain = validation.hostname;
      const workspaceId = input.workspaceId || activeWorkspace?.id;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: botName,
          domain,
          workspaceId,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success || !resData.data) {
        throw new Error(resData.message || "Không thể tạo bot");
      }

      const bot = resData.data;
      const seedUrl = normalizeSeedUrl(formattedUrl);
      const crawlSettings =
        bot.crawl_settings &&
        typeof bot.crawl_settings === "object" &&
        !Array.isArray(bot.crawl_settings)
          ? (bot.crawl_settings as Record<string, unknown>)
          : {};

      await supabase
        .from("bots")
        .update({ crawl_settings: { ...crawlSettings, seedUrl } } as never)
        .eq("id", bot.id);

      if (botAvatar.file) {
        const uploadResult = await uploadBotAvatar(botAvatar.file, bot.id);
        if (uploadResult.success && uploadResult.url) {
          await supabase
            .from("bots")
            .update({ avatar_url: uploadResult.url as string } as never)
            .eq("id", bot.id);
        }
      }

      await updateBotStatus(supabase, bot.id, EBotStatus.Discovering);

      try {
        await startDiscover(supabase, {
          botId: bot.id,
          url: formattedUrl,
          includeSubdomains,
        });
      } catch (error) {
        await updateBotStatus(supabase, bot.id, EBotStatus.Failed);
        throw error;
      }

      return bot.id;
    } finally {
      setIsCreating(false);
    }
  };

  const createFileOnboardingBot = async (input: CreateFileOnboardingBotInput): Promise<string> => {
    const { botName, botAvatar } = input;

    setIsCreating(true);

    try {
      const workspaceId = input.workspaceId || activeWorkspace?.id;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: botName,
          domain: "manual-upload.local",
          workspaceId,
          crawlSettings: {
            onboardingSourceMode: ONBOARDING_SOURCE_MODE.FILES,
          },
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success || !resData.data) {
        throw new Error(resData.message || "Không thể tạo bot");
      }

      const bot = resData.data;

      if (botAvatar.file) {
        const uploadResult = await uploadBotAvatar(botAvatar.file, bot.id);
        if (uploadResult.success && uploadResult.url) {
          await supabase
            .from("bots")
            .update({ avatar_url: uploadResult.url as string } as never)
            .eq("id", bot.id);
        }
      }

      await updateBotStatus(supabase, bot.id, EBotStatus.Pending);

      return bot.id;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createBotAndStartDiscover,
    createFileOnboardingBot,
  };
}
