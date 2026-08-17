"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import { MessageBubble } from "@/components/chat/group/MessageBubble";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import { GroupMember } from "@/hooks/useGroupChat";

interface GroupDisabledViewProps {
  messages: GroupMessageRow[];
  members: GroupMember[];
  currentUserId?: string;
  botName?: string;
}

export function GroupDisabledView({
  messages,
  members,
  currentUserId,
  botName = "Vielora Bot",
}: GroupDisabledViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Warning Banner */}
      <div className="z-10 flex items-center justify-between border-b border-amber-500/30 bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="flex items-center gap-2.5 text-xs font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Nhóm chat của {botName} đang tạm dừng hoạt động. Bạn chỉ có thể xem lịch sử hội thoại.
          </span>
        </div>
      </div>

      {/* Read-only Message List */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[250px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Lock className="h-8 w-8 text-amber-500/60" />
            <p className="text-xs">Không có tin nhắn nào trong lịch sử.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              members={members}
              canPin={false}
            />
          ))
        )}
      </div>

      {/* Locked Footer Banner */}
      <div className="flex items-center justify-center gap-1.5 border-t border-border bg-background p-3 text-center text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        <span>Gửi tin nhắn đã bị khóa do gói dịch vụ cần được nâng cấp.</span>
      </div>
    </div>
  );
}
