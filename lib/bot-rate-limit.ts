export const BOT_RATE_LIMIT_ERROR_CODES = {
  DailyExceeded: "BOT_DAILY_LIMIT_EXCEEDED",
  IpExceeded: "BOT_IP_DAILY_LIMIT_EXCEEDED",
  ApiExceeded: "API_RATE_LIMIT_EXCEEDED",
} as const;

export type BotRateLimitErrorCode =
  (typeof BOT_RATE_LIMIT_ERROR_CODES)[keyof typeof BOT_RATE_LIMIT_ERROR_CODES];

export interface RateLimitValidationResult {
  value: number | null;
  error: string | null;
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateRateLimitValue(value: number | null | undefined, label: string): void {
  if (value == null) {
    return;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} phải là số nguyên dương lớn hơn 0 hoặc để trống.`);
  }
}

export function parseRateLimitInput(rawValue: string, label: string): RateLimitValidationResult {
  if (isBlank(rawValue)) {
    return { value: null, error: null };
  }

  if (!/^[1-9]\d*$/.test(rawValue)) {
    return {
      value: null,
      error: `${label} chỉ chấp nhận số nguyên dương và không được bắt đầu bằng số 0.`,
    };
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return {
      value: null,
      error: `${label} phải lớn hơn 0.`,
    };
  }

  return {
    value: parsedValue,
    error: null,
  };
}
