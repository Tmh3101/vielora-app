import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicBotAppleTouchIconPath } from "@/lib/public-bot/apple-touch-icon";
import { getPublicBotBranding, getPublicBotThemeColor } from "@/lib/public-bot/branding";

export const dynamic = "force-dynamic";

function getRequestOrigin(): string {
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ botSlug: string }>;
}): Promise<Metadata> {
  const { botSlug } = await params;
  const metadataBase = new URL(getRequestOrigin());
  const manifestHref = `/public-bot/${botSlug}/manifest`;
  const appleTouchIconPath = getPublicBotAppleTouchIconPath(botSlug);

  try {
    const supabase = await createServerClient();
    const bot = await getPublicBotBranding(supabase, botSlug);
    const title = bot?.name?.trim() || botSlug;
    const themeColor = getPublicBotThemeColor(bot?.widget_settings ?? null);

    return {
      metadataBase,
      title: {
        absolute: title,
      },
      manifest: manifestHref,
      themeColor,
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

    return {
      metadataBase,
      title: {
        absolute: botSlug,
      },
      manifest: manifestHref,
      themeColor: "#0f172a",
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

export default function PublicBotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}
