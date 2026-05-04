/**
 * Migration Note: Utility functions moved from src/lib/utils.ts
 * Path alias changed from @/lib to @/lib for Next.js compatibility
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
