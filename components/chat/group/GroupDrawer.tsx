"use client";

import { useState } from "react";
import { Users, StickyNote, LogOut, Bot, Loader2, Pin, PinOff, Clock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import { NoteDetailModal } from "@/components/chat/group/NoteDetailModal";
import type { GroupMember } from "@/hooks/useGroupChat";
import type { GroupNoteRow } from "@/types/group-chat";
import { parseMarkdown } from "@/lib/helpers/chat-helpers";

export interface GroupDrawerProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "members" | "notes";
  members: GroupMember[];
  currentUserId?: string;
  isManager?: boolean;
  botName?: string;
  botAvatar?: string;
  activeNote?: GroupNoteRow | null;
  notesList?: GroupNoteRow[];
  hasMoreNotes?: boolean;
  isLoadingNotes?: boolean;
  canCreateNote?: boolean;
  primaryColor?: string;
  onLeaveGroup: () => Promise<void>;
  onLoadMoreNotes?: () => Promise<void>;
  onCreateNoteClick?: () => void;
  onEditNoteClick?: (note: GroupNoteRow) => void;
  onDeleteNoteClick?: (note: GroupNoteRow) => void;
  onPinNoteClick?: (note: GroupNoteRow) => void;
  onUnpinNoteClick?: (note: GroupNoteRow) => void;
  onToggleMemberNotePermission?: (memberId: string, enabled: boolean) => Promise<void>;
}

export function GroupDrawer({
  isOpen,
  onOpenChange,
  defaultTab = "members",
  members = [],
  currentUserId,
  isManager: _isManager = false,
  botName = "Vielora AI Assistant",
  botAvatar,
  activeNote = null,
  notesList = [],
  hasMoreNotes = false,
  isLoadingNotes = false,
  canCreateNote = false,
  primaryColor = "#047857",
  onLeaveGroup,
  onLoadMoreNotes = async () => {},
  onCreateNoteClick: _onCreateNoteClick = () => {},
  onEditNoteClick = () => {},
  onDeleteNoteClick = () => {},
  onPinNoteClick,
  onUnpinNoteClick,
}: GroupDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedDetailNote, setSelectedDetailNote] = useState<GroupNoteRow | null>(null);

  const handleLeave = async () => {
    try {
      setIsLeaving(true);
      await onLeaveGroup();
      setLeaveConfirmOpen(false);
      onOpenChange?.(false);
    } finally {
      setIsLeaving(false);
    }
  };

  const sheetProps =
    isOpen !== undefined ? { open: isOpen, onOpenChange } : onOpenChange ? { onOpenChange } : {};

  const renderMembersContent = () => (
    <div className="space-y-2.5">
      {/* Bot Profile */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-7 w-7 shrink-0 rounded-lg border border-white/40">
            <AvatarImage src={botAvatar || undefined} alt={botName} />
            <AvatarFallback
              className="rounded-lg text-[10px] font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Bot className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-foreground">{botName}</p>
              <span
                className="py-0.2 rounded-md px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                BOT
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">Trợ lý trí tuệ nhân tạo</p>
          </div>
        </div>
      </div>

      {/* Members List */}
      {members.map((m) => {
        const displayName =
          m.display_name || m.user?.display_name || m.full_name || m.user?.full_name || null;
        const email = m.user?.email || m.email || "";
        const isSelf = m.user_id === currentUserId;
        const roleLabel = m.role_label || "Thành viên";
        const avatarUrl = m.avatar_url || m.user?.avatar_url;
        const primaryInitial = (displayName || email || "T").trim().charAt(0).toUpperCase();

        return (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded-xl border border-border/50 bg-slate-50/80 p-2.5 transition-colors dark:bg-slate-900/80"
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar className="h-7 w-7 shrink-0 rounded-lg border border-border/60">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || email} />
                  <AvatarFallback
                    className="rounded-lg text-[10px] font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {primaryInitial}
                  </AvatarFallback>
                </Avatar>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {displayName || email}
                    </p>
                    {isSelf && (
                      <span
                        className="py-0.2 rounded-md px-1 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor,
                        }}
                      >
                        BẠN
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {roleLabel}
                    {email && displayName && ` • ${email}`}
                  </p>
                </div>
              </div>

              {/* Permission Badges */}
              <div className="flex items-center gap-1">
                {Boolean(m.can_create_note || m.can_pin_knowledge) && (
                  <span
                    title="Có quyền quản lý & tạo ghi chú"
                    className="rounded-md bg-amber-500/10 p-1 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  >
                    <StickyNote className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <Sheet {...sheetProps}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full text-current transition-colors hover:bg-white/20 active:scale-95"
            title="Xem thông tin nhóm & ghi chú"
            aria-label="Xem thông tin nhóm & ghi chú"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="flex w-[340px] flex-col justify-between p-4 sm:w-[420px] sm:p-6"
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            <SheetHeader className="mb-3 border-b border-border/60 pb-3">
              <SheetTitle className="text-base font-semibold text-foreground">
                Thông tin nhóm chat
              </SheetTitle>
            </SheetHeader>

            {/* 2-Tab Switcher or single view if notes disabled */}
            {GROUP_CHAT_CONFIG.GROUP_NOTES_ENABLED ? (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <TabsList className="mb-3 grid w-full grid-cols-2">
                  <TabsTrigger
                    value="members"
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Thành viên ({members.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    <span>Ghi chú</span>
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: MEMBERS */}
                <TabsContent
                  value="members"
                  className="flex-1 space-y-2.5 overflow-y-auto pr-1 outline-none"
                >
                  {renderMembersContent()}
                </TabsContent>

                {/* TAB 2: NOTES */}
                <TabsContent
                  value="notes"
                  className="flex-1 space-y-3 overflow-y-auto pr-1 outline-none"
                >
                  {/* 1. Active Note Highlight Card */}
                  {activeNote && (
                    <div
                      className="cursor-pointer rounded-xl border p-3.5 transition-colors duration-150"
                      style={{
                        backgroundColor: primaryColor ? `${primaryColor}0d` : undefined,
                        borderColor: primaryColor ? `${primaryColor}2e` : undefined,
                      }}
                      onClick={() => setSelectedDetailNote(activeNote)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: primaryColor ? `${primaryColor}18` : undefined,
                              color: primaryColor || undefined,
                            }}
                          >
                            <Pin className="h-3 w-3" />
                            Đang ghim
                          </span>
                        </div>

                        {canCreateNote && (
                          <div className="flex items-center gap-1">
                            {onUnpinNoteClick && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-black/5 hover:opacity-90 active:scale-95 dark:hover:bg-white/10"
                                style={{ color: primaryColor }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnpinNoteClick(activeNote);
                                }}
                                title="Bỏ ghim khỏi banner"
                              >
                                <PinOff className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Prominent Title */}
                      <h4 className="mb-1.5 text-xs font-bold leading-snug text-foreground">
                        {activeNote.title}
                      </h4>

                      {/* Content Preview (Markdown formatted with line clamp) */}
                      <div
                        className="prose-xs prose line-clamp-2 max-w-none text-[11px] leading-relaxed text-muted-foreground/90 dark:prose-invert [&_li]:my-0 [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:my-0"
                        dangerouslySetInnerHTML={{
                          __html:
                            activeNote.content_html &&
                            !activeNote.content_html.includes("**") &&
                            (activeNote.content_html.includes("<p>") ||
                              activeNote.content_html.includes("<div>") ||
                              activeNote.content_html.includes("<ul"))
                              ? activeNote.content_html
                              : parseMarkdown(
                                  activeNote.content_text || activeNote.content_html || "",
                                  primaryColor
                                ),
                        }}
                      />

                      {/* Bottom Row: Timestamp with hour */}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(
                            activeNote.updated_at || activeNote.created_at
                          ).toLocaleDateString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Notes History / Archived List */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Lịch sử ghi chú nhóm
                    </p>

                    {notesList.filter((n) => !n.is_active).length === 0 && !activeNote ? (
                      <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                        <StickyNote className="mx-auto mb-1.5 h-7 w-7 opacity-40" />
                        <p>Nhóm chưa có ghi chú nào.</p>
                      </div>
                    ) : (
                      notesList
                        .filter((n) => !n.is_active)
                        .map((n) => (
                          <div
                            key={n.id}
                            className="cursor-pointer space-y-2 rounded-xl border border-border/60 bg-card p-3"
                            onClick={() => setSelectedDetailNote(n)}
                          >
                            {/* Top Row: Title with Icon & Pin Button */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                <h5 className="truncate text-xs font-semibold text-foreground">
                                  {n.title}
                                </h5>
                              </div>

                              {/* Re-pin button if no active note currently pinned */}
                              {canCreateNote && !activeNote && onPinNoteClick && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6.5 shadow-2xs shrink-0 gap-1 rounded-sm border p-1 text-[10px] font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
                                  style={{
                                    color: primaryColor,
                                    borderColor: primaryColor ? `${primaryColor}40` : undefined,
                                    backgroundColor: primaryColor ? `${primaryColor}0a` : undefined,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPinNoteClick(n);
                                  }}
                                  title="Ghim lại lên banner"
                                >
                                  <Pin className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {/* Content Preview (Markdown formatted with line clamp) */}
                            <div
                              className="prose-xs prose line-clamp-2 max-w-none text-[11px] leading-relaxed text-muted-foreground dark:prose-invert [&_li]:my-0 [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:my-0"
                              dangerouslySetInnerHTML={{
                                __html:
                                  n.content_html &&
                                  !n.content_html.includes("**") &&
                                  (n.content_html.includes("<p>") ||
                                    n.content_html.includes("<div>") ||
                                    n.content_html.includes("<ul"))
                                    ? n.content_html
                                    : parseMarkdown(
                                        n.content_text || n.content_html || "",
                                        primaryColor
                                      ),
                              }}
                            />

                            {/* Bottom Row: Timestamp with hour */}
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(n.updated_at || n.created_at).toLocaleDateString(
                                  "vi-VN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        ))
                    )}

                    {/* Pagination Load More Button */}
                    {hasMoreNotes && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 rounded-xl text-xs font-medium transition-all duration-150 hover:bg-accent active:scale-[0.99]"
                        onClick={() => {
                          void onLoadMoreNotes();
                        }}
                        disabled={isLoadingNotes}
                      >
                        {isLoadingNotes && <Loader2 className="h-3 w-3 animate-spin" />}
                        <span>Xem thêm ghi chú</span>
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 outline-none">
                {renderMembersContent()}
              </div>
            )}
          </div>

          {/* Footer: Small Leave Group Button aligned to bottom right */}
          <div className="mt-3 flex items-center justify-end border-t border-border/50 pt-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLeaving}
              className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-destructive transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-50"
              onClick={() => setLeaveConfirmOpen(true)}
              title="Rời khỏi nhóm chat"
            >
              <LogOut className="h-3 w-3" />
              <span>Rời nhóm</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Leave Group Confirmation Modal */}
      <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <DialogContent className="overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-rose-600 dark:text-rose-400">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <LogOut className="h-4 w-4" />
              </div>
              <span>Rời khỏi nhóm chat?</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-1 text-xs leading-relaxed text-muted-foreground">
            <p>
              Bạn có chắc chắn muốn rời khỏi nhóm chat này không? Sau khi rời nhóm, bạn sẽ không
              nhận được tin nhắn mới từ nhóm trừ khi được mời lại.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLeaveConfirmOpen(false)}
              disabled={isLeaving}
              className="text-xs transition-colors duration-200 hover:border-red-600 hover:bg-white hover:text-red-600 dark:hover:border-red-500 dark:hover:bg-background dark:hover:text-red-400"
            >
              Ở lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLeave}
              disabled={isLeaving}
              className="gap-1.5 text-xs"
            >
              {isLeaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3" />
              )}
              <span>{isLeaving ? "Đang rời..." : "Xác nhận rời"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Detail Modal */}
      <NoteDetailModal
        isOpen={Boolean(selectedDetailNote)}
        onClose={() => setSelectedDetailNote(null)}
        note={selectedDetailNote}
        activeNoteId={activeNote?.id}
        canManageNote={canCreateNote}
        primaryColor={primaryColor}
        onPin={onPinNoteClick}
        onUnpin={onUnpinNoteClick}
        onEdit={onEditNoteClick}
        onDelete={onDeleteNoteClick}
      />
    </>
  );
}
