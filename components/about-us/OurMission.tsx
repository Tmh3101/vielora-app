"use client";

import { motion } from "framer-motion";
import { Target, Heart, Eye, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

const OurMission = () => {
  const t = useTranslations("aboutUs");

  const values = [
    {
      icon: Eye,
      title: t("vision"),
      description: t("visionDesc"),
    },
    {
      icon: Target,
      title: t("mission"),
      description: t("missionDesc"),
    },
    {
      icon: Heart,
      title: t("coreValues"),
      description: t("coreValuesDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("responsibility"),
      description: t("responsibilityDesc"),
    },
  ];

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
              {t("missionHeading")}
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">{t("missionDesc")}</p>
            <div className="glass-primary rounded-r-2xl border-l-4 border-l-primary p-6">
              <p className="text-xl font-medium italic text-foreground">&quot;{t("quote")}&quot;</p>
              <p className="mt-4 text-sm font-bold text-primary">{t("quoteAuthor")}</p>
            </div>
          </motion.div>

          <ul className="grid gap-6 sm:grid-cols-2">
            {values.map((value, index) => (
              <motion.li
                key={index}
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
