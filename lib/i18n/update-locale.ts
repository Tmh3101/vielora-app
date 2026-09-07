import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ESystemLanguage } from "@/types/enums";

export async function updateUserLocale(locale: ESystemLanguage | string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  await supabase.auth.updateUser({ data: { locale } });
}
