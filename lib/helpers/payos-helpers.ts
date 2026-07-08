import { TESTMODE_PAYMENT_AMOUNT } from "@/config";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const getPayOSCancelUrl = (paymentId: string) => {
  return `${appUrl}/api/payment/payos-cancel?paymentId=${paymentId}`;
};

export const getPayOSReturnUrl = (paymentId: string) => {
  return `${appUrl}/api/payment/payos-return?paymentId=${paymentId}`;
};

export const getPayOSSuccessUrl = (paymentId: string) => {
  return `${appUrl}/api/payment/payos-return?paymentId=${paymentId}&code=00`;
};

export const getPaymentAmount = (amount: number) => {
  return process.env.PAYOS_TEST_MODE === "true" ? TESTMODE_PAYMENT_AMOUNT : amount;
};

export const generateOrderCode = () => {
  return Number(String(Date.now()).slice(-9) + Math.floor(Math.random() * 100));
};

// ============================================================
// Frontend redirect URL helpers
// ============================================================

export const getPaymentResultUrl = (params: Record<string, string>) => {
  const search = new URLSearchParams(params).toString();
  return `${appUrl}/dashboard/payment/result?${search}`;
};

export const getPaymentSuccessRedirectUrl = (paymentId: string) => {
  return getPaymentResultUrl({ status: "success", paymentId });
};

export const getPaymentFailedRedirectUrl = (reason: string) => {
  return getPaymentResultUrl({ status: "failed", reason });
};
