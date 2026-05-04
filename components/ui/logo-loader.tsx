"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoLoaderProps {
  className?: string;
  size?: number;
}

export function LogoLoader({ className, size = 40 }: LogoLoaderProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
      <div className="relative animate-pulse">
        <Image
          src="/images/logo-icon.png"
          alt="Loading..."
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
