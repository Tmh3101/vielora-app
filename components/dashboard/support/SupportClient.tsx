"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, Mail, Loader2, Clock, CheckCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DashboardSidebar } from "@/components/dashboard/shared/DashboardSidebar";
import { PageHeader } from "@/components/dashboard/shared/PageHeader";
import { DashboardMobileHeader } from "@/components/dashboard/shared/DashboardMobileHeader";
import { DashboardMobileNav } from "@/components/dashboard/shared/DashboardMobileNav";
import { ESubscriptionPlan } from "@/types";
import type { Tables } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import { formatLocalTime } from "@/lib/utils/time";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard.support");
  const tCommon = useTranslations("dashboard.common");
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
      toast.error(t("fillAllFields"));
      return;
    }

    if (!session) {
      toast.error(t("sessionExpired"));
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
        throw new Error(data?.error || t("submitFailed"));
      }

      if (data?.success) {
        toast.success(t("submitSuccessToast"));
        setSubject("");
        setMessage("");
        setSubmitted(true);
        if (data?.ticket) {
          setTickets((prev) => [data.ticket, ...prev]);
        }
      } else {
        throw new Error(data?.error || t("submitFailed"));
      }
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      toast.error(error instanceof Error ? error.message : t("submitError"));
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
        <div className="container mx-auto space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <PageHeader title={t("title")} description={t("subtitle")} />

          <div className="grid gap-8 md:grid-cols-3">
            {/* Form Section */}
            <div className="md:col-span-2">
              <Card className="border-border/50 bg-card/50 shadow-md backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{t("sendTicket")}</CardTitle>
                  <CardDescription>{t("subtitle")}</CardDescription>
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
                      <h3 className="text-xl font-semibold text-foreground">
                        {tCommon("success")}
                      </h3>
                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        Ticket: <strong className="text-foreground">{userEmail}</strong>.
                      </p>
                      <Button
                        onClick={() => setSubmitted(false)}
                        className="mt-6"
                        variant="outline"
                      >
                        {t("sendTicket")}
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="subject" className="text-sm font-medium">
                          {t("ticketSubject")} <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="subject"
                          placeholder={t("subjectPlaceholder")}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="border-border/60 bg-background/50 focus-visible:ring-primary"
                          required
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium">
                          {t("ticketMessage")} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder={t("messagePlaceholder")}
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
                            {t("submitting")}
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            {t("submitTicket")}
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
                  {t("ticketHistory")}
                </h2>
                {tickets.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">{t("noTickets")}</p>
                  </div>
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
                                {t("sentDate")} {formatLocalTime(ticket.created_at)}
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
                                {isResolved ? t("statusResolved") : t("statusPending")}
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
                                  {t("requestContent")}
                                </p>
                                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                  {ticket.message}
                                </p>
                              </div>

                              {ticket.admin_response ? (
                                <div className="-mx-4 -mb-4 space-y-2 border-t border-border/30 bg-primary/5 p-4 pt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                    {t("adminResponse")}
                                  </p>
                                  <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                    {ticket.admin_response}
                                  </p>
                                  {ticket.resolved_at && (
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                      {t("resolvedAt")}{" "}
                                      {new Date(ticket.resolved_at).toLocaleString("vi-VN")}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="border-t border-border/30 pt-3 text-xs italic text-muted-foreground">
                                  {t("processingMessage")}
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
                  <CardTitle className="text-lg">{t("otherChannels")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("supportEmail")}</p>
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
                      <p className="text-sm font-medium">{t("workingHours")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">24/7</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <DashboardMobileNav />
    </div>
  );
}
