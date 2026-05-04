/**
 * Migration Note: Home page (Index) migrated for Next.js
 * - Now uses file-based routing (app/page.tsx = /)
 * - This is a Server Component that renders Client Components
 */

import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import DemoSection from "@/components/landing/DemoSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
