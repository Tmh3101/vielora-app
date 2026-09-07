import { ESystemLanguage, ELanguage } from "@/types/enums";
import viMessages from "@/messages/vi.json";
import enMessages from "@/messages/en.json";

export type SystemActionKey =
  | "noteCreated"
  | "noteUpdated"
  | "noteDeleted"
  | "notePinned"
  | "noteUnpinned"
  | "knowledgePinned"
  | "messageSavedToNote";

export const SYSTEM_ACTION_KEYS: readonly SystemActionKey[] = [
  "noteCreated",
  "noteUpdated",
  "noteDeleted",
  "notePinned",
  "noteUnpinned",
  "knowledgePinned",
  "messageSavedToNote",
] as const;

export interface GroupChatMessagesDefinition {
  NOTE_CREATED: (userName: string, title: string) => string;
  NOTE_UPDATED: (userName: string, title: string) => string;
  NOTE_DELETED: (userName: string, title: string) => string;
  NOTE_PINNED: (userName: string, title: string) => string;
  NOTE_UNPINNED: (userName: string, title: string) => string;
  KNOWLEDGE_PINNED: (userName: string, question: string) => string;
  MESSAGE_SAVED_TO_NOTE: (userName: string, title: string) => string;
  ERRORS: {
    NOTE_NOT_FOUND: string;
    MESSAGE_NOT_FOUND: string;
    ALREADY_PINNED: string;
    INSUFFICIENT_CREDITS_CREATE: string;
    INSUFFICIENT_CREDITS_UPDATE: string;
    MEMBER_LIMIT_REACHED: string;
    BOT_WORKSPACE_NOT_FOUND: string;
    CREATE_NOTE_FAILED: string;
    RAG_INDEX_FAILED: string;
  };
  ROLES: {
    AI_ASSISTANT: string;
    DEFAULT_MEMBER: string;
  };
  NOTE_FORMAT: {
    QA_TITLE: (snippet: string) => string;
    REPLY_TITLE: (snippet: string) => string;
    AI_ANSWER_TITLE: (snippet: string) => string;
    QUESTION_HEADER: (senderName: string, role: string, date: string) => string;
    ANSWER_HEADER: (senderName: string, date: string) => string;
    RAG_EMBEDDING_TEMPLATE: (
      title: string,
      author: string,
      date: string,
      content: string
    ) => string;
    RAG_PINNED_MESSAGE_TEMPLATE: (
      title: string,
      author: string,
      date: string,
      content: string
    ) => string;
  };
}

function interpolate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val);
  }
  return result;
}

type GroupChatJsonStructure = typeof viMessages.groupChat;

function buildMessagesFromSource(source: GroupChatJsonStructure): GroupChatMessagesDefinition {
  return {
    NOTE_CREATED: (userName: string, title: string) =>
      interpolate(source.system.noteCreated, { userName, title }),
    NOTE_UPDATED: (userName: string, title: string) =>
      interpolate(source.system.noteUpdated, { userName, title }),
    NOTE_DELETED: (userName: string, title: string) =>
      interpolate(source.system.noteDeleted, { userName, title }),
    NOTE_PINNED: (userName: string, title: string) =>
      interpolate(source.system.notePinned, { userName, title }),
    NOTE_UNPINNED: (userName: string, title: string) =>
      interpolate(source.system.noteUnpinned, { userName, title }),
    KNOWLEDGE_PINNED: (userName: string, question: string) =>
      interpolate(source.system.knowledgePinned, { userName, question }),
    MESSAGE_SAVED_TO_NOTE: (userName: string, title: string) =>
      interpolate(source.system.messageSavedToNote, { userName, title }),
    ERRORS: {
      NOTE_NOT_FOUND: source.errors.noteNotFound,
      MESSAGE_NOT_FOUND: source.errors.messageNotFound,
      ALREADY_PINNED: source.errors.alreadyPinned,
      INSUFFICIENT_CREDITS_CREATE: source.errors.insufficientCreditsCreate,
      INSUFFICIENT_CREDITS_UPDATE: source.errors.insufficientCreditsUpdate,
      MEMBER_LIMIT_REACHED: source.errors.memberLimitReached,
      BOT_WORKSPACE_NOT_FOUND: source.errors.botWorkspaceNotFound,
      CREATE_NOTE_FAILED: source.errors.createNoteFailed,
      RAG_INDEX_FAILED: source.errors.ragIndexFailed,
    },
    ROLES: {
      AI_ASSISTANT: source.roles.aiAssistant,
      DEFAULT_MEMBER: source.roles.defaultMember,
    },
    NOTE_FORMAT: {
      QA_TITLE: (snippet: string) => interpolate(source.noteFormat.qaTitle, { snippet }),
      REPLY_TITLE: (snippet: string) => interpolate(source.noteFormat.replyTitle, { snippet }),
      AI_ANSWER_TITLE: (snippet: string) =>
        interpolate(source.noteFormat.aiAnswerTitle, { snippet }),
      QUESTION_HEADER: (senderName: string, role: string, date: string) =>
        interpolate(source.noteFormat.questionHeader, { senderName, role, date }),
      ANSWER_HEADER: (senderName: string, date: string) =>
        interpolate(source.noteFormat.answerHeader, { senderName, date }),
      RAG_EMBEDDING_TEMPLATE: (title: string, author: string, date: string, content: string) =>
        interpolate(source.noteFormat.ragEmbeddingTemplate, { title, author, date, content }),
      RAG_PINNED_MESSAGE_TEMPLATE: (title: string, author: string, date: string, content: string) =>
        interpolate(source.noteFormat.ragPinnedMessageTemplate, { title, author, date, content }),
    },
  };
}

/**
 * Group Chat System Messages & Notifications
 * Sourced directly from messages/vi.json and messages/en.json (Single Source of Truth)
 */
export const GROUP_CHAT_MESSAGES: Record<"VI" | "EN" | "VN", GroupChatMessagesDefinition> = {
  VI: buildMessagesFromSource(viMessages.groupChat),
  EN: buildMessagesFromSource(enMessages.groupChat),
  get VN() {
    return this.VI;
  },
};

/**
 * Get Group Chat messages according to specified system locale (vi / en)
 */
export function getGroupChatMessages(
  locale?: string | ESystemLanguage | ELanguage
): GroupChatMessagesDefinition {
  const normalized = (locale || ESystemLanguage.Vi).toLowerCase().replace("-", "_");
  if (normalized.startsWith("en")) {
    return GROUP_CHAT_MESSAGES.EN;
  }
  return GROUP_CHAT_MESSAGES.VI;
}

export const GROUP_MESSAGES = GROUP_CHAT_MESSAGES.VI;
