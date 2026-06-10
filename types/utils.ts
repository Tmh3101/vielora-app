export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  code?: string;
  rateLimitInfo?: {
    remaining: number | null;
    resetAt: string;
  };
};
