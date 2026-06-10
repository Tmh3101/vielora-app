"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getShopifyIdToken } from "@/hooks/useShopifyFetch";

type ShopifyGlobal = {
  idToken: () => Promise<string>;
};

type SSOButtonProps = {
  disabled?: boolean;
  className?: string;
  label?: string;
  loadingLabel?: string;
};

declare global {
  interface Window {
    shopify?: ShopifyGlobal;
  }
}

export function SSOButton({
  disabled = false,
  className,
  label = "Open Vielora Workspace",
  loadingLabel = "Opening secure workspace...",
}: SSOButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSSORedirect = async () => {
    if (loading || disabled) return;

    setLoading(true);
    const popup = window.open("about:blank", "_blank");

    if (!popup) {
      console.error("Shopify SSO launch failed:", new Error("Popup blocked by browser"));
      setLoading(false);
      return;
    }

    try {
      const token = await getShopifyIdToken();
      if (!token) {
        throw new Error("Missing Shopify session token");
      }

      const url = `/api/shopify/sso?token=${token}`;
      popup.location.replace(url);
      popup.focus();
    } catch (error) {
      popup.close();
      console.error("Shopify SSO launch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <Button
        type="button"
        size="lg"
        onClick={handleSSORedirect}
        disabled={loading || disabled}
        className={cn("w-full sm:w-auto", className)}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          <>
            {label}
            <ExternalLink className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
