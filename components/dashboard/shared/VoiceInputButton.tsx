"use client";

import { useState, useEffect, useRef } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { KNOWLEDGE_VOICE_RECORDING_DURATION } from "@/config/knowledge-voice";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, Square, Loader2, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export interface VoiceInputButtonProps {
  scope: "bot" | "workspace";
  targetId: string;
  onTranscript: (text: string, title?: string) => void;
  disabled?: boolean;
  isPaidPlan?: boolean;
  className?: string;
}

function AudioWaveVisualizer({
  isRecording,
  isProcessing,
}: {
  isRecording: boolean;
  isProcessing: boolean;
}) {
  // 14 clean wave bars for a sleek minimalist sound wave
  const bars = [
    { delay: "0.0s", duration: "1.1s", baseHeight: "35%" },
    { delay: "0.2s", duration: "0.9s", baseHeight: "65%" },
    { delay: "0.4s", duration: "1.3s", baseHeight: "45%" },
    { delay: "0.1s", duration: "1.0s", baseHeight: "85%" },
    { delay: "0.3s", duration: "1.2s", baseHeight: "55%" },
    { delay: "0.5s", duration: "0.85s", baseHeight: "95%" },
    { delay: "0.25s", duration: "1.4s", baseHeight: "70%" },
    { delay: "0.15s", duration: "0.95s", baseHeight: "90%" },
    { delay: "0.35s", duration: "1.25s", baseHeight: "60%" },
    { delay: "0.05s", duration: "1.05s", baseHeight: "75%" },
    { delay: "0.45s", duration: "1.35s", baseHeight: "40%" },
    { delay: "0.2s", duration: "0.8s", baseHeight: "70%" },
    { delay: "0.1s", duration: "1.15s", baseHeight: "55%" },
    { delay: "0.3s", duration: "1.0s", baseHeight: "80%" },
  ];

  return (
    <div className="my-5 flex h-16 items-center justify-center gap-1.5 px-4">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${
            isProcessing
              ? "animate-pulse bg-primary/40"
              : isRecording
                ? "animate-sound-wave bg-primary"
                : "bg-muted-foreground/30"
          }`}
          style={{
            height: isRecording ? undefined : bar.baseHeight,
            animationDelay: isRecording ? bar.delay : undefined,
            animationDuration: isRecording ? bar.duration : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceInputButton({
  scope,
  targetId,
  onTranscript,
  disabled = false,
  isPaidPlan = true,
  className = "",
}: VoiceInputButtonProps) {
  const t = useTranslations("dashboard.shared.voiceInput");
  const [isProcessing, setIsProcessing] = useState(false);
  const onTranscriptRef = useRef(onTranscript);
  const processedBlobRef = useRef<Blob | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const {
    isRecording,
    audioBlob,
    recordingSeconds,
    error: recorderError,
    startRecording,
    stopRecording,
  } = useAudioRecorder(KNOWLEDGE_VOICE_RECORDING_DURATION);

  // Handle recorder error
  useEffect(() => {
    if (recorderError) {
      toast.error(recorderError);
    }
  }, [recorderError]);

  // When recording finishes and audioBlob is generated, upload to STT API
  useEffect(() => {
    if (audioBlob && !isRecording && !isProcessing && processedBlobRef.current !== audioBlob) {
      processedBlobRef.current = audioBlob;

      // If user explicitly cancelled recording, skip audio processing
      if (isCancelledRef.current) {
        isCancelledRef.current = false;
        return;
      }

      const processAudio = async () => {
        setIsProcessing(true);
        const formData = new FormData();
        const extension = audioBlob.type.includes("webm")
          ? "webm"
          : audioBlob.type.includes("ogg")
            ? "ogg"
            : "wav";
        const file = new File([audioBlob], `voice-input.${extension}`, { type: audioBlob.type });

        formData.append("file", file);
        formData.append("scope", scope);
        formData.append("id", targetId);

        try {
          const res = await fetch("/api/dashboard/stt", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            toast.error(data.message || t("error"));
          } else if (data.text) {
            toast.success(t("success"));
            onTranscriptRef.current(data.text, data.title);
          }
        } catch (err) {
          console.error("Lỗi gửi voice STT:", err);
          toast.error(t("error"));
        } finally {
          setIsProcessing(false);
        }
      };

      void processAudio();
    }
  }, [audioBlob, isRecording, isProcessing, scope, targetId, t]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = () => {
    isCancelledRef.current = false;
    processedBlobRef.current = null;
    void startRecording();
  };

  const handleCancelRecording = () => {
    isCancelledRef.current = true;
    stopRecording();
  };

  return (
    <>
      {/* 1. Main Circular Mic Button Trigger */}
      {!isPaidPlan ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                className={`h-8 w-8 rounded-full border-dashed border-amber-300 bg-amber-50/50 p-0 text-amber-700 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400 ${className}`}
              >
                <Lock className="h-3.5 w-3.5 text-amber-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              {t("tooltipFree")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled || isRecording || isProcessing}
                onClick={handleStartRecording}
                className={`h-8 w-8 rounded-full border border-primary/30 p-0 text-primary transition-colors duration-200 hover:border-primary hover:bg-white ${className}`}
              >
                <Mic className="h-4 w-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs font-medium">
              {t("tooltipReady")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* 2. Minimalist & Clean Full-Modal Voice Overlay */}
      {(isRecording || isProcessing) && (
        <div className="animate-scale-in bg-background/98 absolute inset-0 z-50 flex flex-col items-center justify-between overflow-hidden rounded-xl border border-border p-6 shadow-xl backdrop-blur-md">
          {/* Top Header */}
          <div className="flex w-full items-center justify-between border-b border-border/40 pb-3">
            {isRecording && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCancelRecording}
                className="h-7 w-7 rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("cancel")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Centerpiece: Clean Microphone & Sound Wave */}
          <div className="my-auto flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <div className="absolute h-20 w-20 animate-ping rounded-full border border-primary/20 opacity-30" />
              )}
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Mic className="h-6 w-6 text-primary" />
              </div>
            </div>

            {/* Audio Wave Visualizer */}
            <AudioWaveVisualizer isRecording={isRecording} isProcessing={isProcessing} />

            {/* Timer & Instructions */}
            {isRecording ? (
              <div className="space-y-1">
                <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                  {formatTime(recordingSeconds)}
                </div>
                <p className="text-xs text-muted-foreground">{t("recording")}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("processing")}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Controls */}
          {isRecording && (
            <div className="flex w-full items-center justify-center gap-3 border-t border-border/40 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelRecording}
                className="h-8 rounded-lg text-xs transition-colors duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                {t("cancel")}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={stopRecording}
                className="h-8 gap-1.5 text-xs"
              >
                <Square className="h-3 w-3 fill-current" />
                {t("stop")}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
