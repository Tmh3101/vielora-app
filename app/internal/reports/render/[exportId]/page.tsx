import React from "react";
import { headers } from "next/headers";
import { verifyInternalRenderToken } from "@/lib/helpers/report-token";
import { createAdminClient } from "@/lib/supabase/server";
import { getBranding } from "@/lib/reports/branding-provider";
import { translateReportData } from "@/lib/reports/language-resolver";
import { getComprehensiveReportData } from "@/lib/reports/unified-data-source";
import DynamicReportRenderer from "@/lib/reports/DynamicReportRenderer";
import type { TemplateSectionConfig } from "@/types";

// Centralized static i18n dictionaries for guaranteed Webpack bundling
import dictVi from "@/lib/reports/i18n/vi.json";
import dictEn from "@/lib/reports/i18n/en.json";
import dictAr from "@/lib/reports/i18n/ar.json";

const STATIC_I18N: Record<string, Record<string, string>> = {
  vi: dictVi,
  en: dictEn,
  ar: dictAr,
};

export const dynamic = "force-dynamic";

export default async function ReportRenderPage({
  params,
  searchParams,
}: {
  params: {
    exportId: string;
  };
  searchParams?: {
    lang?: string;
  };
}) {
  const { exportId } = params;

  // 1. Verify internal token (5-min HMAC)
  const token = headers().get("x-report-token") ?? "";
  if (!verifyInternalRenderToken(token, exportId)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response("Unauthorized", { status: 401 }) as any;
  }

  // 2. Fetch export from DB (admin client — bypasses RLS)
  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exportRow, error: fetchError } = await (adminClient as any)
    .from("report_exports")
    .select("*, report_templates(id, key, name, schema, languages, prompt_directive)")
    .eq("id", exportId)
    .single();

  if (fetchError || !exportRow) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response("Not Found", { status: 404 }) as any;
  }

  const templateRecord = Array.isArray(exportRow.report_templates)
    ? exportRow.report_templates[0]
    : exportRow.report_templates;

  const templateSchema = templateRecord?.schema as {
    title?: string;
    description?: string;
    prompt_directive?: string;
    sections?: TemplateSectionConfig[];
  } | null;

  const sections = templateSchema?.sections || [];
  const schemaTitle = templateSchema?.title || templateRecord?.name;

  const scope = (exportRow.scope as Record<string, unknown>) || {};
  const templateDirective =
    templateRecord?.prompt_directive || templateSchema?.prompt_directive || null;

  let targetLanguages: string[] = [];

  if (searchParams?.lang) {
    targetLanguages = [searchParams.lang];
  } else if (Array.isArray(scope.languages) && scope.languages.length > 0) {
    targetLanguages = scope.languages as string[];
  } else if (Array.isArray(templateRecord?.languages) && templateRecord.languages.length > 0) {
    targetLanguages = templateRecord.languages as string[];
  } else if (exportRow.language) {
    targetLanguages = [exportRow.language];
  } else {
    targetLanguages = ["vi"];
  }

  const mergedScope = {
    ...scope,
    promptDirective: templateDirective,
  };

  const ctx = {
    workspaceId: exportRow.workspace_id,
    botId: exportRow.bot_id,
    scope: mergedScope,
    language: targetLanguages[0] || "vi",
  };

  // 3. Fetch comprehensive report data
  const baseData = await getComprehensiveReportData(adminClient, ctx);

  // 4. Get branding
  const branding = await getBranding(adminClient, ctx.workspaceId);

  // 5. Build render sections for each target language
  const renderedSections = await Promise.all(
    targetLanguages.map(async (lang) => {
      let langData = baseData;
      if (lang !== "vi") {
        try {
          langData = (await translateReportData(
            baseData as unknown as Record<string, unknown>,
            lang
          )) as unknown as typeof baseData;
        } catch (err) {
          console.error(`[ReportRenderPage] Translation error for ${lang}:`, err);
        }
      }

      const i18n = STATIC_I18N[lang] || STATIC_I18N.vi;

      return {
        lang,
        isRtl: lang === "ar",
        data: langData,
        i18n,
      };
    })
  );

  return (
    <html lang={targetLanguages[0]} dir={targetLanguages[0] === "ar" ? "rtl" : "ltr"}>
      <head>
        <meta charSet="utf-8" />
        {branding.fontFamily && <link rel="preconnect" href="https://fonts.googleapis.com" />}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: A4;
                margin: 8mm 10mm;
              }
              nextjs-portal,
              [data-nextjs-dialog-overlay],
              [data-nextjs-toast],
              #__next-build-watcher,
              #nextjs-dev-overlay {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
              }
            `,
          }}
        />
      </head>
      <body className="bg-white text-slate-900 antialiased print:bg-white">
        <main className="space-y-6">
          {renderedSections.map((sec, idx) => (
            <div
              key={sec.lang}
              className={`report-language-page ${idx > 0 ? "break-before-page" : ""}`}
              dir={sec.isRtl ? "rtl" : "ltr"}
            >
              <DynamicReportRenderer
                schemaTitle={schemaTitle}
                sections={sections}
                data={sec.data}
                branding={branding}
                language={sec.lang}
                i18n={sec.i18n}
                reportTitle={(scope.reportTitle as string) || schemaTitle}
              />
            </div>
          ))}
        </main>
      </body>
    </html>
  );
}
