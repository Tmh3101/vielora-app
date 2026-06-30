/**
 * Migration Note: Home page (Index) migrated for Next.js
 * - Now uses file-based routing (app/page.tsx = /)
 * - This is a Server Component that renders Client Components
 */

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import LogoShowcase from "@/components/landing/LogoShowcase";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import DemoSection from "@/components/landing/DemoSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/shared/ScrollToTop";

const schemaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Vielora",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "0",
        highPrice: "799000",
        priceCurrency: "VND",
      },
      description:
        "Nền tảng SaaS tạo Chatbot AI tự động hóa chăm sóc khách hàng với công nghệ RAG.",
    },
    {
      "@type": "Organization",
      name: "Titops DX4U",
      url: "https://vielora.vn",
      logo: "https://vielora.vn/images/logo-footer.png",
    },
  ],
};

export default function Home() {
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
        <DemoSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
