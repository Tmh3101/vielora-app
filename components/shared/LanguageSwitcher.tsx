"use client";

import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname as useIntlPathname, useRouter as useIntlRouter } from "@/i18n/navigation";
import { useRouter as useNextRouter } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ESystemLanguage } from "@/types/enums";
import { updateUserLocale } from "@/lib/i18n/update-locale";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const PUBLIC_I18N_PATHS = new Set(["/", "/about-us", "/posts", "/privacy", "/terms"]);

function isPublicI18nPath(pathname: string): boolean {
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (PUBLIC_I18N_PATHS.has(normalizedPath)) return true;
  if (normalizedPath.startsWith("/posts/")) return true;
  return false;
}

export interface LanguageSwitcherProps {
  className?: string;
  mode?: "auto" | "routing" | "cookie";
}

export function LanguageSwitcher({ className, mode = "auto" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const intlPathname = useIntlPathname();
  const intlRouter = useIntlRouter();
  const nextRouter = useNextRouter();
  const [isPending, startTransition] = useTransition();

  const nextLocale = (routing.locales.find((l) => l !== locale) ?? routing.defaultLocale) as string;

  const isRoutingMode =
    mode === "routing" ? true : mode === "cookie" ? false : isPublicI18nPath(intlPathname);

  const handleSwitch = () => {
    if (!nextLocale) return;

    if (isRoutingMode) {
      // Public routes: locale via URL prefix (next-intl routing)
      // Also persist for dashboard/auth cookie + Supabase
      try {
        // eslint-disable-next-line -- intentional cookie mutation
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // ignore cookie error (e.g. SSR)
      }
      updateUserLocale(nextLocale as ESystemLanguage).catch(() => {});
      intlRouter.push(intlPathname, { locale: nextLocale });
    } else {
      // Dashboard / Auth: cookie + Supabase + router.refresh()
      startTransition(async () => {
        try {
          // eslint-disable-next-line -- intentional cookie mutation
          document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        } catch {
          // ignore
        }
        try {
          await updateUserLocale(nextLocale as ESystemLanguage);
        } catch {
          // not logged in or network error — still refresh
        }
        nextRouter.refresh();
      });
    }
  };

  const label = nextLocale === ESystemLanguage.En ? "English" : "Tiếng Việt";

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95 disabled:opacity-50",
        className
      )}
      aria-label={`Switch to ${label}`}
      title={`Chuyển sang ${label}`}
    >
      <Globe className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
      <span>{nextLocale.toUpperCase()}</span>
    </button>
  );
}

// Alias for dashboard import compatibility
export const LanguageToggle = LanguageSwitcher;

export default LanguageSwitcher;
