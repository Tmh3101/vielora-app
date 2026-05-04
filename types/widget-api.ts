import { ApiResponse } from "./utils";

export type InitRequest = {
  botId: string;
  visitorId?: string;
};

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type InitData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  domain: string;
  quotaExceeded: boolean;
  messagesRemaining: number;
  settings: {
    primaryColor: string;
    textColor: string;
    position: string;
    welcomeMessage: string;
  };
  // Include existing conversation if found
  conversationId: string | null;
  messages: Message[];
};

export type InitResponse = ApiResponse<InitData>;

export type ChatRequest = {
  botId: string;
  message: string;
  conversationId?: string;
  visitorId: string;
};

export type ChatData = {
  conversationId: string;
  message: string;
  noAnswer: boolean;
};

export type ChatResponse = ApiResponse<ChatData>;
