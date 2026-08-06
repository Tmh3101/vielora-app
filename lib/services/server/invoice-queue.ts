import { Queue } from "bullmq";
import { getRedisConnectionOptions } from "@/lib/config/redis";
import { INVOICE_QUEUE_NAME, JobName } from "@/lib/constants/job";
import { INVOICE_JOB_OPTIONS } from "@/config/invoice";

let invoiceQueue: Queue | null = null;

export function getInvoiceQueue(): Queue {
  if (!invoiceQueue) {
    invoiceQueue = new Queue(INVOICE_QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: INVOICE_JOB_OPTIONS,
    });
  }
  return invoiceQueue;
}

export async function addInvoiceJob(params: { invoiceId: string }): Promise<string> {
  const queue = getInvoiceQueue();
  const job = await queue.add(
    JobName.ISSUE_INVOICE,
    { invoiceId: params.invoiceId },
    { jobId: params.invoiceId }
  );
  return job.id!;
}
