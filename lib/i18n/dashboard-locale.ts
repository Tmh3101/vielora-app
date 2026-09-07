import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { ESystemLanguage } from "@/types/enums";

export const DEFAULT_LOCALE: ESystemLanguage = ESystemLanguage.Vi;

export async function getDashboardLocale(): Promise<ESystemLanguage> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale as ESystemLanguage;

  // Fallback: user metadata via supabase auth
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const metaLocale = user?.user_metadata?.locale;
    if (metaLocale && isValidLocale(metaLocale)) return metaLocale as ESystemLanguage;
  } catch {
    // Fall back to default locale if Supabase lookup fails.
  }

  return DEFAULT_LOCALE;
}

function isValidLocale(v: unknown): boolean {
  return typeof v === "string" && ["vi", "en"].includes(v);
}
