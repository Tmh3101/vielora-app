export const GroupChatErrorCode = {
  ALREADY_PINNED: "already_pinned",
  MEMBER_CAP_REACHED: "member_cap_reached",
  ALREADY_MEMBER: "already_member",
  GROUP_CHAT_REQUIRES_PRO: "group_chat_requires_pro",
  INSUFFICIENT_CREDITS: "insufficient_credits",
  OTP_EXPIRED: "error_code=otp_expired",
  ACCESS_DENIED: "access_denied",
} as const;

export const GROUP_ALREADY_PINNED_CODE = "already_pinned";
export const GROUP_MEMBER_CAP_REACHED_CODE = "member_cap_reached";
export const GROUP_ALREADY_MEMBER_CODE = "already_member";
export const GROUP_CHAT_REQUIRES_PRO_CODE = "group_chat_requires_pro";
export const GROUP_INSUFFICIENT_CREDITS_CODE = "insufficient_credits";
export const ERROR_CODE_OTP_EXPIRED = "error_code=otp_expired";
export const ERROR_CODE_ACCESS_DENIED = "access_denied";

export const GroupAuthState = {
  LOADING: "loading",
  UNAUTHENTICATED: "unauthenticated",
  NOT_MEMBER: "not_member",
  MEMBER: "member",
} as const;

export const GROUP_AUTH_MEMBER = "member";
export const GROUP_AUTH_NOT_MEMBER = "not_member";

export { SupabaseAuthEvent, AUTH_EVENT_SIGNED_IN, AUTH_EVENT_SIGNED_OUT } from "./auth";
