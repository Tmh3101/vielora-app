"use client";

import { PWAInstallRoot } from "./PWAInstallRoot";
import { PWAInstallHeaderButton } from "./PWAInstallHeaderButton";

export function PWAInstallController({
  appName,
  primaryColor,
  headerForeground,
}: {
  appName: string;
  primaryColor: string;
  headerForeground: string;
}) {
  return (
    <PWAInstallRoot
      appName={appName}
      primaryColor={primaryColor}
      headerForeground={headerForeground}
    >
      <PWAInstallHeaderButton />
    </PWAInstallRoot>
  );
}
