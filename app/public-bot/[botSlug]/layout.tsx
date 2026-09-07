import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicBotAppleTouchIconPath } from "@/lib/public-bot/apple-touch-icon";
import { getPublicBotThemeColor, getPublicBotPwaVersion } from "@/lib/helpers/pwa-helpers";
import { getPublicBotBranding } from "@/lib/services/bot.service";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getDashboardLocale } from "@/lib/i18n/dashboard-locale";

export const dynamic = "force-dynamic";

function getRequestOrigin(): string {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ botSlug: string }>;
}): Promise<Viewport> {
  const { botSlug } = await params;
  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const themeColor = getPublicBotThemeColor(bot?.widget_settings ?? null);
    return {
      themeColor,
    };
  } catch {
    return {
      themeColor: "#0f172a",
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ botSlug: string }>;
}): Promise<Metadata> {
  const { botSlug } = await params;
  const metadataBase = new URL(getRequestOrigin());

  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const pwaVersion = getPublicBotPwaVersion(bot?.pwa_updated_at);
    const title = bot?.name?.trim() || botSlug;
    const manifestHref = `/public-bot/${botSlug}/manifest`;
    const appleTouchIconPath = getPublicBotAppleTouchIconPath(botSlug, pwaVersion);

    return {
      metadataBase,
      title: {
        absolute: title,
      },
      manifest: manifestHref,
      icons: {
        icon: appleTouchIconPath,
        shortcut: appleTouchIconPath,
        apple: [
          {
            url: appleTouchIconPath,
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      appleWebApp: {
        capable: true,
        title,
        statusBarStyle: "default",
      },
    };
  } catch (error) {
    console.error("Failed to build public bot metadata:", error);

    const manifestHref = `/public-bot/${botSlug}/manifest`;
    const appleTouchIconPath = getPublicBotAppleTouchIconPath(botSlug);

    return {
      metadataBase,
      title: {
        absolute: botSlug,
      },
      manifest: manifestHref,
      icons: {
        icon: appleTouchIconPath,
        shortcut: appleTouchIconPath,
        apple: [
          {
            url: appleTouchIconPath,
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      appleWebApp: {
        capable: true,
        title: botSlug,
        statusBarStyle: "default",
      },
    };
  }
}

export default async function PublicBotLayout({ children }: { children: React.ReactNode }) {
  const locale = await getDashboardLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <Script id="public-bot-service-worker" strategy="afterInteractive">
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('/sw.js').catch(function (error) {
                console.error('Vielora PWA service worker registration failed:', error);
              });
            });
          }
        `}
      </Script>
    </NextIntlClientProvider>
  );
}
