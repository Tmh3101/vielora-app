"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { MAX_CHAT_INPUT } from "@/config/rag";

interface Message {
  id: number;
  role: "user" | "bot";
  content: string;
}

// API message format (matching widget.js)
interface APIMessage {
  role: "user" | "assistant" | "bot";
  content: string;
}

// API configuration
const DEMO_BOT_ID = process.env.NEXT_PUBLIC_DEMO_BOT_ID;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL;

// Bot settings interface
interface BotSettings {
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
}

interface BotInfo {
  botName: string;
  avatarUrl: string | null;
  settings: BotSettings;
  isReady: boolean;
  previousMessages?: APIMessage[];
  conversationId?: string;
}

// Generate visitor ID (simplified version of widget.js logic)
const generateVisitorId = (): string => {
  const stored = localStorage.getItem("vielora_visitor_id");
  if (stored) return stored;

  const id = "demo_visitor_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  localStorage.setItem("vielora_visitor_id", id);
  return id;
};

const getFallbackSetting = (): BotSettings => ({
  primaryColor: "#3B82F6",
  textColor: "#1f2937",
  position: "bottom-right",
  welcomeMessage: "Xin chào! Tôi là AI Assistant với dữ liệu thật. Hãy hỏi tôi bất cứ điều gì!",
});

const getFallbackBotInfo = (): BotInfo => ({
  botName: "Vielora AI",
  avatarUrl: null,
  settings: getFallbackSetting(),
  isReady: true,
  previousMessages: [],
  conversationId: null,
});

// Function to initialize demo bot (matching widget.js init)
const initDemoBot = async (botId: string): Promise<BotInfo> => {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${BASE_URL}/api/widget/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-id": botId,
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({
        botId: botId,
        visitorId: visitorId,
      }),
    });

    if (!response.ok) {
      throw new Error("Init API call failed");
    }

    const data = await response.json();

    if (data.success && data.data) {
      return {
        botName: data.data.name || "Vielora AI",
        avatarUrl: data.data.avatarUrl || null,
        settings: data.data.settings || getFallbackSetting(),
        isReady: data.data.status === "ready",
        previousMessages: data.data.messages || [],
        conversationId: data.data.conversationId || null,
      };
    }

    throw new Error("Invalid init response format");
  } catch (error) {
    console.error("Error initializing demo bot:", error);
    // Return fallback settings
    return getFallbackBotInfo();
  }
};

// Function to call real Vielora API (matching widget.js format)
const callVieloraAPI = async (
  botId: string,
  message: string,
  conversationId?: string
): Promise<{ message: string; conversationId: string }> => {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${BASE_URL}/api/widget/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-id": botId,
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({
        botId: botId,
        message: message,
        conversationId: conversationId,
        visitorId: visitorId,
      }),
    });

    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }

    if (response.status === 403) {
      throw new Error("Domain not allowed");
    }

    if (!response.ok) {
      throw new Error("API call failed");
    }

    const data = await response.json();

    if (data.success && data.data) {
      return {
        message: data.data.message || "Xin lỗi, tôi không nhận được phản hồi.",
        conversationId: data.data.conversationId || conversationId || "",
      };
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error calling Vielora API:", error);
    return {
      message: "Xin lỗi, tôi không nhận được phản hồi.",
      conversationId: conversationId || "offline_" + Date.now(),
    };
  }
};

function parseMarkdown(text: string) {
  if (!text) return "";

  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$1</a>'
  );

  result = result.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; text-underline-offset: 2px; font-weight: 500;">$2</a>'
  );

  result = result
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      '<code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 0.9em;">$1</code>'
    )
    .replace(/\n/g, "<br>");

  return result;
}

interface DemoChatbotWidgetProps {
  botId?: string;
  position?: string;
}

export const DemoChatbotWidget: React.FC<DemoChatbotWidgetProps> = ({ botId, position }) => {
  // Use provided botId or default to demo bot
  const activeBotId = botId || DEMO_BOT_ID;
  const [showDemoChat, setShowDemoChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [botInfo, setBotInfo] = useState<BotInfo>(getFallbackBotInfo());

  // Use widget position from props or bot settings
  const finalPosition = position || botInfo.settings.position;

  // Function to load previous messages (matching widget.js)
  const loadPreviousMessages = (
    previousMessages: APIMessage[],
    welcomeMessage: string
  ): Message[] => {
    const loadedMessages: Message[] = [];

    // Add separator message if there are previous messages
    if (previousMessages && previousMessages.length > 0) {
      loadedMessages.push({
        id: 0,
        role: "bot",
        content: "--- Lịch sử trò chuyện ---",
      });

      // Add previous messages with proper role conversion
      previousMessages.forEach((msg, index) => {
        const role = msg.role === "assistant" ? "bot" : (msg.role as "user" | "bot");
        loadedMessages.push({
          id: index + 1,
          role: role,
          content: msg.content,
        });
      });
    } else {
      // Add welcome message if no previous messages
      loadedMessages.push({
        id: 1,
        role: "bot",
        content: welcomeMessage,
      });
    }

    return loadedMessages;
  };

  // Auto scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current!.scrollTop = messagesContainerRef.current!.scrollHeight;
      }, 100);
    }
  };

  // Scroll to bottom when messages change or when chat is opened
  useEffect(() => {
    if (showDemoChat && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, showDemoChat]);

  // Scroll to bottom when chat is first opened (immediate scroll for initial load)
  useEffect(() => {
    if (showDemoChat) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [showDemoChat]);

  // Initialize bot settings and message history
  useEffect(() => {
    const initBot = async () => {
      const info = await initDemoBot(activeBotId);

      // Override position if provided via props
      if (position) {
        info.settings.position = position;
      }

      setBotInfo(info);

      // Set conversation ID if available
      if (info.conversationId) {
        setConversationId(info.conversationId);
      }

      // Load previous messages or welcome message
      const initialMessages = loadPreviousMessages(
        info.previousMessages || [],
        info.settings.welcomeMessage
      );
      setMessages(initialMessages);
    };
    initBot();
  }, [activeBotId, position]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed.length > MAX_CHAT_INPUT) {
      const warning: Message = {
        id: messages.length + 1,
        role: "bot",
        content: `Tin nhắn quá dài (tối đa ${MAX_CHAT_INPUT} ký tự). Vui lòng rút gọn nội dung.`,
      };
      setMessages((prev) => [...prev, warning]);
      return;
    }

    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: trimmed,
    };

    const currentInput = trimmed;
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Call real Vielora API with conversation context
      const response = await callVieloraAPI(activeBotId, currentInput, conversationId);

      // Update conversation ID for context continuity
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const botMessage: Message = {
        id: messages.length + 2,
        role: "bot",
        content: response.message,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error during message handling:", error);
      const errorMessage: Message = {
        id: messages.length + 2,
        role: "bot",
        content:
          "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc sử dụng widget thật.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-lg overflow-hidden rounded-3xl border border-border/10 shadow-2xl shadow-gray-900/20"
    >
      {/* Browser header simulation */}
      <div className="glass-primary relative flex items-center gap-3 px-6 py-4 shadow-gray-900/5">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="rounded-md bg-background/80 px-3 py-1 font-mono text-xs">
              https://your-website.com
            </div>
          </div>
        </div>
        {/* <div className="ml-auto flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gray-400" />
          <span className="text-xs text-muted-foreground">
            {botId ? "Playground Mode" : "Demo Mode"}
          </span>
        </div> */}
      </div>

      {/* Mock website content with chatbot widget area */}
      <div
        className="relative min-h-[500px] bg-gradient-to-br from-background/80 to-muted/20 shadow-xl shadow-gray-900/10"
        id="demo-website"
      >
        {/* Simple mock website content */}
        <div className="space-y-6 p-8">
          {/* Content placeholders */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-8">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
            <div className="space-y-8">
              <div className="h-24 rounded-lg bg-muted/50 shadow-xl" />
              <div className="flex gap-2">
                <div className="h-4 flex-1 rounded bg-primary/30 shadow-md" />
                <div className="h-4 flex-1 rounded bg-primary/30 shadow-md" />
              </div>
            </div>
          </div>

          {/* More placeholders */}
          <div className="space-y-8">
            <div className="h-6 w-1/2 rounded bg-muted/80" />
            <div className="h-3 w-full rounded bg-muted/60" />
            <div className="h-3 w-4/5 rounded bg-muted/60" />
            <div className="h-3 w-full rounded bg-muted/60" />
            <div className="h-3 w-3/4 rounded bg-muted/60" />
          </div>
        </div>

        {/* Floating chatbot button (positioned like real widget) */}
        <div
          className={`absolute bottom-3 ${finalPosition === "bottom-left" ? "left-6" : "right-6"}`}
        >
          <Button
            onClick={() => setShowDemoChat(!showDemoChat)}
            className="h-14 w-14 rounded-full border-0 shadow-lg transition-transform duration-200 hover:scale-105"
            style={{ backgroundColor: botInfo.settings.primaryColor }}
          >
            {showDemoChat ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </Button>
        </div>

        {/* Demo chatbot widget positioned at bottom right within the frame */}
        <AnimatePresence>
          {showDemoChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
              className={`absolute bottom-20 ${
                finalPosition === "bottom-left" ? "left-6" : "right-6"
              } w-80 max-w-[calc(100%-3rem)]`}
            >
              {/* Chat widget */}
              <div className="glass-lg overflow-hidden rounded-2xl border border-border/20 shadow-2xl">
                {/* Chat header */}
                <div
                  className="flex items-center justify-between rounded-t-2xl p-4"
                  style={{ backgroundColor: botInfo.settings.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    {botInfo.avatarUrl ? (
                      <Image
                        src={botInfo.avatarUrl}
                        alt={botInfo.botName}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full border-2 border-white/30 object-cover shadow-md"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 shadow-md">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-white">{botInfo.botName}</h4>
                      <p className="text-xs text-white/80">Trực tuyến</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 rounded-full p-0 text-white hover:bg-white/20"
                    onClick={() => setShowDemoChat(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="h-64 space-y-3 overflow-y-auto bg-background/95 p-4 shadow-inner"
                >
                  <style jsx>{`
                    .chatbot-message-content strong {
                      font-weight: 600;
                    }
                    .chatbot-message-content a {
                      color: ${botInfo.settings.primaryColor};
                      text-decoration: underline;
                    }
                    .chatbot-message-content code {
                      background: #f3f4f6;
                      padding: 2px 4px;
                      border-radius: 4px;
                      font-family: monospace;
                      font-size: 11px;
                    }
                  `}</style>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: index === messages.length - 1 ? 0.1 : 0,
                      }}
                      className={`${
                        message.content.startsWith("--- Lịch sử")
                          ? "my-2 text-center"
                          : `flex ${message.role === "user" ? "justify-end" : "justify-start"}`
                      }`}
                    >
                      {message.content.startsWith("--- Lịch sử") ? (
                        <div className="text-xs font-medium text-muted-foreground opacity-75">
                          {message.content}
                        </div>
                      ) : (
                        <>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-sm ${
                              message.role === "user"
                                ? "rounded-br-md text-white"
                                : "rounded-bl-md bg-muted"
                            }`}
                            style={
                              message.role === "user"
                                ? { backgroundColor: botInfo.settings.primaryColor }
                                : {}
                            }
                          >
                            {message.role === "bot" ? (
                              <div
                                className="chatbot-message-content whitespace-pre-line"
                                dangerouslySetInnerHTML={{
                                  __html: parseMarkdown(message.content),
                                }}
                              />
                            ) : (
                              <p className="whitespace-pre-line">{message.content}</p>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="rounded-xl rounded-bl-md bg-muted px-3 py-2 shadow-sm">
                        <div className="flex gap-1">
                          <span
                            className="h-1 w-1 animate-bounce rounded-full"
                            style={{ backgroundColor: `${botInfo.settings.primaryColor}60` }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full [animation-delay:0.15s]"
                            style={{ backgroundColor: `${botInfo.settings.primaryColor}60` }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full [animation-delay:0.3s]"
                            style={{ backgroundColor: `${botInfo.settings.primaryColor}60` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Invisible div to scroll to */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="rounded-b-2xl border-t bg-background/95 p-3 shadow-lg">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      maxLength={MAX_CHAT_INPUT}
                      className="h-8 flex-1 text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 w-8 rounded-full p-0 shadow-sm transition-shadow hover:shadow-md"
                      style={{ backgroundColor: botInfo.settings.primaryColor }}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      <div className="glass border-t border-border/40 p-4">
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          <p className="text-xs opacity-75">
            {botId
              ? `Hỏi về bất cứ điều gì liên quan đến ${botInfo.botName}!`
              : "Hỏi về bất cứ điều gì liên quan đến Vielora!"}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DemoChatbotWidget;
