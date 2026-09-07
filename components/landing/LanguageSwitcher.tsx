"use client";

import { LanguageSwitcher as SharedSwitcher } from "@/components/shared/LanguageSwitcher";
import type { LanguageSwitcherProps } from "@/components/shared/LanguageSwitcher";

// Landing uses URL-prefix routing (next-intl). Force routing mode.
export default function LanguageSwitcher(props: Omit<LanguageSwitcherProps, "mode">) {
  return <SharedSwitcher {...props} mode="routing" />;
}
export { SharedSwitcher as LanguageSwitcherBase };
