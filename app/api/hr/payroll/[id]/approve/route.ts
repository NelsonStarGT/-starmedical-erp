import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";
import { assertDraft } from "@/lib/hr/payrollMvp";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:APPROVE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const run = await prisma.hrPayrollRun.findUnique({
    where: { id: params.id },
    include: { lines: true }
  });
  if (!run) throw { status: 404, body: { error: "Planilla no encontrada" } };
  assertDraft(run.status);
  if (run.lines.length === 0) throw { status: 409, body: { error: "Planilla sin líneas" } };

  await prisma.hrPayrollRun.update({
    where: { id: params.id },
    data: { status: "APPROVED", approvedByUserId: auth.user?.id || null }
  });

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(handler);
