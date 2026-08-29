"use client";

import React from "react";
import { Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  lang?: string;
}

export function VoiceInputButton({
  onTranscript,
  disabled = false,
  className = "",
  size = "sm",
  lang = "vi-VN",
}: VoiceInputButtonProps) {
  const { isListening, isSupported, startListening, stopListening } = useSpeechToText({
    lang,
    continuous: false,
    interimResults: true,
    onTranscript,
    onError: (msg) => {
      toast.error(msg);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupported) {
      toast.error(
        "Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech API. Vui lòng sử dụng Chrome, Edge hoặc Safari."
      );
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isSm = size === "sm";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      aria-label={
        isListening
          ? "Đang ghi âm giọng nói. Bấm để dừng"
          : "Bấm để nhập văn bản bằng giọng nói tiếng Việt"
      }
      aria-pressed={isListening}
      title={
        !isSupported
          ? "Trình duyệt không hỗ trợ Web Speech API"
          : isListening
            ? "Đang lắng nghe... Bấm để dừng"
            : "Nhập bằng giọng nói (Tiếng Việt)"
      }
      className={`relative inline-flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSm ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl"
      } ${
        isListening
          ? "bg-rose-500/15 text-rose-600 ring-2 ring-rose-500/50 dark:text-rose-400"
          : isSupported
            ? "border border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary active:scale-95"
            : "cursor-not-allowed border border-border/30 bg-muted/20 text-muted-foreground/40 opacity-60"
      } ${className}`}
    >
      {isListening ? (
        <div className="flex items-center justify-center gap-0.5">
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-rose-500" />
          <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-rose-500 [animation-delay:150ms]" />
          <span className="h-2 w-0.5 animate-pulse rounded-full bg-rose-500 [animation-delay:300ms]" />
        </div>
      ) : isSupported ? (
        <Mic className={isSm ? "h-4 w-4" : "h-4.5 w-4.5"} />
      ) : (
        <MicOff className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
    </button>
  );
}
