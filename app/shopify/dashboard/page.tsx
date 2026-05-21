import { Suspense } from "react";
import { AppBridgeProvider } from "@/components/shopify/AppBridgeProvider";
import { DashboardClient } from "@/components/dashboard/overview/DashboardClient";

export default function ShopifyEmbeddedApp() {
  return (
    <Suspense fallback={null}>
      <AppBridgeProvider>
        <main className="min-h-screen bg-gray-50">
          <DashboardClient />
        </main>
      </AppBridgeProvider>
    </Suspense>
  );
}
