import { z } from "zod";

export const createGroupNoteSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(200, "Tiêu đề tối đa 200 ký tự"),
  contentHtml: z.string().min(1, "Nội dung không được để trống"),
  contentText: z.string().min(1, "Nội dung không được để trống"),
  userName: z.string().optional(),
});

export const updateGroupNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contentHtml: z.string().min(1).optional(),
  contentText: z.string().min(1).optional(),
  userName: z.string().optional(),
});

export const createNoteFromMessageSchema = z.object({
  messageId: z.string().uuid("Message ID không hợp lệ"),
  userName: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const inviteGroupMemberSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export const sendGroupMessageSchema = z.object({
  content: z.string().min(1, "Nội dung tin nhắn không được để trống"),
  replyToId: z.string().uuid().optional().nullable(),
  mentions: z.array(z.string().uuid()).optional(),
  shouldBotReply: z.boolean().optional(),
});
