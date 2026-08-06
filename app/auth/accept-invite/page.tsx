"use client";

import { Suspense, useEffect, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type State = {
  status: "loading" | "accepting" | "redirecting" | "error";
  errorMessage?: string;
};

type Action =
  | { type: "MISSING_TOKEN" }
  | { type: "ACCEPTING" }
  | { type: "SUCCESS"; slug: string }
  | { type: "NOT_AUTHENTICATED"; token: string }
  | { type: "ERROR"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "MISSING_TOKEN":
      return { status: "error", errorMessage: "Invalid invitation link." };
    case "ACCEPTING":
      return { status: "accepting" };
    case "SUCCESS":
      return { status: "redirecting" };
    case "NOT_AUTHENTICATED":
      return { status: "redirecting" };
    case "ERROR":
      return { status: "error", errorMessage: action.message };
    default:
      return state;
  }
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, dispatch] = useReducer(reducer, {
    status: token ? "accepting" : "error",
    errorMessage: token ? undefined : "Invalid invitation link.",
  });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function accept() {
      dispatch({ type: "ACCEPTING" });
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (cancelled) return;

        if (res.status === 401) {
          const returnUrl = `/auth/accept-invite?token=${encodeURIComponent(token)}`;
          router.push(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          dispatch({ type: "ERROR", message: data.error || "Failed to accept invitation" });
          return;
        }

        const data = await res.json();
        if (data.workspace?.slug) {
          router.push(`/${data.workspace.slug}`);
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: "ERROR", message: "Network error. Please try again." });
        }
      }
    }

    accept();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="mx-4 max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-xl">
          <h2 className="mb-2 text-xl font-bold text-foreground">Invalid Invitation</h2>
          <p className="text-sm text-muted-foreground">
            {state.errorMessage || "This invitation link is invalid or has expired."}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Please contact the workspace owner for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {state.status === "accepting" ? "Accepting invitation..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
