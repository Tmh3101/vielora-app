import { WIDGET_FALLBACK, WIDGET_POSITION, WIDGET_CONFIG } from "@/config/widget";

export interface DragPosition {
  x: number;
  y: number;
}

export interface ClampedPositionResult {
  clampedPosition: DragPosition;
  positionChatBelow: boolean;
  horizontalMidpoint: number;
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

export const computeClampedPosition = (
  position: string | { x: number; y: number } | undefined,
  containerDimensions: { width: number; height: number }
): ClampedPositionResult => {
  const parsedPosition = parsePosition(position);

  const BASE_MIN_X = WIDGET_POSITION.PADDING;
  const BASE_MAX_X =
    WIDGET_POSITION.FRAME_WIDTH - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
  const BASE_MIN_Y = WIDGET_POSITION.PADDING;
  const BASE_MAX_Y =
    WIDGET_POSITION.FRAME_HEIGHT - WIDGET_POSITION.PADDING - WIDGET_POSITION.ICON_SIZE;
  const BASE_RANGE_X = BASE_MAX_X - BASE_MIN_X;
  const BASE_RANGE_Y = BASE_MAX_Y - BASE_MIN_Y;
  const clampedBaseX = Math.max(BASE_MIN_X, Math.min(parsedPosition.x, BASE_MAX_X));
  const clampedBaseY = Math.max(BASE_MIN_Y, Math.min(parsedPosition.y, BASE_MAX_Y));
  const normalizedX = BASE_RANGE_X > 0 ? (clampedBaseX - BASE_MIN_X) / BASE_RANGE_X : 0;
  const normalizedY = BASE_RANGE_Y > 0 ? (clampedBaseY - BASE_MIN_Y) / BASE_RANGE_Y : 0;

  const viewportRangeX = Math.max(
    0,
    containerDimensions.width - WIDGET_POSITION.ICON_SIZE - WIDGET_CONFIG.PREVIEW_EDGE_OFFSET * 2
  );
  const viewportRangeY = Math.max(
    0,
    containerDimensions.height - WIDGET_POSITION.ICON_SIZE - WIDGET_CONFIG.PREVIEW_EDGE_OFFSET * 2
  );

  const clampedPosition = {
    x: WIDGET_CONFIG.PREVIEW_EDGE_OFFSET + normalizedX * viewportRangeX,
    y: WIDGET_CONFIG.PREVIEW_EDGE_OFFSET + normalizedY * viewportRangeY,
  };

  const spaceAbove = clampedPosition.y;
  const spaceBelow = containerDimensions.height - clampedPosition.y - WIDGET_POSITION.ICON_SIZE;
  const positionChatBelow = spaceBelow > spaceAbove && spaceBelow > 250;
  const horizontalMidpoint = containerDimensions.width / 2;

  return { clampedPosition, positionChatBelow, horizontalMidpoint };
};

export const getChatWidgetPositionStyle = (
  clampedPosition: DragPosition,
  containerDimensions: { width: number; height: number },
  horizontalMidpoint: number,
  positionChatBelow: boolean
) => ({
  ...(clampedPosition.x < horizontalMidpoint
    ? { left: `${Math.max(0, clampedPosition.x - 20)}px`, right: "auto" }
    : {
        left: "auto",
        right: `${Math.max(0, containerDimensions.width - clampedPosition.x - 64)}px`,
      }),
  ...(positionChatBelow
    ? {
        top: `${Math.max(0, clampedPosition.y + WIDGET_POSITION.ICON_SIZE + 10)}px`,
        bottom: "auto",
      }
    : {
        top: "auto",
        bottom: `${Math.max(containerDimensions.height - clampedPosition.y + 10, 20)}px`,
      }),
});
