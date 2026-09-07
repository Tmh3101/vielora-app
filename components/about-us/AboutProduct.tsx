"use client";

import { motion } from "framer-motion";
import { Brain, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const AboutProduct = () => {
  const t = useTranslations("aboutUs");

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
              {t("productHeading")}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">{t("productDesc")}</p>

            <ul className="space-y-6">
              {[
                {
                  icon: Brain,
                  title: t("knowledgeTitle"),
                  description: t("knowledgeDesc"),
                },
                {
                  icon: Zap,
                  title: t("integrateTitle"),
                  description: t("integrateDesc"),
                },
              ].map((item, index) => (
                <li key={index} className="flex gap-4">
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
                  {t("coreTech")}
                </div>
                <h3 className="text-2xl font-bold text-foreground">{t("techTitle")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: t("dataLabel"), value: "Web crawl & files" },
                    { label: t("aiLabel"), value: "RAG & Google Gemini" },
                    { label: t("integrateLabel"), value: "Embed script" },
                    { label: t("optimizeLabel"), value: "GEO Optimization" },
                  ].map((stat, idx) => (
                    <div key={idx} className="glass rounded-2xl p-4">
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <div className="font-bold text-primary">{stat.value}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm italic text-muted-foreground">
                  &quot;{t("quoteProduct")}&quot;
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
