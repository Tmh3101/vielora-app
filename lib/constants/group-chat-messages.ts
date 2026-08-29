/**
 * Group Chat System Messages & Notifications (i18n ready)
 */
export const GROUP_CHAT_MESSAGES = {
  VN: {
    NOTE_CREATED: (userName: string, title: string) => `${userName} đã tạo ghi chú: "${title}"`,
    NOTE_UPDATED: (userName: string, title: string) =>
      `${userName} đã cập nhật ghi chú: "${title}"`,
    NOTE_DELETED: (userName: string, title: string) => `${userName} đã xóa ghi chú: "${title}"`,
    NOTE_PINNED: (userName: string, title: string) => `${userName} đã ghim ghi chú: "${title}"`,
    NOTE_UNPINNED: (userName: string, title: string) =>
      `${userName} đã bỏ ghim ghi chú: "${title}"`,
    KNOWLEDGE_PINNED: (userName: string, question: string) =>
      `${userName} đã ghim câu hỏi vào kho tri thức: "${question}"`,
    ERRORS: {
      NOTE_NOT_FOUND: "Ghi chú không tồn tại hoặc đã bị xóa.",
      MESSAGE_NOT_FOUND: "Tin nhắn không tồn tại hoặc đã bị xóa.",
      ALREADY_PINNED: "Tin nhắn này đã được lưu vào ghi chú nhóm trước đó.",
      INSUFFICIENT_CREDITS_CREATE: "Không đủ credit để tạo ghi chú.",
      INSUFFICIENT_CREDITS_UPDATE: "Không đủ credit để cập nhật ghi chú.",
      MEMBER_LIMIT_REACHED: "Nhóm đã đạt số lượng thành viên tối đa theo gói cước.",
      BOT_WORKSPACE_NOT_FOUND: "Không tìm thấy workspace của bot.",
      CREATE_NOTE_FAILED: "Không thể tạo ghi chú nhóm.",
      RAG_INDEX_FAILED: "Không thể lập chỉ mục RAG cho ghi chú.",
    },
    ROLES: {
      AI_ASSISTANT: "Trợ lý AI",
      DEFAULT_MEMBER: "Thành viên",
    },
  },
} as const;

export const GROUP_MESSAGES = GROUP_CHAT_MESSAGES.VN;
