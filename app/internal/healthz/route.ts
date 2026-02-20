import { NextResponse } from "next/server";
import { ensureOpsSchedulerStarted } from "@/lib/ops/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureOpsSchedulerStarted();
  const response = NextResponse.json({
    ok: true,
    service: "app",
    status: "up",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || process.env.npm_package_version || "0.0.0",
    commit:
      process.env.GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.COMMIT_SHA ||
      "unknown"
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
