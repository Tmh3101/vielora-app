"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import { useOfflineMessageQueue } from "@/hooks/useOfflineMessageQueue";
import {
  fetchActiveNoteApi,
  fetchNotesListApi,
  createNoteApi,
  updateNoteApi,
  deleteNoteApi,
  toggleNoteCollapseApi,
  updateMemberApi,
  pinMessageAsNoteApi,
} from "@/lib/api/group-chat";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import type { GroupNoteRow } from "@/types/group-chat";

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  email: string;
  role_label: string | null;
  can_pin_knowledge: boolean;
  can_create_note?: boolean;
  last_read_at: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  // Optional client-side enrichment shape; components fall back to the
  // top-level fields above when `user` is absent.
  user?: {
    email: string;
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface InitialUnreadInfo {
  firstUnreadId: string | null;
  unreadCount: number;
}

export interface UseGroupChatProps {
  botId: string;
  userId?: string;
  userEmail?: string;
}

export function useGroupChat({ botId, userId, userEmail }: UseGroupChatProps) {
  const [messages, setMessages] = useState<GroupMessageRow[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupInfo, setGroupInfo] = useState<{ id: string; name: string; status: string } | null>(
    null
  );
  const [botInfo, setBotInfo] = useState<{
    id: string;
    name: string;
    avatar_url?: string | null;
    widget_settings?: unknown;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldBotReplyDefault, setShouldBotReplyDefault] = useState(true);
  const [initialLastReadAt, setInitialLastReadAt] = useState<string | null | undefined>(undefined);
  const [initialUnreadInfo, setInitialUnreadInfo] = useState<InitialUnreadInfo | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());

  // Notes state (Task 3.1)
  const [activeNote, setActiveNote] = useState<GroupNoteRow | null>(null);
  const [notesList, setNotesList] = useState<GroupNoteRow[]>([]);
  const [nextNotesCursor, setNextNotesCursor] = useState<string | null>(null);
  const [hasMoreNotes, setHasMoreNotes] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  const supabase = createBrowserSupabaseClient();
  const groupIdRef = useRef<string | null>(null);
  const initialLastReadAtRef = useRef<string | null | undefined>(undefined);
  const hasComputedInitialUnreadRef = useRef(false);
  const userIdRef = useRef(userId);
  const userEmailRef = useRef(userEmail);

  useEffect(() => {
    userIdRef.current = userId;
    userEmailRef.current = userEmail;
  }, [userId, userEmail]);

  // Current user member record
  const currentMember = members.find(
    (m) =>
      (userId && m.user_id === userId) ||
      (userEmail && m.user?.email?.toLowerCase() === userEmail.toLowerCase()) ||
      (userEmail && m.email?.toLowerCase() === userEmail.toLowerCase())
  );
  const canPin = Boolean(currentMember?.can_create_note || currentMember?.can_pin_knowledge);
  const canCreateNote = Boolean(currentMember?.can_create_note || currentMember?.can_pin_knowledge);

  // Notes actions & loaders
  const refetchActiveNote = useCallback(async () => {
    const currentGroupId = groupIdRef.current || groupInfo?.id;
    if (!currentGroupId) return;
    try {
      const note = await fetchActiveNoteApi(currentGroupId);
      setActiveNote(note);
    } catch (err) {
      console.error("Error fetching active note:", err);
    }
  }, [groupInfo?.id]);

  const toggleMemberNotePermission = useCallback(
    async (memberId: string, enabled: boolean) => {
      try {
        const res = await updateMemberApi(botId, memberId, {
          can_create_note: enabled,
          can_pin_knowledge: enabled,
        });
        if (res.success && res.data) {
          setMembers((prev) =>
            prev.map((m) =>
              m.id === memberId ? { ...m, can_create_note: enabled, can_pin_knowledge: enabled } : m
            )
          );
        }
      } catch (err) {
        console.error("Error toggling member note permission:", err);
        throw err;
      }
    },
    [botId]
  );

  const loadNotesList = useCallback(
    async (isInitial = false) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) return;

      try {
        setIsLoadingNotes(true);
        const cursor = isInitial ? undefined : nextNotesCursor || undefined;
        const res = await fetchNotesListApi(currentGroupId, 20, cursor);
        if (isInitial) {
          setNotesList(res.notes);
        } else {
          setNotesList((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newUnique = res.notes.filter((n) => !existingIds.has(n.id));
            return [...prev, ...newUnique];
          });
        }
        setNextNotesCursor(res.nextCursor);
        setHasMoreNotes(res.hasMore);
      } catch (err) {
        console.error("Error loading notes list:", err);
      } finally {
        setIsLoadingNotes(false);
      }
    },
    [groupInfo?.id, nextNotesCursor]
  );

  useEffect(() => {
    if (groupInfo?.id && GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      refetchActiveNote();
      loadNotesList(true);
    }
  }, [groupInfo?.id, refetchActiveNote, loadNotesList]);

  const refetchActiveNoteRef = useRef(refetchActiveNote);
  refetchActiveNoteRef.current = refetchActiveNote;

  const loadNotesListRef = useRef(loadNotesList);
  loadNotesListRef.current = loadNotesList;

  // Unread messages count
  const lastReadAt = currentMember?.last_read_at;
  const unreadCount = lastReadAt
    ? messages.filter(
        (m) => new Date(m.created_at) > new Date(lastReadAt) && m.sender_id !== userId
      ).length
    : 0;

  // 1. Load initial group info and members
  const fetchGroupDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/group`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Group chat does not exist for this bot.");
        } else {
          setError("Failed to load group chat details.");
        }
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        const group = json.data.group;
        const membersList = json.data.members || [];
        setGroupInfo(group);
        setMembers(membersList);
        groupIdRef.current = group.id;

        if (json.data.bot) {
          setBotInfo(json.data.bot);
        }

        const myMember = membersList.find(
          (m: GroupMember) =>
            (userIdRef.current && m.user_id === userIdRef.current) ||
            (userEmailRef.current &&
              m.user?.email?.toLowerCase() === userEmailRef.current.toLowerCase()) ||
            (userEmailRef.current && m.email?.toLowerCase() === userEmailRef.current.toLowerCase())
        );
        if (myMember && initialLastReadAtRef.current === undefined) {
          initialLastReadAtRef.current = myMember.last_read_at;
          setInitialLastReadAt(myMember.last_read_at);
        }
      }
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError("Failed to load group chat.");
    }
  }, [botId]);

  // 2. Fetch pinned knowledge message IDs
  const fetchPinnedKnowledge = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/group/knowledge`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const ids = new Set<string>(
          json.data
            .map((k: { message_id?: string }) => k.message_id)
            .filter((id): id is string => Boolean(id))
        );
        setPinnedMessageIds(ids);
      }
    } catch (err) {
      console.error("Error fetching pinned knowledge:", err);
    }
  }, [botId]);

  // 3. Fetch messages
  const fetchMessages = useCallback(
    async (before?: string) => {
      try {
        const url = new URL(`/api/bots/${botId}/group/messages`, window.location.origin);
        if (before) url.searchParams.set("before", before);
        url.searchParams.set("limit", "50");

        const res = await fetch(url.toString());
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && json.data) {
          const incoming: GroupMessageRow[] = json.data.messages || [];
          setHasMore(json.data.has_more ?? false);

          if (before) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueNew = incoming.filter((m) => !existingIds.has(m.id));
              return [...uniqueNew, ...prev];
            });
          } else {
            // Smart initial unread divider: compute ONLY ONCE on initial session mount
            if (
              !hasComputedInitialUnreadRef.current &&
              incoming.length > 0 &&
              initialLastReadAtRef.current !== undefined
            ) {
              hasComputedInitialUnreadRef.current = true;
              const lastRead = initialLastReadAtRef.current;
              // Only mark unread if the user had a previous non-null last_read_at timestamp
              if (lastRead) {
                const lastReadTime = new Date(lastRead).getTime();
                const unreadMsgs = incoming.filter(
                  (m) =>
                    new Date(m.created_at).getTime() > lastReadTime &&
                    m.sender_id !== userIdRef.current
                );

                if (unreadMsgs.length > 0) {
                  setInitialUnreadInfo({
                    firstUnreadId: unreadMsgs[0].id,
                    unreadCount: unreadMsgs.length,
                  });
                }
              }
            }

            setMessages((prev) => {
              const existingMap = new Map(prev.map((m) => [m.id, m]));
              let hasChanges = false;

              for (const msg of incoming) {
                const existing = existingMap.get(msg.id);
                if (
                  !existing ||
                  existing.content !== msg.content ||
                  existing.deleted_at !== msg.deleted_at
                ) {
                  existingMap.set(msg.id, msg);
                  hasChanges = true;
                }
              }

              if (!hasChanges) return prev;

              return Array.from(existingMap.values()).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          }
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    },
    [botId]
  );

  // 4. Mark read
  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/bots/${botId}/group/messages/read`, { method: "POST" });
      const nowIso = new Date().toISOString();
      initialLastReadAtRef.current = nowIso;
      setInitialUnreadInfo(null);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, last_read_at: nowIso } : m))
      );
    } catch (err) {
      console.error("Error marking read:", err);
    }
  }, [botId, userId]);

  // 5. Initial load: run once when botId changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    Promise.all([fetchGroupDetails(), fetchPinnedKnowledge()])
      .then(() => {
        if (!isCancelled) {
          return fetchMessages();
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [botId, fetchGroupDetails, fetchPinnedKnowledge, fetchMessages]);

  useEffect(() => {
    const groupId = groupInfo?.id;
    if (!groupId) return;

    // 4a. Realtime subscription
    const channel = supabase
      .channel(`group_messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newMsg = payload.new as GroupMessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as GroupMessageRow;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      )
      .subscribe();

    // 4b. Interval polling fallback (5 seconds, only when tab is active)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages();
      }
    }, 5000);

    // 4c. Realtime subscription for pinned knowledge
    const knowledgeChannel = supabase
      .channel(`chat_knowledge:${botId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_knowledge",
          filter: `bot_id=eq.${botId}`,
        },
        (payload) => {
          const newKnowledge = payload.new as { message_id?: string };
          if (newKnowledge?.message_id) {
            setPinnedMessageIds((prev) => {
              const updated = new Set(prev);
              updated.add(newKnowledge.message_id!);
              return updated;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_knowledge",
          filter: `bot_id=eq.${botId}`,
        },
        (payload) => {
          const oldKnowledge = payload.old as { message_id?: string };
          if (oldKnowledge?.message_id) {
            setPinnedMessageIds((prev) => {
              const updated = new Set(prev);
              updated.delete(oldKnowledge.message_id!);
              return updated;
            });
          }
        }
      )
      .subscribe();

    // 4d. Realtime subscription for group notes (Task 3.1)
    let notesChannel: ReturnType<typeof supabase.channel> | null = null;
    if (GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED) {
      notesChannel = supabase
        .channel(`group_notes:${groupId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "group_notes",
            filter: `group_id=eq.${groupId}`,
          },
          () => {
            refetchActiveNoteRef.current?.();
            loadNotesListRef.current?.(true);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(knowledgeChannel);
      if (notesChannel) supabase.removeChannel(notesChannel);
      clearInterval(interval);
    };
  }, [groupInfo?.id, botId, supabase, fetchMessages]);

  const { queueMessage } = useOfflineMessageQueue();

  // 5. Send message action
  const sendMessage = useCallback(
    async (
      content: string,
      options?: { replyToId?: string; mentions?: string[]; shouldBotReply?: boolean }
    ) => {
      if (!content.trim() || isSending) return;

      const payload = JSON.stringify({
        content,
        reply_to_id: options?.replyToId,
        mentions: options?.mentions,
        should_bot_reply: options?.shouldBotReply ?? shouldBotReplyDefault,
      });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueMessage(
          `/api/bots/${botId}/group/messages`,
          { "Content-Type": "application/json" },
          payload
        );
        return;
      }

      try {
        setIsSending(true);
        const res = await fetch(`/api/bots/${botId}/group/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.message || "Failed to send message");
        }

        const json = await res.json();
        if (json.success && json.data) {
          const newMsg = json.data as GroupMessageRow;
          const nowIso = new Date().toISOString();
          initialLastReadAtRef.current = nowIso;
          setInitialUnreadInfo(null);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      } catch (err) {
        console.error("Error sending group message:", err);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [botId, isSending, shouldBotReplyDefault, queueMessage]
  );

  // 6. Soft delete message action
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch(`/api/bots/${botId}/group/messages/${messageId}`, {
          method: "PATCH",
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.message || "Failed to delete message");
        }

        const json = await res.json();
        if (json.success && json.data) {
          const updatedMsg = json.data as GroupMessageRow;
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
        }
      } catch (err) {
        console.error("Error deleting message:", err);
        throw err;
      }
    },
    [botId]
  );

  // 7. Leave group action
  const leaveGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/group/me`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to leave group");
      window.location.reload();
    } catch (err) {
      console.error("Error leaving group:", err);
      throw err;
    }
  }, [botId]);

  return {
    messages,
    members,
    groupInfo,
    botInfo,
    isLoading,
    isSending,
    hasMore,
    error,
    canPin,
    pinnedMessageIds,
    setPinnedMessageIds,
    unreadCount,
    initialLastReadAt,
    initialUnreadInfo,
    shouldBotReplyDefault,
    setShouldBotReplyDefault,
    sendMessage,
    deleteMessage,
    loadOlder: () => {
      if (messages.length > 0 && hasMore) {
        fetchMessages(messages[0].created_at);
      }
    },
    markRead,
    leaveGroup,
    refetchGroup: fetchGroupDetails,
    refetchPinnedKnowledge: fetchPinnedKnowledge,

    // Notes State & Actions (Task 3.1)
    activeNote,
    setActiveNote,
    notesList,
    hasMoreNotes,
    isLoadingNotes,
    canCreateNote,
    refetchActiveNote,
    fetchActiveNote: refetchActiveNote,
    loadNotesList,
    fetchNotes: (isInitial?: boolean) => loadNotesList(isInitial),
    createNote: async (payload: { title: string; content_html: string; content_text: string }) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      const note = await createNoteApi(currentGroupId, payload);
      setActiveNote(note);
      await loadNotesList(true);
      return note;
    },
    updateNote: async (
      noteId: string,
      payload: { title?: string; content_html?: string; content_text?: string }
    ) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      const updated = await updateNoteApi(currentGroupId, noteId, payload);
      setActiveNote((prev) => (prev?.id === noteId ? updated : prev));
      await loadNotesList(true);
      return updated;
    },
    pinNote: async (noteId: string) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      const res = await fetch(`/api/group/${currentGroupId}/notes/${noteId}/pin`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to pin note");
      }
      const json = await res.json();
      setActiveNote(json.data);
      await loadNotesList(true);
      return json.data;
    },
    pinMessageAsNote: async (messageId: string, isActive: boolean = false) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      const note = await pinMessageAsNoteApi(currentGroupId, messageId, isActive);
      setPinnedMessageIds((prev) => {
        const next = new Set(prev);
        next.add(messageId);
        return next;
      });
      if (isActive) {
        setActiveNote(note);
      }
      await loadNotesList(true);
      return note;
    },
    unpinNote: async (noteId: string) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      const res = await fetch(`/api/group/${currentGroupId}/notes/${noteId}/unpin`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to unpin note");
      }
      setActiveNote((prev) => (prev?.id === noteId ? null : prev));
      await loadNotesList(true);
    },
    deleteNote: async (noteId: string) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      await deleteNoteApi(currentGroupId, noteId);
      setActiveNote((prev) => (prev?.id === noteId ? null : prev));
      await loadNotesList(true);
    },
    toggleNoteCollapse: async (noteId: string, collapsed: boolean) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      await toggleNoteCollapseApi(currentGroupId, noteId, collapsed);
      setActiveNote((prev) => (prev?.id === noteId ? { ...prev, collapsed } : prev));
    },
    toggleCollapse: async (noteId: string, collapsed: boolean) => {
      const currentGroupId = groupIdRef.current || groupInfo?.id;
      if (!currentGroupId) throw new Error("Group not initialized");
      await toggleNoteCollapseApi(currentGroupId, noteId, collapsed);
      setActiveNote((prev) => (prev?.id === noteId ? { ...prev, collapsed } : prev));
    },
    toggleMemberNotePermission,
  };
}
