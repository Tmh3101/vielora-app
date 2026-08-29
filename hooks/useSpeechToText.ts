"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";

interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
}

// Global declaration for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

// Error constants for Web Speech API SpeechRecognition
export const SPEECH_ERROR_NOT_ALLOWED = "not-allowed" as const;
export const SPEECH_ERROR_SERVICE_NOT_ALLOWED = "service-not-allowed" as const;
export const SPEECH_ERROR_NO_SPEECH = "no-speech" as const;
export const SPEECH_ERROR_NETWORK = "network" as const;
export const SPEECH_ERROR_AUDIO_CAPTURE = "audio-capture" as const;
export const SPEECH_ERROR_ABORTED = "aborted" as const;
export const SPEECH_ERROR_LANGUAGE_NOT_SUPPORTED = "language-not-supported" as const;

export enum ESpeechRecognitionError {
  NotAllowed = "not-allowed",
  ServiceNotAllowed = "service-not-allowed",
  NoSpeech = "no-speech",
  Network = "network",
  AudioCapture = "audio-capture",
  Aborted = "aborted",
  LanguageNotSupported = "language-not-supported",
}

export const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  [SPEECH_ERROR_NOT_ALLOWED]: "Vui lòng cấp quyền truy cập Microphone trong trình duyệt.",
  [SPEECH_ERROR_SERVICE_NOT_ALLOWED]: "Vui lòng cấp quyền truy cập Microphone trong trình duyệt.",
  [SPEECH_ERROR_NO_SPEECH]: "Không phát hiện thấy âm thanh. Vui lòng thử lại.",
  [SPEECH_ERROR_NETWORK]: "Lỗi kết nối mạng khi xử lý giọng nói.",
  [SPEECH_ERROR_AUDIO_CAPTURE]: "Không thể ghi âm từ Microphone. Vui lòng kiểm tra thiết bị.",
  [SPEECH_ERROR_LANGUAGE_NOT_SUPPORTED]: "Ngôn ngữ không được hỗ trợ nhận diện giọng nói.",
  DEFAULT: "Lỗi khi nhận diện giọng nói.",
};

const emptySubscribe = () => () => {};
const checkSpeechSupport = () =>
  typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
const getServerSnapshot = () => false;

export function useSpeechToText({
  lang = "vi-VN",
  continuous = false,
  interimResults = true,
  onTranscript,
  onError,
}: UseSpeechToTextOptions = {}) {
  const isSupported = useSyncExternalStore(emptySubscribe, checkSpeechSupport, getServerSnapshot);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      const msg = "Trình duyệt của bạn không hỗ trợ nhận diện giọng nói trực tiếp.";
      setError(msg);
      onError?.(msg);
      return;
    }

    try {
      // Abort any existing session
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentTranscript = "";
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          currentTranscript += result[0].transcript;
          if (result.isFinal) {
            isFinal = true;
          }
        }

        const trimmed = currentTranscript.trim();
        if (trimmed) {
          setTranscript(trimmed);
          onTranscript?.(trimmed, isFinal);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const msg = SPEECH_ERROR_MESSAGES[event.error] || SPEECH_ERROR_MESSAGES.DEFAULT;
        setError(msg);
        setIsListening(false);
        onError?.(msg);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[useSpeechToText] Failed to start recognition:", err);
      const msg = err instanceof Error ? err.message : "Không thể khởi động Microphone.";
      setError(msg);
      setIsListening(false);
      onError?.(msg);
    }
  }, [lang, continuous, interimResults, onTranscript, onError]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
