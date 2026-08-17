"use client";

import { useState } from "react";
import { Bot, Pin, Copy, Check, Reply, AlertCircle, StickyNote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { parseMarkdown } from "@/lib/helpers";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import { GroupMember } from "@/hooks/useGroupChat";
import { EGroupSenderType } from "@/types";

interface MessageBubbleProps {
  message: GroupMessageRow;
  currentUserId?: string;
  botName?: string;
  botAvatar?: string;
  members: GroupMember[];
  allMessages?: GroupMessageRow[];
  canPin?: boolean;
  isPinned?: boolean;
  primaryColor?: string;
  onPin?: (message: GroupMessageRow) => void;
  onReply?: (message: GroupMessageRow) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  botName = "Vielora Bot",
  botAvatar,
  members,
  allMessages = [],
  canPin = false,
  isPinned = false,
  primaryColor = "#047857",
  onPin,
  onReply,
  onScrollToMessage,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isSystem =
    (message.sender_type as string) === EGroupSenderType.System ||
    (message.sender_type as string) === "system";

  // If message is a system notification, render centered status pill
  if (isSystem) {
    const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const renderSystemContent = () => {
      const actionKeywords = [
        "đã lưu tin nhắn vào ghi chú",
        "đã lưu vào ghi chú",
        "đã lưu",
        "đã tạo ghi chú",
        "đã tạo",
        "đã cập nhật ghi chú",
        "đã cập nhật",
        "đã ghim ghi chú",
        "đã ghim",
        "đã bỏ ghim ghi chú",
        "đã bỏ ghim",
        "đã xóa ghi chú",
        "đã xóa",
      ];

      let matchedKw: string | null = null;
      let kwIdx = -1;

      for (const kw of actionKeywords) {
        const idx = message.content.indexOf(kw);
        if (idx !== -1) {
          matchedKw = kw;
          kwIdx = idx;
          break;
        }
      }

      if (matchedKw && kwIdx !== -1) {
        const actorName = message.content.slice(0, kwIdx).trim();
        const afterActor = message.content.slice(kwIdx).trim();
        const colonIndex = afterActor.indexOf(":");

        let actionText = afterActor;
        let titlePart = "";

        if (colonIndex !== -1) {
          actionText = afterActor.slice(0, colonIndex).trim();
          titlePart = afterActor.slice(colonIndex + 1).trim();
        }

        // Strip enclosing quotes
        if (
          (titlePart.startsWith('"') && titlePart.endsWith('"')) ||
          (titlePart.startsWith("“") && titlePart.endsWith("”")) ||
          (titlePart.startsWith("”") && titlePart.endsWith("”")) ||
          (titlePart.startsWith("“") && titlePart.endsWith("“"))
        ) {
          titlePart = titlePart.slice(1, -1).trim();
        }

        const displayTitle = titlePart.length > 35 ? `${titlePart.slice(0, 35)}...` : titlePart;

        return (
          <span className="truncate">
            <strong className="font-semibold text-foreground">{actorName}</strong>{" "}
            <span>
              {actionText}
              {titlePart ? ":" : ""}
            </span>{" "}
            {titlePart && (
              <em className="font-normal italic text-foreground/90">
                &ldquo;{displayTitle}&rdquo;
              </em>
            )}
          </span>
        );
      }

      return <span className="truncate font-medium text-foreground/90">{message.content}</span>;
    };

    return (
      <div id={`msg-${message.id}`} className="my-1.5 flex w-full items-center justify-center px-4">
        <div className="shadow-3xs inline-flex max-w-[95%] items-center gap-1.5 rounded-full border border-border/60 bg-slate-100/90 px-3 py-1 text-[11px] text-muted-foreground transition-colors dark:bg-slate-800/80 sm:max-w-[85%]">
          <StickyNote className="h-3 w-3 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1 truncate text-center">{renderSystemContent()}</div>
          <span className="shrink-0 text-[10px] opacity-60">• {formattedTime}</span>
        </div>
      </div>
    );
  }

  const isBot = message.sender_type === EGroupSenderType.Bot;
  const isCurrentUser = !isBot && message.sender_id === currentUserId;

  // Find sender profile from members list
  const senderMember = !isBot ? members.find((m) => m.user_id === message.sender_id) : undefined;

  const displayName =
    senderMember?.display_name ||
    senderMember?.user?.display_name ||
    senderMember?.full_name ||
    senderMember?.user?.full_name;

  const email = senderMember?.user?.email || "";

  const senderName = isBot ? botName : displayName || email || "Thành viên";
  const senderAvatar = senderMember?.avatar_url || senderMember?.user?.avatar_url;

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Handle quoted reply target message
  const replyTarget = message.reply_to_id
    ? allMessages.find((m) => m.id === message.reply_to_id)
    : undefined;

  const replyTargetSenderMember =
    replyTarget && replyTarget.sender_type !== EGroupSenderType.Bot
      ? members.find((m) => m.user_id === replyTarget.sender_id)
      : undefined;
  const replyTargetSenderName = replyTarget
    ? replyTarget.sender_type === EGroupSenderType.Bot
      ? "AI Assistant"
      : replyTargetSenderMember?.display_name ||
        replyTargetSenderMember?.user?.display_name ||
        replyTargetSenderMember?.full_name ||
        replyTargetSenderMember?.user?.full_name ||
        replyTargetSenderMember?.role_label ||
        replyTargetSenderMember?.user?.email ||
        "Thành viên"
    : "";

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex w-full gap-2 px-1 py-1.5 transition-colors duration-300 ${
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Sender Avatar */}
      <Avatar className="shadow-2xs mt-0.5 h-7 w-7 shrink-0 rounded-full border border-slate-200 dark:border-slate-800">
        <AvatarImage
          src={(isBot ? botAvatar : senderAvatar) || undefined}
          alt={senderName}
          className="object-cover"
        />
        <AvatarFallback
          className={`text-xs font-semibold ${
            isBot || isCurrentUser
              ? "text-white"
              : "border border-border bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
          style={isBot || isCurrentUser ? { backgroundColor: primaryColor } : {}}
        >
          {isBot ? <Bot className="h-3.5 w-3.5" /> : senderName.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Main message column */}
      <div
        className={`relative flex max-w-[80%] flex-col sm:max-w-[70%] ${
          isCurrentUser ? "items-end" : "items-start"
        }`}
      >
        {/* Sender Name & Role & Timestamp header */}
        <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          {!isCurrentUser && <span className="font-semibold text-foreground">{senderName}</span>}
          {!isCurrentUser && !isBot && senderMember?.role_label && (
            <span
              className="py-0.2 rounded-full border px-1.5 text-[9px] font-medium leading-none"
              style={{
                borderColor: `${primaryColor}40`,
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
            >
              {senderMember.role_label}
            </span>
          )}
          <span className="text-[10px] opacity-70">{formattedTime}</span>
        </div>

        {/* Message Bubble content */}
        <div
          className={`shadow-2xs relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
            isCurrentUser
              ? "rounded-tr-xs text-white"
              : isBot &&
                  (message.content.includes("hết credits") ||
                    message.content.includes("hết credit"))
                ? "rounded-tl-xs border border-rose-200 bg-rose-50/90 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-200"
                : "rounded-tl-xs border border-border bg-card text-foreground"
          }`}
          style={isCurrentUser ? { backgroundColor: primaryColor } : {}}
        >
          {/* High contrast Quoted Reply banner inside current user bubble vs bot/member bubbles */}
          {replyTarget && (
            <div
              onClick={() => onScrollToMessage?.(replyTarget.id)}
              className={`border-l-3 shadow-2xs mb-1 cursor-pointer rounded-md px-2.5 py-1 text-xs transition-opacity hover:opacity-90 ${
                isCurrentUser
                  ? "backdrop-blur-xs border-white/90 bg-black/20 text-white dark:bg-white/20"
                  : "border-primary bg-slate-200 text-slate-900 dark:bg-slate-900 dark:text-slate-100"
              }`}
              style={!isCurrentUser ? { borderLeftColor: primaryColor } : {}}
            >
              <div className="flex items-center gap-1 text-[11px] font-semibold opacity-95">
                <Reply className="h-3 w-3 shrink-0" />
                <span>{replyTargetSenderName}</span>
              </div>
              <p className="line-clamp-1 text-[11px] opacity-85">{replyTarget.content}</p>
            </div>
          )}

          {message.deleted_at ? (
            <span>Tin nhắn đã bị xóa</span>
          ) : isBot ? (
            <div className="flex items-start gap-1.5">
              {(message.content.includes("hết credits") ||
                message.content.includes("hết credit")) && (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <div
                className="chatbot-message-content flex-1 whitespace-pre-line break-words text-sm"
                dangerouslySetInnerHTML={{
                  __html: parseMarkdown(message.content, primaryColor),
                }}
              />
            </div>
          ) : (
            <p className="whitespace-pre-line break-words">{message.content}</p>
          )}
        </div>

        {/* Floating Action toolbar shifted lower to avoid overlapping message text */}
        {!message.deleted_at && (
          <div
            className={`shadow-xs absolute -bottom-4 z-10 flex items-center gap-1 rounded-md border border-slate-200/90 bg-white/95 p-0.5 opacity-0 transition-all duration-200 group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900/95 ${
              isCurrentUser ? "right-1" : "left-1"
            }`}
          >
            {/* Reply Button */}
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Trả lời tin nhắn"
              >
                <Reply className="h-3 w-3" />
              </button>
            )}

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Sao chép tin nhắn"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>

            {/* Pin Message to Group Note Button */}
            {canPin &&
              onPin &&
              (isPinned ? (
                <button
                  type="button"
                  disabled
                  className="flex h-5 cursor-default items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 text-emerald-600 transition-all dark:bg-emerald-950/60 dark:text-emerald-400"
                  title="Tin nhắn đã được lưu vào ghi chú nhóm"
                >
                  <Pin className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400" />
                  <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onPin(message)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600 active:scale-95 dark:text-slate-400 dark:hover:bg-amber-950 dark:hover:text-amber-400"
                  title="Lưu tin nhắn vào ghi chú nhóm"
                >
                  <Pin className="h-3 w-3" />
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
