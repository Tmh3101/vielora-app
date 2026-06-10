"use client";

import React, { useId } from "react";
import Image from "next/image";
import { Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { QR_CODE_SIZE, AVATAR_SIZE, TRANSPARENT_AVATAR_SRC } from "@/config/widget";

export interface StandaloneChatPageQRCodeProps {
  url: string;
  avatarUrl: string | null;
  botName?: string;
}

export function StandaloneChatPageQRCode({
  url,
  avatarUrl,
  botName,
}: StandaloneChatPageQRCodeProps) {
  const canvasId = useId().replace(/:/g, "");
  const avatarImageRef = React.useRef<HTMLImageElement>(null);

  const handleDownload = () => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = getDownloadUrl(canvas);
    link.download = `${botName || "vielora"}-chat-qr.png`;
    link.click();
  };

  const getDownloadUrl = (canvas: HTMLCanvasElement) => {
    const avatarImage = avatarImageRef.current;

    if (!avatarUrl || !avatarImage?.complete || !avatarImage.naturalWidth) {
      return canvas.toDataURL("image/png");
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    const context = exportCanvas.getContext("2d");
    if (!context) {
      return canvas.toDataURL("image/png");
    }

    context.drawImage(canvas, 0, 0);

    const scale = canvas.width / QR_CODE_SIZE;
    const avatarSize = AVATAR_SIZE * scale;
    const avatarRadius = avatarSize / 2;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = (canvas.height - avatarSize) / 2;

    context.save();
    context.beginPath();
    context.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
    context.clip();
    context.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    context.restore();

    try {
      return exportCanvas.toDataURL("image/png");
    } catch {
      return canvas.toDataURL("image/png");
    }
  };

  return (
    <div className="rounded-xl p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative overflow-hidden rounded-2xl border bg-white p-3 shadow-sm">
          <QRCodeCanvas
            id={canvasId}
            value={url}
            size={QR_CODE_SIZE}
            marginSize={2}
            level="H"
            imageSettings={
              avatarUrl
                ? {
                    src: TRANSPARENT_AVATAR_SRC,
                    height: AVATAR_SIZE,
                    width: AVATAR_SIZE,
                    excavate: true,
                  }
                : undefined
            }
            title={botName ? `QR code for ${botName}` : "Standalone chat QR code"}
          />
          {avatarUrl && (
            <Image
              ref={avatarImageRef}
              src={avatarUrl}
              alt=""
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              unoptimized
              crossOrigin="anonymous"
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover"
            />
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-white bg-transparent text-primary hover:border hover:border-primary hover:bg-transparent hover:text-primary"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Tải mã QR
        </Button>
      </div>
    </div>
  );
}
