import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkspaceBranding {
  workspaceId: string;
  brandName: string | null;
  logoUrl: string | null;
  primaryColor: string; // default '#3B82F6'
  secondaryColor: string | null;
  fontFamily: string | null;
  headerText: string | null;
  footerText: string | null;
  watermarkUrl: string | null;
  defaultLanguage: string; // default 'vi'
  supportedLanguages: string[];
}

export const BRANDING_FALLBACK: WorkspaceBranding = {
  workspaceId: "",
  brandName: null,
  logoUrl: null,
  primaryColor: "#3B82F6", // matches WIDGET_FALLBACK.PRIMARY_COLOR
  secondaryColor: null,
  fontFamily: null,
  headerText: null,
  footerText: null,
  watermarkUrl: null,
  defaultLanguage: "vi",
  supportedLanguages: ["vi"],
};

export async function getBranding(
  client: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceBranding> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from("workspace_branding")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return { ...BRANDING_FALLBACK, workspaceId };

  return {
    workspaceId,
    brandName: data.brand_name ?? null,
    logoUrl: data.logo_url ?? null,
    primaryColor: data.primary_color ?? "#3B82F6",
    secondaryColor: data.secondary_color ?? null,
    fontFamily: data.font_family ?? null,
    headerText: data.header_text ?? null,
    footerText: data.footer_text ?? null,
    watermarkUrl: data.watermark_url ?? null,
    defaultLanguage: data.default_language ?? "vi",
    supportedLanguages: data.supported_languages ?? ["vi"],
  };
}
