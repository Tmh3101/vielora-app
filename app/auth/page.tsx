"use client";

/**
 * Auth page with:
 * - Login / Sign-up with email+password
 * - Confirm password field (sign-up)
 * - Real-time password strength indicator (sign-up)
 * - Success screen after sign-up
 * - Forgot password flow
 * - OAuth: Google + GitHub
 * - Glassmorphism + animated background
 */

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  MailCheck,
  Mail,
} from "lucide-react";
import { z } from "zod";
import { LogoLoader } from "@/components/ui/logo-loader";
import { checkEmailExists } from "@/lib/services/auth.service";

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                        */
/* ------------------------------------------------------------------ */

const PASSWORD_RULES = [
  { key: "minLength", label: "Tối thiểu 8 ký tự", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Có chữ hoa (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Có chữ thường (a-z)", test: (v: string) => /[a-z]/.test(v) },
  { key: "digit", label: "Có chữ số (0-9)", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "Có ký tự đặc biệt (!@#$...)",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

const signUpSchema = z
  .object({
    email: z
      .string()
      .email("Email không hợp lệ")
      .max(255, { message: "Email không được vượt quá 255 ký tự" }),
    password: z
      .string()
      .min(8, "Tối thiểu 8 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa")
      .regex(/[a-z]/, "Cần ít nhất 1 chữ thường")
      .regex(/[0-9]/, "Cần ít nhất 1 chữ số")
      .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt")
      .max(128, { message: "Mật khẩu không được vượt quá 128 ký tự" }),
    confirmPassword: z
      .string()
      .max(128, { message: "Mật khẩu xác nhận không được vượt quá 128 ký tự" }),
    fullName: z
      .string()
      .min(2, "Tên phải có ít nhất 2 ký tự")
      .max(100, { message: "Họ và tên không được vượt quá 100 ký tự" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(255, { message: "Email không được vượt quá 255 ký tự" }),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .max(128, { message: "Mật khẩu không được vượt quá 128 ký tự" }),
});

const forgotSchema = z.object({
  email: z
    .string()
    .email("Email không hợp lệ")
    .max(255, { message: "Email không được vượt quá 255 ký tự" }),
});

/* ------------------------------------------------------------------ */
/*  Password strength indicator (sign-up only)                         */
/* ------------------------------------------------------------------ */

function PasswordStrength({ password }: { password: string }) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const passedCount = results.filter((r) => r.passed).length;

  const barColor =
    passedCount <= 1
      ? "bg-red-500"
      : passedCount <= 3
        ? "bg-yellow-500"
        : passedCount <= 4
          ? "bg-blue-500"
          : "bg-green-500";

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {PASSWORD_RULES.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < passedCount ? barColor : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Checklist */}
      <ul className="grid grid-cols-1 gap-0.5 text-xs">
        {results.map((r) => (
          <li key={r.key} className="flex items-center gap-1.5">
            {r.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
            <span
              className={r.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}
            >
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Google / GitHub SVG icons                                          */
/* ------------------------------------------------------------------ */

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth views: "login" | "signup" | "forgot" | "signup-success"       */
/* ------------------------------------------------------------------ */

type AuthView = "login" | "signup" | "forgot" | "signup-success";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const initialView: AuthView = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [view, setView] = useState<AuthView>(initialView);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<"google" | "github" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotSent, setForgotSent] = useState(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  /* ---- redirect after auth ---- */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        router.push("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.push("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  /* ---- helpers ---- */
  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setErrors({});
    setForgotSent(false);
  }, []);

  const switchView = useCallback(
    (v: AuthView) => {
      resetForm();
      setView(v);
    },
    [resetForm]
  );

  /* ---- validate ---- */
  const validate = useCallback(() => {
    try {
      if (view === "signup") {
        signUpSchema.parse({ email, password, confirmPassword, fullName });
      } else if (view === "login") {
        signInSchema.parse({ email, password });
      } else {
        forgotSchema.parse({ email });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          const key = String(e.path[0] ?? "form");
          if (!fieldErrors[key]) fieldErrors[key] = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [view, email, password, confirmPassword, fullName]);

  /* ---- submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      if (view === "signup") {
        try {
          const { exists } = await checkEmailExists(email);
          if (exists) throw new Error("User already registered");
        } catch (err: unknown) {
          const raw = err instanceof Error ? err.message : String(err);
          if (raw === "User already registered") {
            toast({
              title: "Cảnh báo",
              description: "Email này đã được đăng ký",
            });
            throw new Error("User already registered");
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.user && !data.session) {
          setView("signup-success");
        }
      } else if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Đăng nhập thành công",
          description: "Chào mừng bạn quay trở lại!",
        });
      } else if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const raw = error instanceof Error ? error.message : "";

      let msg = "Có lỗi xảy ra. Vui lòng thử lại.";
      if (raw === "Invalid login credentials") {
        msg = "Email hoặc mật khẩu không đúng.";
      } else if (raw === "User already registered") {
        msg = "Email này đã được đăng ký. Vui lòng đăng nhập.";
      } else if (raw.includes("Email not confirmed")) {
        msg = "Vui lòng xác nhận email trước khi đăng nhập.";
      }

      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---- OAuth ---- */
  const handleOAuth = async (provider: "google" | "github") => {
    setIsOAuthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error: unknown) {
      console.error("OAuth error:", error);
      toast({
        title: "Lỗi",
        description: `Không thể đăng nhập với ${provider === "google" ? "Google" : "GitHub"}. Vui lòng thử lại.`,
        variant: "destructive",
      });
      setIsOAuthLoading(null);
    }
  };

  /* ---- derived ---- */
  const heading = useMemo(() => {
    switch (view) {
      case "signup":
        return { title: "Tạo tài khoản", desc: "Bắt đầu tạo chatbot AI cho website của bạn" };
      case "forgot":
        return { title: "Quên mật khẩu", desc: "Nhập email để nhận link đặt lại mật khẩu" };
      case "signup-success":
        return { title: "Đăng ký thành công!", desc: "Kiểm tra email để xác nhận tài khoản" };
      default:
        return { title: "Đăng nhập", desc: "Đăng nhập để quản lý chatbot của bạn" };
    }
  }, [view]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="grid-pattern absolute inset-0 opacity-30" />

      {/* Floating orbs */}
      <div className="orb orb-primary animate-float-slow -left-48 -top-48 h-96 w-96" />
      <div className="orb orb-accent animate-float-delayed -bottom-40 -right-40 h-80 w-80" />
      <div className="orb orb-primary animate-float right-1/4 top-1/4 h-48 w-48 opacity-50" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="group mb-4 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Quay lại trang chủ
        </Link>

        <Card className="glass-lg shadow-glow-soft">
          {/* Gradient accent line */}
          <div className="bg-gradient-primary absolute left-0 right-0 top-0 h-1 rounded-t-lg" />

          {/* Header - ẩn khi forgot password sent */}
          {!(view === "forgot" && forgotSent) && (
            <CardHeader className="pt-8 text-center">
              <Link href="/" className="group mb-2 flex items-center justify-center">
                <Image
                  src="/images/logo-icon.png"
                  alt="Vielora"
                  width={80}
                  height={80}
                  className="h-20 w-20"
                  priority
                />
              </Link>
              {view !== "signup-success" && (
                <>
                  <CardTitle className="heading-premium text-2xl">{heading.title}</CardTitle>
                  <CardDescription>{heading.desc}</CardDescription>
                </>
              )}
            </CardHeader>
          )}

          <CardContent className={view === "forgot" && forgotSent ? "pt-8" : ""}>
            {/* ===== SIGN-UP SUCCESS SCREEN ===== */}
            {view === "signup-success" && (
              <div className="-mt-4 flex flex-col items-center space-y-6 pb-4">
                <div className="flex w-auto items-center justify-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <MailCheck className="h-6 w-6 text-green-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Đăng ký thành công!</h2>
                </div>

                <div className="max-w-sm px-4">
                  <p className="text-md text-center leading-relaxed text-muted-foreground">
                    Chúng tôi đã gửi xác nhận đến{" "}
                    <strong className="text-foreground">{email}</strong>. Vui lòng kiểm tra email.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="hover:border-primary/50 hover:bg-white hover:text-foreground hover:text-primary hover:shadow-sm hover:shadow-primary/20"
                  onClick={() => switchView("login")}
                >
                  Quay lại đăng nhập
                </Button>
              </div>
            )}

            {/* ===== FORGOT PASSWORD — sent state ===== */}
            {view === "forgot" && forgotSent && (
              <div className="flex flex-col items-center space-y-4 py-2">
                {/* Logo */}
                <Link href="/" className="group flex items-center justify-center">
                  <Image
                    src="/images/logo-icon.png"
                    alt="Vielora"
                    width={80}
                    height={80}
                    className="h-20 w-20"
                    priority
                  />
                </Link>

                <div className="flex w-auto items-center justify-center space-x-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  {/* Title */}
                  <h2 className="text-xl font-semibold text-foreground">
                    Email đã gửi thành công!
                  </h2>
                </div>

                {/* Description */}
                <div className="max-w-sm px-4">
                  <p className="text-md text-center leading-relaxed text-muted-foreground">
                    Nếu email <strong className="text-foreground">{email}</strong> đã được đăng ký,
                    bạn sẽ nhận được yêu cầu đặt lại mật khẩu.
                  </p>
                </div>

                {/* Button */}
                <Button
                  variant="outline"
                  className="hover:border-primary/50 hover:bg-white hover:text-foreground hover:text-primary hover:shadow-sm hover:shadow-primary/20"
                  onClick={() => switchView("login")}
                >
                  Quay lại đăng nhập
                </Button>
              </div>
            )}

            {/* ===== FORMS (login / signup / forgot) ===== */}
            {view !== "signup-success" && !(view === "forgot" && forgotSent) && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full name — sign-up only */}
                  {view === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Họ và tên</Label>
                      <div>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Nguyễn Văn A"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isLoading}
                          className="focus-glow border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
                        />
                        {errors.fullName && (
                          <p className="pt-1 text-xs text-destructive">{errors.fullName}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="focus-glow border-border/60 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
                      />
                      {errors.email && (
                        <p className="pt-1 text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Password — login & sign-up */}
                  {view !== "forgot" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        {view === "login" && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => switchView("forgot")}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            className="focus-glow border-border/60 bg-background/50 pr-10 focus:border-primary/50 focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="pt-1 text-xs text-destructive">{errors.password}</p>
                        )}
                      </div>

                      {/* Password strength — sign-up only */}
                      {view === "signup" && password.length > 0 && (
                        <PasswordStrength password={password} />
                      )}
                    </div>
                  )}

                  {/* Confirm password — sign-up only */}
                  {view === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                      <div>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            className="focus-glow border-border/60 bg-background/50 pr-10 focus:border-primary/50 focus:ring-primary/20"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
                          <p className="pt-1 text-xs text-destructive">{errors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit button */}
                  <Button
                    type="submit"
                    className="bg-gradient-primary btn-glow h-11 w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : view === "signup" ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Tạo tài khoản
                      </>
                    ) : view === "forgot" ? (
                      "Gửi link đặt lại"
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                </form>

                {/* ===== OAuth buttons (login & signup) ===== */}
                {view !== "forgot" && (
                  <>
                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/60" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          hoặc tiếp tục với
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 border-border/60 bg-background/50 hover:border-primary/50 hover:bg-white hover:text-foreground hover:shadow-sm hover:shadow-primary/20"
                        disabled={!!isOAuthLoading}
                        onClick={() => handleOAuth("google")}
                      >
                        {isOAuthLoading === "google" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <GoogleIcon className="mr-2 h-4 w-4" />
                        )}
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 border-border/60 bg-background/50 hover:border-primary/50 hover:bg-white hover:text-foreground hover:shadow-sm hover:shadow-primary/20"
                        disabled={!!isOAuthLoading}
                        onClick={() => handleOAuth("github")}
                      >
                        {isOAuthLoading === "github" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <GitHubIcon className="mr-2 h-4 w-4" />
                        )}
                        GitHub
                      </Button>
                    </div>
                  </>
                )}

                {/* ===== Toggle links ===== */}
                <div className="mt-6 text-center text-sm">
                  {view === "signup" ? (
                    <p className="text-muted-foreground">
                      Đã có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => switchView("login")}
                        className="font-medium text-primary hover:underline"
                      >
                        Đăng nhập
                      </button>
                    </p>
                  ) : view === "login" ? (
                    <p className="text-muted-foreground">
                      Chưa có tài khoản?{" "}
                      <button
                        type="button"
                        onClick={() => switchView("signup")}
                        className="font-medium text-primary hover:underline"
                      >
                        Đăng ký ngay
                      </button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Nhớ mật khẩu?{" "}
                      <button
                        type="button"
                        onClick={() => switchView("login")}
                        className="font-medium text-primary hover:underline"
                      >
                        Đăng nhập
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LogoLoader size={60} />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthPageContent />
    </Suspense>
  );
}
