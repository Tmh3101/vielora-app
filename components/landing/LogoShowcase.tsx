"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const logos = [
  { name: "Gemini", image: "/images/gemini_logo.png", showText: true },
  {
    name: "Google Cloud",
    image: "/images/google_cloud_logo.png",
    widthClass: "w-16 sm:w-20",
    showText: true,
  },
  {
    name: "Supabase",
    image: "/images/supabase_logo.png",
    widthClass: "w-16 sm:w-20",
    showText: true,
  },
  {
    name: "FingerprintJS",
    image: "/images/fingerprintJS_logo.png",
    widthClass: "w-16 sm:w-20",
    showText: true,
  },
  { name: "PayOS", image: "/images/partners/payos-logo.png", widthClass: "w-16 sm:w-20" },
  {
    name: "WordPress",
    image: "/images/wordpress_logo.png",
    showText: true,
    widthClass: "w-24 sm:w-24",
  },
  { name: "Shopify", image: "/images/shopify_logo.png", showText: true },
  { name: "Google Tag Manager", image: "/images/google_tag_manager_logo.png", showText: true },
  { name: "AWS", image: "/images/aws_logo.png", widthClass: "w-20 sm:w-24" },
  { name: "Viettel", image: "/images/viettel_logo.png", widthClass: "w-40 sm:w-20" },
  { name: "Resend", image: "/images/resend_logo.png", widthClass: "w-12 sm:w-16" },
];

const LogoShowcase = () => {
  const duplicatedLogos = [...logos, ...logos];

  return (
    <section className="relative w-full overflow-hidden border-y border-border/50 bg-background/50 py-4">
      <div className="relative flex overflow-x-hidden">
        <motion.div
          className="flex items-center whitespace-nowrap"
          animate={{
            x: ["0%", "-50%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 40,
              ease: "linear",
            },
          }}
        >
          {duplicatedLogos.map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="mx-4 flex items-center gap-2 opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 sm:mx-6 sm:gap-3"
            >
              {logo.showText ? (
                <>
                  <div className="relative h-4 w-4 flex-shrink-0 sm:h-6 sm:w-6">
                    <Image src={logo.image} alt={logo.name} fill className="object-contain" />
                  </div>
                  <span className="text-xs font-bold text-foreground sm:text-sm">{logo.name}</span>
                </>
              ) : (
                <div className={`relative h-6 sm:h-8 ${logo.widthClass || "w-20 sm:w-32"}`}>
                  <Image src={logo.image} alt={logo.name} fill className="object-contain" />
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent sm:w-48" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent sm:w-48" />
    </section>
  );
};

export default LogoShowcase;
