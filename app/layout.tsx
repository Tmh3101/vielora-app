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
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Vielora - Xây dựng chatbot thông minh cho doanh nghiệp",
  description:
    "Tạo chatbot AI hỗ trợ khách hàng tự động từ nội dung website của bạn. Dễ dàng tích hợp, không cần code.",
  authors: [{ name: "Vielora" }],
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
  openGraph: {
    title: "Vielora - Xây dựng chatbot thông minh cho doanh nghiệp",
    description: "Tạo chatbot AI hỗ trợ khách hàng tự động từ nội dung website của bạn.",
    type: "website",
    url: baseUrl,
    siteName: "Vielora",
    images: [
      {
        url: "/ogi.png",
        width: 1200,
        height: 630,
        alt: "Vielora",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
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
