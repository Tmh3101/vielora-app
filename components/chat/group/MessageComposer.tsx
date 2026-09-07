"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Send, Bot, Reply, X, Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { VOICE_RECORDING_DURATION } from "@/config/voice-chat";
import { GroupMessageRow } from "@/lib/services/group-chat.service";
import { GroupMember } from "@/hooks/useGroupChat";
import { useToast } from "@/hooks/use-toast";
import { transcribeVoiceAudioApi } from "@/lib/services/widget.service";
import { EGroupSenderType } from "@/types";

import { MAX_GROUP_CHAT_INPUT } from "@/config/rag";
import { ELanguage } from "@/types/enums";
import { getWidgetTranslations } from "@/lib/i18n/widget-translations";

interface MessageComposerProps {
  botId?: string;
  userId?: string;
  onSend: (
    content: string,
    options?: { replyToId?: string; shouldBotReply?: boolean }
  ) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
  primaryColor?: string;
  isVoiceEnabled?: boolean;
  replyingToMessage?: GroupMessageRow | null;
  members?: GroupMember[];
  onCancelReply?: () => void;
  isBotOutOfCredits?: boolean;
  locale?: ELanguage | string;
}

export function MessageComposer({
  botId,
  userId,
  onSend,
  isSending = false,
  disabled = false,
  primaryColor = "#047857",
  isVoiceEnabled = true,
  replyingToMessage = null,
  members = [],
  onCancelReply,
  isBotOutOfCredits = false,
  locale = ELanguage.Vi,
}: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [shouldBotReply, setShouldBotReply] = useState(true);
  const [isSttLoading, setIsSttLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const t = getWidgetTranslations(locale);

  const {
    isRecording,
    audioBlob,
    recordingSeconds,
    error: recordError,
    startRecording,
    stopRecording,
  } = useAudioRecorder(VOICE_RECORDING_DURATION);

  useEffect(() => {
    if (recordError) {
      toast({
        title: t.deviceError,
        description: recordError,
        variant: "destructive",
      });
    }
  }, [recordError, toast, t.deviceError]);

  const processedAudioBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    const handleSendAudio = async (blob: Blob) => {
      setIsSttLoading(true);
      try {
        const data = await transcribeVoiceAudioApi({
          blob,
          botId,
          userId,
          isStandaloneChat: true,
        });

        if (data.success && data.text) {
          const recognizedText = data.text.trim();
          if (recognizedText) {
            setContent("");
            const replyToId = replyingToMessage?.id;
            if (onCancelReply) onCancelReply();

            // Automatically send message immediately matching StandaloneChatUI flow
            await onSend(recognizedText, { replyToId, shouldBotReply });
          }
        } else {
          throw new Error(data.message || t.voiceRecognitionFallback);
        }
      } catch (err: unknown) {
        console.error("STT error:", err);
        toast({
          title: t.voiceRecognitionError,
          description: err instanceof Error ? err.message : t.voiceRecognitionFallback,
          variant: "destructive",
        });
      } finally {
        setIsSttLoading(false);
      }
    };

    if (audioBlob && audioBlob !== processedAudioBlobRef.current) {
      processedAudioBlobRef.current = audioBlob;
      void handleSendAudio(audioBlob);
    }
  }, [
    audioBlob,
    botId,
    userId,
    replyingToMessage,
    shouldBotReply,
    onSend,
    onCancelReply,
    toast,
    t.voiceRecognitionError,
    t.voiceRecognitionFallback,
  ]);

  // Determine sender name for replyingToMessage
  const replyingToSenderMember =
    replyingToMessage && replyingToMessage.sender_type !== EGroupSenderType.Bot
      ? members.find((m) => m.user_id === replyingToMessage.sender_id)
      : undefined;
  const replyingToSenderName = replyingToMessage
    ? replyingToMessage.sender_type === EGroupSenderType.Bot
      ? "AI Assistant"
      : replyingToSenderMember?.user?.display_name ||
        replyingToSenderMember?.user?.full_name ||
        replyingToSenderMember?.role_label ||
        replyingToSenderMember?.user?.email ||
        "Thành viên"
    : "";

  const handleSend = async () => {
    if (!content.trim() || isSending || disabled || isSttLoading) return;
    const textToSend = content;
    setContent("");
    const replyToId = replyingToMessage?.id;

    if (onCancelReply) onCancelReply();

    // Focus input field immediately
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      await onSend(textToSend, { replyToId, shouldBotReply });
    } catch (err) {
      console.error("Failed to send:", err);
      setContent(textToSend);
    } finally {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background/95 p-3 backdrop-blur">
      <div className="mx-auto max-w-3xl space-y-2">
        {/* Replying banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 truncate text-muted-foreground">
              <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {t.replyingTo} <strong>{replyingToSenderName}</strong>: &quot;
                {replyingToMessage.content}&quot;
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 rounded-full"
              onClick={onCancelReply}
              title={t.cancelReply}
              aria-label={t.cancelReply}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Single Row Layout: [ AI Reply Toggle ] [ Input Field ] [ Voice Button ] [ Send Button ] */}
        <div className="flex items-center gap-2">
          {/* Bot Reply Toggle Button at the very beginning of the row */}
          <button
            type="button"
            onClick={() => {
              if (isBotOutOfCredits) {
                toast({
                  title: t.outOfCredits,
                  description: t.botCreditWarning,
                  variant: "destructive",
                });
                return;
              }
              setShouldBotReply(!shouldBotReply);
            }}
            className={`shadow-2xs flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all active:scale-95 ${
              isBotOutOfCredits
                ? "border border-rose-200 bg-rose-50/80 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-400"
                : shouldBotReply
                  ? "border bg-primary/10 text-primary"
                  : "border border-border bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
            style={
              !isBotOutOfCredits && shouldBotReply
                ? {
                    borderColor: `${primaryColor}40`,
                    color: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                  }
                : {}
            }
            title={
              isBotOutOfCredits
                ? t.outOfCredits
                : shouldBotReply
                  ? t.disableAiReply
                  : t.enableAiReply
            }
          >
            <Bot className="h-4 w-4 shrink-0" />
          </button>

          {isRecording ? (
            <>
              {/* Recording indicator bar */}
              <div
                className="shadow-xs flex h-10 flex-1 items-center gap-3 rounded-full border bg-white px-3.5 dark:bg-slate-900"
                style={{ borderColor: `${primaryColor}40` }}
              >
                <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span
                    className="absolute h-3 w-3 animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="relative h-2 w-2 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                {/* Dynamic Soundwave Waveform Bars */}
                <div className="flex flex-1 items-center gap-1 overflow-hidden px-1">
                  <span
                    className="h-3 w-0.5 animate-[bounce_1s_infinite_100ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-5 w-0.5 animate-[bounce_1s_infinite_200ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-3 w-0.5 animate-[bounce_1s_infinite_300ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-6 w-0.5 animate-[bounce_1s_infinite_400ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-4 w-0.5 animate-[bounce_1s_infinite_150ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-5.5 w-0.5 animate-[bounce_1s_infinite_250ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-3.5 w-0.5 animate-[bounce_1s_infinite_350ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-5 w-0.5 animate-[bounce_1s_infinite_450ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: primaryColor }}
                >
                  {recordingSeconds}s
                </span>
              </div>

              <Button
                type="button"
                onClick={stopRecording}
                style={{ backgroundColor: primaryColor }}
                className="shadow-xs flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-white"
                title={t.stopRecording}
                aria-label={t.stopRecording}
              >
                <Square className="h-4 w-4 fill-white text-white" />
              </Button>
            </>
          ) : (
            <>
              <Input
                ref={inputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isSttLoading ? t.listening : t.messageComposerPlaceholder}
                disabled={disabled || isSending || isSttLoading}
                maxLength={MAX_GROUP_CHAT_INPUT}
                className="flex-1 rounded-full border-border bg-slate-50 text-sm focus-visible:ring-primary dark:bg-slate-900"
              />

              {/* Voice record button if voice is enabled */}
              {isVoiceEnabled && (
                <Button
                  type="button"
                  onClick={startRecording}
                  disabled={disabled || isSending || isSttLoading}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  title={t.sendVoice}
                  aria-label={t.sendVoice}
                >
                  {isSttLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button
                onClick={handleSend}
                disabled={!content.trim() || isSending || disabled || isSttLoading}
                size="icon"
                style={{ backgroundColor: primaryColor }}
                className="shadow-xs h-10 w-10 shrink-0 rounded-full text-white hover:opacity-90"
                title={t.sendMessage}
                aria-label={t.sendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
