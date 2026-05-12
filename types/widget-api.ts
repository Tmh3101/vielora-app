import { ApiResponse } from "./utils";

export type WidgetSettings = {
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions?: string[]; // Array of suggested questions (max 3, max 200 chars each)
  chatBackgroundType?: "solid" | "gradient" | "image";
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
  chatIconType?: "preset" | "custom";
  chatIconPreset?: string;
  chatIconUrl?: string | null;
  chatIconColor?: string;
  chatIconBgColor?: string;
};

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
  botName: string;
  avatarUrl: string | null;
  status: string;
  domain: string;
  quotaExceeded: boolean;
  messagesRemaining: number;
  isAvailable: boolean;
  statusMessage: string | null;
  settings: WidgetSettings;
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
