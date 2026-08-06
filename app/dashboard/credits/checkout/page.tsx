"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { UnifiedCheckoutClient } from "@/components/shared/pricing/UnifiedCheckoutClient";

export default function CreditCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <UnifiedCheckoutClient mode="credits" />
    </Suspense>
  );
}
