import { redirect } from "next/navigation";
import { PaymentHistoryClient } from "@/components/dashboard/upgrade/PaymentHistoryClient";
import {
  getPaymentHistoryByUserId,
  getPaymentHistoryCountByUserId,
} from "@/lib/services/payment-history.service";
import { createServerClient } from "@/lib/supabase/server";
import { UPGRADE_HISTORY_PAGE_SIZE } from "@/lib/constants/pagination";

export const dynamic = "force-dynamic";

interface UpgradeHistoryPageProps {
  searchParams?: Promise<{
    page?: string;
  }>;
}

export default async function UpgradeHistoryPage({ searchParams }: UpgradeHistoryPageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const resolvedSearchParams = await searchParams;
  const requestedPage = Number(resolvedSearchParams?.page ?? "1");
  const totalItems = await getPaymentHistoryCountByUserId(supabase, user.id);
  const totalPages = Math.max(1, Math.ceil(totalItems / UPGRADE_HISTORY_PAGE_SIZE));
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.min(Math.floor(requestedPage), totalPages)
      : 1;
  const offset = (currentPage - 1) * UPGRADE_HISTORY_PAGE_SIZE;
  const paymentHistory = await getPaymentHistoryByUserId(
    supabase,
    user.id,
    UPGRADE_HISTORY_PAGE_SIZE,
    offset
  );

  return (
    <PaymentHistoryClient
      paymentHistory={paymentHistory}
      currentPage={currentPage}
      pageSize={UPGRADE_HISTORY_PAGE_SIZE}
      totalItems={totalItems}
    />
  );
}
