/**
 * Realtime Subscription Constants cho Group Chat (Supabase Postgres Changes)
 */

export const GROUP_CHAT_REALTIME_SCHEMA = "public" as const;

export const GROUP_CHAT_REALTIME_TABLES = {
  GROUP_MESSAGES: "group_messages",
  CHAT_KNOWLEDGE: "chat_knowledge",
  GROUP_NOTES: "group_notes",
  GROUP_MEMBERS: "group_members",
  GROUP_CHATS: "group_chats",
} as const;

export const GROUP_CHAT_REALTIME_LISTEN_EVENT = "postgres_changes" as const;

export const GROUP_CHAT_REALTIME_EVENTS = {
  INSERT: "INSERT",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  ALL: "*",
} as const;

export const GROUP_CHAT_REALTIME_CHANNELS = {
  GROUP_MESSAGES: (groupId: string) => `group_messages:${groupId}`,
  CHAT_KNOWLEDGE: (botId: string) => `chat_knowledge:${botId}`,
  GROUP_NOTES: (groupId: string) => `group_notes:${groupId}`,
} as const;

export const GROUP_CHAT_REALTIME_POLL_INTERVAL_MS = 5000;
