/**
 * Migration Note: Legal pages layout migrated for Next.js
 * - Nested layout under app/[locale]/(legal)/
 * - Renders Header and Footer with isLegalLayout={true}
 */

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header isLegalLayout={true} />
      <main className="container mx-auto max-w-6xl px-4 py-28 sm:px-6 lg:px-8">{children}</main>
      <Footer isLegalLayout={true} />
    </>
  );
}
