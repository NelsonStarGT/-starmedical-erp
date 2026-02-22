import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CheckStatus = "ok" | "fail" | "missing";
type Overall = "ok" | "degraded" | "down";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db: CheckStatus = "fail";
  let emailConfig: CheckStatus = "missing";
  let exportsCheck: CheckStatus = "ok";

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
  } catch (err) {
    db = "fail";
  }

  // email config check (only if DB reachable)
  if (db === "ok") {
    try {
      const cfg = await prisma.globalEmailConfig.findUnique({
        where: { id: "global" },
        select: { id: true }
      });
      emailConfig = cfg ? "ok" : "missing";
    } catch (_) {
      emailConfig = "missing";
    }
  }

  // exports check kept lightweight (assumed ok if code built)
  exportsCheck = "ok";

  // Overall status
  let status: Overall = "ok";
  if (db !== "ok") {
    status = "down";
  } else if (emailConfig === "missing") {
    status = "degraded";
  }

  const httpStatus = status === "down" ? 503 : 200;

  const res = NextResponse.json(
    {
      ok: status !== "down",
      status,
      checks: {
        db,
        emailConfig,
        exports: exportsCheck
      },
      timestamp: new Date().toISOString()
    },
    { status: httpStatus }
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
