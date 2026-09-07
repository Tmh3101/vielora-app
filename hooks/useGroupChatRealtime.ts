"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import {
  GROUP_CHAT_REALTIME_SCHEMA,
  GROUP_CHAT_REALTIME_TABLES,
  GROUP_CHAT_REALTIME_LISTEN_EVENT,
  GROUP_CHAT_REALTIME_EVENTS,
  GROUP_CHAT_REALTIME_CHANNELS,
  GROUP_CHAT_REALTIME_POLL_INTERVAL_MS,
} from "@/lib/constants/group-chat-realtime";

export interface UseGroupChatRealtimeOptions {
  supabase: ReturnType<typeof createBrowserSupabaseClient>;
  groupId?: string;
  botId: string;
  onNewMessage: (msg: GroupMessageRow) => void;
  onUpdateMessage: (msg: GroupMessageRow) => void;
  onPinKnowledge: (messageId: string) => void;
  onUnpinKnowledge: (messageId: string) => void;
  onNotesChange?: () => void;
  onPollMessages?: () => void;
}

export function useGroupChatRealtime({
  supabase,
  groupId,
  botId,
  onNewMessage,
  onUpdateMessage,
  onPinKnowledge,
  onUnpinKnowledge,
  onNotesChange,
  onPollMessages,
}: UseGroupChatRealtimeOptions) {
  // Keep latest callbacks in refs to avoid recreating subscriptions on every render
  const onNewMessageRef = useRef(onNewMessage);
  const onUpdateMessageRef = useRef(onUpdateMessage);
  const onPinKnowledgeRef = useRef(onPinKnowledge);
  const onUnpinKnowledgeRef = useRef(onUnpinKnowledge);
  const onNotesChangeRef = useRef(onNotesChange);
  const onPollMessagesRef = useRef(onPollMessages);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onUpdateMessageRef.current = onUpdateMessage;
    onPinKnowledgeRef.current = onPinKnowledge;
    onUnpinKnowledgeRef.current = onUnpinKnowledge;
    onNotesChangeRef.current = onNotesChange;
    onPollMessagesRef.current = onPollMessages;
  });

  useEffect(() => {
    if (!groupId) return;

    // 1. Group Messages Realtime Channel
    const messagesChannel = supabase
      .channel(GROUP_CHAT_REALTIME_CHANNELS.GROUP_MESSAGES(groupId))
      .on(
        GROUP_CHAT_REALTIME_LISTEN_EVENT,
        {
          event: GROUP_CHAT_REALTIME_EVENTS.INSERT,
          schema: GROUP_CHAT_REALTIME_SCHEMA,
          table: GROUP_CHAT_REALTIME_TABLES.GROUP_MESSAGES,
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMsg = payload.new as GroupMessageRow;
          onNewMessageRef.current(newMsg);
        }
      )
      .on(
        GROUP_CHAT_REALTIME_LISTEN_EVENT,
        {
          event: GROUP_CHAT_REALTIME_EVENTS.UPDATE,
          schema: GROUP_CHAT_REALTIME_SCHEMA,
          table: GROUP_CHAT_REALTIME_TABLES.GROUP_MESSAGES,
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as GroupMessageRow;
          onUpdateMessageRef.current(updatedMsg);
        }
      )
      .subscribe();

    // 2. Chat Knowledge Pinned Realtime Channel
    const knowledgeChannel = supabase
      .channel(GROUP_CHAT_REALTIME_CHANNELS.CHAT_KNOWLEDGE(botId))
      .on(
        GROUP_CHAT_REALTIME_LISTEN_EVENT,
        {
          event: GROUP_CHAT_REALTIME_EVENTS.INSERT,
          schema: GROUP_CHAT_REALTIME_SCHEMA,
          table: GROUP_CHAT_REALTIME_TABLES.CHAT_KNOWLEDGE,
          filter: `bot_id=eq.${botId}`,
        },
        (payload) => {
          const newKnowledge = payload.new as { message_id?: string };
          if (newKnowledge?.message_id) {
            onPinKnowledgeRef.current(newKnowledge.message_id);
          }
        }
      )
      .on(
        GROUP_CHAT_REALTIME_LISTEN_EVENT,
        {
          event: GROUP_CHAT_REALTIME_EVENTS.DELETE,
          schema: GROUP_CHAT_REALTIME_SCHEMA,
          table: GROUP_CHAT_REALTIME_TABLES.CHAT_KNOWLEDGE,
          filter: `bot_id=eq.${botId}`,
        },
        (payload) => {
          const oldKnowledge = payload.old as { message_id?: string };
          if (oldKnowledge?.message_id) {
            onUnpinKnowledgeRef.current(oldKnowledge.message_id);
          }
        }
      )
      .subscribe();

    // 3. Group Notes Realtime Channel (if enabled)
    let notesChannel: ReturnType<typeof supabase.channel> | null = null;
    if (GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      notesChannel = supabase
        .channel(GROUP_CHAT_REALTIME_CHANNELS.GROUP_NOTES(groupId))
        .on(
          GROUP_CHAT_REALTIME_LISTEN_EVENT,
          {
            event: GROUP_CHAT_REALTIME_EVENTS.ALL,
            schema: GROUP_CHAT_REALTIME_SCHEMA,
            table: GROUP_CHAT_REALTIME_TABLES.GROUP_NOTES,
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            onNotesChangeRef.current?.();
          }
        )
        .subscribe();
    }

    // 4. Interval Polling Fallback (only when tab is visible)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        onPollMessagesRef.current?.();
      }
    }, GROUP_CHAT_REALTIME_POLL_INTERVAL_MS);

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(knowledgeChannel);
      if (notesChannel) supabase.removeChannel(notesChannel);
      clearInterval(interval);
    };
  }, [groupId, botId, supabase]);
}
