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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface HeaderProps {
  isLegalLayout?: boolean;
}

const Header = ({ isLegalLayout }: HeaderProps) => {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setIsLoading(false);
    };
    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="glass-header fixed left-0 right-0 top-0 z-50 flex h-14 items-center md:h-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-18 flex items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center">
            <Image
              src="/images/logo-full.png"
              alt="Vielora"
              width={180}
              height={60}
              className="h-10 w-auto md:h-14"
              priority
            />
          </Link>

          {!isLegalLayout && (
            <>
              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-8 md:flex">
                <a
                  href="/#features"
                  className="link-underline py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tính năng
                </a>
                <a
                  href="/#pricing"
                  className="link-underline py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Bảng giá
                </a>
                <a
                  href="/#demo"
                  className="link-underline py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Demo
                </a>
                <Link
                  href="/about-us"
                  className="link-underline py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Về chúng tôi
                </Link>
                <Link
                  href="/posts"
                  className="link-underline py-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Blog
                </Link>
              </nav>
            </>
          )}

          {/* Desktop CTA - Auth based */}
          <div className="hidden items-center gap-3 md:flex">
            {!isLoading &&
              (isLoggedIn ? (
                <Button asChild className="btn-glow bg-gradient-primary hover:opacity-90">
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    asChild
                    className="border border-primary/30 text-muted-foreground text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
                  >
                    <Link href="/auth">Đăng nhập</Link>
                  </Button>
                  <Button asChild className="btn-glow bg-gradient-primary hover:opacity-90">
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
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="animate-fade-in-up absolute left-0 right-0 top-14 border-t border-border/40 bg-background/100 shadow-lg backdrop-blur-lg md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {!isLegalLayout && (
              <>
                <a
                  href="/#features"
                  className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tính năng
                </a>
                <a
                  href="/#pricing"
                  className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bảng giá
                </a>
                <a
                  href="/#demo"
                  className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Demo
                </a>
                <Link
                  href="/about-us"
                  className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Về chúng tôi
                </Link>
                <Link
                  href="/posts"
                  className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Blog
                </Link>
              </>
            )}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-4">
              {!isLoading &&
                (isLoggedIn ? (
                  <Button asChild className="bg-gradient-primary w-full">
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/auth">Đăng nhập</Link>
                    </Button>
                    <Button asChild className="bg-gradient-primary w-full">
                      <Link href="/auth?mode=signup">Bắt đầu miễn phí</Link>
                    </Button>
                  </>
                ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
