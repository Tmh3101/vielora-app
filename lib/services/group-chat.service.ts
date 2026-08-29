/**
 * Group Chat Service (Facade Layer)
 *
 * Re-exports domain sub-services for 100% backward compatibility:
 * - Core: Channel, messages, and read status
 * - Member: Member invitations, permissions, role updates, and user lookup
 * - Knowledge: Pinned chat Q&A and RAG
 * - Notes: Notes CRUD, pinning, and Saga orchestration
 * - MessageNote: Note creation and extraction from messages
 */

export * from "./group-chat/core.service";
export * from "./group-chat/member.service";
export * from "./group-chat/knowledge.service";
export * from "./group-chat/notes.service";
export * from "./group-chat/message-note.service";

// Re-export shared types for consumers
export type {
  GroupNoteRow,
  CreateGroupNoteInput,
  CreateNoteFromMessageInput,
  UpdateGroupNoteInput,
  GroupNotesPaginatedResponse,
  GroupChatRow,
  GroupMemberRow,
  GroupMessageRow,
} from "@/types/group-chat";
export type { ChatKnowledgeRow } from "./group-chat/knowledge.service";
