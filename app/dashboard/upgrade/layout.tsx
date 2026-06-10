import { UpgradeShell } from "@/components/dashboard/upgrade/UpgradeShell";
import type { ReactNode } from "react";

export default function UpgradeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <UpgradeShell>{children}</UpgradeShell>;
}
