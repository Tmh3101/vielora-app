"use client";

import { LanguageSwitcher as SharedSwitcher } from "@/components/shared/LanguageSwitcher";
import type { LanguageSwitcherProps } from "@/components/shared/LanguageSwitcher";

// Dashboard uses cookie + Supabase (no URL prefix). Force cookie mode.
export function LanguageToggle(props: Omit<LanguageSwitcherProps, "mode">) {
  return <SharedSwitcher {...props} mode="cookie" />;
}
export default LanguageToggle;
export { SharedSwitcher as LanguageSwitcher };
