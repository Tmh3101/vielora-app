import { ApiResponse } from "./utils";
import { EWidgetBackgroundType, EMessageRole, EWidgetIconType } from "./enums";

/**
 * A pre-approved destination page that the chatbot can navigate visitors to.
 * Stored inside WidgetSettings.allowed_pages. Max 20 per bot (T-02).
 */
export interface KeyActionPage {
  /** URL path beginning with "/", e.g. "/pricing" or "/services#booking-form" */
  path: string;
  /** Optional anchor ID (without the leading "#") for fragment navigation */
  anchor?: string | null;
  /** Human-readable title shown in admin UI and bot reply */
  title: string;
  /** Phrase the bot matches against user message, e.g. "show_pricing" */
  intent: string;
}

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
  subscriptionPlan?: string;
  isVoiceEnabled?: boolean;
  // Smart Homepage — Key Action Pages whitelist (T-02)
  navigation_enabled?: boolean;
  allowed_pages?: KeyActionPage[];
  // Smart Homepage — auto-populated navigation entries (FR-9). Built from
  // discovered pages + in-page anchors. Unbounded (no MAX_ALLOWED_PAGES cap).
  auto_pages?: KeyActionPage[];
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

/**
 * Response type discriminator for the widget chat endpoint.
 * - "MESSAGE": regular chat reply
 * - "SHOW_LEAD_FORM": bot couldn't answer, request user contact info
 * - "NAVIGATE": bot recognized a navigation intent; client should redirect
 *   to `url` (with optional `anchor`). If `explicit === true`, navigate
 *   immediately; otherwise show a 3s countdown banner.
 */
export type ChatResponseType = "MESSAGE" | "SHOW_LEAD_FORM" | "NAVIGATE";

export type ChatData = {
  conversationId: string;
  message: string;
  noAnswer: boolean;
  type?: ChatResponseType;
  originalQuestion?: string;
  // New fields for navigation (T-01)
  url?: string;
  anchor?: string;
  explicit?: boolean;
};

export type LeadFormRequest = {
  botId: string;
  visitorId: string;
  conversationId: string;
  question: string;
  name: string;
  email: string;
  phone?: string;
  note?: string;
};

export type LeadFormData = {
  id: string;
};

export type LeadFormResponse = ApiResponse<LeadFormData>;

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
  id?: string;
  role: EMessageRole;
  content: string;
  isHistory?: boolean;
  isVoice?: boolean;
  isProcessing?: boolean;
}
