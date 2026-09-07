"use client";

/**
 * Migration Note: Header component migrated for Next.js
 * - Changed from react-router-dom Link to Next.js Link
 * - Must be a Client Component due to useState
 * - Enhanced with glassmorphism and premium animations
 * - Added auth-based navigation: show Dashboard button when logged in
 */

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  isLegalLayout?: boolean;
}

const Header = ({ isLegalLayout }: HeaderProps) => {
  const t = useTranslations("navigation");
  const { isAuthenticated, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > window.innerHeight / 4);
  });

  // isLoggedIn/isLoading giờ lấy từ useAuth singleton để tránh tạo client riêng gây refresh loop 429
  const isLoggedIn = isAuthenticated;

  return (
    <motion.header
      layout
      className={cn(
        "fixed inset-x-0 z-50 flex h-14 min-w-[380px] items-center transition-[background,border,border-radius,box-shadow,top] duration-500 ease-in-out md:h-16 md:min-w-[740px] lg:min-w-[1200px]",
        isScrolled
          ? "shadow-glow-soft top-2 mx-auto w-fit rounded-3xl border border-border/50 bg-background/80 backdrop-blur-xl"
          : "top-0 rounded-none bg-transparent"
      )}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-between",
          isScrolled ? "px-4 md:px-6" : "container mx-auto px-4 sm:px-6 lg:px-8"
        )}
      >
        <Link href="/" className="group flex items-center">
          <Image
            src="/images/logo-full.png"
            alt="Vielora"
            width={180}
            height={60}
            className={cn("w-auto", isScrolled ? "h-8 md:h-10" : "h-10 md:h-14")}
            priority
          />
        </Link>

        {!isLegalLayout && (
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/#features"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("features")}
            </Link>
            <Link
              href="/#pricing"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("pricing")}
            </Link>
            <Link
              href="/#demo"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("demo")}
            </Link>
            <Link
              href="/about-us"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("aboutUs")}
            </Link>
            <Link
              href="/posts"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {t("blog")}
            </Link>
          </nav>
        )}

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {!isLoading &&
            (isLoggedIn ? (
              <Button
                asChild
                size="sm"
                className="btn-glow bg-gradient-primary h-8 text-xs hover:opacity-90"
              >
                <NextLink href="/dashboard">
                  <LayoutDashboard className="h-3 w-3" />
                  {t("dashboard")}
                </NextLink>
              </Button>
            ) : (
              <>
                {!isScrolled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 border border-primary/30 text-xs text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
                  >
                    <NextLink href="/auth">{t("login")}</NextLink>
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  className="btn-glow bg-gradient-primary h-8 text-xs hover:opacity-90"
                >
                  <NextLink href="/auth?mode=signup">{t("getStarted")}</NextLink>
                </Button>
              </>
            ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="rounded-lg p-2 transition-colors hover:bg-muted/50 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={t("menu")}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="glass-lg absolute inset-x-4 top-16 rounded-3xl border border-border/50 bg-background/95 p-6 shadow-2xl backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-3">
            {!isLegalLayout && (
              <>
                <Link
                  href="/#features"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("features")}
                </Link>
                <Link
                  href="/#pricing"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("pricing")}
                </Link>
                <Link
                  href="/#demo"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("demo")}
                </Link>
                <Link
                  href="/about-us"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("aboutUs")}
                </Link>
                <Link
                  href="/posts"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("blog")}
                </Link>
              </>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Ngôn ngữ / Language:
                </span>
                <LanguageSwitcher />
              </div>
              {!isLoading &&
                (isLoggedIn ? (
                  <Button asChild size="sm" className="bg-gradient-primary h-8 w-full text-xs">
                    <NextLink href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                      {t("dashboard")}
                    </NextLink>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-full border border-primary/30 text-xs text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
                    >
                      <NextLink href="/auth" onClick={() => setIsMenuOpen(false)}>
                        {t("login")}
                      </NextLink>
                    </Button>
                    <Button asChild size="sm" className="bg-gradient-primary h-8 w-full text-xs">
                      <NextLink href="/auth?mode=signup" onClick={() => setIsMenuOpen(false)}>
                        {t("getStarted")}
                      </NextLink>
                    </Button>
                  </>
                ))}
            </div>
          </nav>
        </div>
      )}
    </motion.header>
  );
};

export default Header;
