import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/**
 * Migration Note: Root layout replaces the old src/main.tsx and index.html
 * This is a Server Component by default in Next.js App Router
 */

const inter = Inter({ subsets: ["latin"] });

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vielora.vn");

// Root icons (app/icon.png, app/apple-icon.png) apply to the main app only.
// Public bot subdomains override icons in app/public-bot/[botSlug]/layout.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Vielora - Tạo AI Chatbot từ Website, CSKH 24/7 Không Cần Code",
    template: "%s | Vielora - AI Chatbot Cho Doanh Nghiệp",
  },
  description:
    "Vielora là nền tảng SaaS tạo Chatbot AI thông minh từ dữ liệu website. Chỉ cần nhập URL, AI tự động học nội dung và trả lời khách hàng 24/7. Công nghệ RAG, không cần code. Dùng thử miễn phí.",

  keywords: [
    "AI Chatbot",
    "Tạo Chatbot AI",
    "Chatbot từ website",
    "CSKH tự động",
    "Chatbot AI Việt Nam",
    "Titops DX4U",
    "Vielora",
    "RAG Chatbot",
    "chăm sóc khách hàng tự động",
    "AI cho doanh nghiệp",
  ],

  authors: [{ name: "Titops DX4U" }],
  creator: "Titops DX4U",
  publisher: "Titops DX4U",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: { canonical: "/" },

  openGraph: {
    title: "Vielora - Tạo AI Chatbot từ Website, CSKH 24/7 Không Cần Code",
    description:
      "Nền tảng SaaS tạo Chatbot AI tự động hóa chăm sóc khách hàng với công nghệ RAG. Chỉ cần nhập URL website, AI sẽ tự động học nội dung và tạo chatbot thông minh trong 5 phút.",
    url: "/",
    siteName: "Vielora",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/ogi.png",
        width: 1200,
        height: 630,
        alt: "Vielora - Nền tảng tạo AI Chatbot từ website",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vielora - AI Chatbot Cho Doanh Nghiệp",
    description: "Tạo AI Chatbot thông minh từ dữ liệu website. CSKH 24/7 không cần code.",
    images: ["/ogi.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
