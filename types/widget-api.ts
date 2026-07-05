import { ApiResponse } from "./utils";
import { EWidgetBackgroundType, EMessageRole, EWidgetIconType } from "./enums";

export type WidgetSettings = {
  primaryColor: string;
  textColor: string;
  position: string;
  welcomeMessage: string;
  suggestedQuestions?: string[]; // Array of suggested questions (max 3, max 200 chars each)
  chatBackgroundType?: EWidgetBackgroundType;
  chatBackgroundValue?: string;
  chatBackgroundOpacity?: number;
  chatIconType?: EWidgetIconType;
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
  role: EMessageRole;
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
  rateLimitExceeded?: boolean;
  rateLimitMessage?: string | null;
  rateLimitInfo?: {
    remaining: number | null;
    resetAt: string;
  };
  // Include existing conversation if found
  conversationId: string | null;
  messages: Message[];
  errorCode?: string;
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

export interface APIMessage {
  role: EMessageRole;
  content: string;
}

export interface BotInfo {
  botName: string;
  avatarUrl: string | null;
  settings: WidgetSettings;
  isReady: boolean;
  previousMessages?: APIMessage[];
  conversationId?: string;
  rateLimitExceeded?: boolean;
  rateLimitMessage?: string | null;
  insufficientCredits?: boolean;
  insufficientCreditsMessage?: string | null;
}

export interface ChatMessage {
  role: EMessageRole;
  content: string;
  isHistory?: boolean;
}
