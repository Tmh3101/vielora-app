import type { Metadata } from "next";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: {
    absolute: "Vielora Dashboard",
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const adminClient = createAdminClient();
  const { data: bannedUser } = await adminClient
    .from("banned_users")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (bannedUser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background">
        <div className="mx-4 max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Tài khoản đã bị khóa</h2>
          <p className="mb-6 text-muted-foreground">
            Tài khoản của bạn đã bị quản trị viên khóa do vi phạm chính sách của chúng tôi. Bạn
            không thể sử dụng các tính năng của Vielora lúc này.
          </p>
          <div className="rounded-lg bg-muted/50 p-4 text-left text-sm">
            <span className="font-semibold text-foreground">Lý do: </span>
            {bannedUser.reason || "Không có lý do cụ thể."}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Vui lòng liên hệ{" "}
            <a href="mailto:contact@vielora.vn" className="text-primary hover:underline">
              contact@vielora.vn
            </a>{" "}
            để được hỗ trợ mở khóa.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
