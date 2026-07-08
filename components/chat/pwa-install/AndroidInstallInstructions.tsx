"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, CirclePlus, Download, Ellipsis, Menu, Share } from "lucide-react";
import { EAndroidBrowser } from "@/types/enums";

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

function GenericChromiumInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Ellipsis} label="ba chấm" /> trên thanh địa chỉ.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" /> hoặc{" "}
        <ActionBadge icon={Download} label="Cài đặt ứng dụng" />.
      </InstallStep>
    </InstallStepsList>
  );
}

function BraveInstructions() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <p>
        Trình duyệt Brave trên Android hiện chưa hỗ trợ cài đặt PWA đầy đủ. Vui lòng mở liên kết này
        bằng Chrome để cài đặt ứng dụng.
      </p>
    </div>
  );
}

function OperaInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn vào biểu tượng <ActionBadge icon={Menu} label="Opera" /> (chữ O) ở góc dưới màn hình.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" />.
      </InstallStep>
    </InstallStepsList>
  );
}

function SamsungInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Ellipsis} label="ba chấm" /> trên thanh địa chỉ.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={Share} label="Add page to" />.
      </InstallStep>
      <InstallStep step={3}>
        Chọn <ActionBadge icon={CirclePlus} label="Home screen" />.
      </InstallStep>
    </InstallStepsList>
  );
}

function CocCocInstructions() {
  return (
    <InstallStepsList>
      <InstallStep step={1}>
        Nhấn nút <ActionBadge icon={Ellipsis} label="ba chấm" /> trên thanh địa chỉ.
      </InstallStep>
      <InstallStep step={2}>
        Chọn <ActionBadge icon={Download} label="Cài đặt ứng dụng" /> hoặc{" "}
        <ActionBadge icon={CirclePlus} label="Thêm vào Màn hình chính" />.
      </InstallStep>
    </InstallStepsList>
  );
}

export function AndroidInstallInstructions({ browser }: { browser: EAndroidBrowser }) {
  switch (browser) {
    case EAndroidBrowser.Brave:
      return <BraveInstructions />;
    case EAndroidBrowser.Opera:
      return <OperaInstructions />;
    case EAndroidBrowser.Samsung:
      return <SamsungInstructions />;
    case EAndroidBrowser.CocCoc:
      return <CocCocInstructions />;
    default:
      return <GenericChromiumInstructions />;
  }
}
