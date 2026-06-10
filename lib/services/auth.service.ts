import { LoginWithPasswordErrorCode } from "@/lib/constants/auth";

export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  const response = await fetch("/api/auth/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to check email");
  }

  return response.json();
};

export interface LoginWithPasswordResponse {
  success: true;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    token_type?: string;
  };
  user: unknown;
}

export interface LoginWithPasswordErrorBody {
  success: false;
  code?: LoginWithPasswordErrorCode;
  message?: string;
  retryAfter?: number;
  lockedUntil?: string | null;
  attemptsRemaining?: number;
}

export class LoginWithPasswordError extends Error {
  code?: LoginWithPasswordErrorBody["code"];
  retryAfter?: number;
  lockedUntil?: string | null;
  attemptsRemaining?: number;

  constructor(body: LoginWithPasswordErrorBody, fallbackMessage = "Login failed") {
    super(body.message || fallbackMessage);
    this.name = "LoginWithPasswordError";
    this.code = body.code;
    this.retryAfter = body.retryAfter;
    this.lockedUntil = body.lockedUntil;
    this.attemptsRemaining = body.attemptsRemaining;
  }
}

export const loginWithPassword = async (
  email: string,
  password: string
): Promise<LoginWithPasswordResponse> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as LoginWithPasswordResponse | LoginWithPasswordErrorBody;

  if (!response.ok || !data.success) {
    throw new LoginWithPasswordError(data as LoginWithPasswordErrorBody);
  }

  return data;
};
