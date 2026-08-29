import type { SupabaseClient } from "@supabase/supabase-js";
import { signInternalRenderToken } from "@/lib/helpers/report-token";

/**
 * Template Renderer
 * Generates the signed internal token and fetches the rendered HTML via fetch (for preview / internal rendering).
 */
export async function renderReportHtml(
  exportId: string,
  _adminClient?: SupabaseClient
): Promise<string> {
  const token = signInternalRenderToken(exportId);
  const baseUrl = process.env.INTERNAL_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/internal/reports/render/${exportId}`, {
    headers: { "x-report-token": token },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to render report HTML: ${res.status} ${res.statusText}`);
  }

  return res.text();
}
