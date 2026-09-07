"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

interface FooterProps {
  isLegalLayout?: boolean;
}

const Footer = ({ isLegalLayout }: FooterProps) => {
  const t = useTranslations("footer");

  return (
    <footer className="relative overflow-hidden rounded-t-3xl bg-[#111626] pb-12 pt-16 text-secondary-foreground">
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="group mb-8 inline-flex items-center gap-2">
              <Image
                src="/images/logo-footer.png"
                alt="Vielora"
                width={280}
                height={80}
                className="h-16 w-auto rounded-xl border border-white/10 shadow-lg"
              />
            </Link>
            <p className="max-w-sm leading-relaxed text-secondary-foreground/70">{t("tagline")}</p>
          </div>
          {/* Links - Products */}
          <div>
            {!isLegalLayout && (
              <>
                <h4 className="mb-4 font-semibold text-secondary-foreground">{t("product")}</h4>
                <ul className="space-y-1 text-secondary-foreground/70">
                  <li>
                    <Link
                      href="/#features"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      {t("features")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#pricing"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      {t("pricing")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#demo"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      {t("demo")}
                    </Link>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Links - Support */}
          <div>
            {!isLegalLayout && (
              <>
                <h4 className="mb-4 font-semibold text-secondary-foreground">{t("resources")}</h4>
                <ul className="space-y-1 text-secondary-foreground/70">
                  <li>
                    <Link
                      href="/about-us"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      {t("about")}
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://dx4u.gitbook.io/velora-docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      {t("documentation")}
                    </a>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Links - Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-secondary-foreground">{t("contact")}</h4>
            <ul className="space-y-2 text-secondary-foreground/70">
              <li>
                <a
                  href="mailto:contact@vielora.vn"
                  className="group flex items-center gap-2 py-1 transition-colors hover:text-secondary-foreground"
                >
                  <Mail
                    size={16}
                    className="text-secondary-foreground/40 transition-colors group-hover:text-primary"
                  />
                  <span className="text-sm">contact@vielora.vn</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/vieloravn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 py-1 transition-colors hover:text-secondary-foreground"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-secondary-foreground/40 transition-colors group-hover:text-primary"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                  <span className="text-sm">facebook.com/vieloravn</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Powered by */}
          <div className="lg:justify-self-end">
            <a
              href="https://www.dx4u.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <Image
                src="/images/logo-dx4u.png"
                alt="Titops DX4U"
                width={64}
                height={64}
                className="h-14 w-14 rounded-2xl border border-white/10 bg-white/5 object-contain p-1.5 shadow-sm"
              />
              <div className="leading-tight">
                <p className="text-sm text-secondary-foreground/60">Powered by</p>
                <p className="text-md font-semibold text-secondary-foreground">Titops DX4U</p>
              </div>
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-secondary-foreground/10 pt-6 sm:flex-row">
          <p className="text-sm text-secondary-foreground/60">
            © {new Date().getFullYear()} Vielora. {t("copyright")}
          </p>
          <div className="flex items-center gap-6 text-sm text-secondary-foreground/60">
            <Link href="/terms" className="transition-colors hover:text-secondary-foreground">
              {t("terms")}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-secondary-foreground">
              {t("privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
