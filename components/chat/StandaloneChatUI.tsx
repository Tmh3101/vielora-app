"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot } from "lucide-react";
import type { PublicBotData } from "@/lib/services/bot.service";
import type { Json } from "@/lib/supabase/types";
import { parseMarkdown, getUserMessageTextColor } from "@/lib/helpers/chat-helpers";
import type { Message as ApiMessage, InitResponse } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isHistory?: boolean;
}

interface WidgetSettings {
  primaryColor?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  chatBackgroundType?: "solid" | "gradient" | "image";
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
}

// FingerprintJS types
declare global {
  interface Window {
    FingerprintJS?: {
      load: () => Promise<{
        get: () => Promise<{ visitorId: string }>;
      }>;
    };
  }
}

export function StandaloneChatUI({ bot }: { bot: PublicBotData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);

  // Bot state and settings
  const [isAvailable, setIsAvailable] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [suggestedQuestionsShown, setSuggestedQuestionsShown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const widgetSettings = (bot.widget_settings as Json as WidgetSettings | null) || {};
  const primaryColor = widgetSettings?.primaryColor || "#3B82F6";
  const welcomeMessage = widgetSettings?.welcomeMessage || "Hello! How can I help you?";

  const bgType = widgetSettings?.chatBackgroundType || "solid";
  const bgValue = widgetSettings?.chatBackgroundValue || "#ffffff";
  const bgOpacity = (widgetSettings?.chatBackgroundOpacity || 100) / 100;

  const getBackgroundStyle = () => {
    if (bgType === "solid") {
      try {
        const hex = bgValue;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgOpacity})` };
      } catch {
        return { backgroundColor: `rgba(255, 255, 255, ${bgOpacity})` };
      }
    } else if (bgType === "gradient") {
      return {
        background: bgValue,
        backgroundColor: `rgba(255, 255, 255, ${1 - bgOpacity})`,
        backgroundBlendMode: "lighten" as const,
        backgroundSize: "cover",
      };
    } else if (bgType === "image" && bgValue?.startsWith("http")) {
      return {
        backgroundImage: `url("${bgValue}")`,
        backgroundColor: `rgba(255, 255, 255, ${1 - bgOpacity})`,
        backgroundBlendMode: "lighten" as const,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return { backgroundColor: `rgba(255, 255, 255, ${bgOpacity})` };
  };

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

        if (response.status === 429) {
          setRateLimitExceeded(true);
          setMessages([{ role: "assistant", content: "Bạn đã hết lượt chat miễn phí hôm nay." }]);
          return;
        }

        const data: InitResponse = await response.json();

        if (data.success && data.data) {
          const settings = data.data.settings;
          setIsAvailable(data.data.isAvailable);
          setStatusMessage(data.data.statusMessage);
          setQuotaExceeded(data.data.quotaExceeded);
          setSuggestedQuestions(settings?.suggestedQuestions || []);

          if (data.data.conversationId) {
            setConversationId(data.data.conversationId);
            if (data.data.messages && data.data.messages.length > 0) {
              setMessages(
                data.data.messages.map((msg: ApiMessage) => ({
                  role: (msg.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
                  content: msg.content,
                  isHistory: true,
                }))
              );
            } else {
              setMessages([
                { role: "assistant", content: settings?.welcomeMessage || welcomeMessage },
              ]);
            }
          } else {
            setMessages([
              { role: "assistant", content: settings?.welcomeMessage || welcomeMessage },
            ]);
          }
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Failed to initialize bot:", error);
        setMessages([{ role: "assistant", content: welcomeMessage }]);
      }
    };

    void initBot();
  }, [visitorId, bot.id, welcomeMessage, isInitialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();

    const messageToSend = (overrideInput || input).trim();
    if (!messageToSend || isLoading || !visitorId) return;

    if (messageToSend.length > 200) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Tin nhắn quá dài (tối đa 200 ký tự). Vui lòng rút gọn nội dung.",
        },
      ]);
      return;
    }

    if (quotaExceeded) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hệ thống đang bảo trì. Vui lòng quay lại sau." },
      ]);
      return;
    }

    if (rateLimitExceeded) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Bạn đã hết lượt chat miễn phí hôm nay." },
      ]);
      return;
    }

    if (!isAvailable) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: statusMessage || "Bot chưa sẵn sàng. Vui lòng đợi trong giây lát.",
        },
      ]);
      return;
    }

    setInput("");
    setSuggestedQuestionsShown(true);
    setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
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

      if (response.status === 429) {
        setRateLimitExceeded(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Bạn đã hết lượt chat miễn phí trong ngày." },
        ]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.data.message || "Sorry, something went wrong." },
        ]);
        if (data.data.conversationId) setConversationId(data.data.conversationId);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "Sorry, something went wrong." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Markdown Link Styles */}
      <style jsx>{`
        .chatbot-message-content a {
          color: ${primaryColor} !important;
          text-decoration: underline;
          text-underline-offset: 2px;
          font-weight: 500;
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
        className="flex items-center gap-3 px-6 py-4 shadow-sm"
        style={{
          backgroundColor: primaryColor,
          color: getUserMessageTextColor(primaryColor),
        }}
      >
        <Avatar className="h-10 w-10 rounded-2xl border-2 border-white/30 shadow-sm transition-shadow">
          <AvatarImage src={bot.avatar_url || undefined} alt={bot.name} className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-white/10 text-white">
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{bot.name}</h1>
          <p className="text-sm opacity-90">
            {isAvailable ? "Luôn sẵn sàng hỗ trợ" : statusMessage || "Chưa sẵn sàng"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6" style={getBackgroundStyle()}>
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              {msg.isHistory && idx === 0 && (
                <div className="flex items-center gap-4 py-4 opacity-50">
                  <div className="h-px flex-1 bg-slate-300" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    Lịch sử trò chuyện
                  </span>
                  <div className="h-px flex-1 bg-slate-300" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: idx === messages.length - 1 ? 0.1 : 0,
                }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm bg-muted"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          backgroundColor: primaryColor,
                          color: getUserMessageTextColor(primaryColor),
                        }
                      : {}
                  }
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="chatbot-message-content whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                    />
                  ) : (
                    <p className="whitespace-pre-line">{msg.content}</p>
                  )}
                </div>
              </motion.div>
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {!suggestedQuestionsShown && suggestedQuestions.length > 0 && isAvailable && (
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
      <div className="border-t bg-white px-4 py-2">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAvailable ? "Type your message..." : "Bot chưa sẵn sàng"}
            disabled={isLoading || !isAvailable}
            maxLength={200}
            className="flex-1 rounded-2xl"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim() || !isAvailable}
            className="rounded-full shadow-sm transition-shadow hover:shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="h-4 w-4" />
          </Button>
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
