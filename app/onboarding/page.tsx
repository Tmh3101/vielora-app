"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoLoader } from "@/components/ui/logo-loader";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [authLoading, router, user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoLoader size={60} />
      </div>
    );
  }

  return <OnboardingWizard userId={user.id} />;
}
