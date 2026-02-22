import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";
import { assertApproved } from "@/lib/hr/payrollMvp";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:PUBLISH");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const run = await prisma.hrPayrollRun.findUnique({ where: { id: params.id } });
  if (!run) throw { status: 404, body: { error: "Planilla no encontrada" } };
  assertApproved(run.status);

  await prisma.hrPayrollRun.update({
    where: { id: params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(handler);
