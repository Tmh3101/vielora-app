/**
 * Migration Note: Home page (Index) migrated for Next.js
 * - Now uses file-based routing (app/[locale]/page.tsx)
 * - This is a Server Component that renders Client Components
 */

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import LogoShowcase from "@/components/landing/LogoShowcase";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DataSourcesSection from "@/components/landing/DataSourcesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import AccessMethodsSection from "@/components/landing/AccessMethodsSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.home" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    alternates: {
      canonical: `/${locale}`,
      languages: { vi: "/vi", en: "/en", "x-default": "/vi" },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "vi" ? "vi_VN" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

import { buildHomeSchema } from "@/lib/helpers";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tSchema = await getTranslations({ locale, namespace: "metadata.schema" });
  const schemaJsonLd = buildHomeSchema({
    locale,
    appDescription: tSchema("appDescription"),
  });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJsonLd) }}
      />
      <Header />
      <main>
        <HeroSection />
        <LogoShowcase />
        <FeaturesSection />
        <DataSourcesSection />
        <AccessMethodsSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
