"use client";

/**
 * Redesign notes:
 * - Replaced centered single-column layout with an asymmetric text/visual split.
 * - Removed the "Powered by" badge pill, the 6 floating decorative icons,
 *   the dot-pattern + orb background, and the gradient-text headline treatment.
 * - Added a real product mockup (browser frame + live chat widget preview)
 *   as the hero's visual anchor instead of ambient decoration.
 * - Reduced motion to two orchestrated groups (text stack, product visual)
 *   plus one small accent card, instead of ten independently staggered elements.
 * - Trust indicators are now a plain stat bar with dividers, not icon pills.
 * - The AEO summary paragraph is de-emphasized (no card, smaller/muted) and
 *   moved below the fold of the primary hero content.
 */

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { Mockup3DWrapper } from "@/components/landing/features/Mockup3DWrapper";
import { ArrowRight, MessageSquare, Bot, Globe, Send, Clock, X } from "lucide-react";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stats = [
  { icon: Bot, value: "500+", label: "chatbot đã tạo" },
  { icon: MessageSquare, value: "24/7", label: "hỗ trợ tự động" },
  { icon: Clock, value: "<5 phút", label: "thời gian cài đặt" },
];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 lg:pb-12 lg:pt-52">
      {/* Background with subtle grid pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="dot-pattern absolute inset-0 opacity-60" />

      {/* Floating decorative orbs */}
      <div className="orb orb-primary animate-float-slow -left-10 bottom-0 h-72 w-72" />
      <div className="orb orb-accent animate-float-delayed right-0 top-10 h-96 w-96" />

      {/* Floating icon elements */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="glass-primary shadow-glow-sm animate-float-subtle top-38 absolute left-[40%] hidden h-12 w-12 items-center justify-center rounded-2xl lg:flex"
      >
        <MessageSquare className="h-6 w-6 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="glass animate-float-subtle absolute right-[10%] top-28 hidden h-12 w-12 items-center justify-center rounded-xl lg:flex"
      >
        <Bot className="h-6 w-6 text-accent" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="glass-primary animate-float-subtle absolute bottom-14 right-[10%] hidden h-11 w-11 items-center justify-center rounded-xl lg:flex"
      >
        <Globe className="h-5 w-5 text-primary" />
      </motion.div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-16">
        <div className="grid items-center gap-16 lg:grid-cols-[55%_45%] lg:gap-12">
          {/* Left column — content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-primary shadow-glow-sm mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase text-primary"
            >
              <Bot className="h-4 w-4" />
              <span>Trợ lý AI cho mọi người</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-8 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.4rem]"
            >
              Tạo <span className="text-gradient-animated pr-2 uppercase italic">trợ lý AI</span>{" "}
              cho mọi người{" "}
              <span className="relative inline-block whitespace-nowrap pb-2">
                trong vài phút
                <svg
                  viewBox="0 0 300 14"
                  className="absolute bottom-0 left-0 h-3 w-full text-primary"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 9.5C60 3 140 2 180 6C220 10 260 5 298 8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mb-10 max-w-xl text-base text-muted-foreground"
            >
              Chỉ cần 1 URL hoặc các tệp tài liệu, hệ thống tự động xây dựng kho tri thức cho Trợ lý
              AI của bạn. Linh hoạt tiếp cận khách hàng ở mọi nơi, &ldquo;no code&rdquo;.
            </motion.p>

            <motion.div variants={itemVariants} className="mb-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-gradient-primary btn-glow shadow-glow-sm h-12 rounded-xl px-6 text-sm hover:opacity-90"
              >
                <Link href="/auth?mode=signup">
                  Bắt đầu miễn phí
                  <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 rounded-xl border-primary/30 px-6 text-sm text-primary/80 transition-all hover:border-primary hover:bg-white hover:text-primary"
              >
                <a href="#demo">Xem demo</a>
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-2 sm:gap-4"
            >
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`${index > 0 ? "border-l border-border/60 pl-2 sm:pl-4" : ""}`}
                >
                  <div className="glass flex items-center gap-1 rounded-full px-4 py-2">
                    <stat.icon className="mr-0.5 h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{stat.value}</span>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right column — 3D floating logo showcase */}
          <div className="relative hidden h-full items-start justify-start pb-12 pt-4 lg:flex lg:pt-8">
            <div className="absolute h-60 w-60 rounded-full bg-gradient-to-br from-primary/45 via-accent/25 to-transparent opacity-60 blur-3xl" />

            {/* perspective stage */}
            <div style={{ perspective: 1200 }} className="relative">
              <div
                style={{ transformStyle: "preserve-3d" }}
                className="relative -ml-8 -mt-16 h-56 w-56 sm:h-[350px] sm:w-[350px]"
              >
                {[24, 16, 8, 4].map((depth, i) => (
                  <div
                    key={depth}
                    style={{ transform: `translateZ(-${depth}px)` }}
                    className="absolute inset-0 rounded-[2rem]"
                  >
                    <Image
                      src="/images/logo-icon.webp"
                      alt=""
                      fill
                      aria-hidden="true"
                      className="object-contain"
                      style={{ opacity: 0.12 - i * 0.02, filter: "brightness(0.4) blur(1px)" }}
                    />
                  </div>
                ))}
                <div
                  style={{ transform: "translateZ(0px)" }}
                  className="absolute inset-0 drop-shadow-2xl"
                >
                  <Image
                    src="/images/logo-icon.webp"
                    alt="Vielora"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>

              <motion.div
                animate={{ opacity: [0.35, 0.15, 0.35], scaleX: [1, 0.85, 1] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 left-1/2 h-6 w-40 -translate-x-1/2 rounded-full bg-foreground/20 blur-xl"
              />
            </div>

            {/* chat widget mockup — floats beside/below the logo as product proof */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
              className="absolute -bottom-4 right-14 z-20 w-72 sm:w-80"
            >
              <Mockup3DWrapper
                overflowVisible
                innerClassName="p-0 bg-transparent shadow-none border-0 overflow-visible"
              >
                <div
                  className="overflow-hidden rounded-2xl border border-border/20 bg-background shadow-2xl [transform-style:preserve-3d]"
                  style={{ transform: "translateZ(10px)" }}
                >
                  <div
                    className="flex items-center justify-between bg-primary px-4 py-3"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/30 bg-white/20">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-white">Trợ lý AI của bạn</p>
                        <p className="text-[10px] text-white/70">Trực tuyến</p>
                      </div>
                    </div>
                    <X
                      className="h-4 w-4 text-white/60"
                      style={{ transform: "translateZ(25px)" }}
                    />
                  </div>

                  <div className="flex h-52 flex-col justify-start gap-2 p-3 [transform-style:preserve-3d]">
                    <motion.div
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="w-fit max-w-[85%] rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-[10px] leading-relaxed text-foreground/80"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      👋 Chào bạn! Tôi có thể giúp gì cho bạn?
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-[10px] leading-relaxed text-white"
                      style={{ transform: "translateZ(35px)" }}
                    >
                      Tôi cần hỗ trợ
                    </motion.div>

                    <div
                      className="flex items-start gap-2"
                      style={{ transform: "translateZ(28px)" }}
                    >
                      <div className="flex items-center gap-[3px] rounded-lg bg-muted/60 px-3 py-2">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 border-t border-border/20 px-4 py-2.5"
                    style={{ transform: "translateZ(18px)" }}
                  >
                    <div className="flex-1 rounded-md border border-border/30 bg-background/60 px-3 py-2 text-[10px] text-muted-foreground/50">
                      Nhập tin nhắn...
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <Send className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
              </Mockup3DWrapper>
            </motion.div>
          </div>
        </div>

        {/* AEO summary — de-emphasized, no card chrome, secondary to the main hero content */}
        <p className="mx-auto mt-20 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground/70">
          <strong className="font-medium text-muted-foreground">Vielora</strong> là nền tảng SaaS
          ứng dụng kiến trúc RAG tiên tiến, giúp mọi người dễ dàng tự động hóa quy trình tương tác
          và hỗ trợ. Tự động thu thập và chuyển hóa nội dung từ bất kỳ URL website hay tệp tài liệu
          nào thành kho tri thức cho Trợ lý AI thông minh 24/7 chỉ trong vài phút với chi phí tối ưu
          và linh hoạt tiếp cận khách hàng qua nhiều phương thức, không cần code.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
