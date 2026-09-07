import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getDashboardLocale } from "@/lib/i18n/dashboard-locale";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getDashboardLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
