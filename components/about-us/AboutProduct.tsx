"use client";

import { motion } from "framer-motion";
import { Brain, Zap } from "lucide-react";

const AboutProduct = () => {
  return (
    <section className="relative overflow-hidden bg-card/50 py-20 lg:py-32">
      {/* Subtle background decoration */}
      <div className="dot-pattern absolute inset-0 opacity-30" />
      <div className="orb orb-primary -right-32 -top-32 h-64 w-64 opacity-50" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="heading-premium mb-6 text-3xl font-bold text-foreground sm:text-4xl">
              <span className="text-gradient-animated">Vielora:</span> Chatbot AI thông minh cho mọi
              website
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Vielora là giải pháp SaaS đột phá, cho phép bạn tạo chatbot AI chuyên sâu cho website
              của mình chỉ trong vài phút. Bằng cách sử dụng công nghệ RAG (Retrieval-Augmented
              Generation) tiên tiến và mô hình Google Gemini, Vielora học trực tiếp từ nội dung
              website của bạn để cung cấp những câu trả lời chính xác, tự nhiên và mang đậm bản sắc
              thương hiệu.
            </p>

            <ul className="space-y-6">
              {[
                {
                  icon: Brain,
                  title: "Xây dựng nguồn tri thức",
                  description: "Tự động phân tích và học hỏi từ URL website, file tài liệu.",
                },
                {
                  icon: Zap,
                  title: "Tích hợp tức thì",
                  description: "Chỉ một dòng code để đưa AI vào website của bạn.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4">
                  <div className="glass-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-foreground">{item.title}</h4>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Visual Element / Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-glow relative overflow-hidden rounded-3xl p-8 lg:p-12">
              <div className="bg-gradient-primary absolute -right-20 -top-20 h-64 w-64 opacity-10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-accent opacity-10 blur-3xl" />

              <div className="relative space-y-6">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  Công nghệ lõi
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Từ thu thập dữ liệu đến trải nghiệm AI toàn diện
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Dữ liệu", value: "Web crawl & files" },
                    { label: "AI", value: "RAG & Google Gemini" },
                    { label: "Tích hợp", value: "Embed script" },
                    { label: "Tối ưu", value: "Tăng GEO cho website" },
                  ].map((stat) => (
                    <div key={stat.label} className="glass rounded-2xl p-4">
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <div className="font-bold text-primary">{stat.value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground">
                  &quot;Vielora giúp giảm 80% thời gian phản hồi khách hàng trong khi vẫn duy trì
                  được chất lượng phục vụ 5 sao.&quot;
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutProduct;
