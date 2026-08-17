"use client";

import { useState, useEffect, useRef } from "react";
import { Pin, PinOff, ChevronDown, ChevronUp, Edit3, Trash2, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GroupNoteRow } from "@/types/group-chat";
import { parseMarkdown } from "@/lib/helpers/chat-helpers";

export interface NoteBannerProps {
  note: GroupNoteRow | null;
  canManageNote?: boolean;
  primaryColor?: string;
  onEdit?: (note: GroupNoteRow) => void;
  onUnpin?: (note: GroupNoteRow) => void;
  onDelete?: (note: GroupNoteRow) => void;
  onOpenNotesDrawer?: () => void;
  onToggleCollapse?: (noteId: string, collapsed: boolean) => void;
}

export function NoteBanner({
  note,
  canManageNote = false,
  primaryColor = "#047857",
  onEdit,
  onUnpin,
  onDelete,
  // onOpenNotesDrawer,
  onToggleCollapse,
}: NoteBannerProps) {
  const [localCollapsed, setLocalCollapsed] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = localCollapsed !== null ? !localCollapsed : !note?.collapsed;

  const handleToggle = () => {
    if (!note) return;
    const nextState = !isExpanded;
    setLocalCollapsed(!nextState);
    if (onToggleCollapse) {
      onToggleCollapse(note.id, !nextState);
    }
  };

  // Close floating popover when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setLocalCollapsed(true);
        if (note && onToggleCollapse) {
          onToggleCollapse(note.id, true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, note, onToggleCollapse]);

  if (!note || !note.is_active) {
    return null;
  }

  const formattedDate = new Date(note.updated_at || note.created_at).toLocaleDateString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="z-20 w-full px-4 sm:px-6" ref={containerRef}>
      <div className="relative mx-auto max-w-3xl">
        {/* Pinned Note Banner Bar (Seamlessly attached under header with rounded-b-2xl corners) */}
        <div
          className="shadow-xs relative flex items-center justify-between gap-3 rounded-b-2xl border-x border-b border-t-0 bg-background/95 px-4 py-2 backdrop-blur-md transition-all duration-200"
          style={{
            backgroundColor: primaryColor ? `${primaryColor}0d` : undefined,
            borderColor: primaryColor ? `${primaryColor}28` : undefined,
          }}
        >
          {/* Title & Pin Icon Trigger */}
          <div
            className="group/toggle -mx-1.5 -my-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-black/5 active:scale-[0.99] dark:hover:bg-white/5"
            onClick={handleToggle}
            role="button"
            tabIndex={0}
            title={isExpanded ? "Thu gọn ghi chú" : "Xem chi tiết ghi chú nổi"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            <div
              className="h-6.5 w-6.5 shadow-3xs flex shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover/toggle:scale-105"
              style={{
                backgroundColor: primaryColor ? `${primaryColor}1a` : undefined,
                color: primaryColor || undefined,
              }}
            >
              <Pin className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-xs font-semibold text-foreground transition-colors group-hover/toggle:text-primary">
                  {note.title}
                </h4>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-1">
            {canManageNote && onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-black/5 hover:opacity-90 active:scale-95 dark:hover:bg-white/10"
                style={{ color: primaryColor }}
                onClick={() => onEdit(note)}
                title="Sửa ghi chú"
                aria-label="Sửa ghi chú"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}

            {canManageNote && onUnpin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-black/5 hover:opacity-90 active:scale-95 dark:hover:bg-white/10"
                style={{ color: primaryColor }}
                onClick={() => onUnpin(note)}
                title="Bỏ ghim khỏi banner"
                aria-label="Bỏ ghim khỏi banner"
              >
                <PinOff className="h-3.5 w-3.5" />
              </Button>
            )}

            {canManageNote && !onUnpin && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-rose-600 transition-all duration-150 hover:bg-rose-500/10 hover:text-rose-700 active:scale-95 dark:text-rose-400 dark:hover:bg-rose-950/50"
                onClick={() => onDelete(note)}
                title="Xóa ghi chú"
                aria-label="Xóa ghi chú"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-black/5 hover:opacity-90 active:scale-95 dark:hover:bg-white/10"
              style={{ color: primaryColor }}
              onClick={handleToggle}
              title={isExpanded ? "Đóng ghi chú" : "Xem chi tiết"}
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Floating Note Dropdown Popover */}
        {isExpanded && (
          <>
            {/* Backdrop click-to-dismiss */}
            <div
              className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] dark:bg-black/20"
              onClick={handleToggle}
              aria-hidden="true"
            />

            {/* Floating Card Overlay */}
            <div
              className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
              style={{
                borderColor: primaryColor ? `${primaryColor}35` : undefined,
                boxShadow:
                  "0 20px 35px -5px rgba(0, 0, 0, 0.15), 0 8px 15px -4px rgba(0, 0, 0, 0.08)",
              }}
            >
              {/* Floating Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4 pb-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: primaryColor ? `${primaryColor}18` : undefined,
                        color: primaryColor || undefined,
                      }}
                    >
                      <Pin className="h-3 w-3" />
                      Đang ghim
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <h3 className="break-words text-sm font-bold leading-snug text-foreground sm:text-base">
                    {note.title}
                  </h3>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
                  onClick={handleToggle}
                  title="Đóng ghi chú nổi"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Floating Card Body */}
              <div className="max-h-[50vh] overflow-y-auto p-4 sm:p-5">
                <div
                  className="prose-xs prose max-w-none break-words text-xs leading-relaxed text-foreground dark:prose-invert [&_h1]:my-1.5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:my-1 [&_h2]:text-xs [&_h2]:font-bold [&_h3]:my-1 [&_h3]:text-xs [&_h3]:font-semibold [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1"
                  dangerouslySetInnerHTML={{
                    __html:
                      note.content_html &&
                      (note.content_html.includes("<p>") ||
                        note.content_html.includes("<div>") ||
                        note.content_html.includes("<ul")) &&
                      !note.content_html.includes("**") &&
                      !note.content_html.includes("- ")
                        ? note.content_html
                        : parseMarkdown(note.content_text || note.content_html || "", primaryColor),
                  }}
                />
              </div>

              {/* Floating Card Footer Actions */}
              <div className="flex items-center justify-end border-t border-border/60 bg-muted/20 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  {canManageNote && onUnpin && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shadow-3xs h-7 gap-1 rounded-lg border border-border/80 px-2.5 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:border-foreground/30 hover:bg-muted/80 hover:text-foreground active:scale-95"
                      onClick={() => {
                        handleToggle();
                        onUnpin(note);
                      }}
                    >
                      <PinOff className="h-3 w-3" />
                      <span>Bỏ ghim</span>
                    </Button>
                  )}

                  {canManageNote && onEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shadow-3xs h-7 gap-1 rounded-lg border border-border/80 bg-background px-2.5 text-[11px] font-medium text-foreground transition-all duration-150 hover:border-foreground/30 hover:bg-muted/60 hover:text-black active:scale-95"
                      onClick={() => {
                        handleToggle();
                        onEdit(note);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Chỉnh sửa</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="shadow-xs h-7 rounded-lg px-3 text-[11px] font-medium text-white transition-all duration-150 hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleToggle}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
