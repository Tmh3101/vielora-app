"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Nguyễn Hoài Tưởng",
    role: "CEO Titops",
    content: "Thú vị đấy! Chatbot này là để thay chủ trả lời tư vấn các chủ đề mà chủ biết.",
    avatar: "",
  },
  {
    name: "Nguyễn Văn Nam",
    role: "Marketing Manager",
    content: "Giúp các nhân viên CSKH thoải mái hơn rất nhiều.",
    avatar: "",
  },
  {
    name: "Trần Thị Lan",
    role: "CEO Fashion Brand",
    content:
      "Điểm tôi thích nhất là bot tự học toàn bộ kiến thức từ URL website. Tiết kiệm được bao nhiêu công sức soạn kịch bản trả lời mẫu cho nhân viên.",
    avatar: "",
  },
  {
    name: "Đoàn Lê Quốc Anh",
    role: "Tech Lead TSC",
    content:
      "Công nghệ RAG xử lý cực kỳ chính xác, không trả lời sai lệch thông tin đã cung cấp. Rất an tâm khi nhúng lên web công ty.",
    avatar: "",
  },
  {
    name: "Hoàng Anh",
    role: "Customer Support Manager",
    content:
      "Giao diện đẹp, dễ sử dụng với người không rành kỹ thuật. Đội ngũ hỗ trợ của Vielora cũng phản hồi rất nhanh và nhiệt tình.",
    avatar: "",
  },
  {
    name: "Phạm Đức Thắng",
    role: "Founder Tech Startup",
    content: "Setup nhanh, bot thông minh, chi phí lại rất hợp lý cho doanh nghiệp SME.",
    avatar: "",
  },
];

const TestimonialsSection = () => {
  // Duplicate testimonials for a seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials];

  return (
    <section className="relative overflow-hidden bg-background py-24 lg:py-32">
      {/* Background decoration */}
      <div className="orb orb-primary absolute -left-20 top-1/4 opacity-10" />
      <div className="orb orb-accent absolute -right-20 bottom-1/4 opacity-10" />

      <div className="container relative z-10 mx-auto mb-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
        >
          <Star className="h-4 w-4 fill-primary" />
          <span>Khách hàng nói gì về Vielora</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="heading-premium mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          Được tin dùng bởi các <span className="text-gradient">chủ doanh nghiệp</span>
        </motion.h2>
      </div>

      <div className="relative flex overflow-x-hidden py-4">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: ["0%", "-50%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 60, // Slower for testimonials
              ease: "linear",
            },
          }}
          whileHover={{ animationPlayState: "paused" }}
        >
          {duplicatedTestimonials.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="hover:shadow-glow-sm mx-4 flex w-[280px] flex-shrink-0 flex-col justify-between whitespace-normal rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:border-primary/50 sm:w-[350px]"
            >
              <div className="mb-6">
                <div className="relative">
                  <Quote className="absolute -right-2 -top-2 h-6 w-6 text-primary/10" />
                  <p className="relative z-10 text-base italic leading-relaxed text-muted-foreground">
                    &ldquo;{item.content}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-4">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={item.avatar} alt={item.name} />
                  <AvatarFallback className="bg-gradient-primary font-bold text-white">
                    {item.name.split(" ").pop()?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{item.name}</h4>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Gradient masks for smooth fading at edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent sm:w-48" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent sm:w-48" />
      </div>
    </section>
  );
};

export default TestimonialsSection;
