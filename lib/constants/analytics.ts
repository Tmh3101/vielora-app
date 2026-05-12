export const DAY_LABELS_BY_INDEX = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
export const DISPLAY_DAYS = [
  { index: 1, label: "T2" },
  { index: 2, label: "T3" },
  { index: 3, label: "T4" },
  { index: 4, label: "T5" },
  { index: 5, label: "T6" },
  { index: 6, label: "T7" },
  { index: 0, label: "CN" },
] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;
