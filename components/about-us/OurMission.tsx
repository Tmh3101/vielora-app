"use client";

import { motion } from "framer-motion";
import { Target, Heart, Eye, ShieldCheck } from "lucide-react";

const values = [
  {
    icon: Eye,
    title: "Tầm nhìn",
    description:
      "Trở thành nền tảng tạo chatbot AI hàng đầu Việt Nam, định hình tương lai chăm sóc khách hàng.",
  },
  {
    icon: Target,
    title: "Sứ mệnh",
    description:
      "Đem công nghệ AI tiên tiến nhất đến tay mọi doanh nghiệp, xóa bỏ rào cản kỹ thuật.",
  },
  {
    icon: Heart,
    title: "Giá trị cốt lõi",
    description:
      "Tận tâm, sáng tạo và luôn đặt lợi ích của khách hàng lên hàng đầu trong mọi tính năng.",
  },
  {
    icon: ShieldCheck,
    title: "Trách nhiệm",
    description: "Cam kết bảo mật dữ liệu và phát triển AI một cách có đạo đức, minh bạch.",
  },
];

const OurMission = () => {
  return (
    <section className="relative overflow-hidden bg-secondary/5 py-20 lg:py-32">
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="heading-premium mb-6 text-3xl font-bold text-foreground sm:text-4xl">
              Chúng tôi tin vào một tương lai nơi AI phục vụ con người
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Tại Vielora, chúng tôi không chỉ xây dựng phần mềm. Chúng tôi xây dựng những nhịp cầu
              kết nối. Chúng tôi tin rằng công nghệ chỉ thực sự có giá trị khi nó giải quyết được
              những vấn đề thực tế và mang lại niềm vui cho người sử dụng.
            </p>
            <div className="glass-primary rounded-r-2xl border-l-4 border-l-primary p-6">
              <p className="text-xl font-medium italic text-foreground">
                &quot;Công nghệ tốt nhất là công nghệ khiến bạn cảm thấy như nó không tồn tại - nó
                chỉ đơn giản là hoạt động một cách hoàn hảo.&quot;
              </p>
              <p className="mt-4 text-sm font-bold text-primary">— Team Titops DX4U</p>
            </div>
          </motion.div>

          <ul className="grid gap-6 sm:grid-cols-2">
            {values.map((value, index) => (
              <motion.li
                key={value.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass hover-glow flex flex-col items-center rounded-3xl p-6 text-center"
              >
                <div className="glass-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default OurMission;
