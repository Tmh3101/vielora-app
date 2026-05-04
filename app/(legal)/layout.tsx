/**
 * Migration Note: Home page (Index) migrated for Next.js
 * - Now uses file-based routing (app/page.tsx = /)
 * - This is a Server Component that renders Client Components
 */

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`bg-background text-foreground antialiased`}>
        <Header isLegalLayout={true} />
        <main className="container mx-auto max-w-6xl px-4 py-28 sm:px-6 lg:px-8">{children}</main>
        <Footer isLegalLayout={true} />
      </body>
    </html>
  );
}
