"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, ListOrdered, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GROUP_CHAT_CONFIG } from "@/config/group-chat";
import type { GroupNoteRow } from "@/types/group-chat";
import { VoiceInputButton } from "@/components/dashboard/shared/VoiceInputButton";
import { ELanguage } from "@/types/enums";
import { getWidgetTranslations } from "@/lib/i18n/widget-translations";

export interface NoteEditorModalProps {
  botId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "create" | "edit";
  existingNote?: GroupNoteRow | null;
  onSubmit?: (payload: {
    title: string;
    contentHtml: string;
    contentText: string;
  }) => Promise<void> | void;
  primaryColor?: string;
  isSubmitting?: boolean;
  isPaidPlan?: boolean;

  // Aliases for compatibility
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (payload: {
    title: string;
    content_html: string;
    content_text: string;
  }) => Promise<void> | void;
  initialNote?: GroupNoteRow | null;
  isSaving?: boolean;
  locale?: ELanguage | string;
}

function NoteEditorModalInner({
  botId,
  open,
  onOpenChange,
  mode,
  existingNote,
  onSubmit,
  primaryColor = "#047857",
  isSubmitting = false,
  isPaidPlan = true,
  isOpen: legacyIsOpen,
  onClose,
  onSave,
  initialNote,
  isSaving: legacyIsSaving,
  locale = ELanguage.Vi,
}: NoteEditorModalProps) {
  const t = getWidgetTranslations(locale);
  const note = existingNote || initialNote;
  const isEditing = mode ? mode === "edit" : Boolean(note);
  const isPending = isSubmitting || legacyIsSaving || false;
  const showModal = open ?? legacyIsOpen ?? false;

  const [title, setTitle] = useState(note?.title || "");
  const [contentLength, setContentLength] = useState(0);
  const [isFormatting, setIsFormatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    unorderedList: false,
    orderedList: false,
  });
  const editorRef = useRef<HTMLDivElement>(null);

  const updateActiveFormats = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // Ignore queryCommandState errors in unsupported environments
    }
  }, []);

  const updateContentLength = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || editorRef.current.textContent || "";
      setContentLength(text.trim().length);
    }
  }, []);

  // Hydrate editor DOM content reliably when note changes or modal opens
  useEffect(() => {
    if (showModal) {
      const htmlContent = note?.content_html || note?.content_text || "";

      const setContent = () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlContent;
          updateActiveFormats();
          updateContentLength();
        }
      };

      setContent();
      const timer = setTimeout(setContent, 50);
      return () => clearTimeout(timer);
    }
  }, [note, showModal, updateActiveFormats, updateContentLength]);

  // Format commands for simple rich text editor
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    updateContentLength();
  };

  // Keyboard shortcut & list break handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Shortcuts: Ctrl+B / Cmd+B (Bold), Ctrl+I / Cmd+I (Italic)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        applyFormat("bold");
        return;
      }
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        applyFormat("italic");
        return;
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        applyFormat("underline");
        return;
      }
    }

    // 2. Break list on Enter or Backspace in an empty list item (<li></li> or <li><br></li>)
    if ((e.key === "Enter" && !e.shiftKey) || e.key === "Backspace") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const anchorNode = selection.anchorNode;
        const li =
          anchorNode?.nodeType === Node.ELEMENT_NODE
            ? (anchorNode as Element).closest("li")
            : anchorNode?.parentElement?.closest("li");

        if (li) {
          const isLiEmpty =
            !li.textContent ||
            li.textContent.trim() === "" ||
            li.innerHTML === "<br>" ||
            li.innerHTML === "";

          if (isLiEmpty) {
            e.preventDefault();
            const list = li.closest("ul, ol");
            if (list) {
              // Create a standard paragraph after the list
              const p = document.createElement("p");
              p.innerHTML = "<br>";
              list.parentNode?.insertBefore(p, list.nextSibling);

              // Remove the empty list item
              li.remove();
              if (list.children.length === 0) {
                list.remove();
              }

              // Position cursor inside the new paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              updateActiveFormats();
              updateContentLength();
              return;
            }
          }
        }
      }
    }
  };

  const setContentHtml = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      updateActiveFormats();
      updateContentLength();
    }
  };

  const handleVoiceTranscript = async (rawText: string, suggestedTitle?: string) => {
    if (!rawText) return;

    if (suggestedTitle && !title.trim()) {
      setTitle(suggestedTitle);
    }

    setIsFormatting(true);
    try {
      const res = await fetch("/api/dashboard/voice-note-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        if (data.title && !title.trim()) {
          setTitle(data.title);
        }
        if (data.contentHtml) {
          const currentHtml = editorRef.current?.innerHTML?.trim() || "";
          const isEditorEmpty = !editorRef.current?.textContent?.trim();
          if (isEditorEmpty || !currentHtml || currentHtml === "<p><br></p>") {
            setContentHtml(data.contentHtml);
          } else {
            setContentHtml(`${currentHtml}<p><br></p>${data.contentHtml}`);
          }
          toast.success("Đã ghi chú và định dạng bằng giọng nói.");
        }
      } else {
        // Fallback: direct text append
        const currentHtml = editorRef.current?.innerHTML?.trim() || "";
        const isEditorEmpty = !editorRef.current?.textContent?.trim();
        const safeHtml = `<p>${rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
        if (isEditorEmpty || !currentHtml || currentHtml === "<p><br></p>") {
          setContentHtml(safeHtml);
        } else {
          setContentHtml(`${currentHtml}<p><br></p>${safeHtml}`);
        }
        toast.success("Đã nhận diện giọng nói thành công.");
      }
    } catch (err) {
      console.error("Voice note format error:", err);
      const currentHtml = editorRef.current?.innerHTML?.trim() || "";
      const isEditorEmpty = !editorRef.current?.textContent?.trim();
      const safeHtml = `<p>${rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      if (isEditorEmpty || !currentHtml || currentHtml === "<p><br></p>") {
        setContentHtml(safeHtml);
      } else {
        setContentHtml(`${currentHtml}<p><br></p>${safeHtml}`);
      }
      toast.success(t.voiceRecognitionSuccess);
    } finally {
      setIsFormatting(false);
      updateContentLength();
    }
  };

  const handleModalClose = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen && onClose) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const editor = editorRef.current || document.getElementById("note-rich-editor");
    const rawHtml = editor ? editor.innerHTML : "";
    const rawText = editor ? editor.innerText || editor.textContent || "" : "";

    if (!title.trim()) {
      setError(t.noteTitleRequired);
      return;
    }

    if (!rawText.trim()) {
      setError(t.noteContentRequired);
      return;
    }

    if (title.length > GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH) {
      setError(
        t.noteTitleTooLong.replace("{max}", String(GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH))
      );
      return;
    }

    if (rawText.length > GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH) {
      setError(
        t.noteContentTooLong.replace("{max}", String(GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH))
      );
      return;
    }

    setError(null);

    if (onSubmit) {
      await onSubmit({
        title: title.trim(),
        contentHtml: rawHtml,
        contentText: rawText.trim(),
      });
    } else if (onSave) {
      await onSave({
        title: title.trim(),
        content_html: rawHtml,
        content_text: rawText.trim(),
      });
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={handleModalClose}>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span>{isEditing ? t.editNoteTitle : t.createNoteTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-foreground">
                {t.noteTitle} <span className="font-normal text-destructive">*</span>
              </label>
              <span
                className={cn(
                  "text-[10px]",
                  title.length >= GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {title.length}/{GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH}
              </span>
            </div>
            <Input
              value={title}
              onChange={(e) => {
                if (e.target.value.length <= GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH) {
                  setTitle(e.target.value);
                }
              }}
              placeholder={t.noteTitlePlaceholder}
              maxLength={GROUP_CHAT_CONFIG.MAX_NOTE_TITLE_LENGTH}
              required
              className="text-xs"
            />
          </div>

          {/* Rich Text Editor Toolbar & Container */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {t.noteContent} <span className="font-normal text-destructive">*</span>
              </label>
              {botId && (
                <VoiceInputButton
                  scope="bot"
                  targetId={botId}
                  isPaidPlan={isPaidPlan}
                  disabled={isPending || isFormatting}
                  onTranscript={(text, suggestedTitle) =>
                    void handleVoiceTranscript(text, suggestedTitle)
                  }
                />
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border/80 bg-background transition-colors focus-within:border-primary">
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b border-border/60 bg-muted/30 px-2 py-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    activeFormats.bold && "shadow-2xs bg-muted font-semibold text-foreground"
                  )}
                  onClick={() => applyFormat("bold")}
                  title="In đậm (Ctrl+B)"
                  aria-label="In đậm"
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    activeFormats.italic && "shadow-2xs bg-muted font-semibold text-foreground"
                  )}
                  onClick={() => applyFormat("italic")}
                  title="In nghiêng (Ctrl+I)"
                  aria-label="In nghiêng"
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <div className="mx-1 h-3.5 w-px bg-border/60" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    activeFormats.unorderedList &&
                      "shadow-2xs bg-muted font-semibold text-foreground"
                  )}
                  onClick={() => applyFormat("insertUnorderedList")}
                  title="Danh sách dấu chấm"
                  aria-label="Danh sách dấu chấm"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    activeFormats.orderedList && "shadow-2xs bg-muted font-semibold text-foreground"
                  )}
                  onClick={() => applyFormat("insertOrderedList")}
                  title="Danh sách số thứ tự"
                  aria-label="Danh sách số thứ tự"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                id="note-rich-editor"
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  updateActiveFormats();
                  updateContentLength();
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={() => {
                  updateActiveFormats();
                  updateContentLength();
                }}
                onPaste={() => {
                  setTimeout(() => {
                    updateActiveFormats();
                    updateContentLength();
                  }, 0);
                }}
                onCut={() => {
                  setTimeout(() => {
                    updateActiveFormats();
                    updateContentLength();
                  }, 0);
                }}
                onMouseUp={updateActiveFormats}
                onSelect={updateActiveFormats}
                onClick={updateActiveFormats}
                className="prose-xs prose max-h-[260px] min-h-[140px] overflow-y-auto p-3 text-xs leading-relaxed outline-none dark:prose-invert [&_h1]:my-1.5 [&_h1]:text-sm [&_h1]:font-bold [&_h2]:my-1 [&_h2]:text-xs [&_h2]:font-bold [&_h3]:my-1 [&_h3]:text-xs [&_h3]:font-semibold [&_ol]:my-1 [&_p]:my-1 [&_ul]:my-1"
                data-placeholder={t.noteContentPlaceholder}
              />
            </div>

            {/* Content Helper Text & Character Limit */}
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[11px] text-muted-foreground">
                {isFormatting ? (
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.noteAiFormatting}
                  </span>
                ) : (
                  t.noteFormatHelp
                )}
              </p>
              <p
                className={cn(
                  "text-[10px] transition-colors",
                  contentLength >= GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {contentLength}/{GROUP_CHAT_CONFIG.MAX_NOTE_CONTENT_LENGTH}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleModalClose(false)}
              disabled={isPending}
              className="text-xs transition-colors duration-200 hover:border-red-600 hover:bg-white hover:text-red-600 dark:hover:border-red-500 dark:hover:bg-background dark:hover:text-red-400"
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || isFormatting}
              className="gap-1.5 text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{isEditing ? t.saveChanges : t.createAndPin}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NoteEditorModal(props: NoteEditorModalProps) {
  const show = props.open ?? props.isOpen ?? false;
  if (!show) return null;
  const noteId = props.existingNote?.id || props.initialNote?.id || "new";
  const noteUpdated = props.existingNote?.updated_at || props.initialNote?.updated_at || "";
  const key = `${noteId}-${props.mode || "create"}-${noteUpdated}`;
  return <NoteEditorModalInner key={key} {...props} />;
}
