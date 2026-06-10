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
