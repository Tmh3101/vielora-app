import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AuthPage from "@/app/auth/page";
import { getPwaScopedBotGroupPath, isBotSubdomainHost } from "@/lib/utils/standalone-chat-url";

export const dynamic = "force-dynamic";

export default async function PublicBotAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ botSlug: string }>;
  searchParams: Promise<{ next?: string; pwa?: string }>;
}) {
  const { botSlug } = await params;
  const query = await searchParams;
  const host = headers().get("host") ?? "";
  const isSubdomain = isBotSubdomainHost(host);

  const defaultNext = isSubdomain
    ? "/group?pwa_return=1"
    : `${getPwaScopedBotGroupPath(botSlug)}?pwa_return=1`;

  if (query.pwa !== "1" || !query.next) {
    const next = query.next || defaultNext;
    if (isSubdomain) {
      redirect(`/auth?next=${encodeURIComponent(next)}&pwa=1`);
    } else {
      redirect(`/public-bot/${botSlug}/auth?next=${encodeURIComponent(next)}&pwa=1`);
    }
  }

  return <AuthPage />;
}
