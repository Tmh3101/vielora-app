"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileText,
  Pin,
  Trash2,
  Search,
  X,
  Loader2,
  Clock,
  User,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchGroupNotesForBotApi, deleteNoteApi } from "@/lib/api/group-chat";
import type { GroupNoteRow } from "@/types/group-chat";
import { useToast } from "@/hooks/use-toast";
import { NoteDetailModal } from "@/components/chat/group/NoteDetailModal";
import { parseMarkdown } from "@/lib/helpers/chat-helpers";

interface GroupNotesListProps {
  botId: string;
  primaryColor?: string;
}

export function GroupNotesList({ botId, primaryColor }: GroupNotesListProps) {
  const [notes, setNotes] = useState<GroupNoteRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetailNote, setSelectedDetailNote] = useState<GroupNoteRow | null>(null);
  const [deletingNote, setDeletingNote] = useState<GroupNoteRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchGroupNotesForBotApi(botId);
      setNotes(data);
    } catch (err) {
      console.error("Error loading bot group notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const activeNote = useMemo(() => notes.find((n) => n.is_active) || null, [notes]);

  const handleDeleteConfirm = async () => {
    if (!deletingNote) return;
    try {
      setIsDeleting(true);
      await deleteNoteApi(deletingNote.group_id, deletingNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
      if (selectedDetailNote?.id === deletingNote.id) {
        setSelectedDetailNote(null);
      }
      toast({
        title: "Đã xóa ghi chú",
        description: "Ghi chú và vector RAG liên quan đã được xóa khỏi hệ thống.",
      });
      setDeletingNote(null);
    } catch (err) {
      console.error("Error deleting note:", err);
      toast({
        title: "Lỗi",
        description: "Không thể xóa ghi chú này.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title?.toLowerCase().includes(q) ||
        note.content_text?.toLowerCase().includes(q) ||
        note.creator?.display_name?.toLowerCase().includes(q) ||
        note.creator?.full_name?.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Đang tải danh sách ghi chú & tri thức nhóm...</span>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6 opacity-80" />
        </div>
        <p className="text-sm font-semibold text-foreground">Chưa có ghi chú nào</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
          Các ghi chú do thành viên tạo hoặc tin nhắn được ghim từ cuộc trò chuyện sẽ tự động xuất
          hiện ở đây và được nạp vào cơ sở tri thức RAG của bot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar & Counter Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề, nội dung ghi chú hoặc người tạo..."
            className="h-9 rounded-xl bg-background/50 pl-9 pr-8 text-xs focus-visible:bg-background"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge
            variant="outline"
            className="shadow-3xs h-7 shrink-0 rounded-lg border-primary/25 bg-primary/10 px-3 text-xs font-medium text-primary"
          >
            {searchQuery
              ? `${filteredNotes.length} / ${notes.length} ghi chú`
              : `${notes.length} ghi chú`}
          </Badge>
        </div>
      </div>

      {/* Notes List Container */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
          <p>Không tìm thấy ghi chú nào khớp với từ khóa &quot;{searchQuery}&quot;</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-2 h-7 text-xs text-primary"
          >
            Xóa bộ lọc tìm kiếm
          </Button>
        </div>
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {filteredNotes.map((note) => {
            const isNoteActive = note.is_active;
            const authorName =
              note.creator?.display_name ||
              note.creator?.full_name ||
              note.creator?.email?.split("@")[0] ||
              "Thành viên";
            const isFromMessage = Boolean(note.source_message_id);

            const formattedDate = new Date(note.updated_at || note.created_at).toLocaleDateString(
              "vi-VN",
              {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            );

            return (
              <div
                key={note.id}
                className={`shadow-3xs group relative flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-150 sm:flex-row sm:items-start ${
                  isNoteActive
                    ? "border-amber-500/40 bg-amber-500/5 dark:border-amber-900/50 dark:bg-amber-950/20"
                    : "border-border/60 bg-card/70 hover:border-border hover:bg-card"
                }`}
              >
                {/* Left Side: Note Content Preview */}
                <div
                  className="min-w-0 flex-1 cursor-pointer space-y-2"
                  onClick={() => setSelectedDetailNote(note)}
                >
                  {/* Badges & Meta row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isNoteActive && (
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        style={{
                          backgroundColor: primaryColor ? `${primaryColor}18` : undefined,
                          color: primaryColor || undefined,
                        }}
                      >
                        <Pin className="h-3 w-3" />
                        Đang ghim
                      </span>
                    )}

                    {isFromMessage ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:border-sky-500/35 dark:bg-sky-950/40 dark:text-sky-400">
                        <MessageSquare className="h-3 w-3" />
                        Từ tin nhắn
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-400/25 bg-slate-500/10 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-slate-500/30 dark:bg-slate-800/60 dark:text-slate-300">
                        <FileText className="h-3 w-3" />
                        Tạo thủ công
                      </span>
                    )}
                  </div>

                  {/* Note Title */}
                  <h4 className="break-words text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {note.title}
                  </h4>

                  {/* Note Content Excerpt (Markdown formatted with line clamp) */}
                  <div
                    className="prose-xs prose line-clamp-2 max-w-none text-xs leading-relaxed text-muted-foreground/90 dark:prose-invert [&_li]:my-0 [&_p]:my-0 [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_ul]:my-0"
                    dangerouslySetInnerHTML={{
                      __html:
                        note.content_html &&
                        !note.content_html.includes("**") &&
                        (note.content_html.includes("<p>") ||
                          note.content_html.includes("<div>") ||
                          note.content_html.includes("<ul"))
                          ? note.content_html
                          : parseMarkdown(
                              note.content_text || note.content_html || "",
                              primaryColor
                            ),
                    }}
                  />

                  {/* Footer info: Creator & Time */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground/75">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{authorName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Quick Action Toolbar */}
                <div className="flex shrink-0 items-center gap-1 border-t border-border/40 pt-2 sm:border-t-0 sm:pt-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={() => setSelectedDetailNote(note)}
                    title="Xem chi tiết ghi chú"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-muted-foreground opacity-70 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                    onClick={() => setDeletingNote(note)}
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedDetailNote && (
        <NoteDetailModal
          note={selectedDetailNote}
          isOpen={Boolean(selectedDetailNote)}
          onClose={() => setSelectedDetailNote(null)}
          activeNoteId={activeNote?.id}
          canManageNote={false}
          primaryColor={primaryColor}
          onDelete={(n) => {
            setDeletingNote(n);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingNote)}
        onOpenChange={(open) => {
          if (!open) setDeletingNote(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Xóa ghi chú nhóm
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
              Bạn có chắc chắn muốn xóa ghi chú &quot;
              <strong className="text-foreground">{deletingNote?.title}</strong>&quot;? Hành động
              này sẽ đồng thời xóa dữ liệu vector RAG của ghi chú khỏi bộ não bot và không thể hoàn
              tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setDeletingNote(null)}
              disabled={isDeleting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
