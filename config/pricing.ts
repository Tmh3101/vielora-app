export type BillingCycle = "monthly" | "yearly";
export type PricingVariant = "landing" | "dashboard";

export type PlanCode = "free" | "standard" | "pro" | "enterprise";

export interface PricingPolicy {
  title: string;
  description: string;
}

export const planOrder: readonly PlanCode[] = ["free", "standard", "pro", "enterprise"];

export const planFeatureKeys: Record<PlanCode, string[]> = {
  free: ["leadForm", "mobileApp", "widgetLanguage"],
  standard: [
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "widgetLanguage",
  ],
  pro: [
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "groupChatAI",
    "exportReport",
    "widgetLanguage",
  ],
  enterprise: [
    "customBotLimit",
    "customMonthlyCredits",
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "groupChatAI",
    "exportReport",
    "widgetLanguage",
  ],
};

const unifiedPlanFeatures: Partial<Record<PlanCode, string[]>> = {
  free: ["leadForm", "mobileApp", "widgetLanguage"],
  standard: [
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "widgetLanguage",
  ],
  pro: [
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "groupChatAI",
    "exportReport",
    "widgetLanguage",
  ],
  enterprise: [
    "customBotLimit",
    "customMonthlyCredits",
    "customizeKnowledge",
    "suggestedQuestions",
    "customizePersonality",
    "leadForm",
    "smartHomepage",
    "mobileApp",
    "voiceChat",
    "groupChatAI",
    "exportReport",
    "widgetLanguage",
  ],
};

export const planFeatures: Record<PricingVariant, Partial<Record<PlanCode, string[]>>> = {
  landing: unifiedPlanFeatures,
  dashboard: unifiedPlanFeatures,
};

const unifiedPlanCTA: Partial<Record<PlanCode, string>> = {
  free: "Gói hiện tại",
  standard: "Nâng cấp Standard",
  pro: "Nâng cấp Pro",
  enterprise: "Cấu hình gói",
};

export const planCTA: Record<PricingVariant, Partial<Record<PlanCode, string>>> = {
  landing: unifiedPlanCTA,
  dashboard: unifiedPlanCTA,
};

export const policies: readonly PricingPolicy[] = [
  {
    title: "Hoàn tiền trong 7 ngày",
    description: "Hoàn tiền 100% nếu không hài lòng trong 7 ngày đầu sử dụng gói trả phí.",
  },
  {
    title: "Hủy bất cứ lúc nào",
    description: "Gói subscription có thể hủy bất cứ lúc nào. Bạn vẫn sử dụng được đến hết chu kỳ.",
  },
  {
    title: "Nâng/hạ cấp linh hoạt",
    description: "Chuyển đổi giữa các gói dễ dàng, phần chênh lệch sẽ được tính toán tự động.",
  },
];

export * from "./plan-theme";
