"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  CalendarClock,
  Check,
  Copy,
  Globe,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionBanner } from "@/components/dashboard/overview/SubscriptionBanner";
import { SSOButton } from "@/components/shopify/SSOButton";
import { getShopifyIdToken, useShopifyFetch } from "@/hooks/useShopifyFetch";
import type { CreditSummary } from "@/lib/services/credit.service";
import type { Tables } from "@/lib/supabase/types";
import { getStatusColor, getStatusText } from "@/lib/helpers/bot-helpers";
import { EBotStatus, ESubscriptionPlan } from "@/types";

interface IBot {
  id: string;
  name: string;
  status: string;
  domain: string | null;
  avatar_url: string | null;
  is_stopped: boolean;
  last_crawl_at: string | null;
}

type ShopifyDashboardStats = {
  messagesThisMonth: number;
  totalConversations: number;
  botCount: number;
  botsLimit: number;
  hasSubscription: boolean;
};

type ShopifyDashboardData = {
  bots: IBot[];
  stats: ShopifyDashboardStats;
  subscription: Tables<"subscriptions"> | null;
  currentPlan: ESubscriptionPlan;
  creditSummary: CreditSummary | null;
  indexedPagesByBot: Record<string, number>;
};

type ShopifyCallbackError = {
  code: string | null;
  message: string | null;
  shop: string | null;
};

const defaultDashboardData: ShopifyDashboardData = {
  bots: [],
  stats: {
    messagesThisMonth: 0,
    totalConversations: 0,
    botCount: 0,
    botsLimit: 1,
    hasSubscription: false,
  },
  subscription: null,
  currentPlan: ESubscriptionPlan.Free,
  creditSummary: null,
  indexedPagesByBot: {},
};

function formatLastCrawlDate(value: string | null) {
  if (!value) return "Chưa crawl";
  return new Date(value).toLocaleDateString("vi-VN");
}

function getSystemErrorCopy(error: string) {
  const isExpiredToken =
    error.includes('"exp" claim timestamp check failed') ||
    error.toLowerCase().includes("session token");

  if (isExpiredToken) {
    return {
      title: "Phiên Shopify đã hết hạn",
      description:
        "Shopify session token chỉ có hiệu lực trong thời gian ngắn. Hãy tải lại app từ Shopify Admin để App Bridge cấp token mới.",
      detailLabel: "Chi tiết token",
    };
  }

  return {
    title: "Lỗi cấu hình hệ thống",
    description:
      "Vielora chưa thể tải dữ liệu Shopify dashboard. Vui lòng tải lại trang hoặc kết nối lại Shopify nếu lỗi vẫn tiếp diễn.",
    detailLabel: "Chi tiết lỗi",
  };
}

export default function ShopifyDashboardPage() {
  const shopifyFetch = useShopifyFetch();
  const [dashboardData, setDashboardData] = useState<ShopifyDashboardData>(defaultDashboardData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<ShopifyCallbackError | null>(null);
  const [copiedBotId, setCopiedBotId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");

    if (authError) {
      setCallbackError({
        code: params.get("auth_error_code"),
        message: params.get("auth_error_message"),
        shop: params.get("shop"),
      });
      setLoading(false);
      return;
    }

    async function loadEmbeddedData() {
      try {
        const response = await shopifyFetch("/api/shopify/v1/bots");
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.message || "Failed to fetch data");
        }

        setDashboardData({
          bots: json.data?.bots ?? [],
          stats: {
            ...defaultDashboardData.stats,
            ...(json.data?.stats ?? {}),
          },
          subscription: json.data?.subscription ?? null,
          currentPlan: (json.data?.currentPlan as ESubscriptionPlan) ?? ESubscriptionPlan.Free,
          creditSummary: json.data?.creditSummary ?? null,
          indexedPagesByBot: json.data?.indexedPagesByBot ?? {},
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    loadEmbeddedData();
  }, [shopifyFetch]);

  function reconnectShopify() {
    const shop = callbackError?.shop;
    if (!shop) return;

    const reconnectUrl = new URL("/api/shopify/auth", window.location.origin);
    reconnectUrl.searchParams.set("shop", shop);

    try {
      window.top?.location.assign(reconnectUrl.toString());
    } catch {
      window.location.assign(reconnectUrl.toString());
    }
  }

  async function copyBotId(botId: string) {
    try {
      await navigator.clipboard.writeText(botId);
      setCopiedBotId(botId);
      toast.success("Đã copy Bot ID");
      window.setTimeout(() => {
        setCopiedBotId((current) => (current === botId ? null : current));
      }, 1600);
    } catch (error) {
      console.error("Copy bot id failed:", error);
      toast.error("Không thể copy Bot ID. Vui lòng thử lại.");
    }
  }

  async function openVieloraDashboardPath(path: string) {
    const popup = window.open("about:blank", "_blank");

    if (!popup) {
      toast.error("Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép popup để mở dashboard.");
      return;
    }

    try {
      const token = await getShopifyIdToken();
      if (!token) {
        throw new Error("Missing Shopify session token");
      }

      const ssoUrl = new URL("/api/shopify/sso", window.location.origin);
      ssoUrl.searchParams.set("token", token);
      ssoUrl.searchParams.set("return_to", path);

      popup.location.replace(ssoUrl.toString());
      popup.focus();
    } catch (error) {
      popup.close();
      console.error("Shopify dashboard SSO launch failed:", error);
      toast.error("Không thể mở dashboard Vielora. Vui lòng thử lại từ Shopify Admin.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Đang tải cấu hình Vielora...</span>
      </div>
    );
  }

  if (error) {
    const systemErrorCopy = getSystemErrorCopy(error);
    const shop = new URLSearchParams(window.location.search).get("shop");

    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="dot-pattern absolute inset-0 opacity-50" />
        <div className="orb orb-primary -left-24 top-12 h-72 w-72 opacity-40" />
        <div className="orb orb-accent -bottom-28 right-0 h-80 w-80 opacity-30" />

        <Card className="glass-glow relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl">
          <div className="grid md:grid-cols-[0.82fr_1.18fr]">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden border-b border-border/50 bg-card/60 p-6 sm:p-8 md:border-b-0 md:border-r">
              <div className="bg-gradient-primary absolute -right-20 -top-20 h-44 w-44 rounded-full opacity-10 blur-3xl" />
              <div className="bg-gradient-primary absolute -bottom-24 left-8 h-56 w-56 rounded-full opacity-10 blur-3xl" />

              <div className="relative">
                <div className="glass-primary mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Shopify Session
                </div>
                <Image
                  src="/images/partners/shopify-logo.png"
                  alt="Shopify"
                  width={144}
                  height={72}
                  className="h-16 w-36 object-contain px-1"
                />
              </div>

              <div className="relative mt-6 space-y-3">
                <h1 className="heading-premium text-2xl font-semibold leading-tight text-foreground">
                  Cần làm mới <span className="text-gradient-animated">phiên kết nối</span>
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  App Bridge cần một token mới từ Shopify Admin để tải dữ liệu dashboard an toàn.
                </p>
              </div>
            </div>

            <div className="bg-background/70 p-6 backdrop-blur-md sm:p-8">
              <CardHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="glass-primary shadow-glow-sm mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xl leading-7 text-slate-950">
                      {systemErrorCopy.title}
                    </CardTitle>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {systemErrorCopy.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="mt-6 space-y-5 p-0">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-primary">
                    {systemErrorCopy.detailLabel}
                  </div>
                  <p className="max-h-28 overflow-auto break-words font-mono text-xs leading-5 text-foreground/80">
                    {error}
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tải lại trang
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!shop) return;
                      const reconnectUrl = new URL("/api/shopify/auth", window.location.origin);
                      reconnectUrl.searchParams.set("shop", shop);
                      try {
                        window.top?.location.assign(reconnectUrl.toString());
                      } catch {
                        window.location.assign(reconnectUrl.toString());
                      }
                    }}
                    disabled={!shop}
                    className="bg-gradient-primary btn-glow hover:opacity-90"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Kết nối lại Shopify
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (callbackError) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="dot-pattern absolute inset-0 opacity-50" />
        <div className="orb orb-primary -left-24 top-12 h-72 w-72 opacity-40" />
        <div className="orb orb-accent -bottom-28 right-0 h-80 w-80 opacity-30" />

        <Card className="glass-glow relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl">
          <div className="grid md:grid-cols-[0.82fr_1.18fr]">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden border-b border-border/50 bg-card/60 p-6 sm:p-8 md:border-b-0 md:border-r">
              <div className="bg-gradient-primary absolute -right-20 -top-20 h-44 w-44 rounded-full opacity-10 blur-3xl" />
              <div className="bg-gradient-primary absolute -bottom-24 left-8 h-56 w-56 rounded-full opacity-10 blur-3xl" />

              <div className="relative">
                <div className="glass-primary mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Shopify OAuth
                </div>
                <Image
                  src="/images/partners/shopify-logo.png"
                  alt="Shopify"
                  width={144}
                  height={72}
                  className="h-16 w-36 object-contain px-1"
                />
              </div>

              <div className="relative mt-6 space-y-3">
                <h1 className="heading-premium text-2xl font-semibold leading-tight text-foreground">
                  Kết nối cần được <span className="text-gradient-animated">xác thực lại</span>
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  Vielora chưa hoàn tất bước OAuth với Shopify. Vui lòng kết nối lại để quản lý
                  chatbot trong Shopify Admin.
                </p>
              </div>
            </div>

            <div className="bg-background/70 p-6 backdrop-blur-md sm:p-8">
              <CardHeader className="p-0">
                <div className="flex items-center gap-3">
                  <div className="glass-primary shadow-glow-sm mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xl leading-7 text-slate-950">
                      Cần kết nối lại Shopify
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="mt-6 space-y-5 p-0">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Store className="h-4 w-4 text-primary" />
                    {callbackError.shop || "Không xác định cửa hàng"}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Thông tin này được lấy từ callback URL để khởi động lại xác thực đúng store.
                  </p>
                </div>

                {(callbackError.code || callbackError.message) && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase text-primary">
                      Chi tiết lỗi
                    </div>
                    <div className="space-y-1 break-words font-mono text-xs leading-5 text-foreground/80">
                      {callbackError.code && <div>code: {callbackError.code}</div>}
                      {callbackError.message && <div>message: {callbackError.message}</div>}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    onClick={reconnectShopify}
                    disabled={!callbackError.shop}
                    className="bg-gradient-primary btn-glow shrink-0 hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Kết nối lại Shopify
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const { bots, stats, subscription, currentPlan, creditSummary, indexedPagesByBot } =
    dashboardData;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="dot-pattern absolute inset-0 opacity-40" />
      <div className="orb orb-primary -left-24 top-16 h-72 w-72 opacity-30" />
      <div className="orb orb-accent -bottom-32 right-0 h-80 w-80 opacity-25" />

      <main className="container relative z-10 mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-5 rounded-2xl border border-border/50 bg-background/70 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="glass-primary mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Shopify App Bridge Active
            </div>
            <h1 className="heading-premium text-3xl font-bold tracking-tight text-foreground">
              <span className="text-gradient-animated">Vielora</span> Shopify Dashboard
            </h1>
          </div>

          <SSOButton
            label="Mở dashboard Vielora"
            loadingLabel="Đang mở dashboard..."
            className="bg-gradient-primary btn-glow shadow-glow-sm h-11 px-5 hover:opacity-90"
          />
        </section>

        {subscription && (
          <SubscriptionBanner
            subscription={subscription}
            currentPlan={currentPlan}
            creditsUsedThisMonth={creditSummary?.creditsUsedThisMonth ?? 0}
            creditsTotalThisMonth={creditSummary?.totalCreditsThisMonth ?? 0}
            usagePercent={creditSummary?.usagePercent ?? 0}
            paygCredits={creditSummary?.paygCredits ?? 0}
            onUpgrade={() => void openVieloraDashboardPath("/dashboard/upgrade")}
            onBuyCredits={() => void openVieloraDashboardPath("/dashboard/upgrade")}
          />
        )}

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="card-stat">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Tin nhắn tháng này
            </CardDescription>
            <CardTitle className="text-3xl">{stats.messagesThisMonth}</CardTitle>
          </Card>

          <Card className="card-stat">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Cuộc hội thoại
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalConversations}</CardTitle>
          </Card>

          <Card className="card-stat col-span-2 lg:col-span-1">
            <CardDescription className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Chatbots
            </CardDescription>
            <CardTitle className="text-3xl">
              {stats.botCount}
              {stats.hasSubscription && (
                <span className="text-lg font-normal text-muted-foreground">
                  /{stats.botsLimit}
                </span>
              )}
            </CardTitle>
          </Card>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="heading-premium text-xl font-bold">Chatbots của bạn</h2>
              <p className="text-sm text-muted-foreground">
                Quản lý nhanh các chatbot đang kết nối với Shopify store.
              </p>
            </div>
          </div>

          {bots.length === 0 ? (
            <Card className="glass-lg py-16 text-center">
              <CardContent>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10">
                  <Bot className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">Chưa có chatbot nào</h3>
                <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                  Mở dashboard Vielora để tạo chatbot đầu tiên và đồng bộ vào Shopify.
                </p>
                <SSOButton
                  label="Mở dashboard Vielora"
                  loadingLabel="Đang mở dashboard..."
                  className="bg-gradient-primary btn-glow hover:opacity-90"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {bots.map((bot) => {
                const isReady = bot.status === EBotStatus.Ready && !bot.is_stopped;
                const isCopied = copiedBotId === bot.id;

                return (
                  <Card key={bot.id} className="card-bot group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="group-hover:shadow-glow-sm h-12 w-12 rounded-2xl transition-shadow">
                            <AvatarImage
                              src={bot.avatar_url || undefined}
                              alt={bot.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                              <Bot className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <CardTitle className="truncate text-lg">{bot.name}</CardTitle>
                            <CardDescription className="flex min-w-0 items-center gap-1">
                              <Globe className="h-3 w-3 shrink-0" />
                              <span className="truncate">{bot.domain || "Chưa có domain"}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="glass flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1">
                          <span
                            className={`h-2 w-2 rounded-full ${getStatusColor(bot.status, bot.is_stopped)} ${
                              isReady ? "animate-pulse" : ""
                            }`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {getStatusText(bot.status, bot.is_stopped)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-muted/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">Bot ID</p>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-primary hover:text-white"
                            onClick={() => void copyBotId(bot.id)}
                            aria-label={`Copy bot ID ${bot.name}`}
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        <p className="font-mono text-xs font-semibold text-foreground">{bot.id}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Trang đã index</p>
                          <p className="font-semibold text-foreground">
                            {indexedPagesByBot[bot.id] || 0}
                          </p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3 w-3" />
                            Crawl lần cuối
                          </p>
                          <p className="font-semibold text-foreground">
                            {formatLastCrawlDate(bot.last_crawl_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
