export const BackgroundType = {
  SOLID: "solid",
  GRADIENT: "gradient",
  IMAGE: "image",
} as const;

export type ChatBackgroundType = (typeof BackgroundType)[keyof typeof BackgroundType];
