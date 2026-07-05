import { Metadata } from "next";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import AboutHero from "@/components/about-us/AboutHero";
import AboutProduct from "@/components/about-us/AboutProduct";
import OurMission from "@/components/about-us/OurMission";
import AboutTeam from "@/components/about-us/AboutTeam";
import CTASection from "@/components/landing/CTASection";

export const metadata: Metadata = {
  title: "Về chúng tôi | Vielora",
  description:
    "Khám phá câu chuyện về Vielora và đội ngũ Titops DX4U - những người đang nỗ lực mang AI đến gần hơn với doanh nghiệp của bạn.",
};

export default function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://vielora.vn/about-us",
        },
        name: "Về chúng tôi | Vielora & Titops DX4U",
        description:
          "Khám phá câu chuyện về Vielora và đội ngũ Titops DX4U - những người đang nỗ lực mang AI đến gần hơn với doanh nghiệp.",
      },
      {
        "@type": "Organization",
        "@id": "https://vielora.vn/#organization",
        name: "Titops DX4U",
        url: "https://dx4u.io/",
        logo: "https://vielora.vn/images/logo-dx4u.png",
        description:
          "Đội ngũ chuyển đổi số chuyên nghiệp, phát triển phần mềm và nền tảng SaaS Vielora.",
        knowsAbout: ["Artificial Intelligence", "SaaS", "Chatbot", "RAG", "Web3"],
      },
    ],
  };

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
