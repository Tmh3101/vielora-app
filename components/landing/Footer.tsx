/**
 * Migration Note: Footer component migrated for Next.js
 * - Changed from react-router-dom Link to Next.js Link
 * - Can be a Server Component (no hooks or browser APIs)
 * - Enhanced with subtle gradient accents and refined styling
 */

import Link from "next/link";
import Image from "next/image";
import { Mail, Facebook } from "lucide-react";

interface FooterProps {
  isLegalLayout?: boolean;
}

const Footer = ({ isLegalLayout }: FooterProps) => {
  return (
    <footer className="relative overflow-hidden bg-[#111626] pb-12 pt-16 text-secondary-foreground">
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
            <p className="max-w-sm leading-relaxed text-secondary-foreground/70">
              Tạo chatbot AI thông minh cho website của bạn trong vài phút. Hỗ trợ khách hàng 24/7
              với sức mạnh của Google Gemini.
            </p>
          </div>
          {/* Links - Products */}
          <div>
            {!isLegalLayout && (
              <>
                <h4 className="mb-4 font-semibold text-secondary-foreground">Sản phẩm</h4>
                <ul className="space-y-1 text-secondary-foreground/70">
                  <li>
                    <a
                      href="#features"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      Tính năng
                    </a>
                  </li>
                  <li>
                    <a
                      href="#pricing"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      Bảng giá
                    </a>
                  </li>
                  <li>
                    <a
                      href="#demo"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      Demo
                    </a>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Links - Support */}
          <div>
            {!isLegalLayout && (
              <>
                <h4 className="mb-4 font-semibold text-secondary-foreground">Hỗ trợ</h4>
                <ul className="space-y-1 text-secondary-foreground/70">
                  <li>
                    <Link
                      href="/about-us"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      Về chúng tôi
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://dx4u.gitbook.io/velora-docs"
                      className="link-underline inline-block py-1 transition-colors hover:text-secondary-foreground"
                    >
                      Tài liệu
                    </a>
                  </li>
                </ul>
              </>
            )}
          </div>

          {/* Links - Contact */}
          <div>
            <h4 className="mb-4 font-semibold text-secondary-foreground">Liên hệ</h4>
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
                  <Facebook
                    size={16}
                    className="text-secondary-foreground/40 transition-colors group-hover:text-primary"
                  />
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
            © {new Date().getFullYear()} Vielora. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-secondary-foreground/60">
            <a href="/terms" className="transition-colors hover:text-secondary-foreground">
              Điều khoản sử dụng
            </a>
            <a href="/privacy" className="transition-colors hover:text-secondary-foreground">
              Chính sách bảo mật
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
