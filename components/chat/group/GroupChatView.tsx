"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Bot, RefreshCw, MessageSquare, Loader2, ChevronDown, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGroupChat } from "@/hooks/useGroupChat";
import { MessageBubble } from "@/components/chat/group/MessageBubble";
import { MessageComposer } from "@/components/chat/group/MessageComposer";
import { UnreadDivider } from "@/components/chat/group/UnreadDivider";
import { GroupDrawer } from "@/components/chat/group/GroupDrawer";
import { NoteBanner } from "@/components/chat/group/NoteBanner";
import { NoteEditorModal } from "@/components/chat/group/NoteEditorModal";
import { DeleteNoteConfirmModal } from "@/components/chat/group/DeleteNoteConfirmModal";
import { ExportReportModal } from "@/components/dashboard/bot-detail/ExportReportModal";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import type { PublicBotData } from "@/lib/services/bot.service";
import type { GroupNoteRow } from "@/types/group-chat";
import { getUserMessageTextColor, getBackgroundStyle } from "@/lib/helpers";
import { EWidgetBackgroundType, EGroupSenderType } from "@/types";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useToast } from "@/hooks/use-toast";
import { OfflineBanner } from "@/components/chat/OfflineBanner";
import { GroupDisabledView } from "@/components/chat/group/GroupDisabledView";
import { ChatTabSwitcher } from "@/components/chat/ChatTabSwitcher";
import { getWidgetTranslations } from "@/lib/i18n/widget-translations";

import {
  ERROR_CODE_OTP_EXPIRED,
  ERROR_CODE_ACCESS_DENIED,
  GROUP_ALREADY_PINNED_CODE,
  GROUP_INSUFFICIENT_CREDITS_CODE,
} from "@/lib/constants";

interface GroupChatViewProps {
  botId: string;
  botSlug?: string;
  userId?: string;
  userEmail?: string;
  botName?: string;
  botData?: PublicBotData;
  onPinKnowledge?: (message: GroupMessageRow) => void;
}

interface WidgetSettings {
  primaryColor?: string;
  chatBackgroundType?: EWidgetBackgroundType;
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
  isVoiceEnabled?: boolean;
  ui_language?: string;
  locale?: string;
}

export function GroupChatView({
  botId,
  botSlug,
  userId,
  userEmail,
  botName = "Vielora Bot",
  botData,
  onPinKnowledge,
}: GroupChatViewProps) {
  const isOnline = useNetworkStatus();
  const { toast } = useToast();

  const [replyingToMessage, setReplyingToMessage] = useState<GroupMessageRow | null>(null);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Note management state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingNote, setEditingNote] = useState<GroupNoteRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingNote, setDeletingNote] = useState<GroupNoteRow | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDefaultTab, setDrawerDefaultTab] = useState<"members" | "notes">("members");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const propWidgetSettings = (botData?.widget_settings as WidgetSettings) || {};
  const initialLocale = propWidgetSettings.ui_language || propWidgetSettings.locale || "vi";

  const {
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
    initialUnreadInfo,
    sendMessage,
    loadOlder,
    markRead,
    leaveGroup,
    activeNote,
    notesList,
    hasMoreNotes,
    isLoadingNotes,
    loadNotesList,
    canCreateNote,
    canExportReport,
    createNote,
    updateNote,
    pinNote,
    pinMessageAsNote,
    unpinNote,
    deleteNote,
    toggleMemberNotePermission,
  } = useGroupChat({ botId, userId, userEmail, locale: initialLocale });

  const effectiveBotData = botData || botInfo;
  const widgetSettings =
    ((effectiveBotData?.widget_settings || botData?.widget_settings) as WidgetSettings) || {};
  const locale = widgetSettings.ui_language || widgetSettings.locale || initialLocale;
  const t = getWidgetTranslations(locale);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes(ERROR_CODE_OTP_EXPIRED) || hash.includes(ERROR_CODE_ACCESS_DENIED)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);

      if (userId) {
        toast({
          title: t.notificationTitle,
          description: t.emailLinkUsedDesc,
        });
      } else {
        toast({
          title: t.linkExpiredTitle,
          description: t.linkExpiredDesc,
          variant: "destructive",
        });
      }
    }
  }, [userId, toast, t]);

  const handleOpenCreateNote = useCallback(() => {
    setEditingNote(null);
    setEditorMode("create");
    setEditorOpen(true);
  }, []);

  const handleOpenEditNote = useCallback((note: GroupNoteRow) => {
    setEditingNote(note);
    setEditorMode("edit");
    setEditorOpen(true);
  }, []);

  const handleOpenDeleteNote = useCallback((note: GroupNoteRow) => {
    setDeletingNote(note);
    setDeleteOpen(true);
  }, []);

  const handlePinNote = useCallback(
    async (note: GroupNoteRow) => {
      try {
        await pinNote(note.id);
        toast({
          title: t.pinned,
          description: t.messagePinnedToNotes,
        });
      } catch (err: unknown) {
        console.error("Error pinning note:", err);
        const message = err instanceof Error ? err.message : t.pinNoteError;
        toast({
          title: t.errorTitle,
          description: message,
          variant: "destructive",
        });
      }
    },
    [pinNote, toast, t]
  );

  const handleUnpinNote = useCallback(
    async (note: GroupNoteRow) => {
      try {
        await unpinNote(note.id);
        toast({
          title: t.unpin,
          description: t.unpinNoteSuccess,
        });
      } catch (err: unknown) {
        console.error("Error unpinning note:", err);
        const message = err instanceof Error ? err.message : t.unpinNoteError;
        toast({
          title: t.errorTitle,
          description: message,
          variant: "destructive",
        });
      }
    },
    [unpinNote, toast, t]
  );

  const handleOpenNotesDrawer = useCallback(() => {
    setDrawerDefaultTab("notes");
    setDrawerOpen(true);
  }, []);

  const handleEditorSubmit = useCallback(
    async (payload: { title: string; contentHtml: string; contentText: string }) => {
      setIsSavingNote(true);
      try {
        if (editorMode === "edit" && editingNote) {
          await updateNote(editingNote.id, {
            title: payload.title,
            content_html: payload.contentHtml,
            content_text: payload.contentText,
          });
          toast({
            title: t.saveChanges,
            description: t.updateNoteSuccess,
          });
        } else {
          await createNote({
            title: payload.title,
            content_html: payload.contentHtml,
            content_text: payload.contentText,
          });
          toast({
            title: t.createAndPin,
            description: t.createNoteSuccess,
          });
        }
        setEditorOpen(false);
        setEditingNote(null);
      } catch (err: unknown) {
        console.error("Error saving note:", err);
        const message = err instanceof Error ? err.message : t.saveNoteError;
        toast({
          title: t.errorTitle,
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsSavingNote(false);
      }
    },
    [editorMode, editingNote, updateNote, createNote, toast, t]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingNote) return;
    setIsDeletingNote(true);
    try {
      await deleteNote(deletingNote.id);
      toast({
        title: t.delete,
        description: t.deleteNoteSuccess,
      });
      setDeleteOpen(false);
      setDeletingNote(null);
    } catch (err: unknown) {
      console.error("Error deleting note:", err);
      const message = err instanceof Error ? err.message : t.deleteNoteError;
      toast({
        title: t.errorTitle,
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingNote(false);
    }
  }, [deletingNote, deleteNote, toast, t]);

  const handlePinKnowledge = useCallback(
    async (msg: GroupMessageRow) => {
      if (pinnedMessageIds.has(msg.id)) {
        toast({
          title: t.savedToNotes,
          description: t.messageAlreadySaved,
        });
        return;
      }

      if (onPinKnowledge) {
        onPinKnowledge(msg);
        return;
      }
      try {
        await pinMessageAsNote(msg.id, false);
        toast({
          title: t.savedToNotes,
          description: t.messageSavedSuccess,
        });
      } catch (err: unknown) {
        console.error("Error saving message as note:", err);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const code = (err as any)?.code;
        const msgStr = err instanceof Error ? err.message : t.messageSaveError;

        if (
          code === GROUP_ALREADY_PINNED_CODE ||
          msgStr?.includes("already pinned") ||
          msgStr?.includes("đã được lưu")
        ) {
          setPinnedMessageIds((prev) => {
            const next = new Set(prev);
            next.add(msg.id);
            return next;
          });
          toast({
            title: t.savedToNotes,
            description: t.messageAlreadyInNotes,
          });
        } else if (code === GROUP_INSUFFICIENT_CREDITS_CODE) {
          toast({
            title: t.outOfCredits,
            description: t.insufficientCreditsNoteError,
            variant: "destructive",
          });
        } else {
          toast({
            title: t.saveNoteErrorTitle,
            description: msgStr,
            variant: "destructive",
          });
        }
      }
    },
    [onPinKnowledge, pinMessageAsNote, pinnedMessageIds, setPinnedMessageIds, toast, t]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledInitiallyRef = useRef(false);
  const isUserNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef<number | null>(null);

  // Extract theme styling from botData or botInfo
  const primaryColor = widgetSettings.primaryColor || "#047857";
  const headerTextColor = getUserMessageTextColor(primaryColor);
  const isVoiceEnabled = widgetSettings.isVoiceEnabled ?? true;
  const backgroundStyle = getBackgroundStyle(
    widgetSettings.chatBackgroundType,
    widgetSettings.chatBackgroundValue,
    widgetSettings.chatBackgroundOpacity
  );

  const isBotOutOfCredits = useMemo(() => {
    return messages.some(
      (m) =>
        m.sender_type === EGroupSenderType.Bot &&
        (m.content.includes("hết credits") || m.content.includes("hết credit"))
    );
  }, [messages]);

  const displayBotName = effectiveBotData?.name || botName;
  const avatarUrl =
    effectiveBotData?.avatar_url ||
    (effectiveBotData as unknown as { avatarUrl?: string })?.avatarUrl ||
    (widgetSettings as unknown as { avatarUrl?: string })?.avatarUrl ||
    (widgetSettings as unknown as { chatIconUrl?: string })?.chatIconUrl ||
    (widgetSettings as unknown as { botAvatar?: string })?.botAvatar;

  // Helper to scroll smoothly to bottom after DOM reflow
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior });
        }
      });
    });
  }, []);

  // Smart Initial Scroll: If unread messages exist, scroll to unread divider; otherwise bottom
  useEffect(() => {
    if (messages.length === 0 || hasScrolledInitiallyRef.current) return;
    if (members.length === 0 && userId) return;

    hasScrolledInitiallyRef.current = true;

    if (initialUnreadInfo?.firstUnreadId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const dividerEl = document.getElementById("unread-divider");
          const targetEl =
            dividerEl || document.getElementById(`msg-${initialUnreadInfo.firstUnreadId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "auto", block: "center" });
          } else {
            scrollToBottom("auto");
          }
        });
      });
    } else {
      scrollToBottom("auto");
      markRead();
    }
  }, [
    messages.length,
    members.length,
    initialUnreadInfo?.firstUnreadId,
    userId,
    scrollToBottom,
    markRead,
  ]);

  // Handle new incoming messages while user is active
  useEffect(() => {
    if (!hasScrolledInitiallyRef.current) return;

    const lastMsg = messages[messages.length - 1];
    const isMyMsg = lastMsg?.sender_id === userId;
    const isBotReply = lastMsg?.sender_type === "bot";

    // If user was near bottom, or if it's user's message, or bot reply -> always scroll to bottom
    if (isUserNearBottomRef.current || isMyMsg || isBotReply) {
      scrollToBottom("smooth");
      markRead();
    }
  }, [messages, userId, scrollToBottom, markRead]);

  // Handle load older with scroll position preservation
  const handleLoadOlderMessages = useCallback(async () => {
    if (!hasMore || isFetchingOlder) return;
    setIsFetchingOlder(true);

    if (scrollRef.current) {
      prevScrollHeightRef.current = scrollRef.current.scrollHeight;
    }

    await loadOlder();

    setTimeout(() => {
      if (scrollRef.current && prevScrollHeightRef.current !== null) {
        const newScrollHeight = scrollRef.current.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeightRef.current;
        scrollRef.current.scrollTop = heightDiff;
        prevScrollHeightRef.current = null;
      }
      setIsFetchingOlder(false);
    }, 80);
  }, [hasMore, isFetchingOlder, loadOlder]);

  // Scroll event listener for infinite scroll & floating bottom button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop < 80 && hasMore && !isFetchingOlder) {
      void handleLoadOlderMessages();
    }

    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isNearBottom = distanceFromBottom < 120;

    isUserNearBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);

    if (isNearBottom) {
      markRead();
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const targetElement = document.getElementById(`msg-${messageId}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("bg-amber-100/30", "dark:bg-amber-900/30");
      setTimeout(() => {
        targetElement.classList.remove("bg-amber-100/30", "dark:bg-amber-900/30");
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium">{t.loadingGroupChat}</p>
      </div>
    );
  }

  if (error || !groupInfo) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
        <MessageSquare className="h-10 w-10 text-amber-500" />
        <h3 className="text-base font-semibold text-foreground">{error || t.groupNotAvailable}</h3>
        <p className="max-w-sm text-xs">{t.groupNotAvailableDesc}</p>
      </div>
    );
  }

  if (groupInfo.status === "disabled") {
    return (
      <GroupDisabledView
        messages={messages}
        members={members}
        currentUserId={userId}
        botName={displayBotName}
        locale={locale}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header synchronized 100% with StandaloneChatUI layout (max-w-3xl) */}
      <div
        className="sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: primaryColor, color: headerTextColor }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Avatar className="shadow-xs h-10 w-10 shrink-0 rounded-2xl border-2 border-white/30 transition-shadow">
            <AvatarImage
              src={avatarUrl || undefined}
              alt={displayBotName}
              className="object-cover"
            />
            <AvatarFallback className="rounded-2xl bg-white/10 text-white">
              <Bot className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-semibold leading-tight">{displayBotName}</h1>
              {botSlug && (
                <ChatTabSwitcher
                  botId={botId}
                  botSlug={botSlug}
                  activeTab="group"
                  className="h-5.5 w-5.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95"
                />
              )}
            </div>
            <p className="truncate text-sm opacity-90">
              {isBotOutOfCredits
                ? `${t.groupTitle} • ${members.length} ${t.membersCount} • ${t.outOfCredits}`
                : `${t.groupTitle} • ${members.length} ${t.membersCount}`}
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1">
            {GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED && canCreateNote && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full text-current transition-colors hover:bg-white/20 active:scale-95"
                onClick={handleOpenCreateNote}
                title={t.createNewNote}
                aria-label={t.createNewNote}
              >
                <SquarePen className="h-5 w-5" />
              </Button>
            )}

            <GroupDrawer
              isOpen={drawerOpen}
              onOpenChange={setDrawerOpen}
              defaultTab={drawerDefaultTab}
              members={members}
              currentUserId={userId}
              isManager={canCreateNote}
              botName={displayBotName}
              botAvatar={avatarUrl}
              activeNote={activeNote}
              notesList={notesList}
              hasMoreNotes={hasMoreNotes}
              isLoadingNotes={isLoadingNotes}
              canCreateNote={canCreateNote}
              canExportReport={canExportReport}
              primaryColor={primaryColor}
              onLeaveGroup={leaveGroup}
              onLoadMoreNotes={async () => {
                await loadNotesList();
              }}
              onCreateNoteClick={handleOpenCreateNote}
              onExportReportClick={() => setReportModalOpen(true)}
              onEditNoteClick={handleOpenEditNote}
              onDeleteNoteClick={handleOpenDeleteNote}
              onPinNoteClick={handlePinNote}
              onUnpinNoteClick={handleUnpinNote}
              onToggleMemberNotePermission={toggleMemberNotePermission}
              locale={locale}
            />
          </div>
        </div>
      </div>

      <OfflineBanner isOnline={isOnline} />

      {/* Active Group Note Banner */}
      {GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED && (
        <NoteBanner
          note={activeNote}
          canManageNote={canCreateNote}
          primaryColor={primaryColor}
          onEdit={handleOpenEditNote}
          onUnpin={handleUnpinNote}
          onOpenNotesDrawer={handleOpenNotesDrawer}
          locale={locale}
        />
      )}

      {/* Message List Container with max-w-3xl layout matching StandaloneChatUI */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-4 py-3"
        style={backgroundStyle}
      >
        <div className="mx-auto max-w-3xl space-y-1">
          {/* Infinite scroll indicator at the top */}
          {hasMore && (
            <div className="my-2 flex justify-center py-1">
              {isFetchingOlder ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: primaryColor }} />
                  <span>{t.loadingOlderMessages}</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadOlderMessages}
                  className="h-6 rounded-full px-3 text-[11px] text-muted-foreground hover:bg-muted/80"
                >
                  {t.loadOlderMessages}
                </Button>
              )}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex h-full min-h-[250px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Bot className="h-8 w-8 opacity-60" style={{ color: primaryColor }} />
              <p className="text-xs font-medium">{t.noGroupMessages}</p>
              <p className="text-[11px] opacity-70">{t.firstMessagePrompt}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {initialUnreadInfo?.firstUnreadId && msg.id === initialUnreadInfo.firstUnreadId && (
                  <UnreadDivider count={initialUnreadInfo.unreadCount} />
                )}
                <MessageBubble
                  message={msg}
                  currentUserId={userId}
                  botName={displayBotName}
                  botAvatar={avatarUrl}
                  members={members}
                  allMessages={messages}
                  canPin={canPin}
                  isPinned={pinnedMessageIds.has(msg.id)}
                  primaryColor={primaryColor}
                  onPin={handlePinKnowledge}
                  onReply={(m) => setReplyingToMessage(m)}
                  onScrollToMessage={handleScrollToMessage}
                  locale={locale}
                />
              </div>
            ))
          )}
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollToBottom && (
          <div className="pointer-events-none sticky bottom-3 z-30 flex justify-end pr-2 sm:pr-4">
            <button
              type="button"
              onClick={() => {
                isUserNearBottomRef.current = true;
                scrollToBottom("smooth");
                markRead();
              }}
              className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-muted active:scale-95"
              aria-label={t.scrollToBottom}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Message Composer Container with floating credit warning banner */}
      <div className="relative">
        {isBotOutOfCredits && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full z-10 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-t-lg border border-rose-200/80 bg-rose-50/95 px-4 py-2 text-xs font-medium text-rose-900 shadow-sm backdrop-blur-sm dark:border-rose-900/60 dark:bg-rose-950/90 dark:text-rose-200">
                {t.botCreditWarning}
              </div>
            </div>
          </div>
        )}

        <MessageComposer
          botId={botId}
          userId={userId}
          onSend={async (text, options) => {
            isUserNearBottomRef.current = true;
            scrollToBottom("smooth");
            await sendMessage(text, options);
            scrollToBottom("smooth");
          }}
          isSending={isSending}
          disabled={groupInfo.status === "disabled"}
          primaryColor={primaryColor}
          isVoiceEnabled={isVoiceEnabled}
          replyingToMessage={replyingToMessage}
          members={members}
          onCancelReply={() => setReplyingToMessage(null)}
          isBotOutOfCredits={isBotOutOfCredits}
          locale={locale}
        />
      </div>

      {/* Note Editor Modal */}
      {GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED && editorOpen && (
        <NoteEditorModal
          botId={botId}
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingNote(null);
          }}
          mode={editorMode}
          existingNote={editingNote}
          onSubmit={handleEditorSubmit}
          primaryColor={primaryColor}
          isSubmitting={isSavingNote}
          locale={locale}
        />
      )}

      {/* Delete Note Confirm Modal */}
      {GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED && deleteOpen && deletingNote && (
        <DeleteNoteConfirmModal
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeletingNote(null);
          }}
          noteTitle={deletingNote.title}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeletingNote}
          locale={locale}
        />
      )}

      {/* Export Report Modal */}
      {canExportReport && (
        <ExportReportModal
          open={reportModalOpen}
          onOpenChange={setReportModalOpen}
          botId={botId}
          workspaceId={botData?.workspace_id || botInfo?.workspace_id || undefined}
          groupId={groupInfo?.id}
          requestedByDisplayName={
            members.find((m) => m.user_id === userId)?.display_name ||
            members.find((m) => m.user_id === userId)?.full_name ||
            members.find((m) => m.user_id === userId)?.email ||
            userEmail ||
            t.groupMembers
          }
        />
      )}
    </div>
  );
}
