"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Users, Palette, LayoutTemplate } from "lucide-react";

export function WorkspaceSettingsNav() {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();

  const membersHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/settings/members`
    : "/dashboard/settings/members";

  const brandingHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/settings/branding`
    : "/dashboard/settings/branding";

  const templatesHref = activeWorkspace?.slug
    ? `/${activeWorkspace.slug}/settings/templates`
    : "/dashboard/settings/templates";

  const isMembersActive =
    pathname.endsWith("/settings/members") || pathname.includes("/settings/members/");
  const isBrandingActive =
    pathname.endsWith("/settings/branding") || pathname.includes("/settings/branding/");
  const isTemplatesActive =
    pathname.endsWith("/settings/templates") || pathname.includes("/settings/templates/");

  return (
    <div className="flex border-b border-border/50">
      <nav className="-mb-px flex space-x-6" aria-label="Settings Tabs">
        <Link
          href={membersHref}
          className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
            isMembersActive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Thành viên
        </Link>
        <Link
          href={brandingHref}
          className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
            isBrandingActive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          <Palette className="h-4 w-4" />
          Thương hiệu
        </Link>
        <Link
          href={templatesHref}
          className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition-colors ${
            isTemplatesActive
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          Mẫu báo cáo
        </Link>
      </nav>
    </div>
  );
}
