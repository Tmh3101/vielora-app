import {
  useTranslations as useNextIntlTranslations,
  useLocale as useNextIntlLocale,
} from "next-intl";
import viMessages from "@/messages/vi.json";
import enMessages from "@/messages/en.json";

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const result = path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);

  return typeof result === "string" ? result : undefined;
}

export function useSafeTranslations(namespace?: string) {
  try {
    return useNextIntlTranslations(namespace);
  } catch {
    const fallbackT = (key: string, values?: Record<string, string | number>) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      let text =
        getNestedValue(viMessages as Record<string, unknown>, fullPath) ||
        getNestedValue(enMessages as Record<string, unknown>, fullPath) ||
        key;

      if (values && typeof text === "string") {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
        });
      }
      return text;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fallbackT as any;
  }
}

export function useSafeLocale(): string {
  try {
    return useNextIntlLocale();
  } catch {
    return "vi";
  }
}
