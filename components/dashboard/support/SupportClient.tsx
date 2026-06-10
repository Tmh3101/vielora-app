"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, Mail, Loader2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { ESubscriptionPlan } from "@/types";
import type { Tables } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import { formatLocalTime } from "@/lib/utils/time";

interface SupportClientProps {
  initialUser: User | null;
  initialSubscription: Tables<"subscriptions"> | null;
  initialPlan: Tables<"plans"> | null;
  initialTickets: Tables<"support_tickets">[];
}

export default function SupportClient({
  initialUser,
  initialPlan,
  initialTickets,
}: SupportClientProps) {
  const router = useRouter();
  const { session, signOut } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState<Tables<"support_tickets">[]>(initialTickets || []);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const currentPlan =
    (initialPlan?.code as ESubscriptionPlan | undefined) || ESubscriptionPlan.Free;
  const userEmail = initialUser?.email || "";
  const userFullName = initialUser?.user_metadata?.full_name || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung yêu cầu.");
      return;
    }

    if (!session) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      router.push("/auth");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Gửi yêu cầu thất bại");
      }

      if (data?.success) {
        toast.success("Gửi yêu cầu hỗ trợ thành công!");
        setSubject("");
        setMessage("");
        setSubmitted(true);
        if (data?.ticket) {
          setTickets((prev) => [data.ticket, ...prev]);
        }
      } else {
        throw new Error(data?.error || "Gửi yêu cầu thất bại");
      }
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi, vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        fullName={userFullName}
        email={userEmail}
        currentPlanLabel={currentPlan}
        onSignOut={signOut}
      />

      <DashboardMobileHeader
        fullName={userFullName}
        email={userEmail}
        currentPlanLabel={currentPlan}
        onNavigateSettings={() => router.push("/dashboard/settings")}
        onSignOut={signOut}
      />

      <main className="lg:pl-64">
        <div className="container relative mx-auto px-4 pb-24 pt-12 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-8 flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Yêu cầu hỗ trợ
            </h1>
            <p className="text-muted-foreground">
              Gửi yêu cầu hỗ trợ hoặc báo cáo lỗi cho đội ngũ quản trị viên Vielora. Chúng tôi sẽ
              phản hồi sớm nhất qua email.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Form Section */}
            <div className="md:col-span-2">
              <Card className="border-border/50 bg-card/50 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Tạo Ticket hỗ trợ mới</CardTitle>
                  <CardDescription>
                    Mô tả rõ ràng vấn đề bạn gặp phải để chúng tôi hỗ trợ nhanh nhất có thể.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-8 text-center"
                    >
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">Gửi thành công!</h3>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        Ticket hỗ trợ của bạn đã được ghi nhận. Đội ngũ kỹ thuật sẽ xem xét và gửi
                        phản hồi tới email <strong className="text-foreground">{userEmail}</strong>.
                      </p>
                      <Button
                        onClick={() => setSubmitted(false)}
                        className="mt-6"
                        variant="outline"
                      >
                        Tạo yêu cầu mới
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium">
                          Chủ đề yêu cầu <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="subject"
                          placeholder="Ví dụ: Lỗi tích hợp Widget, Cập nhật thanh toán..."
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="border-border/60 bg-background/50 focus-visible:ring-primary"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium">
                          Nội dung chi tiết <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Mô tả chi tiết lỗi bạn đang gặp phải, bao gồm các bước gây ra lỗi hoặc mã bot liên quan..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          className="min-h-[160px] border-border/60 bg-background/50 focus-visible:ring-primary"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang gửi yêu cầu...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Gửi hỗ trợ
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Lịch sử yêu cầu hỗ trợ */}
              <div className="mt-8 space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Lịch sử yêu cầu
                </h2>
                {tickets.length === 0 ? (
                  <Card className="border-dashed border-border/60 bg-card/20 shadow-none">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                      Bạn chưa gửi yêu cầu hỗ trợ nào.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => {
                      const isExpanded = expandedTicketId === ticket.id;
                      const isResolved = ticket.status === "resolved";
                      return (
                        <Card
                          key={ticket.id}
                          className={`overflow-hidden border-border/50 bg-card/40 transition-all ${
                            isExpanded ? "ring-1 ring-primary/20" : ""
                          }`}
                        >
                          <div
                            onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                            className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/30"
                          >
                            <div className="min-w-0 flex-1 pr-4">
                              <h4 className="truncate text-sm font-semibold sm:text-base">
                                {ticket.subject}
                              </h4>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Gửi ngày: {formatLocalTime(ticket.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  isResolved
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "animate-pulse bg-amber-500/10 text-amber-500"
                                }`}
                              >
                                {isResolved ? "Đã xử lý" : "Đang chờ"}
                              </span>
                              <svg
                                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-4 border-t border-border/40 bg-muted/10 p-4 text-sm duration-200 animate-in fade-in-50">
                              <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Nội dung yêu cầu
                                </p>
                                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                  {ticket.message}
                                </p>
                              </div>

                              {ticket.admin_response ? (
                                <div className="-mx-4 -mb-4 space-y-2 border-t border-border/30 bg-primary/5 p-4 pt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                    Phản hồi từ Admin
                                  </p>
                                  <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                    {ticket.admin_response}
                                  </p>
                                  {ticket.resolved_at && (
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                      Giải quyết lúc:{" "}
                                      {new Date(ticket.resolved_at).toLocaleString("vi-VN")}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="border-t border-border/30 pt-3 text-xs italic text-muted-foreground">
                                  Yêu cầu của bạn đang được kỹ thuật viên xử lý.
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Contact & Policies Section */}
            <div className="space-y-6">
              <Card className="border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Kênh liên hệ khác</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email hỗ trợ</p>
                      <a
                        href="mailto:contact@vielora.vn"
                        className="text-sm text-primary hover:underline"
                      >
                        contact@vielora.vn
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 border-t border-border/40 pt-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Thời gian làm việc</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">24/7</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-primary/5 shadow-md">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-primary">Mẹo nhận phản hồi nhanh</h4>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-muted-foreground">
                    <li>Cung cấp chính xác tên Bot ID hoặc trang web của bạn.</li>
                    <li>Mô tả chi tiết thông báo lỗi (nếu có).</li>
                    <li>Đính kèm ảnh chụp màn hình qua email nếu lỗi phức tạp.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
