"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, CirclePlus, Copy, Download, Ellipsis } from "lucide-react";
import { useState } from "react";
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

function ChromeEdgeInstructions() {
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

function UnsupportedBrowserInstructions({ appName }: { appName: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="font-medium text-amber-900">Trình duyệt chưa hỗ trợ cài đặt</p>
          <p className="text-xs leading-relaxed text-amber-700">
            Để cài đặt <span className="font-semibold">{appName}</span> trên thiết bị Android, vui
            lòng mở liên kết này bằng <span className="font-semibold">Chrome</span> hoặc{" "}
            <span className="font-semibold">Edge</span> để có trải nghiệm tốt nhất.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Sao chép liên kết và mở bằng Chrome:
        </p>
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Đã sao chép!" : "Sao chép liên kết"}
        </button>
      </div>
    </div>
  );
}

export function AndroidInstallInstructions({
  browser,
  appName,
}: {
  browser: EAndroidBrowser;
  appName: string;
}) {
  if (browser === EAndroidBrowser.Chrome || browser === EAndroidBrowser.Edge) {
    return <ChromeEdgeInstructions />;
  }

  return <UnsupportedBrowserInstructions appName={appName} />;
}
