"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createBot, startDiscover, updateBotStatus } from "@/lib/services/bot.service";
import { uploadBotAvatar } from "@/lib/supabase/upload";
import { normalizeSeedUrl } from "@/lib/helpers/url-helpers";
import { EBotStatus } from "@/types";

export interface BotAvatarInput {
  url: string | null;
  file?: File;
}

export interface CreateBotAndStartDiscoverInput {
  userId: string;
  websiteUrl: string;
  botName: string;
  botAvatar: BotAvatarInput;
  includeSubdomains: boolean;
}

export interface UseBotCreationReturn {
  isCreating: boolean;
  createBotAndStartDiscover: (input: CreateBotAndStartDiscoverInput) => Promise<string>;
}

export function useBotCreation(): UseBotCreationReturn {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isCreating, setIsCreating] = useState(false);

  const createBotAndStartDiscover = async (
    input: CreateBotAndStartDiscoverInput
  ): Promise<string> => {
    const { userId, websiteUrl, botName, botAvatar, includeSubdomains } = input;

    setIsCreating(true);

    try {
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith("http")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const domain = new URL(formattedUrl).hostname;
      const bot = await createBot(supabase, { userId, name: botName, domain });
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

      setTimeout(async () => {
        try {
          await startDiscover(supabase, {
            botId: bot.id,
            url: formattedUrl,
            includeSubdomains,
          });
        } catch {
          // Step 2 will surface pipeline failure via polling.
        }
      }, 1000);

      return bot.id;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createBotAndStartDiscover,
  };
}
