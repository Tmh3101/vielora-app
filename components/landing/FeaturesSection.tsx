"use client";

/**
 * Migration Note: FeaturesSection component migrated for Next.js
 * Must be a Client Component due to framer-motion
 * Enhanced with glassmorphism cards and premium hover effects
 */

import { motion } from "framer-motion";
import { Globe, MessageSquare, BarChart3, Palette, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Crawl tự động",
    description: "Chỉ cần nhập URL, AI sẽ tự động quét và học nội dung từ toàn bộ website của bạn.",
  },
  {
    icon: MessageSquare,
    title: "Trả lời thông minh",
    description:
      "Powered by Gemini 2.5, chatbot có thể hiểu và trả lời các câu hỏi một cách tự nhiên.",
  },
  {
    icon: Zap,
    title: "Cài đặt nhanh chóng",
    description: "Chỉ cần copy 1 đoạn code duy nhất và dán vào website của bạn.",
  },
  {
    icon: BarChart3,
    title: "Phân tích chi tiết",
    description: "Theo dõi số lượng tin nhắn, thống kê người dùng qua dashboard trực quan.",
  },
  {
    icon: Palette,
    title: "Tùy chỉnh giao diện",
    description:
      "Thay đổi màu sắc, icon, vị trí widget và tin nhắn chào mừng theo thương hiệu của bạn.",
  },
  {
    icon: Shield,
    title: "Bảo mật cao",
    description: "Dữ liệu được mã hóa và lưu trữ an toàn. Không chia sẻ với bên thứ ba.",
  },
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="relative scroll-mt-32 overflow-hidden bg-card/50 py-20 lg:py-32"
    >
      {/* Subtle background decoration */}
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="orb orb-primary -right-32 -top-32 h-64 w-64 opacity-50" />
      <div className="orb orb-accent -bottom-24 -left-24 h-48 w-48 opacity-40" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="heading-premium mb-4 text-3xl font-bold text-foreground sm:text-4xl"
          >
            Mọi thứ bạn cần để tạo chatbot chuyên nghiệp
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Từ việc train AI đến theo dõi hiệu suất, tất cả đều được tích hợp sẵn
          </motion.p>
        </div>

        {/* Features grid */}
        <div className="grid gap-6 px-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-feature glass group"
            >
              {/* Icon with gradient glow */}
              <div className="relative mb-6 h-14 w-14">
                <div className="bg-gradient-primary absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity group-hover:opacity-40" />
                <div className="glass-primary group-hover:shadow-glow-sm relative flex h-14 w-14 items-center justify-center rounded-2xl transition-shadow">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
              </div>

              <h3 className="mb-3 text-xl font-semibold text-foreground">{feature.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
