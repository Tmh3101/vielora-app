"use client";

/**
 * Migration Note: CTASection component migrated for Next.js
 * - Changed from react-router-dom Link to Next.js Link
 * - Must be a Client Component due to framer-motion
 * - Enhanced with animated gradient background and floating decorations
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

const CTASection = () => {
  return (
    <section className="relative pb-20 pt-16 lg:pb-32 lg:pt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-primary-animated relative overflow-hidden rounded-3xl p-10 text-center lg:p-16"
        >
          {/* Decorative elements */}
          <div className="animate-float-slow absolute left-0 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="animate-float-delayed absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-accent/20 blur-3xl" />
          <div className="animate-float absolute left-1/4 top-1/2 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

          {/* Subtle grid overlay */}
          <div className="grid-pattern absolute inset-0 opacity-10" />

          <div className="relative z-10">
            {/* Decorative badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-primary-foreground/90 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span>Bắt đầu trong 2 phút</span>
            </motion.div>

            <h2 className="mb-6 text-3xl font-bold text-primary-foreground sm:text-4xl lg:text-5xl">
              Sẵn sàng tạo chatbot AI cho website?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-primary-foreground/80">
              Bắt đầu miễn phí ngay hôm nay. Không cần thẻ tín dụng, không cần code.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="h-14 bg-white px-8 text-lg text-primary shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl"
            >
              <Link href="/auth?mode=signup">
                Tạo chatbot miễn phí
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
