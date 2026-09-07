import { Metadata } from "next";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import AboutHero from "@/components/about-us/AboutHero";
import AboutProduct from "@/components/about-us/AboutProduct";
import OurMission from "@/components/about-us/OurMission";
import AboutTeam from "@/components/about-us/AboutTeam";
import CTASection from "@/components/landing/CTASection";
import { setRequestLocale, getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.aboutUs" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/about-us`,
      languages: { vi: "/vi/about-us", en: "/en/about-us", "x-default": "/vi/about-us" },
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

import { buildAboutSchema } from "@/lib/helpers";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tSchema = await getTranslations({ locale, namespace: "metadata.schema" });
  const aboutSchema = buildAboutSchema({
    locale,
    pageName: tSchema("aboutPageName"),
    pageDescription: tSchema("aboutPageDescription"),
    orgDescription: tSchema("orgDescription"),
  });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <Header />
      <main>
        <AboutHero />
        <AboutProduct />
        <OurMission />
        <AboutTeam />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
