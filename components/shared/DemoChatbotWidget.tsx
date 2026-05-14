"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MAX_CHAT_INPUT } from "@/config/rag";
import { parseMarkdown, getUserMessageTextColor } from "@/lib/helpers/chat-helpers";
import { parsePosition } from "@/lib/helpers/position-helpers";
import { getIconColorBasedOnBg } from "@/lib/helpers/icon-helpers";
import { getIconSVGWithSize } from "@/lib/icons";
import { WIDGET_CONFIG, WIDGET_FALLBACK, WIDGET_MESSAGES, WIDGET_POSITION } from "@/config/widget";

// API message format (matching widget.js)
interface APIMessage {
  role: "user" | "assistant" | "bot";
  content: string;
}

// Bot settings interface
interface BotSettings {
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions?: string[];
  chatBackgroundType?: "solid" | "gradient" | "image";
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
  chatIconType?: "preset" | "custom";
  chatIconPreset?: string;
  chatIconUrl?: string | null;
  chatIconColor?: string;
  chatIconBgColor?: string;
}

interface BotInfo {
  botName: string;
  avatarUrl: string | null;
  settings: BotSettings;
  isReady: boolean;
  previousMessages?: APIMessage[];
  conversationId?: string;
}

interface Message {
  id: number;
  role: "user" | "bot";
  content: string;
}

const generateVisitorId = (): string => {
  const stored = localStorage.getItem(WIDGET_CONFIG.VISITOR_ID_KEY);
  if (stored) return stored;

  const id =
    WIDGET_CONFIG.VISITOR_ID_PREFIX + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
  localStorage.setItem(WIDGET_CONFIG.VISITOR_ID_KEY, id);
  return id;
};

const getFallbackSetting = (): BotSettings => ({
  primaryColor: WIDGET_FALLBACK.PRIMARY_COLOR,
  textColor: WIDGET_FALLBACK.TEXT_COLOR,
  position: WIDGET_FALLBACK.POSITION,
  welcomeMessage: WIDGET_FALLBACK.WELCOME_MESSAGE,
});

const getFallbackBotInfo = (): BotInfo => ({
  botName: WIDGET_FALLBACK.BOT_NAME,
  avatarUrl: null,
  settings: getFallbackSetting(),
  isReady: true,
  previousMessages: [],
  conversationId: undefined,
});

// Function to initialize demo bot (matching widget.js init)
const initDemoBot = async (botId: string): Promise<BotInfo> => {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${WIDGET_CONFIG.BASE_URL}/api/widget/init`, {
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
        botName: data.data.name || WIDGET_FALLBACK.BOT_NAME,
        avatarUrl: data.data.avatarUrl || null,
        settings: data.data.settings || getFallbackSetting(),
        isReady: data.data.status === "ready",
        previousMessages: data.data.messages || [],
        conversationId: data.data.conversationId || undefined,
      };
    }

    throw new Error("Invalid init response format");
  } catch (error) {
    console.error("Error initializing demo bot:", error);
    return getFallbackBotInfo();
  }
};

const callVieloraAPI = async (
  botId: string,
  message: string,
  conversationId?: string
): Promise<{ message: string; conversationId: string }> => {
  const visitorId = generateVisitorId();

  try {
    const response = await fetch(`${WIDGET_CONFIG.BASE_URL}/api/widget/chat`, {
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
        message: data.data.message || WIDGET_MESSAGES.API_ERROR,
        conversationId: data.data.conversationId || conversationId || "",
      };
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error calling Vielora API:", error);
    return {
      message: WIDGET_MESSAGES.API_ERROR,
      conversationId: conversationId || WIDGET_MESSAGES.OFFLINE_PREFIX + Date.now(),
    };
  }
};

interface DemoChatbotWidgetProps {
  botId?: string;
  position?: string;
}

export const DemoChatbotWidget: React.FC<DemoChatbotWidgetProps> = ({ botId, position }) => {
  const activeBotId = botId || WIDGET_CONFIG.DEMO_BOT_ID || "";
  const [showDemoChat, setShowDemoChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [suggestedQuestionsShown, setSuggestedQuestionsShown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLDivElement>(null);
  const [botInfo, setBotInfo] = useState<BotInfo>(getFallbackBotInfo());
  const [containerDimensions, setContainerDimensions] = useState({ width: 340, height: 400 });

  const finalPosition = position || botInfo.settings.position;
  const parsedPosition = parsePosition(finalPosition);

  const BASE_MIN_X = WIDGET_POSITION.PADDING;
  const BASE_MAX_X =
    WIDGET_POSITION.FRAME_WIDTH - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
  const BASE_MIN_Y = WIDGET_POSITION.PADDING;
  const BASE_MAX_Y =
    WIDGET_POSITION.FRAME_HEIGHT - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
  const BASE_RANGE_X = BASE_MAX_X - BASE_MIN_X;
  const BASE_RANGE_Y = BASE_MAX_Y - BASE_MIN_Y;
  const clampedBaseX = Math.max(BASE_MIN_X, Math.min(parsedPosition.x, BASE_MAX_X));
  const clampedBaseY = Math.max(BASE_MIN_Y, Math.min(parsedPosition.y, BASE_MAX_Y));
  const normalizedX = BASE_RANGE_X > 0 ? (clampedBaseX - BASE_MIN_X) / BASE_RANGE_X : 0;
  const normalizedY = BASE_RANGE_Y > 0 ? (clampedBaseY - BASE_MIN_Y) / BASE_RANGE_Y : 0;

  const viewportRangeX = Math.max(
    0,
    containerDimensions.width - WIDGET_POSITION.ICON_SIZE - WIDGET_CONFIG.PREVIEW_EDGE_OFFSET * 2
  );
  const viewportRangeY = Math.max(
    0,
    containerDimensions.height - WIDGET_POSITION.ICON_SIZE - WIDGET_CONFIG.PREVIEW_EDGE_OFFSET * 2
  );

  const clampedPosition = {
    x: WIDGET_CONFIG.PREVIEW_EDGE_OFFSET + normalizedX * viewportRangeX,
    y: WIDGET_CONFIG.PREVIEW_EDGE_OFFSET + normalizedY * viewportRangeY,
  };

  const spaceAbove = clampedPosition.y;
  const spaceBelow = containerDimensions.height - clampedPosition.y - WIDGET_POSITION.ICON_SIZE;

  const positionChatBelow = spaceBelow > spaceAbove && spaceBelow > 250;

  const horizontalMidpoint = containerDimensions.width / 2;

  // Handler functions to replace inline ones
  const toggleDemoChat = () => setShowDemoChat((prev) => !prev);
  const closeDemoChat = () => setShowDemoChat(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleSuggestedQuestionClick = (question: string) => {
    setSuggestedQuestionsShown(true);
    sendMessageContent(question);
  };

  const handleSuggestedMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "#f3f4f6";
    e.currentTarget.style.borderColor = botInfo.settings.primaryColor;
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.12)";
  };

  const handleSuggestedMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "white";
    e.currentTarget.style.borderColor = "#e5e7eb";
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.08)";
  };

  // Memoized styles
  const chatBackgroundStyle = useMemo(() => {
    const bgType = botInfo.settings.chatBackgroundType || "solid";
    const bgValue = botInfo.settings.chatBackgroundValue || "#ffffff";
    const bgOpacity = (botInfo.settings.chatBackgroundOpacity || 100) / 100;

    if (bgType === "solid") {
      const rgb = parseInt(bgValue.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      return { backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgOpacity})` };
    } else if (bgType === "gradient") {
      const overlayOpacity = 1 - bgOpacity;
      return {
        background: bgValue,
        backgroundColor: `rgba(255, 255, 255, ${overlayOpacity})`,
        backgroundBlendMode: "lighten" as const,
      };
    } else if (bgType === "image") {
      const overlayOpacity = 1 - bgOpacity;
      return {
        backgroundImage: `url("${bgValue}")`,
        backgroundColor: `rgba(255, 255, 255, ${overlayOpacity})`,
        backgroundBlendMode: "lighten" as const,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return {};
  }, [
    botInfo.settings.chatBackgroundType,
    botInfo.settings.chatBackgroundValue,
    botInfo.settings.chatBackgroundOpacity,
  ]);

  useEffect(() => {
    const measureContainer = () => {
      if (websiteRef.current) {
        const rect = websiteRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    const timer = setTimeout(measureContainer, 100);
    window.addEventListener("resize", measureContainer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureContainer);
    };
  }, []);

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
        content: WIDGET_MESSAGES.HISTORY_SEPARATOR,
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
        content: WIDGET_MESSAGES.MAX_LENGTH_WARNING(MAX_CHAT_INPUT),
      };
      setMessages((prev) => [...prev, warning]);
      return;
    }

    setSuggestedQuestionsShown(true);
    setInput(""); // Clear input immediately before sending
    await sendMessageContent(trimmed);
  };

  const sendMessageContent = async (messageText: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await callVieloraAPI(activeBotId, messageText, conversationId);

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
        content: WIDGET_MESSAGES.TECHNICAL_ERROR,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedQuestionsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Convert vertical wheel movement into horizontal scroll for suggestion pills.
    if (e.deltaY === 0 && e.deltaX === 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.scrollLeft += e.deltaY + e.deltaX;
  };

  const visibleSuggestedQuestions = (botInfo.settings.suggestedQuestions || []).filter((q) =>
    q.trim()
  );
  const showSuggestedOverlay =
    !suggestedQuestionsShown && messages.length > 0 && visibleSuggestedQuestions.length > 0;

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
      </div>

      {/* Mock website content with chatbot widget area */}
      <div
        ref={websiteRef}
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
          className="absolute z-40"
          style={{
            left: `${clampedPosition.x}px`,
            top: `${clampedPosition.y}px`,
          }}
        >
          <button
            onClick={toggleDemoChat}
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
            style={{
              backgroundColor: botInfo.settings.chatIconBgColor || botInfo.settings.primaryColor,
              border: "none",
              cursor: "pointer",
            }}
            title="Click để mở chat"
          >
            {showDemoChat ? (
              <X
                className="h-6 w-6"
                color={
                  botInfo.settings.chatIconColor ||
                  getIconColorBasedOnBg(
                    botInfo.settings.chatIconBgColor || botInfo.settings.primaryColor
                  )
                }
              />
            ) : botInfo.settings.chatIconType === "custom" && botInfo.settings.chatIconUrl ? (
              <Avatar className="h-14 w-14 border-none">
                <AvatarImage
                  src={botInfo.settings.chatIconUrl}
                  alt="Custom icon"
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            ) : botInfo.settings.chatIconType === "preset" ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: getIconSVGWithSize(
                    botInfo.settings.chatIconPreset || "messagecircle",
                    "28",
                    "28"
                  ),
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color:
                    botInfo.settings.chatIconColor ||
                    getIconColorBasedOnBg(
                      botInfo.settings.chatIconBgColor || botInfo.settings.primaryColor
                    ),
                }}
              />
            ) : (
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                color={
                  botInfo.settings.chatIconColor ||
                  getIconColorBasedOnBg(
                    botInfo.settings.chatIconBgColor || botInfo.settings.primaryColor
                  )
                }
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Demo chatbot widget positioned at calculated position within the frame */}
        <AnimatePresence>
          {showDemoChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute z-50 w-80"
              style={{
                // Position chat window smartly based on icon position (left/right)
                // Use container midpoint for responsive threshold
                ...(clampedPosition.x < horizontalMidpoint
                  ? { left: `${Math.max(0, clampedPosition.x - 20)}px`, right: "auto" }
                  : {
                      left: "auto",
                      right: `${Math.max(0, containerDimensions.width - clampedPosition.x - 64)}px`,
                    }),
                // Position chat window smartly based on vertical space (top/bottom)
                ...(positionChatBelow
                  ? {
                      top: `${Math.max(0, clampedPosition.y + WIDGET_POSITION.ICON_SIZE + 10)}px`,
                      bottom: "auto",
                    }
                  : {
                      top: "auto",
                      bottom: `${Math.max(containerDimensions.height - clampedPosition.y + 10, 20)}px`,
                    }),
              }}
            >
              {/* Chat widget */}
              <div className="glass-lg overflow-hidden rounded-2xl border border-border/20 shadow-2xl">
                {/* Chat header */}
                <div
                  className="flex items-center justify-between rounded-t-2xl p-4"
                  style={{ backgroundColor: botInfo.settings.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 rounded-xl border-2 border-white/30 shadow-md">
                      <AvatarImage
                        src={botInfo.avatarUrl || undefined}
                        alt={botInfo.botName}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-xl bg-white/20">
                        <Bot className="h-4 w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{botInfo.botName}</h4>
                      <p className="text-xs text-white/80">Trực tuyến</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 rounded-full p-0 text-white hover:bg-white/20"
                    onClick={closeDemoChat}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className={`h-64 space-y-3 overflow-y-auto p-4 shadow-inner ${
                    showSuggestedOverlay ? "pb-14" : ""
                  }`}
                  style={chatBackgroundStyle}
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
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                              message.role === "user"
                                ? "rounded-br-sm text-white"
                                : "rounded-bl-sm bg-muted"
                            }`}
                            style={
                              message.role === "user"
                                ? {
                                    backgroundColor: botInfo.settings.primaryColor,
                                    color: getUserMessageTextColor(botInfo.settings.primaryColor),
                                  }
                                : { color: botInfo.settings.textColor }
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

                {/* Suggested Questions + Input Area */}
                <div className="relative border-t border-border bg-transparent">
                  {/* Suggested Questions Bar */}
                  {showSuggestedOverlay && (
                    <>
                      <style jsx>{`
                        .chatbot-suggested-scroll {
                          -ms-overflow-style: none;
                          scrollbar-width: none;
                          overscroll-behavior-x: contain;
                          overscroll-behavior-y: contain;
                        }
                        .chatbot-suggested-scroll::-webkit-scrollbar {
                          display: none;
                          width: 0;
                          height: 0;
                        }
                      `}</style>
                      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-0 px-3">
                        <div
                          className="chatbot-suggested-scroll pointer-events-auto flex gap-3 overflow-x-auto pb-1 pr-2"
                          onWheel={handleSuggestedQuestionsWheel}
                        >
                          {visibleSuggestedQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSuggestedQuestionClick(question)}
                              onMouseEnter={handleSuggestedMouseEnter}
                              onMouseLeave={handleSuggestedMouseLeave}
                              className="flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                              style={{
                                background: "white",
                                borderColor: "#e5e7eb",
                                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
                                opacity: 0.95,
                              }}
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Input */}
                  <div className="rounded-b-2xl bg-background/95 p-3 shadow-lg">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={WIDGET_MESSAGES.INPUT_PLACEHOLDER}
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
              : `Hỏi về bất cứ điều gì liên quan đến ${WIDGET_FALLBACK.BOT_NAME}!`}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default DemoChatbotWidget;
