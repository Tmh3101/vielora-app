"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Users, ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLastTabPreference } from "@/lib/helpers/group-tab-preference";
import { isStandaloneMode } from "@/lib/helpers/pwa-helpers";
import {
  getBotStandaloneChatPath,
  getBotGroupChatPath,
  getPwaScopedBotChatPath,
  getPwaScopedBotGroupPath,
} from "@/lib/utils/standalone-chat-url";

interface ChatTabSwitcherProps {
  botId: string;
  botSlug: string;
  activeTab: "chat" | "group";
  className?: string;
  children?: React.ReactNode;
}

export function ChatTabSwitcher({
  botId,
  botSlug,
  activeTab,
  className = "",
  children,
}: ChatTabSwitcherProps) {
  const [usePwaScope] = useState(() => isStandaloneMode());

  const chatUrl = usePwaScope
    ? getPwaScopedBotChatPath(botSlug)
    : getBotStandaloneChatPath(botSlug);
  const groupUrl = usePwaScope ? getPwaScopedBotGroupPath(botSlug) : getBotGroupChatPath(botSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-5.5 w-5.5 shrink-0 rounded-md p-0 text-current transition-all hover:bg-white/20 hover:text-current active:scale-95 ${className}`}
          title="Chuyển đổi chế độ chat (Chat 1-1 / Nhóm chat)"
          aria-label="Chuyển đổi chế độ chat"
        >
          <ArrowLeftRight className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-xl p-1 shadow-lg">
        <DropdownMenuLabel className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Chuyển đổi Chế độ Chat
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
        >
          <Link
            href={chatUrl}
            onClick={() => setLastTabPreference(botId, "chat")}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Chat độc lập 1-1</span>
            </div>
            {activeTab === "chat" && <Check className="h-3.5 w-3.5 text-primary" />}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
        >
          <Link
            href={groupUrl}
            onClick={() => setLastTabPreference(botId, "group")}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>Nhóm chat riêng tư</span>
            </div>
            {activeTab === "group" && <Check className="h-3.5 w-3.5 text-primary" />}
          </Link>
        </DropdownMenuItem>

        {children && (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
