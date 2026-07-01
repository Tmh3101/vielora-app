"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Code, ExternalLink, QrCode, Link } from "lucide-react";
import { Mockup3DWrapper } from "./Mockup3DWrapper";

const frameworks = [
  {
    name: "HTML",
    icon: (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 0 512 512" fill="none" className="h-3 w-3">
          <path
            d="M38.238 0C33.532 0 30.026 3.835 30.444 8.521l39.671 444.978c.418 4.687 4.468 9.552 9.004 10.811l168.344 46.742c4.535 1.259 11.954 1.259 16.49.003l168.856-46.819c4.535-1.258 8.59-6.122 9.007-10.808L481.553 8.521C481.974 3.835 478.464 0 473.758 0H38.238z"
            fill="#DD512A"
          />
          <path
            d="M397.068 102.054c-.375 4.18-1.023 11.437-1.441 16.124l-1.045 11.675c-.421 4.685-1.02 11.386-1.336 14.889-.315 3.504-.614 6.371-.669 6.371-.053 0-3.948 0-8.653 0H264.554c-4.706 0-8.595 0-8.646 0s-3.944 0-8.65 0H184.39c-4.706 0-8.212 3.835-7.794 8.521l3.667 40.99c.418 4.685 4.612 8.521 9.317 8.521h57.679c4.706 0 8.598 0 8.65 0s3.941 0 8.646 0h99.142c4.706 0 11.988 0 16.182 0 4.191 0 7.312 3.421 6.932 7.601-.382 4.18-1.034 11.439-1.451 16.124L373.569 365.02c-.421 4.687-.953 10.674-1.182 13.306-.234 2.63-4.134 5.811-8.669 7.069l-99.474 27.582c-4.535 1.256-8.302 2.296-8.373 2.312-.07.015-3.836-1.003-8.373-2.26l-99.58-27.632c-4.535-1.258-8.587-6.122-9.004-10.809l-6.41-71.945c-.418-4.687 3.092-8.522 7.798-8.522h9.088c4.706 0 12.406 0 17.111 0h13.552c4.706 0 8.896 3.835 9.317 8.522l2.514 28.164c.418 4.687 4.475 9.524 9.019 10.751l46.579 12.579c4.541 1.227 8.275 2.231 8.296 2.231.021 0 3.753-1.006 8.296-2.233l46.663-12.609c4.541-1.227 8.602-6.066 9.023-10.751l5.06-56.427c.421-4.687-3.085-8.522-7.791-8.522h-52.474c-4.706 0-8.595 0-8.646 0s-3.944 0-8.65 0H137.765c-4.706 0-8.896-3.836-9.314-8.521l-12.416-139.126c-.418-4.687-1.066-11.942-1.441-16.124-.371-4.18 3.172-7.601 7.878-7.601h124.787c4.706 0 8.598 0 8.65 0s3.941 0 8.646 0h124.636c4.704 0 8.249 3.42 7.876 7.602z"
            fill="#fff"
          />
        </svg>
      </div>
    ),
    position: "-top-4 -right-5",
    color: "border-orange-500/30 text-orange-600 dark:text-orange-400",
    delay: 0.1,
  },
  {
    name: "React",
    icon: (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 -14 256 256" fill="none" className="h-3 w-3">
          <path
            d="M210.483 73.824c-2.655-.914-5.407-1.779-8.24-2.597.465-1.9.893-3.777 1.273-5.621 6.238-30.281 2.159-54.676-11.768-62.707C178.393-4.803 156.551 3.227 134.493 22.424c-2.121 1.846-4.248 3.8-6.375 5.848-1.416-1.355-2.831-2.665-4.242-3.917C100.759 3.829 77.587-4.822 63.673 3.233 50.33 10.957 46.38 33.89 51.995 62.588c.542 2.772 1.176 5.603 1.893 8.481-3.28.931-6.446 1.923-9.475 2.979C17.31 83.497 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427 2.227.762 4.539 1.482 6.921 2.165-.773 3.113-1.446 6.163-2.01 9.138-5.355 28.2-1.173 50.591 6.134 58.266 13.744 7.926 36.812-.221 59.273-19.855 1.776-1.552 3.557-3.198 5.342-4.923 2.314 2.228 4.623 4.336 6.921 6.314 21.757 18.722 43.245 26.283 56.539 18.586 13.731-7.949 18.194-32.003 12.4-61.268-.442-2.235-.957-4.518-1.535-6.842 1.62-.479 3.21-.974 4.761-1.488C236.905 145.465 256 129.745 256 113.668c0-15.417-17.868-30.326-45.517-39.844z"
            fill="#00D8FF"
          />
        </svg>
      </div>
    ),
    position: "top-2 -right-8",
    color: "border-sky-500/30 text-sky-600 dark:text-sky-400",
    delay: 0.18,
  },
  {
    name: "VueJS",
    icon: (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 -17.5 256 256" fill="none" className="h-3 w-3">
          <path
            d="M204.8 0L256 0L128 220.8L0 0L50.56 0L97.92 0L128 51.2L157.44 0L204.8 0Z"
            fill="#41B883"
          />
          <path d="M0 0L128 220.8L256 0L204.8 0L128 132.48L50.56 0L0 0Z" fill="#41B883" />
          <path d="M50.56 0L128 133.12L204.8 0L157.44 0L128 51.2L97.92 0L50.56 0Z" fill="#35495E" />
        </svg>
      </div>
    ),
    position: "top-8 -right-5",
    color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    delay: 0.26,
  },
  {
    name: "PHP",
    icon: (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 0 192.756 192.756" fill="none" className="h-4 w-4">
          <path
            d="M96.378 138.287c45.673 0 82.698-18.764 82.698-41.909s-37.025-41.909-82.698-41.909-82.698 18.764-82.698 41.909 37.026 41.909 82.698 41.909z"
            fill="#6e81b6"
          />
          <path
            d="M113.131 109.924l4.102-21.112c.926-4.765.156-8.319-2.287-10.565-2.367-2.173-6.385-3.23-12.283-3.23h-7.104l2.032-10.46a1.344 1.344 0 0 0-1.319-1.602h-9.805c-.644 0-1.197.457-1.32 1.089L80.79 86.457c-.396-2.522-1.372-4.69-2.934-6.479-2.876-3.292-7.425-4.961-13.522-4.961H45.33c-.644 0-1.197.457-1.32 1.088l-8.817 45.368c-.077.395.026.801.282 1.111.255.311.635.49 1.038.49h9.882c.644 0 1.197-.457 1.32-1.09l2.133-10.973h7.356c3.86 0 7.104-.418 9.636-1.242 2.589-.842 4.972-2.27 7.072-4.236 1.697-1.559 3.099-3.305 4.178-5.188l-1.761 9.064c-.077.395.026.803.282 1.111.255.311.636.49 1.038.49h9.805c.644 0 1.197-.457 1.32-1.088l4.839-24.903h6.728c2.867 0 3.707.571 3.936.816.207.224.637 1.013.154 3.5l-3.9 20.073a1.347 1.347 0 0 0 1.32 1.601h9.961a1.341 1.341 0 0 0 1.319-1.085zM67.673 92.48c-.616 3.165-1.776 5.422-3.45 6.709-1.7 1.311-4.419 1.975-8.082 1.975h-4.38l3.167-16.298h5.663c4.16 0 5.836.889 6.509 1.634.933 1.034 1.131 3.103.573 5.98zM154.432 79.978c-2.875-3.292-7.424-4.961-13.521-4.961h-19.004c-.645 0-1.197.457-1.32 1.088l-8.816 45.368c-.078.395.025.801.281 1.111s.637.49 1.037.49h9.883c.645 0 1.197-.457 1.32-1.09l2.133-10.973h7.357c3.861 0 7.102-.418 9.635-1.242 2.59-.842 4.973-2.27 7.072-4.236 1.752-1.609 3.193-3.418 4.285-5.371s1.875-4.131 2.332-6.475c1.123-5.781.224-10.393-2.674-13.709zm-9.621 12.502c-.617 3.165-1.777 5.422-3.449 6.709-1.701 1.311-4.42 1.975-8.082 1.975h-4.381l3.166-16.298h5.664c4.16 0 5.836.889 6.51 1.634.931 1.034 1.13 3.103.572 5.98z"
            fill="#fff"
          />
        </svg>
      </div>
    ),
    position: "top-14 -right-8",
    color: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400",
    delay: 0.34,
  },
];

const integrations = [
  {
    name: "Google Tag Manager",
    logo: "/images/google_tag_manager_logo.png",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    badge: null,
  },
  {
    name: "Trang chat độc lập",
    icon: () => (
      <div className="ml-3 flex items-center gap-1">
        <QrCode className="h-4 w-4 shrink-0 text-current" />
        <Link className="h-4 w-4 shrink-0 text-current" />
      </div>
    ),
    color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    badge: null,
    qrAndLink: true,
  },
  {
    name: "WordPress Plugin",
    logo: "/images/wordpress_logo.png",
    color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    badge: null,
  },
  {
    name: "Shopify App Embed",
    logo: "/images/shopify_logo.png",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    badge: {
      label: "S\u1eafp ra m\u1eaft",
      className:
        "border-amber-500/25 bg-amber-500/15 text-[7px] font-semibold text-amber-600 dark:text-amber-400",
    },
  },
];

export function MockupIntegration() {
  return (
    <Mockup3DWrapper overflowVisible>
      <div className="relative">
        <div className="mb-1 flex items-center gap-2" style={{ transform: "translateZ(8px)" }}>
          <span className="flex h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[13px] font-extrabold uppercase text-foreground">
            Website Widget
          </span>
        </div>

        <p
          className="mb-4 text-[10px] text-muted-foreground"
          style={{ transform: "translateZ(6px)" }}
        >
          Tích hợp đa nền tảng
        </p>

        <div className="relative mb-4">
          <div
            className="overflow-hidden rounded-xl border border-border/20 bg-background shadow-sm"
            style={{ transform: "translateZ(8px)" }}
          >
            <div className="bg-[#0d1117] px-0 py-0">
              <div className="flex border-b border-white/5">
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500/80" />
                  <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
                  <span className="h-2 w-2 rounded-full bg-green-500/80" />
                </div>
              </div>
              <div className="flex">
                <div className="flex select-none flex-col items-end gap-0 border-r border-white/5 px-2 py-2.5 font-mono text-[6px] leading-[1.65] text-white/20">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <span>6</span>
                </div>
                <div className="space-y-0 px-3 py-2.5 font-mono text-[7px] leading-[1.65]">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    <span className="text-[#ff7b72]">&lt;script</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  >
                    <span className="ml-2 text-[#79c0ff]"> src</span>
                    <span className="text-[#ffa657]">=</span>
                    <span className="text-[#a5d6ff]">&quot;https://vielora.vn/widget.js&quot;</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  >
                    <span className="ml-2 text-[#79c0ff]"> data-bot-id</span>
                    <span className="text-[#ffa657]">=</span>
                    <span className="text-[#a5d6ff]">&quot;abc-def-123&quot;</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.3 }}
                  >
                    <span className="ml-2 text-[#d2a8ff]"> defer</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <span className="text-[#ff7b72]">&gt;&lt;/script&gt;</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {frameworks.map((f) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: f.delay,
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`absolute flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[8px] font-semibold shadow-sm backdrop-blur-sm ${f.color} ${f.position}`}
              style={{ z: 20 }}
            >
              {f.icon}
              {f.name}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3 + i * 0.1,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`relative rounded-xl border p-3 ${item.color}`}
              style={{ transform: `translateZ(${14 + i * 6}px)` }}
            >
              <div className="flex items-start justify-between">
                <div className="relative flex h-6 w-6 items-center justify-center">
                  {item.logo ? (
                    <Image
                      src={item.logo}
                      alt={item.name}
                      fill
                      className="object-contain"
                      sizes="24px"
                    />
                  ) : (
                    item.icon()
                  )}
                </div>
                {item.badge && (
                  <span
                    className={`inline-block rounded-full border px-1.5 py-0.5 ${item.badge.className}`}
                  >
                    {item.badge.label}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[9px] font-semibold leading-tight">{item.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Mockup3DWrapper>
  );
}
