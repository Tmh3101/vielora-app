export const Framework = {
  REACT: "react",
  VUE: "vue",
  PHP: "php",
} as const;

export type FrameworkType = (typeof Framework)[keyof typeof Framework];
