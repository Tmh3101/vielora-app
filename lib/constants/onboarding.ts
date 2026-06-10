export type OnboardingSourceMode = "website" | "files";

export const ONBOARDING_SOURCE_MODE = {
  WEBSITE: "website",
  FILES: "files",
} as const satisfies Record<string, OnboardingSourceMode>;
