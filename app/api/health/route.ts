import { NextResponse } from "next/server";
import { getQueueStatus } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const queueStatus = await getQueueStatus();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      services: {
        nextjs: "running",
        queue: {
          connected: true,
          ...queueStatus,
        },
      },
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
