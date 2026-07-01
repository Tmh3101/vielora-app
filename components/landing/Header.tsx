"use client";

/**
 * Migration Note: Header component migrated for Next.js
 * - Changed from react-router-dom Link to Next.js Link
 * - Must be a Client Component due to useState
 * - Enhanced with glassmorphism and premium animations
 * - Added auth-based navigation: show Dashboard button when logged in
 */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isLegalLayout?: boolean;
}

const Header = ({ isLegalLayout }: HeaderProps) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > window.innerHeight / 4);
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setIsLoading(false);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

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
            <a
              href="/#features"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Tính năng
            </a>
            <a
              href="/#pricing"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Bảng giá
            </a>
            <a
              href="/#demo"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Demo
            </a>
            <Link
              href="/about-us"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Về chúng tôi
            </Link>
            <Link
              href="/posts"
              className="link-underline py-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Blog
            </Link>
          </nav>
        )}

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {!isLoading &&
            (isLoggedIn ? (
              <Button
                asChild
                size="sm"
                className="btn-glow bg-gradient-primary h-8 text-xs hover:opacity-90"
              >
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-1 h-3 w-3" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                {!isScrolled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 border border-primary/30 text-xs text-muted-foreground text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
                  >
                    <Link href="/auth">Đăng nhập</Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  className="btn-glow bg-gradient-primary h-8 text-xs hover:opacity-90"
                >
                  <Link href="/auth?mode=signup">Bắt đầu miễn phí</Link>
                </Button>
              </>
            ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="rounded-lg p-2 transition-colors hover:bg-muted/50 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Menu className="h-5 w-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="animate-fade-in-up fixed left-0 right-0 top-14 z-40 border-t border-border/40 bg-background/100 shadow-lg backdrop-blur-lg md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {!isLegalLayout && (
              <>
                <a
                  href="/#features"
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tính năng
                </a>
                <a
                  href="/#pricing"
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bảng giá
                </a>
                <a
                  href="/#demo"
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Demo
                </a>
                <Link
                  href="/about-us"
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Về chúng tôi
                </Link>
                <Link
                  href="/posts"
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Blog
                </Link>
              </>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
              {!isLoading &&
                (isLoggedIn ? (
                  <Button asChild size="sm" className="bg-gradient-primary h-8 w-full text-xs">
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="h-8 w-full text-xs">
                      <Link href="/auth">Đăng nhập</Link>
                    </Button>
                    <Button asChild size="sm" className="bg-gradient-primary h-8 w-full text-xs">
                      <Link href="/auth?mode=signup">Bắt đầu miễn phí</Link>
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
