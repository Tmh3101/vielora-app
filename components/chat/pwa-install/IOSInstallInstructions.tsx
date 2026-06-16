"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, CirclePlus, Ellipsis, Menu, Share } from "lucide-react";
import { EIOSBrowser } from "@/types/enums";

function InstallStep({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {step}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{children}</p>
    </li>
  );
}

function ActionBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 align-middle text-xs font-semibold text-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function InstallStepsList({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-4">{children}</ol>;
}

function SafariInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Ellipsis} label="ba chấm" /> trên thanh công cụ ở cuối màn hình.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={Share} label="Chia sẻ" /> trong menu vừa mở.
      </InstallStep>
      <InstallStep step={3}>
        Chọn <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" />.
      </InstallStep>
    </InstallStepsList>
  );
}

function ChromiumInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Share} label="Chia sẻ" /> nằm trong hoặc bên cạnh thanh địa chỉ
        ở phía trên.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" />.
      </InstallStep>
    </InstallStepsList>
  );
}

function EdgeInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Menu} label="Menu" /> (ba gạch ngang) bên cạnh thanh địa chỉ.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={Share} label="Chia sẻ" /> trong menu.
      </InstallStep>
      <InstallStep step={3}>
        Chọn <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" />.
      </InstallStep>
    </InstallStepsList>
  );
}

export function IOSInstallInstructions({ browser }: { browser: EIOSBrowser }) {
  if (browser === EIOSBrowser.Brave) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <p>
          Trình duyệt Brave trên iOS hiện chưa hỗ trợ cài đặt PWA. Vui lòng mở liên kết này bằng
          Safari hoặc Chrome để cài đặt ứng dụng.
        </p>
      </div>
    );
  }

  if (browser === EIOSBrowser.Safari) {
    return <SafariInstructions />;
  }

  if (
    browser === EIOSBrowser.Chrome ||
    browser === EIOSBrowser.Firefox ||
    browser === EIOSBrowser.Other
  ) {
    return <ChromiumInstructions />;
  }

  return <EdgeInstructions />;
}
