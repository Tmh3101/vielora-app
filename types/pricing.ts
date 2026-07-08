export interface CreditPackagePrice {
  USD?: number;
  VND?: number;
}

export interface PlanPrice {
  USD: { monthly: number; yearly: number };
  VND: { monthly: number; yearly: number };
}
