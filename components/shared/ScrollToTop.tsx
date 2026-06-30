"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useLenis } from "lenis/react";

export default function ScrollToTop() {
  const lenis = useLenis();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => lenis?.scrollTo(0, { duration: 1.5 });

  return (
    <motion.button
      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8, y: isVisible ? 0 : 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="hover:shadow-glow-sm fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/90 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-primary"
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <ArrowUp className="h-5 w-5" />
    </motion.button>
  );
}
