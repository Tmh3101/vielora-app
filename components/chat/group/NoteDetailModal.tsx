"use client";

import { useMemo, useEffect } from "react";
import { Pin, PinOff, Edit3, Trash2, Clock, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { GroupNoteRow } from "@/types/group-chat";
import { parseMarkdown } from "@/lib/helpers/chat-helpers";

export interface NoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: GroupNoteRow | null;
  activeNoteId?: string | null;
  canManageNote?: boolean;
  primaryColor?: string;
  onPin?: (note: GroupNoteRow) => void;
  onUnpin?: (note: GroupNoteRow) => void;
  onEdit?: (note: GroupNoteRow) => void;
  onDelete?: (note: GroupNoteRow) => void;
}

export function NoteDetailModal({
  isOpen,
  onClose,
  note,
  activeNoteId,
  canManageNote = false,
  primaryColor = "#047857",
  onPin,
  onUnpin,
  onEdit,
  onDelete,
}: NoteDetailModalProps) {
  useEffect(() => {
    if (isOpen && note?.id) {
      try {
        const seenKey = `vielora_note_seen_${note.id}`;
        const currentVal = `${note.id}:${note.title}:${note.content_text?.length || 0}`;
        localStorage.setItem(seenKey, currentVal);
        window.dispatchEvent(new Event("vielora_note_seen_update"));
      } catch {
        // ignore
      }
    }
  }, [isOpen, note?.id, note?.title, note?.content_text]);

  const renderedContent = useMemo(() => {
    if (!note) return "";
    if (
      note.content_html &&
      (note.content_html.includes("<p>") ||
        note.content_html.includes("<div>") ||
        note.content_html.includes("<ul"))
    ) {
      // If it contains markdown syntax like ** inside tags
      if (note.content_html.includes("**") || note.content_html.includes("- ")) {
        return parseMarkdown(note.content_text || note.content_html, primaryColor);
      }
      return note.content_html;
    }
    return parseMarkdown(note.content_text || note.content_html || "", primaryColor);
  }, [note, primaryColor]);

  if (!note) return null;

  const isCurrentlyActive = note.is_active || note.id === activeNoteId;
  const canPinThisNote = canManageNote && !isCurrentlyActive && !activeNoteId && onPin;

  const formattedDate = new Date(note.updated_at || note.created_at).toLocaleDateString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl p-0 sm:max-w-xl">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border/60 bg-muted/20 p-4 pb-3 pr-10 sm:p-5 sm:pb-4 sm:pr-12">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {isCurrentlyActive ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors"
                    style={{
                      backgroundColor: primaryColor ? `${primaryColor}18` : undefined,
                      color: primaryColor || undefined,
                    }}
                  >
                    <Pin className="h-3 w-3" />
                    Đang ghim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <StickyNote className="h-3 w-3" />
                    Lịch sử ghi chú
                  </span>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                  <Clock className="h-3 w-3" />
                  <span>{formattedDate}</span>
                </div>
              </div>
              <DialogTitle className="min-w-0 break-all text-base font-semibold leading-tight text-foreground">
                {note.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="max-h-[55vh] min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <div
            className="prose-xs prose max-w-none break-all text-xs leading-relaxed text-foreground dark:prose-invert [&_code]:break-all [&_h1]:my-1.5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:my-1 [&_h2]:text-xs [&_h2]:font-bold [&_h3]:my-1 [&_h3]:text-xs [&_h3]:font-semibold [&_ol]:my-1.5 [&_p]:my-1.5 [&_pre]:overflow-x-auto [&_ul]:my-1.5"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex flex-row items-center justify-between border-t border-border/60 bg-muted/20 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            {canPinThisNote && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shadow-2xs h-8 gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{
                  color: primaryColor,
                  borderColor: primaryColor ? `${primaryColor}40` : undefined,
                  backgroundColor: primaryColor ? `${primaryColor}0a` : undefined,
                }}
                onClick={() => {
                  onClose();
                  onPin(note);
                }}
              >
                <Pin className="h-3.5 w-3.5" />
                <span>Ghim lại</span>
              </Button>
            )}

            {isCurrentlyActive && canManageNote && onUnpin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shadow-2xs h-8 gap-1.5 rounded-lg border border-border/80 px-3 text-xs font-medium text-muted-foreground transition-all duration-150 hover:border-foreground/30 hover:bg-muted/80 hover:text-foreground active:scale-95"
                onClick={() => {
                  onClose();
                  onUnpin(note);
                }}
              >
                <PinOff className="h-3.5 w-3.5" />
                <span>Bỏ ghim</span>
              </Button>
            )}

            {canManageNote && onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shadow-2xs h-8 gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground transition-all duration-150 hover:border-foreground/30 hover:bg-muted/60 hover:text-black active:scale-95"
                onClick={() => {
                  onClose();
                  onEdit(note);
                }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Chỉnh sửa</span>
              </Button>
            )}
          </div>
          <div>
            {canManageNote && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border border-transparent px-2.5 text-xs font-medium text-rose-500 transition-all duration-150 hover:border-rose-200/70 hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 dark:text-rose-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                onClick={() => {
                  onClose();
                  onDelete(note);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
