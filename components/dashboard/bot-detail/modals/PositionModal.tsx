"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { parsePosition, type DragPosition } from "@/lib/helpers";
import { WIDGET_POSITION } from "@/config/widget";
import { getIconSVG } from "@/lib/icons";
import { EWidgetIconType } from "@/types";

interface PositionModalProps {
  open: boolean;
  botName: string;
  avatarUrl: string | null;
  primaryColor: string;
  chatIconType: EWidgetIconType;
  chatIconUrl: string | null;
  chatIconBgColor: string;
  chatIconPreset: string;
  chatIconColor: string;
  currentPosition: string | { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onClose: () => void;
}

export function PositionModal({
  open,
  primaryColor,
  chatIconType,
  chatIconUrl,
  chatIconBgColor,
  chatIconPreset,
  chatIconColor,
  currentPosition,
  onPositionChange,
  onClose,
}: PositionModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<DragPosition>(parsePosition(currentPosition));
  const dragStartRef = useRef<DragPosition>({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!open) return;

    const frame = frameRef.current;
    if (!frame) return;

    const updateScaledPosition = () => {
      const frameRect = frame.getBoundingClientRect();
      if (frameRect.width === 0 || frameRect.height === 0) return;

      const loadedPosition = parsePosition(currentPosition);
      const scaledPosition = {
        x: loadedPosition.x * (frameRect.width / WIDGET_POSITION.FRAME_WIDTH),
        y: loadedPosition.y * (frameRect.height / WIDGET_POSITION.FRAME_HEIGHT),
      };

      setDragPosition(scaledPosition);
    };

    updateScaledPosition();

    const resizeObserver = new ResizeObserver(() => {
      updateScaledPosition();
    });

    resizeObserver.observe(frame);

    return () => {
      resizeObserver.disconnect();
    };
  }, [open, currentPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!iconRef.current) return;

    setIsDragging(true);

    // Get icon position
    const iconRect = iconRef.current.getBoundingClientRect();

    // Calculate offset between mouse position and icon's top-left corner
    dragStartRef.current = {
      x: e.clientX - iconRect.left,
      y: e.clientY - iconRect.top,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!frameRef.current) return;

      const frameRect = frameRef.current.getBoundingClientRect();
      let newX = e.clientX - frameRect.left - dragStartRef.current.x;
      let newY = e.clientY - frameRect.top - dragStartRef.current.y;

      const minX = WIDGET_POSITION.PADDING;
      const maxX = frameRect.width - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
      const minY = WIDGET_POSITION.PADDING;
      const maxY = frameRect.height - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setDragPosition({ x: newX, y: newY });
    };

    const handleDocumentMouseUp = () => {
      if (frameRef.current) {
        const frameRect = frameRef.current.getBoundingClientRect();
        const iconX = dragPosition.x;
        const iconY = dragPosition.y;
        const iconCenterX = iconX + WIDGET_POSITION.ICON_SIZE / 2;
        const iconCenterY = iconY + WIDGET_POSITION.ICON_SIZE / 2;

        const distToLeft = iconCenterX - WIDGET_POSITION.PADDING;
        const distToRight = frameRect.width - WIDGET_POSITION.PADDING - iconCenterX;
        const distToTop = iconCenterY - WIDGET_POSITION.PADDING;
        const distToBottom = frameRect.height - WIDGET_POSITION.PADDING - iconCenterY;

        const minDistance = Math.min(distToLeft, distToRight, distToTop, distToBottom);

        let snapX = iconX;
        let snapY = iconY;

        if (minDistance === distToLeft) {
          snapX = WIDGET_POSITION.PADDING;
        } else if (minDistance === distToRight) {
          snapX = frameRect.width - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
        } else if (minDistance === distToTop) {
          snapY = WIDGET_POSITION.PADDING;
        } else if (minDistance === distToBottom) {
          snapY = frameRect.height - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
        }

        setDragPosition({ x: snapX, y: snapY });
      }

      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [isDragging, dragPosition]);

  const handleConfirm = () => {
    let normalizedPosition = { x: dragPosition.x, y: dragPosition.y };

    if (frameRef.current) {
      const frameRect = frameRef.current.getBoundingClientRect();
      const scaleX = WIDGET_POSITION.FRAME_WIDTH / frameRect.width;
      const scaleY = WIDGET_POSITION.FRAME_HEIGHT / frameRect.height;

      normalizedPosition = {
        x: dragPosition.x * scaleX,
        y: dragPosition.y * scaleY,
      };
    }

    onPositionChange({
      x: normalizedPosition.x,
      y: normalizedPosition.y,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Chỉnh sửa vị trí icon chatbot
          </DialogTitle>
          <DialogDescription>
            Kéo icon chatbot xung quanh để chọn vị trí hiển thị trên website
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Website Frame with Draggable Icon */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Kéo để thay đổi vị trí</h3>
            <div className="relative overflow-hidden rounded-xl border-2 border-border/50">
              <div
                ref={frameRef}
                className="relative flex h-[400px] items-end justify-center bg-muted/40 p-8"
              >
                {/* Website background grid pattern */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                ></div>

                {/* Website content placeholder */}
                <div className="relative z-10 w-full space-y-3">
                  <div className="mx-auto max-w-sm space-y-2">
                    <div className="h-8 rounded bg-background/50" />
                    <div className="h-4 rounded bg-background/50" />
                    <div className="h-4 w-3/4 rounded bg-background/50" />
                  </div>
                </div>

                {/* Draggable Icon Chatbot */}

                <div
                  ref={iconRef}
                  className={`absolute z-20 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-shadow ${isDragging ? "cursor-grabbing active:shadow-xl" : "cursor-grab"}`}
                  style={{
                    backgroundColor:
                      chatIconType === EWidgetIconType.Preset ? primaryColor : chatIconBgColor,
                    left: `${dragPosition.x}px`,
                    top: `${dragPosition.y}px`,
                    transition: isDragging ? "none" : "all 0.15s ease-out",
                    pointerEvents: "auto",
                  }}
                  onMouseDown={handleMouseDown}
                  title="Kéo để di chuyển"
                >
                  {chatIconType === EWidgetIconType.Custom && chatIconUrl ? (
                    <Image
                      src={chatIconUrl}
                      alt="Custom icon"
                      width={56}
                      height={56}
                      className="h-full w-full rounded-full object-cover"
                      draggable={false}
                      unoptimized
                    />
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: getIconSVG(chatIconPreset),
                      }}
                      style={{
                        color: chatIconColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Kéo icon tự do bên trong khung website. Icon không thể kéo ra ngoài khung.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-2 hover:border-primary hover:bg-white hover:text-primary"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            className="border-2 border-primary bg-primary text-white hover:border-primary/90 hover:bg-primary/90"
          >
            Lưu vị trí
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
