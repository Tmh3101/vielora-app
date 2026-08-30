export const LoginWithPasswordError = {
  LOGIN_COOLDOWN: "LOGIN_COOLDOWN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  AUTH_ERROR: "AUTH_ERROR",
  INVALID_LOGIN_REQUEST: "INVALID_LOGIN_REQUEST",
  AUTH_SESSION_MISSING: "AUTH_SESSION_MISSING",
  LOGIN_FAILED: "LOGIN_FAILED",
} as const;

export type LoginWithPasswordErrorCode =
  (typeof LoginWithPasswordError)[keyof typeof LoginWithPasswordError];

export const OauthProvider = {
  GOOGLE: "google",
  GITHUB: "github",
} as const;

export type OauthProviderType = (typeof OauthProvider)[keyof typeof OauthProvider];

export const AuthView = {
  LOGIN: "login",
  SIGNUP: "signup",
  SIGNUP_SUCCESS: "signup-success",
  FORGOT: "forgot",
} as const;

export type AuthViewType = (typeof AuthView)[keyof typeof AuthView];

export const SupabaseAuthEvent = {
  PASSWORD_RECOVERY: "PASSWORD_RECOVERY",
  SIGNED_IN: "SIGNED_IN",
  SIGNED_OUT: "SIGNED_OUT",
  USER_UPDATED: "USER_UPDATED",
  TOKEN_REFRESHED: "TOKEN_REFRESHED",
  INITIAL_SESSION: "INITIAL_SESSION",
} as const;

export type SupabaseAuthEventType = (typeof SupabaseAuthEvent)[keyof typeof SupabaseAuthEvent];

export const AUTH_EVENT_PASSWORD_RECOVERY = "PASSWORD_RECOVERY";
export const AUTH_EVENT_SIGNED_IN = "SIGNED_IN";
export const AUTH_EVENT_SIGNED_OUT = "SIGNED_OUT";
export const AUTH_EVENT_USER_UPDATED = "USER_UPDATED";

export const OAUTH_ERROR_FAILED = "oauth_failed";
export const PENDING_IOS_AUTH_KEY = "pending_ios_auth";
export const OAUTH_COMPLETE_EVENT = "OAUTH_COMPLETE";
