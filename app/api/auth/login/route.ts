import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  clearLoginAttempts,
  getLoginCooldown,
  normalizeLoginEmail,
  recordFailedLoginAttempt,
} from "@/lib/security/auth-login-attempts";
import { LoginWithPasswordError } from "@/lib/constants/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

function createCooldownResponse(cooldown: {
  retryAfter: number;
  lockedUntil: string | null;
}): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: LoginWithPasswordError.LOGIN_COOLDOWN,
      message: `Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau ${cooldown.retryAfter} giây.`,
      retryAfter: cooldown.retryAfter,
      lockedUntil: cooldown.lockedUntil,
    },
    {
      status: 429,
      headers: {
        "Retry-After": cooldown.retryAfter.toString(),
      },
    }
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: LoginWithPasswordError.INVALID_LOGIN_REQUEST,
          message: "Yêu cầu không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: LoginWithPasswordError.INVALID_LOGIN_REQUEST,
          message: "Email hoặc mật khẩu không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const email = normalizeLoginEmail(parsed.data.email);
    const password = parsed.data.password;
    const cooldown = await getLoginCooldown(email);

    if (cooldown.locked) {
      return createCooldownResponse(cooldown);
    }

    const supabase = createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === "Invalid login credentials") {
        const attempt = await recordFailedLoginAttempt(email);

        if (attempt.locked) {
          return createCooldownResponse(attempt);
        }

        return NextResponse.json(
          {
            success: false,
            code: LoginWithPasswordError.INVALID_CREDENTIALS,
            message: "Email hoặc mật khẩu không đúng.",
            attemptsRemaining: attempt.attemptsRemaining,
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: LoginWithPasswordError.AUTH_ERROR,
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        {
          success: false,
          code: LoginWithPasswordError.AUTH_SESSION_MISSING,
          message: "Không thể tạo phiên đăng nhập. Vui lòng thử lại.",
        },
        { status: 500 }
      );
    }

    await clearLoginAttempts(email);

    return NextResponse.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
      },
      user: data.user,
    });
  } catch (error) {
    console.error("[AuthLogin] Login error:", error);
    return NextResponse.json(
      {
        success: false,
        code: LoginWithPasswordError.LOGIN_FAILED,
        message: "Có lỗi xảy ra. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}
