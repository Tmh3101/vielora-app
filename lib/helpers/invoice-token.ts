import { createHmac, timingSafeEqual } from "crypto";
import { EXPIRATION_DAYS } from "@/lib/config/invoice";

function getSecret(): string {
  const secret = process.env.INVOICE_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Missing INVOICE_TOKEN_SECRET environment variable.");
  }
  return secret;
}

export function generateInvoiceToken(invoiceId: string): {
  token: string;
  exp: number;
} {
  const exp = Math.floor(Date.now() / 1000) + EXPIRATION_DAYS * 24 * 60 * 60;
  const payload = `${invoiceId}:${exp}`;
  const hmac = createHmac("sha256", getSecret()).update(payload, "utf8").digest("hex");
  return { token: hmac, exp };
}

export function verifyInvoiceToken(invoiceId: string, token: string, exp: number): boolean {
  // Reject expired
  if (Date.now() >= exp * 1000) {
    return false;
  }

  const payload = `${invoiceId}:${exp}`;
  const expected = createHmac("sha256", getSecret()).update(payload, "utf8").digest("hex");

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const INVOICE_LINK_EXPIRATION_DAYS = EXPIRATION_DAYS;
