"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogoLoader } from "@/components/ui/logo-loader";
import { ShieldAlert, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { GroupChatView } from "@/components/chat/group/GroupChatView";
import { GroupInvitePrompt } from "@/components/chat/group/GroupInvitePrompt";
import { PwaAuthReturnOverlay } from "@/components/chat/pwa-install/PwaAuthReturnOverlay";
import { getBotStandaloneChatPath, getBotAuthUrl } from "@/lib/utils/standalone-chat-url";
import { useIOSAuthSync } from "@/hooks/public-bot/useIOSAuthSync";
import { ELanguage } from "@/types/enums";
import { getWidgetTranslations } from "@/lib/i18n/widget-translations";
import {
  AUTH_EVENT_SIGNED_IN,
  AUTH_EVENT_SIGNED_OUT,
  GROUP_AUTH_MEMBER,
  GROUP_AUTH_NOT_MEMBER,
  GROUP_CHAT_REQUIRES_PRO_CODE,
  GroupAuthState,
} from "@/lib/constants";

import type { PublicBotData } from "@/lib/services/bot.service";

type AuthStateType = (typeof GroupAuthState)[keyof typeof GroupAuthState] | "PRO_REQUIRED";

interface PwaGroupChatContainerProps {
  botId: string;
  botSlug?: string;
  botName?: string;
  botData?: PublicBotData;
  locale?: ELanguage | string;
}

export function PwaGroupChatContainer({
  botId,
  botSlug,
  botName = "Vielora Bot",
  botData,
  locale: propLocale,
}: PwaGroupChatContainerProps) {
  const [authState, setAuthState] = useState<AuthStateType>(GroupAuthState.LOADING);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const resolvedLocale =
    propLocale ||
    (botData?.widget_settings as { ui_language?: string; locale?: string })?.ui_language ||
    (botData?.widget_settings as { ui_language?: string; locale?: string })?.locale ||
    ELanguage.Vi;
  const t = getWidgetTranslations(resolvedLocale);

  const supabase = createBrowserSupabaseClient();
  useIOSAuthSync();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setAuthState(GroupAuthState.UNAUTHENTICATED);
          return;
        }

        if (isMounted) {
          setUserId(user.id);
          setUserEmail(user.email);
        }

        // Check group membership and plan status
        const res = await fetch(`/api/bots/${botId}/group`);
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          if (errJson?.code === GROUP_CHAT_REQUIRES_PRO_CODE || res.status === 403) {
            if (isMounted) setAuthState("PRO_REQUIRED");
            return;
          }
          if (isMounted) setAuthState(GROUP_AUTH_NOT_MEMBER);
          return;
        }

        const json = await res.json();
        if (json.success && json.data?.members) {
          const isMember = json.data.members.some(
            (m: { user_id: string; email?: string }) =>
              m.user_id === user.id ||
              (user.email && m.email?.toLowerCase() === user.email.toLowerCase())
          );
          if (isMounted) {
            setAuthState(isMember ? GROUP_AUTH_MEMBER : GROUP_AUTH_NOT_MEMBER);
          }
        } else {
          if (isMounted) setAuthState(GROUP_AUTH_NOT_MEMBER);
        }
      } catch (err) {
        console.error("Error checking group auth state:", err);
        if (isMounted) setAuthState(GROUP_AUTH_NOT_MEMBER);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === AUTH_EVENT_SIGNED_IN || event === AUTH_EVENT_SIGNED_OUT) {
        initAuth();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [botId, supabase]);

  if (authState === GroupAuthState.LOADING) {
    return (
      <>
        <PwaAuthReturnOverlay />
        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-muted-foreground">
          <LogoLoader size={48} />
          <p className="animate-pulse text-xs font-medium text-muted-foreground/80">
            {t.checkingGroupAccess}
          </p>
        </div>
      </>
    );
  }

  if (authState === "PRO_REQUIRED") {
    const standaloneChatUrl = getBotStandaloneChatPath(botSlug);
    return (
      <div className="flex h-full min-h-[450px] items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-lg border-border/60 shadow-lg backdrop-blur-md">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center space-y-6 py-2 text-center">
              <Link
                href="/"
                className="flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <Image
                  src="/images/logo-icon.png"
                  alt="Vielora"
                  width={80}
                  height={80}
                  className="h-16 w-16 sm:h-20 sm:w-20"
                  priority
                />
              </Link>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20">
                  <ShieldAlert className="h-7 w-7 text-amber-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t.groupChatProRequiredTitle}
                </h2>
              </div>

              <div className="space-y-3 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t.groupChatProRequiredDesc.replace("{name}", botName)}
                </p>
                <p className="text-xs text-muted-foreground">{t.groupChatProRequiredHint}</p>
              </div>

              <div className="flex w-full flex-col gap-3 pt-2">
                <Button
                  asChild
                  className="btn-glow flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold shadow-md transition-all duration-200 active:scale-[0.98]"
                >
                  <Link href={standaloneChatUrl}>
                    <MessageSquare className="h-4 w-4" />
                    {t.backToAiChat}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authState === GroupAuthState.UNAUTHENTICATED || authState === GROUP_AUTH_NOT_MEMBER) {
    return (
      <>
        <PwaAuthReturnOverlay />
        <GroupInvitePrompt
          userEmail={userEmail}
          botName={botName}
          botSlug={botSlug}
          locale={resolvedLocale}
          onSwitchToAuth={() => {
            window.location.assign(getBotAuthUrl(botSlug));
          }}
        />
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <PwaAuthReturnOverlay />
      <div className="flex-1 overflow-hidden">
        <GroupChatView
          botId={botId}
          botSlug={botSlug}
          userId={userId}
          userEmail={userEmail}
          botName={botName}
          botData={botData}
        />
      </div>
    </div>
  );
}
