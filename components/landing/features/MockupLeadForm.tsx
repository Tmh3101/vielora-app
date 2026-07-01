"use client";

import { motion } from "framer-motion";
import { Bot, User, Mail, Phone, FileText, CheckCircle2 } from "lucide-react";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

const fields = [
  { label: "Họ và tên", icon: User, required: true, placeholder: "Nguyễn Văn A" },
  { label: "Email", icon: Mail, required: true, placeholder: "email@example.com" },
  { label: "Số điện thoại", icon: Phone, required: false, placeholder: "090 123 45 67" },
  {
    label: "Nhu cầu của bạn",
    icon: FileText,
    required: false,
    placeholder: "Tôi muốn được tư vấn về...",
  },
];

export function MockupLeadForm() {
  return (
    <div className="pb-8">
      <Mockup3DWrapper overflowVisible>
        <div className="relative">
          <div className="mb-3 flex items-center gap-2" style={{ transform: "translateZ(8px)" }}>
            <span className="flex h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[13px] font-extrabold uppercase text-foreground">Lead Form</span>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-border/20 bg-background shadow-sm"
            style={{ transform: "translateZ(8px)" }}
          >
            <div className="flex items-center justify-between bg-primary px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-lg border border-white/30 bg-white/20">
                  <Bot className="h-2.5 w-2.5 text-white" />
                </div>
                <div className="leading-tight">
                  <p className="text-[9px] font-semibold text-white">Trợ lý AI của bạn</p>
                  <p className="text-[7px] text-white/70">Trực tuyến</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 px-3 py-3">
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-fit max-w-[85%] rounded-xl rounded-bl-sm bg-muted px-3 py-2"
                style={{ transform: "translateZ(4px)" }}
              >
                <p className="text-[10px] leading-relaxed text-foreground/80">
                  Để nhận báo giá ưu đãi, bạn vui lòng để lại thông tin nhé!
                </p>
              </motion.div>

              <div className="space-y-1.5">
                {fields.map((field, i) => {
                  const Icon = field.icon;
                  return (
                    <motion.div
                      key={field.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.3 + i * 0.08,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/80 px-3 py-2"
                      style={{ transform: `translateZ(${10 + i * 4}px)` }}
                    >
                      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground/50">
                        {field.placeholder}
                      </span>
                      {field.required && (
                        <span className="ml-auto text-[8px] text-red-400/60">*Bắt buộc</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: "translateZ(24px)" }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-lg bg-primary py-2 text-[11px] font-semibold tracking-wide text-white"
                >
                  Gửi thông tin
                </motion.button>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 1.2,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            className="shadow-glow absolute -right-20 -top-10 w-[90%] rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-500/20 dark:bg-green-950"
            style={{ z: 24, transform: "translateZ(32px)" }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
              <div>
                <p className="text-[11px] font-semibold text-green-700 dark:text-green-300">
                  Đã gửi thành công!
                </p>
                <p className="text-[9px] leading-relaxed text-green-600/80 dark:text-green-400/80">
                  Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Mockup3DWrapper>
    </div>
  );
}
