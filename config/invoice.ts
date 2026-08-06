import { JobsOptions } from "bullmq";

export const INVOICE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000, // Starts at 2s, then 4s, then 8s
  },
  removeOnComplete: {
    age: 3600 * 24, // Keep metadata for 24h
    count: 1000,
  },
  removeOnFail: {
    age: 3600 * 24 * 7, // Retain failures for 7 days for audit/manual retry
    count: 500,
  },
};
