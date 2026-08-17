"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { GroupChatView } from "@/components/chat/group/GroupChatView";
import { GroupInvitePrompt } from "@/components/chat/group/GroupInvitePrompt";
import {
  AUTH_EVENT_SIGNED_IN,
  AUTH_EVENT_SIGNED_OUT,
  GROUP_AUTH_MEMBER,
  GROUP_AUTH_NOT_MEMBER,
  GroupAuthState,
} from "@/lib/constants";

import type { PublicBotData } from "@/lib/services/bot.service";

type AuthStateType = (typeof GroupAuthState)[keyof typeof GroupAuthState];

interface PwaGroupChatContainerProps {
  botId: string;
  botSlug?: string;
  botName?: string;
  botData?: PublicBotData;
}

export function PwaGroupChatContainer({
  botId,
  botSlug,
  botName = "Vielora Bot",
  botData,
}: PwaGroupChatContainerProps) {
  const [authState, setAuthState] = useState<AuthStateType>(GroupAuthState.LOADING);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const supabase = createBrowserSupabaseClient();

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

        // Check group membership
        const res = await fetch(`/api/bots/${botId}/group`);
        if (!res.ok) {
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
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs font-medium">Đang kiểm tra quyền truy cập nhóm...</p>
      </div>
    );
  }

  if (authState === GroupAuthState.UNAUTHENTICATED || authState === GROUP_AUTH_NOT_MEMBER) {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname
        : botSlug
          ? `/public-bot/${botSlug}/group`
          : "/";

    return (
      <GroupInvitePrompt
        userEmail={userEmail}
        botName={botName}
        botSlug={botSlug}
        onSwitchToAuth={() =>
          (window.location.href = `/auth?next=${encodeURIComponent(currentPath)}`)
        }
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
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
