import { ESubscriptionPlan } from "@/types";

export interface PlanTheme {
  code: ESubscriptionPlan | string;
  name: string;
  badgeClass: string;
  badgeActiveClass: string;
  borderClass: string;
  borderHoverClass: string;
  bgGradientClass: string;
  iconBgClass: string;
  iconTextClass: string;
  textPrimaryClass: string;
  buttonClass: string;
}

export const PLAN_THEMES: Record<string, PlanTheme> = {
  [ESubscriptionPlan.Free]: {
    code: ESubscriptionPlan.Free,
    name: "Free",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    badgeActiveClass: "border-slate-500/40 bg-slate-500/20 text-slate-800 dark:text-slate-200",
    borderClass: "border-slate-200 dark:border-slate-800",
    borderHoverClass: "hover:border-slate-400 dark:hover:border-slate-700",
    bgGradientClass: "bg-gradient-to-br from-slate-500/5 via-card to-slate-500/10",
    iconBgClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    iconTextClass: "text-slate-600 dark:text-slate-400",
    textPrimaryClass: "text-slate-700 dark:text-slate-300",
    buttonClass: "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  [ESubscriptionPlan.Standard]: {
    code: ESubscriptionPlan.Standard,
    name: "Standard",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    badgeActiveClass: "border-blue-500/40 bg-blue-500/20 text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-500/30",
    borderHoverClass: "hover:border-blue-500/60",
    bgGradientClass: "bg-gradient-to-br from-blue-500/10 via-card to-cyan-500/5",
    iconBgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconTextClass: "text-blue-600 dark:text-blue-400",
    textPrimaryClass: "text-blue-600 dark:text-blue-400",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
  },
  [ESubscriptionPlan.Pro]: {
    code: ESubscriptionPlan.Pro,
    name: "Pro",
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
    badgeActiveClass: "border-violet-500/40 bg-violet-500/20 text-violet-700 dark:text-violet-200",
    borderClass: "border-violet-500/30",
    borderHoverClass: "hover:border-violet-500/60",
    bgGradientClass: "bg-gradient-to-br from-violet-500/10 via-card to-purple-500/5",
    iconBgClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    iconTextClass: "text-violet-600 dark:text-violet-400",
    textPrimaryClass: "text-violet-600 dark:text-violet-400",
    buttonClass: "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20",
  },
  [ESubscriptionPlan.Enterprise]: {
    code: ESubscriptionPlan.Enterprise,
    name: "Enterprise",
    badgeClass: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    badgeActiveClass: "border-slate-500/40 bg-slate-500/20 text-slate-800 dark:text-slate-200",
    borderClass: "border-slate-400/40 dark:border-slate-700",
    borderHoverClass: "hover:border-slate-500 dark:hover:border-slate-600",
    bgGradientClass: "bg-gradient-to-br from-slate-500/10 via-card to-zinc-500/5",
    iconBgClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    iconTextClass: "text-slate-700 dark:text-slate-300",
    textPrimaryClass: "text-slate-800 dark:text-slate-200",
    buttonClass: "bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white shadow-slate-500/20",
  },
};

export function getPlanTheme(planCode?: string | null): PlanTheme {
  if (!planCode || !PLAN_THEMES[planCode]) {
    return PLAN_THEMES[ESubscriptionPlan.Free];
  }
  return PLAN_THEMES[planCode];
}
