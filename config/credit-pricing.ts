/**
 * Centralized credit pricing constants.
 *
 * Two distinct unit prices are used across the system:
 *
 * 1. CREDIT_UNIT_PRICE_EXPANSION (200 VND/credit)
 *    → Used when **expanding** Enterprise plan resources (adding more bots or credits
 *      within an existing active Enterprise subscription cycle).
 *    → Consumers: calculateEnterprisePrice, calculateEnterpriseUpgradePrice
 *
 * 2. CREDIT_UNIT_PRICE_PRORATION (100 VND/credit)
 *    → Used when **upgrading** from one plan to another (e.g. Standard → Pro).
 *      The remaining unused subscription credits are refunded at this rate.
 *    → Consumers: calculateCreditBasedProration, UnifiedCheckoutClient fetchProration
 */

/**
 * Price per credit (VND) when expanding Enterprise plan resources.
 *
 * Applied to deltaCredits when an active Enterprise subscriber adds more
 * monthly credits mid-cycle.
 *
 * Formula: cost_per_1000_credits_per_month = CREDIT_UNIT_PRICE_EXPANSION × 1000
 *          (i.e. 200 × 1000 = 200,000 VND per 1,000 credits/month)
 */
export const CREDIT_UNIT_PRICE_EXPANSION = 200;

/**
 * Price per credit (VND) when calculating proration discount on plan upgrade.
 *
 * When a user upgrades from a lower plan to a higher plan, their remaining
 * subscription credits are valued at this rate and subtracted from the new
 * plan's price.
 *
 * Formula: proration_discount = remaining_subscription_credits × CREDIT_UNIT_PRICE_PRORATION
 *          (e.g. 1,000 credits remaining × 100 = 100,000 VND discount)
 */
export const CREDIT_UNIT_PRICE_PRORATION = 100;
