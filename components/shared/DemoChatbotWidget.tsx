"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getIconColorBasedOnBg,
  computeClampedPosition,
  getChatWidgetPositionStyle,
  getBackgroundStyle,
  parseMarkdown,
  getUserMessageTextColor,
  getIconSVGWithSize,
  getChatBlockedData,
} from "@/lib/helpers";
import { WIDGET_CONFIG, WIDGET_FALLBACK, WIDGET_MESSAGES, MAX_CHAT_INPUT } from "@/config";
import { INSUFFICIENT_CREDITS_MESSAGE } from "@/lib/constants/chat";
import { type BotInfo, type APIMessage, EMessageRole, EWidgetIconType } from "@/types";
import { callChatAPI, initDemoBot, getFallbackBotInfo } from "@/lib/services/widget.service";

interface Message {
  id: number;
  role: EMessageRole;
  content: string;
}
interface DemoChatbotWidgetProps {
  botId?: string;
  position?: string;
}

export const DemoChatbotWidget: React.FC<DemoChatbotWidgetProps> = ({ botId, position }) => {
  const activeBotId = botId || WIDGET_CONFIG.DEMO_BOT_ID || "";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLDivElement>(null);
  const [showDemoChat, setShowDemoChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [suggestedQuestionsShown, setSuggestedQuestionsShown] = useState(false);
  const [botInfo, setBotInfo] = useState<BotInfo>(getFallbackBotInfo());
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const [insufficientCreditsMessage, setInsufficientCreditsMessage] = useState<string | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 340, height: 400 });

  const { blockedChatMessage, isChatBlocked } = getChatBlockedData(
    insufficientCredits,
    rateLimitExceeded,
    insufficientCreditsMessage,
    rateLimitMessage,
    botInfo.botName
  );

  const { clampedPosition, positionChatBelow, horizontalMidpoint } = computeClampedPosition(
    position || botInfo.settings.position,
    containerDimensions
  );

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
    if (isChatBlocked || isTyping) return;
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
  const chatBackgroundStyle = useMemo(
    () =>
      getBackgroundStyle(
        botInfo.settings.chatBackgroundType,
        botInfo.settings.chatBackgroundValue || "#ffffff",
        (botInfo.settings.chatBackgroundOpacity || 100) / 100
      ),
    [
      botInfo.settings.chatBackgroundType,
      botInfo.settings.chatBackgroundValue,
      botInfo.settings.chatBackgroundOpacity,
    ]
  );

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

  const loadPreviousMessages = (
    previousMessages: APIMessage[],
    welcomeMessage: string
  ): Message[] => {
    const loadedMessages: Message[] = [];
    if (previousMessages && previousMessages.length > 0) {
      loadedMessages.push({
        id: 0,
        role: EMessageRole.Bot,
        content: WIDGET_MESSAGES.HISTORY_SEPARATOR,
      });
      previousMessages.forEach((msg, index) => {
        const role = msg.role === EMessageRole.Assistant ? EMessageRole.Bot : msg.role;
        loadedMessages.push({
          id: index + 1,
          role: role,
          content: msg.content,
        });
      });
    } else {
      loadedMessages.push({
        id: 1,
        role: EMessageRole.Bot,
        content: welcomeMessage,
      });
    }

    return loadedMessages;
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current!.scrollTop = messagesContainerRef.current!.scrollHeight;
      }, 100);
    }
  };

  useEffect(() => {
    if (showDemoChat && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, showDemoChat]);

  useEffect(() => {
    if (showDemoChat) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [showDemoChat]);

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    const initBot = async () => {
      const info = await initDemoBot(activeBotId);

      if (cancelled || abortController.signal.aborted) return;
      if (position) {
        info.settings.position = position;
      }

      setBotInfo(info);
      setRateLimitExceeded(Boolean(info.rateLimitExceeded));
      setRateLimitMessage(info.rateLimitMessage || null);
      setInsufficientCredits(Boolean(info.insufficientCredits));
      setInsufficientCreditsMessage(info.insufficientCreditsMessage || null);
      if (info.rateLimitExceeded) {
        setSuggestedQuestionsShown(true);
      }

      if (info.conversationId) {
        setConversationId(info.conversationId);
      }

      const initialMessages = loadPreviousMessages(
        info.previousMessages || [],
        info.rateLimitExceeded && info.rateLimitMessage
          ? info.rateLimitMessage
          : info.settings.welcomeMessage
      );
      setMessages(initialMessages);
    };
    initBot();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [activeBotId, position]);

  const appendBotMessage = (content: string) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === EMessageRole.Bot && lastMessage.content === content) {
        return prev;
      }

      return [
        ...prev,
        {
          id: prev.length + 1,
          role: EMessageRole.Bot,
          content,
        },
      ];
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isChatBlocked) {
      setInput("");
      appendBotMessage(blockedChatMessage || INSUFFICIENT_CREDITS_MESSAGE);
      return;
    }

    if (trimmed.length > MAX_CHAT_INPUT) {
      appendBotMessage(WIDGET_MESSAGES.getMaxLengthWarning(MAX_CHAT_INPUT));
      return;
    }

    setSuggestedQuestionsShown(true);
    setInput(""); // Clear input immediately before sending
    await sendMessageContent(trimmed);
  };

  const sendMessageContent = async (messageText: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      role: EMessageRole.User,
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await callChatAPI(activeBotId, messageText, conversationId);

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      if (response.rateLimitExceeded) {
        setRateLimitExceeded(true);
        setRateLimitMessage(response.rateLimitMessage || response.message);
        setSuggestedQuestionsShown(true);
      }

      if (response.insufficientCredits) {
        setInsufficientCredits(true);
        setInsufficientCreditsMessage(
          response.insufficientCreditsMessage || response.message || INSUFFICIENT_CREDITS_MESSAGE
        );
        setSuggestedQuestionsShown(true);
      }

      const botMessage: Message = {
        id: messages.length + 2,
        role: EMessageRole.Bot,
        content: response.message,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error during message handling:", error);
      const errorMessage: Message = {
        id: messages.length + 2,
        role: EMessageRole.Bot,
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
    !suggestedQuestionsShown &&
    messages.length > 0 &&
    visibleSuggestedQuestions.length > 0 &&
    !isChatBlocked;

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
        <div className="space-y-6 p-8">
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
            ) : botInfo.settings.chatIconType === EWidgetIconType.Custom &&
              botInfo.settings.chatIconUrl ? (
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
            ) : botInfo.settings.chatIconType === EWidgetIconType.Preset ? (
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
              style={getChatWidgetPositionStyle(
                clampedPosition,
                containerDimensions,
                horizontalMidpoint,
                positionChatBelow
              )}
            >
              {/* Chat widget */}
              <div className="glass-lg overflow-hidden rounded-2xl border border-border/20 shadow-2xl">
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
                      <p className="text-xs text-white/80">
                        {insufficientCredits ? "Tạm dừng do hết credits" : "Trực tuyến"}
                      </p>
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
                      font-size: 11px;
                    }
                  `}</style>
                  {messages.map((message, index) => {
                    const isHistory = message.content.startsWith(WIDGET_MESSAGES.HISTORY_SEPARATOR);
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index === messages.length - 1 ? 0.1 : 0,
                        }}
                        className={`${
                          isHistory
                            ? "my-2 text-center"
                            : `flex ${message.role === EMessageRole.User ? "justify-end" : "justify-start"}`
                        }`}
                      >
                        {isHistory ? (
                          <div className="text-xs font-medium text-muted-foreground opacity-75">
                            {message.content}
                          </div>
                        ) : (
                          <>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                                message.role === EMessageRole.User
                                  ? "rounded-br-sm text-white"
                                  : "rounded-bl-sm bg-muted"
                              }`}
                              style={
                                message.role === EMessageRole.User
                                  ? {
                                      backgroundColor: botInfo.settings.primaryColor,
                                      color: getUserMessageTextColor(botInfo.settings.primaryColor),
                                    }
                                  : { color: botInfo.settings.textColor }
                              }
                            >
                              {message.role === EMessageRole.Bot ? (
                                <div
                                  className="chatbot-message-content whitespace-pre-line"
                                  dangerouslySetInnerHTML={{
                                    __html: parseMarkdown(
                                      message.content,
                                      botInfo.settings.primaryColor
                                    ),
                                  }}
                                />
                              ) : (
                                <p className="whitespace-pre-line">{message.content}</p>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
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
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions + Input Area */}
                <div className="relative border-t border-border bg-transparent">
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

                  <div className="rounded-b-2xl p-3 shadow-lg">
                    {blockedChatMessage && (rateLimitExceeded || insufficientCredits) && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 px-3">
                        <div
                          className={`rounded-t-lg px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm ${
                            insufficientCredits
                              ? "border border-rose-200/70 bg-rose-50 text-rose-900"
                              : "border border-amber-200/70 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {blockedChatMessage}
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={
                          insufficientCredits ? "Bot đã hết credits" : "Nhập tin nhắn..."
                        }
                        disabled={isTyping || isChatBlocked}
                        maxLength={MAX_CHAT_INPUT}
                        className="h-8 flex-1 text-xs"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isTyping || !input.trim() || isChatBlocked}
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
