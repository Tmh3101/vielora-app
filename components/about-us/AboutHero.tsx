"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const AboutHero = () => {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 lg:pb-32 lg:pt-40">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="dot-pattern absolute inset-0 opacity-60" />

      {/* Floating decorative orbs */}
      <div className="orb orb-primary animate-float-slow left-10 top-20 h-72 w-72" />
      <div className="orb orb-accent animate-float-delayed bottom-20 right-10 h-96 w-96" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-primary shadow-glow-sm mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            <span>Câu chuyện của Vielora</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="heading-premium mb-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Vielora - Đưa <span className="text-gradient-animated">Trợ lý AI túc trực 24/7</span>{" "}
            vào website chỉ trong một nốt nhạc
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Biến dữ liệu hiện có thành vũ khí bán hàng chỉ trong vài phút. Vielora tự động trích
            xuất kiến thức từ website để tạo ra người đồng hành kỹ thuật số, tích hợp dễ dàng, sẵn
            sàng tương tác với khách hàng mọi lúc.
          </motion.p>

          {/* Stats/Icons */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground"
          >
            {[
              { icon: Rocket, text: "Sứ mệnh đột phá" },
              { icon: Users, text: "Tâm điểm là khách hàng" },
              { icon: Sparkles, text: "AI vì con người" },
            ].map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                className="glass flex items-center gap-2 rounded-full px-4 py-2"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div> */}
        </div>
      </div>
    </section>
  );
};

export default AboutHero;
