"use client";

/**
 * Migration Note: HeroSection component migrated for Next.js
 * - Changed from react-router-dom Link to Next.js Link
 * - Must be a Client Component due to framer-motion
 * - Enhanced with floating orbs, gradient text, and premium animations
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  MessageSquare,
  Bot,
  Globe,
  Code2,
  Cpu,
} from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 lg:pb-32 lg:pt-40">
      {/* Background with subtle grid pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="dot-pattern absolute inset-0 opacity-60" />

      {/* Floating decorative orbs */}
      <div className="orb orb-primary animate-float-slow left-10 top-20 h-72 w-72" />
      <div className="orb orb-accent animate-float-delayed bottom-20 right-10 h-96 w-96" />
      <div className="orb orb-primary animate-float left-1/4 top-1/2 h-48 w-48 opacity-50" />

      {/* Floating icon elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="glass-primary shadow-glow-sm animate-float-slow absolute left-[15%] top-32 hidden h-14 w-14 items-center justify-center rounded-2xl lg:flex"
      >
        <MessageSquare className="h-7 w-7 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="glass animate-float-delayed absolute right-[12%] top-40 hidden h-12 w-12 items-center justify-center rounded-xl lg:flex"
      >
        <Bot className="h-6 w-6 text-accent" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="bg-gradient-primary shadow-glow-sm animate-float absolute bottom-32 left-[8%] hidden h-10 w-10 items-center justify-center rounded-lg lg:flex"
      >
        <Zap className="h-5 w-5 text-primary-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.4 }}
        className="glass-primary animate-float-slow absolute bottom-40 right-[18%] hidden h-11 w-11 items-center justify-center rounded-xl lg:flex"
      >
        <Globe className="h-5 w-5 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.1 }}
        className="glass animate-float-delayed absolute right-[8%] top-1/2 hidden h-10 w-10 items-center justify-center rounded-lg lg:flex"
      >
        <Code2 className="h-5 w-5 text-muted-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.3 }}
        className="glass animate-float absolute left-[5%] top-1/3 hidden h-9 w-9 items-center justify-center rounded-lg lg:flex"
      >
        <Cpu className="h-4 w-4 text-muted-foreground" />
      </motion.div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge with glow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-primary shadow-glow-sm mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-primary"
          >
            <Sparkles className="h-4 w-4" />
            <span>Powered by Titops DX4U</span>
          </motion.div>

          {/* Headline with gradient text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="heading-premium mb-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Tạo chatbot AI cho website{" "}
            <span className="text-gradient-animated">trong vài phút</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            Chỉ cần nhập URL website, AI sẽ tự động học nội dung và tạo chatbot thông minh. Hỗ trợ
            khách hàng 24/7 mà không cần code.
          </motion.p>

          {/* CTA Buttons with enhanced styling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              asChild
              className="bg-gradient-primary btn-glow shadow-glow-sm h-14 px-8 text-lg hover:opacity-90"
            >
              <Link href="/auth?mode=signup">
                Bắt đầu miễn phí
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-14 border-primary/30 px-8 text-lg text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
            >
              <a href="#demo">Xem demo</a>
            </Button>
          </motion.div>

          {/* Trust badges with icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground"
          >
            {[
              { icon: Zap, text: "Cài đặt trong 5 phút" },
              { icon: Shield, text: "Bảo mật dữ liệu" },
              { icon: Sparkles, text: "AI thông minh Gemini 2.5" },
            ].map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="glass flex items-center gap-2 rounded-full px-4 py-2"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-sm">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
