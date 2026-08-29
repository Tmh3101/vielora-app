"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Users,
  StickyNote,
  FileDown,
  LogOut,
  Bot,
  Loader2,
  Pin,
  PinOff,
  Clock,
  Menu,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  canExportReport?: boolean;
  primaryColor?: string;
  onLeaveGroup: () => Promise<void>;
  onLoadMoreNotes?: () => Promise<void>;
  onCreateNoteClick?: () => void;
  onExportReportClick?: () => void;
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
  canExportReport = false,
  primaryColor = "#047857",
  onLeaveGroup,
  onLoadMoreNotes = async () => {},
  onCreateNoteClick: _onCreateNoteClick = () => {},
  onExportReportClick,
  onEditNoteClick = () => {},
  onDeleteNoteClick = () => {},
  onPinNoteClick,
  onUnpinNoteClick,
}: GroupDrawerProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedDetailNote, setSelectedDetailNote] = useState<GroupNoteRow | null>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days" | "custom">(
    "all"
  );
  const [customDate, setCustomDate] = useState<Date | null>(null);

  const isNoteMatchingDate = useCallback(
    (note: GroupNoteRow) => {
      if (dateFilter === "all") return true;
      const noteDate = new Date(note.updated_at || note.created_at);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (dateFilter === "today") {
        return noteDate.getTime() >= startOfToday;
      }
      if (dateFilter === "7days") {
        const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
        return noteDate.getTime() >= sevenDaysAgo;
      }
      if (dateFilter === "custom" && customDate) {
        return (
          noteDate.getFullYear() === customDate.getFullYear() &&
          noteDate.getMonth() === customDate.getMonth() &&
          noteDate.getDate() === customDate.getDate()
        );
      }
      return true;
    },
    [dateFilter, customDate]
  );

  const filteredActiveNote = useMemo(() => {
    if (!activeNote) return null;
    if (!isNoteMatchingDate(activeNote)) return null;
    if (!noteSearchQuery.trim()) return activeNote;
    const q = noteSearchQuery.toLowerCase();
    const matchTitle = activeNote.title?.toLowerCase().includes(q);
    const matchContent =
      activeNote.content_text?.toLowerCase().includes(q) ||
      activeNote.content_html?.toLowerCase().includes(q);
    return matchTitle || matchContent ? activeNote : null;
  }, [activeNote, isNoteMatchingDate, noteSearchQuery]);

  const filteredHistoryNotes = useMemo(() => {
    let list = notesList.filter((n) => !n.is_active && isNoteMatchingDate(n));
    if (noteSearchQuery.trim()) {
      const q = noteSearchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content_text?.toLowerCase().includes(q) ||
          n.content_html?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notesList, isNoteMatchingDate, noteSearchQuery]);

  const totalFilteredCount = (filteredActiveNote ? 1 : 0) + filteredHistoryNotes.length;

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
            <p className="text-[10px] text-muted-foreground">Trợ lý AI</p>
          </div>
        </div>
      </div>

      {/* Group Members List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Thành viên nhóm ({members.length})
          </p>
        </div>

        <div className="space-y-1">
          {members.map((member) => {
            const isMe = member.user_id === currentUserId;
            const displayName =
              member.display_name ||
              member.full_name ||
              (member.email ? member.email.split("@")[0] : "Thành viên");
            const roleLabel = member.role_label || "Thành viên";
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0 rounded-lg">
                    <AvatarImage src={member.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="rounded-lg bg-muted text-[11px] font-semibold text-foreground">
                      {initial}
                    </AvatarFallback>
                  </Avatar>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-medium text-foreground">
                        {displayName}
                        {isMe && <span className="ml-1 text-[10px] text-primary">(Bạn)</span>}
                      </p>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{roleLabel}</p>
                  </div>
                </div>

                {/* Permission Badges: StickyNote icon & FileDown icon */}
                <div className="flex shrink-0 items-center gap-1">
                  {Boolean(member.can_create_note || member.can_pin_knowledge) && (
                    <span
                      title="Có quyền quản lý & tạo ghi chú"
                      className="rounded-md bg-amber-500/10 p-1 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                    >
                      <StickyNote className="h-3 w-3" />
                    </span>
                  )}
                  {Boolean(member.can_export_report || member.canExportReport) && (
                    <span
                      title="Có quyền xuất báo cáo"
                      className="rounded-md bg-blue-500/10 p-1 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                    >
                      <FileDown className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bot Report Section */}
      {canExportReport && onExportReportClick && (
        <div className="space-y-1.5 pt-1">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Báo cáo
          </p>

          <button
            type="button"
            onClick={() => {
              if (onOpenChange) onOpenChange(false);
              onExportReportClick();
            }}
            className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-card p-2.5 text-left transition-all hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <FileDown className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium text-foreground">Xuất báo cáo</p>
                </div>
                <p className="truncate text-[10px] text-muted-foreground">
                  Tạo tài liệu tổng hợp bot
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        </div>
      )}
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

        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-sm">
          {/* Header */}
          <SheetHeader className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Thông tin nhóm</SheetTitle>
          </SheetHeader>

          {/* Body Content with Tabs */}
          <div className="flex flex-1 flex-col overflow-hidden px-4 py-3">
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
                  {/* Search & Filter Bar */}
                  <div className="space-y-2 pb-1">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        placeholder="Tìm kiếm ghi chú..."
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                        className="h-8 rounded-xl border-border/60 bg-muted/40 pl-8 pr-7 text-xs transition-colors placeholder:text-muted-foreground/60 focus:bg-background"
                      />
                      {noteSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setNoteSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                          title="Xóa tìm kiếm"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Date Filter Tabs / Pills */}
                    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter("all");
                          setCustomDate(null);
                        }}
                        className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-all duration-150 ${
                          dateFilter === "all"
                            ? "shadow-3xs bg-foreground font-semibold text-background"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter("today");
                          setCustomDate(null);
                        }}
                        className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-all duration-150 ${
                          dateFilter === "today"
                            ? "shadow-3xs bg-foreground font-semibold text-background"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter("7days");
                          setCustomDate(null);
                        }}
                        className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-all duration-150 ${
                          dateFilter === "7days"
                            ? "shadow-3xs bg-foreground font-semibold text-background"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        7 ngày qua
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-all duration-150 ${
                              dateFilter === "custom" && customDate
                                ? "shadow-3xs bg-foreground font-semibold text-background"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <CalendarIcon className="h-3 w-3" />
                            <span>
                              {dateFilter === "custom" && customDate
                                ? customDate.toLocaleDateString("vi-VN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })
                                : "Chọn ngày"}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={customDate || undefined}
                            onSelect={(date) => {
                              if (date) {
                                setCustomDate(date);
                                setDateFilter("custom");
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Empty State when Search / Filter yields 0 results */}
                  {totalFilteredCount === 0 && (noteSearchQuery || dateFilter !== "all") ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                      <StickyNote className="mx-auto mb-1.5 h-6 w-6 opacity-40" />
                      <p>Không tìm thấy ghi chú nào phù hợp.</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNoteSearchQuery("");
                          setDateFilter("all");
                          setCustomDate(null);
                        }}
                        className="mt-2 h-7 text-xs text-primary"
                      >
                        Đặt lại bộ lọc
                      </Button>
                    </div>
                  ) : null}

                  {/* Empty State when whole group has no notes */}
                  {notesList.length === 0 && !activeNote ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                      <StickyNote className="mx-auto mb-1.5 h-7 w-7 opacity-40" />
                      <p>Nhóm chưa có ghi chú nào.</p>
                    </div>
                  ) : null}

                  {/* 1. Active Note Highlight Card */}
                  {filteredActiveNote && (
                    <div
                      className="cursor-pointer rounded-xl border p-3.5 transition-colors duration-150 hover:opacity-95"
                      style={{
                        backgroundColor: primaryColor ? `${primaryColor}0d` : undefined,
                        borderColor: primaryColor ? `${primaryColor}2e` : undefined,
                      }}
                      onClick={() => setSelectedDetailNote(filteredActiveNote)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: primaryColor ? `${primaryColor}18` : undefined,
                              color: primaryColor || undefined,
                            }}
                          >
                            <Pin className="h-3 w-3" />
                            Đang ghim
                          </span>
                        </div>

                        {canCreateNote && onUnpinNoteClick && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-black/5 hover:opacity-90 active:scale-95 dark:hover:bg-white/10"
                              style={{ color: primaryColor }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnpinNoteClick(filteredActiveNote);
                              }}
                              title="Bỏ ghim khỏi banner"
                            >
                              <PinOff className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Prominent Title with break-all to prevent overflow */}
                      <h4 className="mb-1.5 line-clamp-2 min-w-0 break-all text-xs font-bold leading-snug text-foreground">
                        {filteredActiveNote.title}
                      </h4>

                      {/* Content Preview (Markdown formatted with line clamp and word break) */}
                      <div
                        className="prose-xs prose line-clamp-2 max-w-none break-all text-[11px] leading-relaxed text-muted-foreground/90 dark:prose-invert [&_li]:my-0 [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:my-0"
                        dangerouslySetInnerHTML={{
                          __html:
                            filteredActiveNote.content_html &&
                            !filteredActiveNote.content_html.includes("**") &&
                            (filteredActiveNote.content_html.includes("<p>") ||
                              filteredActiveNote.content_html.includes("<div>") ||
                              filteredActiveNote.content_html.includes("<ul"))
                              ? filteredActiveNote.content_html
                              : parseMarkdown(
                                  filteredActiveNote.content_text ||
                                    filteredActiveNote.content_html ||
                                    "",
                                  primaryColor
                                ),
                        }}
                      />

                      {/* Bottom Row: Timestamp with hour */}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(
                            filteredActiveNote.updated_at || filteredActiveNote.created_at
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
                  {filteredHistoryNotes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Lịch sử ghi chú nhóm
                      </p>

                      {filteredHistoryNotes.map((n) => (
                        <div
                          key={n.id}
                          className="cursor-pointer space-y-2 rounded-xl border border-border/60 bg-card p-3 transition-colors duration-150 hover:border-border hover:bg-card/90"
                          onClick={() => setSelectedDetailNote(n)}
                        >
                          {/* Top Row: Title with Icon & Pin Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-start gap-1.5">
                              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                              <h5 className="line-clamp-2 min-w-0 break-all text-xs font-semibold text-foreground">
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

                          {/* Content Preview (Markdown formatted with line clamp and word break) */}
                          <div
                            className="prose-xs prose line-clamp-2 max-w-none break-all text-[11px] leading-relaxed text-muted-foreground dark:prose-invert [&_li]:my-0 [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:my-0"
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
                              {new Date(n.updated_at || n.created_at).toLocaleDateString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Load More Button */}
                  {hasMoreNotes && !noteSearchQuery && dateFilter === "all" && (
                    <div className="pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full gap-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground transition-all duration-150 hover:border-border hover:bg-muted/60 hover:text-foreground active:scale-[0.99]"
                        onClick={() => {
                          void onLoadMoreNotes();
                        }}
                        disabled={isLoadingNotes}
                      >
                        {isLoadingNotes ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Đang tải thêm...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            <span>Xem thêm ghi chú</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 outline-none">
                {renderMembersContent()}
              </div>
            )}
          </div>

          {/* Footer: Leave Group Button */}
          <div className="flex shrink-0 items-center justify-end border-t border-border/60 bg-muted/20 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLeaving}
              className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium text-destructive transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-50"
              onClick={() => setLeaveConfirmOpen(true)}
              title="Rời khỏi nhóm chat"
            >
              <LogOut className="h-3.5 w-3.5" />
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
