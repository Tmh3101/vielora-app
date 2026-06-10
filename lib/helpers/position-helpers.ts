import { WIDGET_FALLBACK } from "@/config/widget";

export interface DragPosition {
  x: number;
  y: number;
}

const DEFAULT_POSITION = JSON.parse(WIDGET_FALLBACK.POSITION) as DragPosition;

export const parsePosition = (pos: string | { x: number; y: number } | undefined): DragPosition => {
  if (typeof pos === "object" && pos && typeof pos.x === "number" && typeof pos.y === "number") {
    return { x: pos.x, y: pos.y };
  }

  if (typeof pos === "string") {
    try {
      const parsed = JSON.parse(pos);
      if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number") {
        return { x: parsed.x, y: parsed.y };
      }
    } catch {
      // Invalid JSON, use default
    }
  }

  return DEFAULT_POSITION;
};
