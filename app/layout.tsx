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

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Vielora - Nền tảng SaaS xây dựng AI Chatbot",
    template: "%s | Vielora",
  },
  description:
    "Chỉ cần nhập URL website, AI sẽ tự động học nội dung và tạo chatbot thông minh. Giải pháp CSKH 24/7 không cần code.",

  openGraph: {
    title: "Vielora - Nền tảng SaaS xây dựng AI Chatbot",
    description:
      "Chỉ cần nhập URL website, AI sẽ tự động học nội dung và tạo chatbot thông minh trong 5 phút.",
    url: "/",
    siteName: "Vielora",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/ogi.png",
        width: 1200,
        height: 630,
        alt: "Vielora AI Chatbot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vielora - AI Chatbot",
    description: "Tạo AI Chatbot thông minh từ dữ liệu website.",
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
