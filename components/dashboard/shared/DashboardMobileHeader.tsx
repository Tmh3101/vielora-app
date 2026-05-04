"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";
// import { Settings } from "lucide-react";

export interface DashboardMobileHeaderProps {
  fullName?: string;
  email?: string;
  currentPlanLabel: string;
  onNavigateSettings?: () => void;
  onSignOut: () => Promise<void>;
}

export function DashboardMobileHeader({
  fullName,
  email,
  currentPlanLabel,
  // onNavigateSettings,
  onSignOut,
}: DashboardMobileHeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-50 lg:hidden">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo-full.png"
              alt="Vielora"
              width={120}
              height={40}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="glass">
                <div className="bg-gradient-primary mr-2 flex h-7 w-7 items-center justify-center rounded-lg">
                  <span className="text-xs font-medium text-primary-foreground">
                    {fullName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-md w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs font-medium">{email}</p>
                <p className="text-xs capitalize text-muted-foreground">Gói {currentPlanLabel}</p>
              </div>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={onNavigateSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onSignOut()} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
