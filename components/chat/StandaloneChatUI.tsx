"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Share2, Copy, Check, QrCode, Mic, Square } from "lucide-react";
import type { PublicBotData } from "@/lib/services/bot.service";
import type { WidgetSettings } from "@/types/widget-api";
import {
  parseMarkdown,
  getUserMessageTextColor,
  getBackgroundStyle,
  getRateLimitMessage,
  getChatBlockedData,
} from "@/lib/helpers";
import type { Message as ApiMessage, InitResponse } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CHATBOT_UNAVAILABLE_MESSAGE,
  INSUFFICIENT_CREDITS_ERROR_CODE,
  INSUFFICIENT_CREDITS_MESSAGE,
  ChatResponseType,
} from "@/lib/constants/chat";
import { MAX_CHAT_INPUT } from "@/config/rag";
import { BOT_RATE_LIMIT_ERROR_CODES } from "@/lib/bot-rate-limit";
import type { BotRateLimitErrorCode } from "@/lib/bot-rate-limit";
import { EMessageRole, EWidgetBackgroundType } from "@/types/enums";
import type { ChatResponse, ChatMessage, ChatData } from "@/types/widget-api";
import { getWidgetTranslations } from "@/lib/i18n/widget-translations";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineMessageQueue } from "@/hooks/useOfflineMessageQueue";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { OfflineBanner } from "@/components/chat/OfflineBanner";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VOICE_RECORDING_DURATION } from "@/config/voice-chat";
import { ChatTabSwitcher } from "@/components/chat/ChatTabSwitcher";
import { getLastTabPreference } from "@/lib/helpers/group-tab-preference";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getBotGroupChatPath } from "@/lib/utils/standalone-chat-url";
import { useIOSAuthSync } from "@/hooks/public-bot/useIOSAuthSync";

const LeadForm = dynamic(() => import("@/components/chat/LeadForm").then((mod) => mod.LeadForm), {
  ssr: false,
});
const StandaloneChatPageQRCode = dynamic(
  () =>
    import("@/components/dashboard/StandaloneChatPageQRCode").then(
      (mod) => mod.StandaloneChatPageQRCode
    ),
  { ssr: false }
);

const PWAInstallRoot = dynamic(
  () => import("./pwa-install/PWAInstallRoot").then((mod) => mod.PWAInstallRoot),
  { ssr: false }
);
const PWAInstallHeaderButton = dynamic(
  () => import("./pwa-install/PWAInstallHeaderButton").then((mod) => mod.PWAInstallHeaderButton),
  { ssr: false }
);

declare global {
  interface Window {
    FingerprintJS?: {
      load: () => Promise<{
        get: () => Promise<{ visitorId: string }>;
      }>;
    };
  }
}

export function StandaloneChatUI({
  bot,
  isMobile = false,
  pwaVersion = "1",
  planCode,
}: {
  bot: PublicBotData;
  isMobile?: boolean;
  pwaVersion?: string;
  planCode?: string | null;
}) {
  useIOSAuthSync();
  const widgetSettings = bot.widget_settings as unknown as WidgetSettings | null;
  const locale = widgetSettings?.ui_language || "vi";
  const t = getWidgetTranslations(locale);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const prevIsLoadingRef = useRef(isLoading);

  const [isAvailable, setIsAvailable] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [insufficientCreditsMessage, setInsufficientCreditsMessage] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [suggestedQuestionsShown, setSuggestedQuestionsShown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadFormQuestion, setLeadFormQuestion] = useState("");
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const { queueMessage } = useOfflineMessageQueue();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const effectivePlan = (planCode || subscriptionPlan || "free").toString().toLowerCase();
  const isProOrEnterprise = effectivePlan === "pro" || effectivePlan === "enterprise";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);

      // Check last tab preference and redirect to group if user is a member (Only Pro/Enterprise)
      if (isProOrEnterprise && bot.id && bot.slug) {
        const pref = getLastTabPreference(bot.id);
        if (pref === "group") {
          const checkAndRedirect = async () => {
            try {
              const supabase = createBrowserSupabaseClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (user) {
                const res = await fetch(`/api/bots/${bot.id}/group`);
                if (res.ok) {
                  const json = await res.json();
                  if (
                    json.success &&
                    json.data?.members?.some((m: { user_id: string }) => m.user_id === user.id)
                  ) {
                    window.location.replace(getBotGroupChatPath(bot.slug));
                  }
                }
              }
            } catch (err) {
              console.error("Error during last-tab redirect:", err);
            }
          };
          checkAndRedirect();
        }
      }
    }
  }, [bot.id, bot.slug, isProOrEnterprise]);

  // Tích hợp nút Micro kế bên nút Gửi (Send) trong form input chat
  const {
    isRecording,
    audioBlob,
    recordingSeconds,
    error: recordError,
    startRecording,
    stopRecording,
  } = useAudioRecorder(VOICE_RECORDING_DURATION);
  const [isSttLoading, setIsSttLoading] = useState(false);

  // Hiển thị thông báo khi có lỗi cấp quyền micro
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
  const conversationIdRef = useRef<string | null>(conversationId);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Gửi Audio lên API ngay khi dừng ghi âm sinh ra blob
  useEffect(() => {
    const handleSendAudio = async (blob: Blob) => {
      setIsSttLoading(true);

      // Show a processing indicator in the chat (animated mic, no text)
      const tempMessageId = `temp_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempMessageId,
          role: EMessageRole.User,
          content: "",
          isProcessing: true,
        },
      ]);

      try {
        const formData = new FormData();
        formData.append("file", blob, "voice.webm");

        // Bước 1: Gửi file audio lên API dịch thuật
        const res = await fetch("/api/widget/voice", {
          method: "POST",
          headers: {
            "x-bot-id": bot.id,
            "x-visitor-id": visitorId || "",
            "x-standalone-chat": "true",
          },
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.text) {
          // Replace the processing indicator with the actual transcript + voice flag
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempMessageId
                ? { ...msg, content: data.text, isVoice: true, isProcessing: false }
                : msg
            )
          );

          // Bước 2: Tự động gọi API Chat để gửi văn bản này đi liền lập tức, tạo cảm giác mượt mà không có điểm dừng khựng
          setIsLoading(true);
          const chatRes = await fetch("/api/widget/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-bot-id": bot.id,
              "x-visitor-id": visitorId || "",
              "x-standalone-chat": "true",
            },
            body: JSON.stringify({
              botId: bot.id,
              message: data.text,
              conversationId: conversationIdRef.current,
              visitorId,
            }),
          });

          const chatData = await chatRes.json();
          if (chatData.success && chatData.data) {
            setMessages((prev) => [
              ...prev,
              {
                role: EMessageRole.Assistant,
                content: chatData.data.message || "Sorry, something went wrong.",
              },
            ]);
            if (chatData.data.conversationId) setConversationId(chatData.data.conversationId);
          }
        } else {
          throw new Error(data.message || t.voiceRecognitionFallback);
        }
      } catch (err: unknown) {
        console.error("Lỗi chuyển dịch giọng nói:", err);
        // Remove the processing indicator on error
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
        toast({
          title: t.voiceRecognitionError,
          description: err instanceof Error ? err.message : t.voiceRecognitionFallback,
          variant: "destructive",
        });
      } finally {
        setIsSttLoading(false);
        setIsLoading(false);
      }
    };

    if (audioBlob && audioBlob !== processedAudioBlobRef.current) {
      processedAudioBlobRef.current = audioBlob;
      void handleSendAudio(audioBlob);
    }
  }, [audioBlob, bot.id, visitorId, toast, t.voiceRecognitionError, t.voiceRecognitionFallback]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        textArea.remove();
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      }
      setCopied(true);
      toast({
        title: t.linkCopied,
        description: t.linkCopiedDesc,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast({
        title: t.copyFailed,
        description: t.copyFailedDesc,
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // silent fail
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const primaryColor = widgetSettings?.primaryColor || "#3B82F6";
  const welcomeMessage = widgetSettings?.welcomeMessage || t.welcome;
  const bgType = widgetSettings?.chatBackgroundType || EWidgetBackgroundType.Solid;
  const bgValue = widgetSettings?.chatBackgroundValue || "#ffffff";
  const bgOpacity = (widgetSettings?.chatBackgroundOpacity || 100) / 100;
  const isVoiceEnabled = widgetSettings?.isVoiceEnabled !== false;
  const { blockedChatMessage, isChatBlocked: baseChatBlocked } = getChatBlockedData(
    insufficientCredits,
    rateLimitExceeded,
    insufficientCreditsMessage,
    rateLimitMessage,
    bot.name
  );
  const isChatBlocked = baseChatBlocked || quotaExceeded || !isAvailable;
  const headerTextColor = getUserMessageTextColor(primaryColor);

  // Focus ô input sau khi chatbot trả lời xong
  useEffect(() => {
    if (
      prevIsLoadingRef.current &&
      !isLoading &&
      !isChatBlocked &&
      !showLeadForm &&
      !isSttLoading
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, isChatBlocked, showLeadForm, isSttLoading]);

  const shareDialog = (
    <Dialog
      open={isShareOpen}
      onOpenChange={(open) => {
        setIsShareOpen(open);
        if (!open) {
          setShowQr(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl text-current transition-colors hover:bg-white/10"
          aria-label={t.shareChat}
          title={t.shareChat}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[92vw] max-w-[400px] overflow-y-auto rounded-2xl border-none bg-white p-4 shadow-xl sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold text-slate-900 sm:text-xl">
            {t.shareChat}
          </DialogTitle>
          <p className="text-xs text-slate-500 sm:text-sm">
            {t.shareBotWithCustomers.replace("{name}", bot.name)}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          {/* Option 1: Copy Link */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              {t.copyLink}
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="rounded-xl border-slate-200 bg-slate-50 text-xs text-slate-800 focus-visible:ring-1 focus-visible:ring-slate-300 sm:text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="icon"
                onClick={handleCopy}
                variant="outline"
                className="shrink-0 rounded-xl border-slate-200 text-slate-600 transition-colors hover:border-[var(--primary-color)] hover:bg-white hover:text-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor } as React.CSSProperties}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Option 2: QR Code */}
          {!showQr ? (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setShowQr(true)}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border-slate-200 text-xs font-medium text-slate-700 transition-colors hover:border-[var(--primary-color)] hover:bg-white hover:text-[var(--primary-color)]"
                style={{ "--primary-color": primaryColor } as React.CSSProperties}
              >
                <QrCode className="h-3 w-3" />
                {t.createQrCode}
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center border-t border-slate-100 pt-4">
              <StandaloneChatPageQRCode
                url={shareUrl}
                avatarUrl={bot.avatar_url}
                botName={bot.name}
              />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-slate-400 hover:bg-transparent hover:text-slate-600"
                onClick={() => setShowQr(false)}
              >
                {t.hideQrCode}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const headerInfo = (
    <>
      <Avatar className="h-10 w-10 shrink-0 rounded-2xl border-2 border-white/30 shadow-sm transition-shadow">
        <AvatarImage src={bot.avatar_url || undefined} alt={bot.name} className="object-cover" />
        <AvatarFallback className="rounded-2xl bg-white/10 text-white">
          <Bot className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-lg font-semibold leading-tight">{bot.name}</h1>
          {isProOrEnterprise && bot.slug && (
            <ChatTabSwitcher
              botId={bot.id}
              botSlug={bot.slug}
              activeTab="chat"
              className="h-5.5 w-5.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95"
            />
          )}
        </div>
        <p className="truncate text-sm opacity-90">
          {insufficientCredits
            ? t.outOfCredits
            : isAvailable
              ? t.alwaysAvailable
              : statusMessage || t.notReady}
        </p>
      </div>
    </>
  );

  // Load FingerprintJS
  const loadFingerprintJS = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js";
      script.async = true;

      script.onload = () => {
        if (window.FingerprintJS) {
          window.FingerprintJS.load()
            .then((fp) => fp.get())
            .then((result) => resolve(result.visitorId))
            .catch(() => resolve(null));
        } else {
          resolve(null);
        }
      };

      script.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 5000);
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const initVisitorId = async () => {
      const stored = localStorage.getItem("vielora_visitor_id");
      if (stored) {
        setVisitorId(stored);
        return;
      }

      try {
        const fpId = await loadFingerprintJS();
        if (fpId) {
          const id = `fp_${fpId}`;
          localStorage.setItem("vielora_visitor_id", id);
          setVisitorId(id);
          return;
        }
      } catch {
        console.log("FingerprintJS fallback");
      }

      const id = `visitor_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
      localStorage.setItem("vielora_visitor_id", id);
      setVisitorId(id);
    };

    void initVisitorId();
  }, []);

  useEffect(() => {
    if (!visitorId || isInitialized) return;

    const initBot = async () => {
      try {
        const response = await fetch("/api/widget/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-bot-id": bot.id,
            "x-visitor-id": visitorId,
            "x-standalone-chat": "true",
          },
          body: JSON.stringify({ botId: bot.id, visitorId }),
        });

        const data: InitResponse = await response.json();

        const rateLimitMessCreated = getRateLimitMessage(
          bot.name || "Bot",
          data.data?.errorCode as BotRateLimitErrorCode,
          data.message
        );

        if (response.status === 429) {
          setRateLimitExceeded(true);
          setRateLimitMessage(rateLimitMessCreated);
          setSuggestedQuestionsShown(true);
          setSuggestedQuestions([]);
          setMessages([
            {
              role: EMessageRole.Assistant,
              content: rateLimitMessCreated,
            },
          ]);
          setIsInitialized(true);
          return;
        }

        if (data.success && data.data) {
          const settings = data.data.settings;
          setIsAvailable(data.data.isAvailable);
          setStatusMessage(data.data.statusMessage);
          setQuotaExceeded(data.data.quotaExceeded);
          setRateLimitExceeded(Boolean(data.data.rateLimitExceeded));
          setRateLimitMessage(data.data?.errorCode ? rateLimitMessCreated : null);
          setSuggestedQuestions(settings?.suggestedQuestions || []);
          if (settings?.subscriptionPlan) {
            setSubscriptionPlan(settings.subscriptionPlan);
          }
          if (data.data.rateLimitExceeded) {
            setSuggestedQuestionsShown(true);
          }

          if (data.data.conversationId) {
            setConversationId(data.data.conversationId);
            if (data.data.messages && data.data.messages.length > 0) {
              setMessages(
                data.data.messages.map((msg: ApiMessage) => ({
                  role: msg.role,
                  content: msg.content,
                  isHistory: true,
                }))
              );
            } else {
              setMessages([
                {
                  role: EMessageRole.Assistant,
                  content: data.data.rateLimitMessage || settings?.welcomeMessage || welcomeMessage,
                },
              ]);
            }
          } else {
            setMessages([
              {
                role: EMessageRole.Assistant,
                content: data.data.rateLimitMessage || settings?.welcomeMessage || welcomeMessage,
              },
            ]);
          }
          setIsInitialized(true);
        } else {
          const message =
            response.status === 404 ? CHATBOT_UNAVAILABLE_MESSAGE : data.message || welcomeMessage;
          setIsAvailable(false);
          setStatusMessage(message);
          setMessages([{ role: EMessageRole.Assistant, content: message }]);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Failed to initialize bot:", error);
        setMessages([{ role: EMessageRole.Assistant, content: welcomeMessage }]);
      }
    };

    void initBot();
  }, [visitorId, bot.id, bot.name, welcomeMessage, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLeadFormSuccess = useCallback(() => {
    setShowLeadForm(false);
    setLeadFormQuestion("");
  }, []);

  const appendAssistantMessage = (content: string) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === EMessageRole.Assistant && lastMessage.content === content) {
        return prev;
      }

      return [...prev, { role: EMessageRole.Assistant, content }];
    });
  };

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();

    const messageToSend = (overrideInput || input).trim();
    if (!messageToSend || isLoading || !visitorId) return;

    if (messageToSend.length > MAX_CHAT_INPUT) {
      appendAssistantMessage(t.messageTooLong.replace("{max}", String(MAX_CHAT_INPUT)));
      return;
    }

    if (quotaExceeded) {
      appendAssistantMessage(t.maintenance);
      return;
    }

    if (rateLimitExceeded) {
      setInput("");
      appendAssistantMessage(
        rateLimitMessage || t.dailyLimitBot.replace("{name}", bot.name || "Bot")
      );
      return;
    }

    if (insufficientCredits) {
      setInput("");
      appendAssistantMessage(insufficientCreditsMessage || INSUFFICIENT_CREDITS_MESSAGE);
      return;
    }

    if (!isAvailable) {
      appendAssistantMessage(statusMessage || `${bot.name} ${t.notReady.toLowerCase()}.`);
      return;
    }

    setInput("");
    setSuggestedQuestionsShown(true);
    setMessages((prev) => [...prev, { role: EMessageRole.User, content: messageToSend }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bot-id": bot.id,
          "x-visitor-id": visitorId,
          "x-standalone-chat": "true",
        },
        body: JSON.stringify({
          botId: bot.id,
          message: messageToSend,
          conversationId,
          visitorId,
        }),
      });

      const data: ChatResponse = await response.json();

      if (response.status === 429) {
        const rateLimitMessCreated = getRateLimitMessage(
          bot.name || "Bot",
          data.code as BotRateLimitErrorCode,
          data.message
        );
        if (data.code !== BOT_RATE_LIMIT_ERROR_CODES.ApiExceeded) {
          setRateLimitExceeded(true);
          setRateLimitMessage(rateLimitMessCreated);
          setSuggestedQuestionsShown(true);
        }
        appendAssistantMessage(rateLimitMessCreated);
        return;
      }

      if (response.status === 402 && data.code === INSUFFICIENT_CREDITS_ERROR_CODE) {
        const creditsMessage = data.message || INSUFFICIENT_CREDITS_MESSAGE;
        setInsufficientCredits(true);
        setInsufficientCreditsMessage(creditsMessage);
        setSuggestedQuestionsShown(true);
        setSuggestedQuestions([]);
        appendAssistantMessage(creditsMessage);
        return;
      }

      if (response.status === 404) {
        window.location.reload();
        return;
      }

      if (data.success && data.data) {
        const chatData = data.data as ChatData;

        if (chatData.type === ChatResponseType.SHOW_LEAD_FORM) {
          setMessages((prev) => [
            ...prev,
            {
              role: EMessageRole.Assistant,
              content: chatData.message || t.error,
            },
          ]);
          setLeadFormQuestion(chatData.originalQuestion || messageToSend);
          setShowLeadForm(true);
          if (chatData.conversationId) setConversationId(chatData.conversationId);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: EMessageRole.Assistant,
            content: chatData.message || t.error,
          },
        ]);
        if (chatData.conversationId) setConversationId(chatData.conversationId);
      } else {
        const message = data.message || t.error;
        appendAssistantMessage(message);
      }
    } catch {
      if (!navigator.onLine) {
        try {
          await queueMessage(
            "/api/widget/chat",
            {
              "Content-Type": "application/json",
              "x-bot-id": bot.id,
              "x-visitor-id": visitorId,
              "x-standalone-chat": "true",
            },
            JSON.stringify({
              botId: bot.id,
              message: messageToSend,
              conversationId,
              visitorId,
            })
          );
          appendAssistantMessage(t.offlineQueued);
        } catch {
          appendAssistantMessage(t.connectionTrouble);
        }
      } else {
        appendAssistantMessage(t.connectionTrouble);
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex h-dvh flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Markdown Link Styles */}
      <style jsx>{`
        .chatbot-message-content a {
          color: ${primaryColor} !important;
          text-decoration: underline;
          text-underline-offset: 2px;
          font-weight: 500;
        }
        .chatbot-message-content ul,
        .chatbot-message-content ol {
          list-style-position: outside;
          padding-left: 20px;
          margin: 6px 0;
        }
        .chatbot-message-content ul {
          list-style-type: disc;
        }
        .chatbot-message-content ol {
          list-style-type: decimal;
        }
        .chatbot-message-content li {
          display: list-item;
          margin-bottom: 3px;
        }
        .chatbot-message-content code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
      `}</style>

      {/* Header */}
      <div
        className="sticky top-0 z-20 shadow-sm"
        style={{ backgroundColor: primaryColor, color: headerTextColor }}
      >
        {isMobile ? (
          <PWAInstallRoot
            appName={bot.name}
            primaryColor={primaryColor}
            headerForeground={headerTextColor}
            pwaVersion={pwaVersion}
          >
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
              {headerInfo}
              <div className="flex items-center gap-2">
                <PWAInstallHeaderButton />
                {shareDialog}
              </div>
            </div>
          </PWAInstallRoot>
        ) : (
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
            {headerInfo}
            <div className="flex items-center gap-2">{shareDialog}</div>
          </div>
        )}
      </div>

      <OfflineBanner isOnline={isOnline} />

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 pb-safe"
        style={getBackgroundStyle(bgType, bgValue, bgOpacity)}
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              {msg.isHistory && idx === 0 && (
                <div className="flex items-center gap-4 py-4 opacity-50">
                  <div className="h-px flex-1 bg-slate-300" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    {t.chatHistory}
                  </span>
                  <div className="h-px flex-1 bg-slate-300" />
                </div>
              )}
              <div className="group relative">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx === messages.length - 1 ? 0.1 : 0,
                  }}
                  className={`flex ${msg.role === EMessageRole.User ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      msg.role === EMessageRole.User ? "rounded-br-sm" : "rounded-bl-sm bg-muted"
                    } ${msg.role === EMessageRole.User && msg.isVoice && !msg.isProcessing ? "relative pr-8" : ""}`}
                    style={
                      msg.role === EMessageRole.User
                        ? {
                            backgroundColor: primaryColor,
                            color: headerTextColor,
                          }
                        : {}
                    }
                  >
                    {msg.role === EMessageRole.Assistant ? (
                      <div
                        className="chatbot-message-content whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: parseMarkdown(msg.content, primaryColor),
                        }}
                      />
                    ) : msg.isProcessing ? (
                      <div className="flex items-center gap-2 px-1 py-1">
                        <Mic className="h-3.5 w-3.5 animate-pulse text-white/90" />
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/80 [animation-delay:0.3s]" />
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line">{msg.content}</p>
                    )}

                    {msg.role === EMessageRole.User && msg.isVoice && !msg.isProcessing && (
                      <span
                        className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-sm"
                        title={t.voiceMessage}
                      >
                        <Mic className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                </motion.div>
                {!msg.isProcessing && (
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(`${idx}`, msg.content)}
                    className={`absolute -bottom-6 z-10 flex items-center rounded-md border border-slate-200 bg-white p-1.5 text-slate-400 opacity-0 shadow-sm transition-all duration-200 hover:text-slate-600 group-hover:opacity-100 ${
                      msg.role === EMessageRole.User ? "right-0" : "left-0"
                    }`}
                    title={t.copyMessage}
                    aria-label={t.copyMessage}
                  >
                    {copiedMessageId === `${idx}` ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 shadow-sm">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full"
                    style={{ backgroundColor: `${primaryColor}60` }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full [animation-delay:0.15s]"
                    style={{ backgroundColor: `${primaryColor}60` }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full [animation-delay:0.3s]"
                    style={{ backgroundColor: `${primaryColor}60` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Lead Form */}
          {showLeadForm && visitorId && conversationId && (
            <LeadForm
              botId={bot.id}
              visitorId={visitorId}
              conversationId={conversationId}
              originalQuestion={leadFormQuestion}
              primaryColor={primaryColor}
              headerTextColor={headerTextColor}
              locale={locale}
              onSuccess={handleLeadFormSuccess}
              onClose={() => setShowLeadForm(false)}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {!suggestedQuestionsShown &&
        suggestedQuestions.length > 0 &&
        isAvailable &&
        !isChatBlocked &&
        isOnline && (
          <div className="bg-background/95 bg-white px-4 py-2">
            <div className="scrollbar-hide mx-auto flex max-w-3xl gap-2 overflow-x-auto">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(undefined, q)}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Input */}
      <div className="relative border-t bg-white px-4 py-2">
        {blockedChatMessage && (rateLimitExceeded || insufficientCredits) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full z-10 px-4">
            <div className="mx-auto max-w-3xl">
              <div
                className={`rounded-t-lg px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm ${
                  insufficientCredits
                    ? "border border-rose-200/70 bg-rose-50 text-rose-900"
                    : "border border-amber-200/70 bg-amber-50 text-amber-900"
                }`}
              >
                {blockedChatMessage}
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className={`mx-auto flex max-w-3xl items-center gap-2 ${!isOnline ? "opacity-60" : ""}`}
        >
          {isRecording ? (
            <>
              {/* Recording indicator bar using primary color & soundwave visualizer */}
              <div
                className="flex h-10 flex-1 items-center gap-3 rounded-2xl border bg-white px-3.5 shadow-sm"
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
                  <span
                    className="h-3 w-0.5 animate-[bounce_1s_infinite_200ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span
                    className="h-4 w-0.5 animate-[bounce_1s_infinite_300ms] rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>

                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: primaryColor }}
                >
                  {recordingSeconds}s
                </span>
              </div>
              <Button
                type="button"
                onClick={stopRecording}
                style={{ backgroundColor: primaryColor }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 shadow-none transition-transform hover:scale-105"
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={insufficientCredits ? t.botOutOfCredits : t.typeMessage}
                disabled={isLoading || isChatBlocked || showLeadForm || isSttLoading}
                maxLength={MAX_CHAT_INPUT}
                className="flex-1 rounded-2xl"
              />
              {isVoiceEnabled &&
                subscriptionPlan !== "free" &&
                isOnline &&
                !isChatBlocked &&
                !input.trim() && (
                  <Button
                    type="button"
                    onClick={startRecording}
                    disabled={isSttLoading || isLoading}
                    title={t.sendVoice}
                    aria-label={t.sendVoice}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 p-0 text-slate-700 shadow-none hover:bg-slate-200"
                  >
                    {isSttLoading ? (
                      <Mic className="h-4 w-4 animate-pulse text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-slate-600" />
                    )}
                  </Button>
                )}
              <Button
                type="submit"
                disabled={
                  isLoading || !input.trim() || isChatBlocked || isRecording || isSttLoading
                }
                title={t.send}
                aria-label={t.send}
                className="flex h-10 w-10 items-center justify-center rounded-full p-0 shadow-sm transition-shadow hover:shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-4 py-2 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href={process.env.NEXT_PUBLIC_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
          style={{ color: primaryColor }}
        >
          Vielora
        </a>
      </div>
    </div>
  );
}
