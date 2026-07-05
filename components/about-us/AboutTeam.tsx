"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ExternalLink, Layers, Server, Cpu, CheckCircle2 } from "lucide-react";

const expertise = [
  {
    title: "Phát triển Sản phẩm & Dự án",
    description:
      "Từ phân tích yêu cầu đến triển khai thực tế. Chúng tôi quản lý toàn bộ vòng đời sản phẩm với chuyên môn PM & BA chuyên sâu.",
    icon: Layers,
  },
  {
    title: "Phát triển Hệ thống & Nền tảng",
    description:
      "Xây dựng các nền tảng SaaS có khả năng mở rộng, hệ thống quản lý nội bộ và cổng quản trị dành cho vận hành thực tế.",
    icon: Server,
  },
  {
    title: "Web3, Blockchain & AI",
    description:
      "Kinh nghiệm thực chiến trong SocialFi, hợp đồng thông minh, cổng thanh toán và tích hợp trí tuệ nhân tạo.",
    icon: Cpu,
  },
];

const AboutTeam = () => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Background decorations */}
      <div className="grid-pattern absolute inset-0 opacity-30" />
      <div className="orb orb-accent -bottom-48 left-1/4 h-96 w-96 opacity-30" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-20 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="heading-premium mb-6 text-3xl font-bold text-foreground sm:text-4xl">
              Đội ngũ <span className="text-gradient-animated">Titops DX4U</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Titops DX4U là một đội ngũ chuyển đổi số chuyên nghiệp, phát triển phần mềm và ứng
              dụng AI. Chúng tôi tập trung xây dựng các hệ thống vận hành, nền tảng số và sản phẩm
              công nghệ đột phá cho các doanh nghiệp và startup.
            </p>
          </motion.div>
        </div>

        {/* Expertise Grid */}
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {expertise.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass group relative overflow-hidden rounded-3xl p-8 transition-all hover:border-primary/50"
            >
              <div className="glass-primary mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{item.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{item.description}</p>

              {/* Subtle list indicator */}
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/60">
                <CheckCircle2 className="h-3 w-3" />
                <span>Core Expertise</span>
              </div>
            </motion.li>
          ))}
        </ul>

        {/* Powered by Titops branding */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-14 flex flex-col items-center justify-center gap-6"
        >
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />
          <a
            href="https://www.dx4u.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-6 transition-all hover:opacity-80 md:flex-row"
          >
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border/40 bg-white/5 p-3 shadow-xl backdrop-blur-sm">
              <Image
                src="/images/logo-dx4u.png"
                alt="Titops DX4U"
                fill
                className="object-contain p-2"
              />
            </div>
            <div className="text-center md:text-left">
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Phát triển bởi
              </p>
              <p className="text-2xl font-bold text-foreground">Titops DX4U</p>
              <div className="mt-1 flex items-center justify-center gap-2 text-primary md:justify-start">
                <ExternalLink className="h-3 w-3" />
                <span className="text-sm">dx4u.io</span>
              </div>
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutTeam;
