"use client";

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  MailCheck,
  Mail,
} from "lucide-react";
import { z } from "zod";
import { LogoLoader } from "@/components/ui/logo-loader";
import {
  checkEmailExists,
  loginWithPassword,
  LoginWithPasswordError,
} from "@/lib/services/auth.service";
import {
  LoginWithPasswordError as LoginWithPasswordErrorCode,
  OauthProvider,
  AuthView,
  SupabaseAuthEvent,
  OAUTH_ERROR_FAILED,
  PENDING_IOS_AUTH_KEY,
  OAUTH_COMPLETE_EVENT,
} from "@/lib/constants/auth";
import { ERROR_CODE_ACCESS_DENIED } from "@/lib/constants";
import type { OauthProviderType, AuthViewType } from "@/lib/constants/auth";
import { markPwaAuthReturn, isIOS, isStandaloneMode } from "@/lib/helpers/pwa-helpers";
import { getRootDomain } from "@/config";
import { getMainAppUrl } from "@/lib/utils/standalone-chat-url";

const PASSWORD_RULES = [
  { key: "minLength", labelKey: "strength.minLength", test: (v: string) => v.length >= 8 },
  { key: "uppercase", labelKey: "strength.uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", labelKey: "strength.lowercase", test: (v: string) => /[a-z]/.test(v) },
  { key: "digit", labelKey: "strength.digit", test: (v: string) => /[0-9]/.test(v) },
  {
    key: "special",
    labelKey: "strength.special",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
] as const;

function createSignUpSchema(t: (key: string) => string) {
  return z
    .object({
      email: z
        .string()
        .email(t("auth.validation.emailInvalid"))
        .max(255, { message: t("auth.validation.emailMaxLength") }),
      password: z
        .string()
        .min(8, t("auth.validation.passwordMinLength"))
        .regex(/[A-Z]/, t("auth.validation.passwordUppercase"))
        .regex(/[a-z]/, t("auth.validation.passwordLowercase"))
        .regex(/[0-9]/, t("auth.validation.passwordDigit"))
        .regex(/[^A-Za-z0-9]/, t("auth.validation.passwordSpecial"))
        .max(128, { message: t("auth.validation.passwordMaxLength") }),
      confirmPassword: z
        .string()
        .max(128, { message: t("auth.validation.confirmPasswordMaxLength") }),
      fullName: z
        .string()
        .min(2, t("auth.validation.fullNameMinLength"))
        .max(100, { message: t("auth.validation.fullNameMaxLength") }),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t("auth.validation.confirmPasswordMismatch"),
      path: ["confirmPassword"],
    });
}

function createSignInSchema(t: (key: string) => string) {
  return z.object({
    email: z
      .string()
      .email(t("auth.validation.emailInvalid"))
      .max(255, { message: t("auth.validation.emailMaxLength") }),
    password: z
      .string()
      .min(1, t("auth.validation.passwordRequired"))
      .max(128, { message: t("auth.validation.passwordMaxLength") }),
  });
}

function createForgotSchema(t: (key: string) => string) {
  return z.object({
    email: z
      .string()
      .email(t("auth.validation.emailInvalid"))
      .max(255, { message: t("auth.validation.emailMaxLength") }),
  });
}

function PasswordStrength({ password, t }: { password: string; t: (key: string) => string }) {
  const results = PASSWORD_RULES.map((r) => ({
    ...r,
    passed: r.test(password),
    label: t(`auth.${r.labelKey}`),
  }));
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

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getSafeRedirect(rawRedirect: string | null): string {
  if (!rawRedirect) return "/dashboard";
  const lower = rawRedirect.toLowerCase();
  if (
    lower === "/auth" ||
    lower.startsWith("/auth?") ||
    lower.startsWith("/auth#") ||
    lower.startsWith("/auth/")
  ) {
    return "/dashboard";
  }
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.includes("\\")) {
    return rawRedirect;
  }
  try {
    const parsed = new URL(rawRedirect);
    const p = parsed.pathname.toLowerCase();
    if (p === "/auth" || p.startsWith("/auth/")) return "/dashboard";
    const rootDomain = getRootDomain().toLowerCase().split(":")[0];
    const host = parsed.hostname.toLowerCase();
    if (
      host === rootDomain ||
      host.endsWith(`.${rootDomain}`) ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local")
    ) {
      return rawRedirect;
    }
  } catch {
    // Ignore invalid url format
  }
  return "/dashboard";
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations();

  const initialView: AuthViewType =
    searchParams.get("mode") === "signup" ? AuthView.SIGNUP : AuthView.LOGIN;
  const [view, setView] = useState<AuthViewType>(initialView);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<OauthProviderType | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forgotSent, setForgotSent] = useState(false);
  const [cooldownEmail, setCooldownEmail] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const handledOAuthErrorRef = useRef(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const normalizedEmail = email.trim().toLowerCase();
  const isLoginCooldownActive =
    view === AuthView.LOGIN && cooldownRemaining > 0 && normalizedEmail === cooldownEmail;

  const isPwaAuth = searchParams.get("pwa") === "1";
  const targetRedirect = useMemo(
    () => getSafeRedirect(searchParams.get("redirect") || searchParams.get("next")),
    [searchParams]
  );

  useEffect(() => {
    if (isPwaAuth) {
      markPwaAuthReturn(targetRedirect);
    }
  }, [isPwaAuth, targetRedirect]);

  useEffect(() => {
    const goToApp = (path: string) => {
      if (isPwaAuth) {
        window.location.replace(path);
        return;
      }
      window.location.href = path;
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore recovery event so password reset flow doesn't hijack this tab
      if (event === SupabaseAuthEvent.PASSWORD_RECOVERY) {
        return;
      }
      if (
        session?.user &&
        (event === SupabaseAuthEvent.SIGNED_IN || event === SupabaseAuthEvent.USER_UPDATED)
      ) {
        goToApp(targetRedirect);
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        goToApp(targetRedirect);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, targetRedirect, isPwaAuth]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const authError = searchParams.get("error");
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
    );

    const oauthFailed =
      authError === OAUTH_ERROR_FAILED || hashParams.get("error") === ERROR_CODE_ACCESS_DENIED;
    if (!oauthFailed) {
      handledOAuthErrorRef.current = false;
      return;
    }

    if (handledOAuthErrorRef.current) return;
    handledOAuthErrorRef.current = true;

    const oauthErrorMessage =
      hashParams.get("error") === ERROR_CODE_ACCESS_DENIED
        ? t("auth.errors.oauthCancelled")
        : t("auth.errors.oauthFailed");

    toast({
      title: t("auth.errors.generic"),
      description: oauthErrorMessage,
      variant: "destructive",
    });

    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.hash = "";
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchParams, toast, t]);

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
    (v: AuthViewType) => {
      resetForm();
      setCooldownEmail(null);
      setCooldownUntil(null);
      setCooldownRemaining(0);
      setView(v);
    },
    [resetForm]
  );

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining === 0) {
        setCooldownEmail(null);
        setCooldownUntil(null);
      }
    };

    updateCooldown();
    const timer = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const validate = useCallback(() => {
    try {
      if (view === AuthView.SIGNUP) {
        createSignUpSchema(t).parse({ email, password, confirmPassword, fullName });
      } else if (view === AuthView.LOGIN) {
        createSignInSchema(t).parse({ email, password });
      } else {
        createForgotSchema(t).parse({ email });
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
  }, [view, email, password, confirmPassword, fullName, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isLoginCooldownActive) {
      toast({
        title: t("auth.loginLocked"),
        description: t("auth.errors.loginCooldown"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (view === AuthView.SIGNUP) {
        try {
          const { exists } = await checkEmailExists(email);
          if (exists) throw new Error("User already registered");
        } catch (err: unknown) {
          const raw = err instanceof Error ? err.message : String(err);
          if (raw === "User already registered") {
            toast({
              title: t("auth.success.emailExists"),
              description: t("auth.success.emailExistsDesc"),
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
          setView(AuthView.SIGNUP_SUCCESS);
        }
      } else if (view === AuthView.LOGIN) {
        const { session } = await loginWithPassword(email, password);
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw error;

        setCooldownUntil(null);
        setCooldownRemaining(0);
        setCooldownEmail(null);
        toast({
          title: t("auth.success.loginTitle"),
          description: t("auth.success.loginDesc"),
        });
      } else if (view === AuthView.FORGOT) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setForgotSent(true);
      }
    } catch (error: unknown) {
      console.error("Auth error:", error);
      const raw = error instanceof Error ? error.message : "";

      let msg = t("auth.errors.generic");
      if (
        error instanceof LoginWithPasswordError &&
        error.code === LoginWithPasswordErrorCode.LOGIN_COOLDOWN
      ) {
        const nextCooldownUntil = error.lockedUntil
          ? new Date(error.lockedUntil).getTime()
          : Date.now() + Math.max(error.retryAfter || 0, 1) * 1000;
        const retryAfter = Math.max(
          error.retryAfter || 0,
          Math.ceil((nextCooldownUntil - Date.now()) / 1000)
        );

        setCooldownEmail(email.trim().toLowerCase());
        setCooldownUntil(nextCooldownUntil);
        setCooldownRemaining(retryAfter);
        msg = t("auth.errors.loginCooldown");
      } else if (
        error instanceof LoginWithPasswordError &&
        error.code === LoginWithPasswordErrorCode.INVALID_CREDENTIALS
      ) {
        msg =
          typeof error.attemptsRemaining === "number"
            ? t("auth.errors.invalidCredentialsAttempts", { count: error.attemptsRemaining })
            : t("auth.errors.invalidCredentials");
      } else if (raw === "Invalid login credentials") {
        msg = t("auth.errors.invalidCredentials");
      } else if (raw === "User already registered") {
        msg = t("auth.errors.userAlreadyRegistered");
      } else if (raw.includes("Email not confirmed")) {
        msg = t("auth.errors.emailNotConfirmed");
      }

      toast({ title: t("auth.errors.generic"), description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: OauthProviderType) => {
    setIsOAuthLoading(provider);
    try {
      const isStandalone = isStandaloneMode();
      const mainAppUrl = getMainAppUrl();
      const callbackUrl = new URL(`${mainAppUrl}/auth/callback`);
      if (targetRedirect && targetRedirect !== "/dashboard") {
        callbackUrl.searchParams.set("next", targetRedirect);
      }

      if (isStandalone && isIOS()) {
        const iosSid = crypto.randomUUID();
        try {
          localStorage.setItem(PENDING_IOS_AUTH_KEY, iosSid);
        } catch {
          // ignore quota or security error
        }
        callbackUrl.searchParams.set("ios_sid", iosSid);

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: callbackUrl.toString() },
        });
        if (error) throw error;
      } else if (isStandalone) {
        callbackUrl.searchParams.set("popup", "1");

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            skipBrowserRedirect: true,
            redirectTo: callbackUrl.toString(),
          },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("No OAuth URL returned from provider");

        const width = 500;
        const height = 700;
        const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
        const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

        const popup = window.open(
          data.url,
          "oauth_popup",
          `width=${width},height=${height},left=${left},top=${top},popup=yes,noopener=no`
        );

        let checkPopupClosed: NodeJS.Timeout | null = null;

        const handlePopupMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin && event.origin !== mainAppUrl) return;
          if (event.data?.type === OAUTH_COMPLETE_EVENT) {
            window.removeEventListener("message", handlePopupMessage);
            if (checkPopupClosed) clearInterval(checkPopupClosed);
            supabase.auth.getUser().then(({ data: { user } }) => {
              if (user) {
                if (isPwaAuth) {
                  window.location.replace(targetRedirect);
                } else {
                  window.location.href = targetRedirect;
                }
              }
            });
          }
        };

        window.addEventListener("message", handlePopupMessage);

        checkPopupClosed = setInterval(() => {
          if (popup?.closed) {
            if (checkPopupClosed) clearInterval(checkPopupClosed);
            window.removeEventListener("message", handlePopupMessage);
            setIsOAuthLoading(null);
          }
        }, 1000);
      } else {
        if (isPwaAuth) {
          markPwaAuthReturn(targetRedirect);
        }
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: callbackUrl.toString() },
        });
        if (error) throw error;
      }
    } catch (error: unknown) {
      console.error("OAuth error:", error);
      toast({
        title: t("auth.errors.generic"),
        description: t("auth.errors.oauthProviderFailed", {
          provider: provider === OauthProvider.GOOGLE ? "Google" : "GitHub",
        }),
        variant: "destructive",
      });
      setIsOAuthLoading(null);
    }
  };

  const heading = useMemo(() => {
    switch (view) {
      case AuthView.SIGNUP:
        return { title: t("auth.createAccount"), desc: t("auth.createAccountDesc") };
      case AuthView.FORGOT:
        return { title: t("auth.forgotPassword"), desc: t("auth.forgotPasswordDesc") };
      case AuthView.SIGNUP_SUCCESS:
        return { title: t("auth.signupSuccess"), desc: t("auth.signupSuccessDesc") };
      default:
        return {
          title: t("auth.login"),
          desc: isPwaAuth ? t("auth.loginPwaDesc") : t("auth.loginDesc"),
        };
    }
  }, [view, isPwaAuth, t]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="grid-pattern absolute inset-0 opacity-30" />

      <div className="orb orb-primary animate-float-slow -left-48 -top-48 h-96 w-96" />
      <div className="orb orb-accent animate-float-delayed -bottom-40 -right-40 h-80 w-80" />
      <div className="orb orb-primary animate-float right-1/4 top-1/4 h-48 w-48 opacity-50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={isPwaAuth ? targetRedirect.split("?")[0] || "/" : "/"}
            className="group inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            {isPwaAuth ? t("auth.backToChat") : t("auth.backToHome")}
          </Link>
          <LanguageSwitcher mode="cookie" />
        </div>

        <Card className="glass-lg shadow-glow-soft">
          <div className="bg-gradient-primary absolute left-0 right-0 top-0 h-1 rounded-t-lg" />

          {!(view === AuthView.FORGOT && forgotSent) && (
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
              {view !== AuthView.SIGNUP_SUCCESS && (
                <>
                  <CardTitle className="heading-premium text-2xl">{heading.title}</CardTitle>
                  <CardDescription>{heading.desc}</CardDescription>
                </>
              )}
            </CardHeader>
          )}

          <CardContent className={view === AuthView.FORGOT && forgotSent ? "pt-8" : ""}>
            {view === AuthView.SIGNUP_SUCCESS && (
              <div className="-mt-4 flex flex-col items-center space-y-6 pb-4">
                <div className="flex w-auto items-center justify-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <MailCheck className="h-6 w-6 text-green-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("auth.signupSuccessTitle")}
                  </h2>
                </div>

                <div className="max-w-sm px-4">
                  <p className="text-md text-center leading-relaxed text-muted-foreground">
                    {t("auth.signupSuccessEmailSent")}{" "}
                    <strong className="text-foreground">{email}</strong>.{" "}
                    {t("auth.signupSuccessCheckEmail")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="hover:border-primary/50 hover:bg-white hover:text-primary hover:shadow-sm hover:shadow-primary/20"
                  onClick={() => switchView(AuthView.LOGIN)}
                >
                  {t("auth.backToLogin")}
                </Button>
              </div>
            )}

            {view === AuthView.FORGOT && forgotSent && (
              <div className="flex flex-col items-center space-y-4 py-2">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                    <Mail className="h-6 w-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {t("auth.emailSentTitle")}
                  </h2>
                </div>

                <div className="max-w-sm px-4">
                  <p className="text-md text-center leading-relaxed text-muted-foreground">
                    {t("auth.emailSentDesc")} <strong className="text-foreground">{email}</strong>{" "}
                    {t("auth.emailSentRegistered")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="hover:border-primary/50 hover:bg-white hover:text-primary hover:shadow-sm hover:shadow-primary/20"
                  onClick={() => switchView(AuthView.LOGIN)}
                >
                  {t("auth.backToLogin")}
                </Button>
              </div>
            )}

            {view !== AuthView.SIGNUP_SUCCESS && !(view === AuthView.FORGOT && forgotSent) && (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {view === AuthView.SIGNUP && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                      <div>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder={t("auth.fullNamePlaceholder")}
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

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("auth.email")}</Label>
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

                  {view !== AuthView.FORGOT && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t("auth.password")}</Label>
                        {view === AuthView.LOGIN && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => switchView(AuthView.FORGOT)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {t("auth.forgotPasswordLink")}
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
                            disabled={isLoading || isLoginCooldownActive}
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
                        {isLoginCooldownActive && (
                          <p className="pt-1 text-xs text-destructive">
                            {t("auth.cooldownRetryAfter", {
                              time: formatCooldown(cooldownRemaining),
                            })}
                          </p>
                        )}
                      </div>

                      {view === AuthView.SIGNUP && password.length > 0 && (
                        <PasswordStrength password={password} t={(key) => t(key)} />
                      )}
                    </div>
                  )}

                  {view === AuthView.SIGNUP && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
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

                  <Button
                    type="submit"
                    className="bg-gradient-primary btn-glow h-11 w-full"
                    disabled={isLoading || isLoginCooldownActive}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("auth.processing")}
                      </>
                    ) : isLoginCooldownActive ? (
                      t("auth.loginLocked")
                    ) : view === AuthView.SIGNUP ? (
                      <>{t("auth.createAccountBtn")}</>
                    ) : view === AuthView.FORGOT ? (
                      t("auth.sendResetLink")
                    ) : (
                      t("auth.loginBtn")
                    )}
                  </Button>
                </form>

                {view !== AuthView.FORGOT && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/60" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          {t("auth.orContinueWith")}
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

                <div className="mt-6 text-center text-sm">
                  {view === AuthView.SIGNUP ? (
                    <p className="text-muted-foreground">
                      {t("auth.alreadyHaveAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => switchView(AuthView.LOGIN)}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("auth.loginLink")}
                      </button>
                    </p>
                  ) : view === AuthView.LOGIN ? (
                    <p className="text-muted-foreground">
                      {t("auth.noAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => switchView(AuthView.SIGNUP)}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("auth.signupLink")}
                      </button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      {t("auth.rememberPassword")}{" "}
                      <button
                        type="button"
                        onClick={() => switchView(AuthView.LOGIN)}
                        className="font-medium text-primary hover:underline"
                      >
                        {t("auth.loginLink")}
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
