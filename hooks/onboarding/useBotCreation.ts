"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createBot, startDiscover, updateBotStatus } from "@/lib/services/bot.service";
import { uploadBotAvatar } from "@/lib/supabase/upload";
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
    const { userId, websiteUrl, botName, botAvatar } = input;

    setIsCreating(true);

    try {
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith("http")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const domain = new URL(formattedUrl).hostname;
      const bot = await createBot(supabase, { userId, name: botName, domain });

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
