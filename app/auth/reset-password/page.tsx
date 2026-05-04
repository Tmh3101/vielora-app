"use client";

/**
 * Reset Password page.
 * User arrives here from the email link sent by Supabase.
 * They enter a new password (with confirmation) and submit.
 */

import { useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Loader2, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";
import { LogoLoader } from "@/components/ui/logo-loader";

/* ------------------------------------------------------------------ */
/*  Password rules & strength indicator                                */
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

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const resetSchema = z
  .object({
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
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

function ResetPasswordContent() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    try {
      resetSchema.parse({ password, confirmPassword });
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.code === "same_password") {
          setErrors({ password: "Mật khẩu mới không được trùng với mật khẩu cũ." });
          return;
        }
        throw error;
      }

      setSuccess(true);
      toast({ title: "Thành công", description: "Mật khẩu đã được đặt lại." });

      // Auto redirect after 3 seconds
      setTimeout(() => router.push("/auth"), 3000);
    } catch (error: unknown) {
      console.error("Reset password error:", error);
      const raw = error instanceof Error ? error.message : "";

      let msg = "Có lỗi xảy ra. Vui lòng thử lại.";
      if (raw.includes("same_password")) {
        msg = "Mật khẩu mới không được trùng với mật khẩu cũ.";
      }

      toast({ title: "Lỗi", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
          href="/auth"
          className="group mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Quay lại đăng nhập
        </Link>

        <Card className="glass-lg shadow-glow-soft">
          {/* Gradient accent line */}
          <div className="bg-gradient-primary absolute left-0 right-0 top-0 h-1 rounded-t-lg" />

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
            <CardTitle className="heading-premium text-2xl">
              {success ? "Đặt lại thành công!" : "Đặt lại mật khẩu"}
            </CardTitle>
            <CardDescription>
              {success
                ? "Bạn sẽ được chuyển hướng đến trang đăng nhập..."
                : "Nhập mật khẩu mới cho tài khoản của bạn"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center space-y-4 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Mật khẩu đã được cập nhật. Đang chuyển hướng...
                </p>
                <Button variant="outline" onClick={() => router.push("/auth")}>
                  Đăng nhập ngay
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu mới</Label>
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

                  {password.length > 0 && <PasswordStrength password={password} />}
                </div>

                {/* Confirm new password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
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
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Đặt lại mật khẩu
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LogoLoader size={60} />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
