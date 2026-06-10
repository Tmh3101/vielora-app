import { NextRequest } from "next/server";
import { subscribeStreamChanel } from "@/lib/services/worker.service";
import { getJobProgressStreamId } from "@/lib/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }
  return await subscribeStreamChanel(getJobProgressStreamId(jobId), request);
}
