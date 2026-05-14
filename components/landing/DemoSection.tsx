"use client";

/**
 * Migration Note: DemoSection component migrated for Next.js
 * Must be a Client Component due to framer-motion
 * Enhanced with glassmorphism and premium styling for website mockup with demo chatbot
 */

import { motion } from "framer-motion";
import { DemoChatbotWidget } from "@/components/shared/DemoChatbotWidget";

const DemoSection = () => {
  return (
    <section id="demo" className="relative scroll-mt-32 overflow-hidden bg-card/50 py-20 lg:py-32">
      {/* Background decorations */}
      <div className="orb orb-accent -left-40 top-1/4 h-80 w-80 opacity-40" />
      <div className="orb orb-primary -right-30 bottom-1/4 h-60 w-60 opacity-30" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Section header */}
          <div className="mb-12 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
            >
              Thử chatbot thật ngay bây giờ
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              Chatbot được tích hợp AI thông minh, sẵn sàng trả lời mọi câu hỏi của bạn
            </motion.p>
          </div>

          {/* Website mockup with chatbot */}
          <DemoChatbotWidget />
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
