import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getDashboardLocale } from "@/lib/i18n/dashboard-locale";
import { WorkspaceProvider } from "@/hooks/useWorkspace";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getDashboardLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </NextIntlClientProvider>
  );
}
