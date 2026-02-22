import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";
import { computeNet, assertDraft } from "@/lib/hr/payrollMvp";
import { rateLimit, getClientIp } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string; lineId: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const rl = rateLimit(`${getClientIp(req)}:${req.nextUrl.pathname}`, 20, 60_000);
  if (!rl.allowed) throw { status: 429, body: { error: "Rate limit", retryAt: rl.retryAt } };

  const body = await safeJson(req);
  const updates: any = {};
  if (body.baseSalary !== undefined) updates.baseSalary = Number(body.baseSalary);
  if (body.bonuses !== undefined) updates.bonuses = Number(body.bonuses);
  if (body.deductions !== undefined) updates.deductions = Number(body.deductions);

  const run = await prisma.hrPayrollRun.findUnique({ where: { id: params.id } });
  if (!run) throw { status: 404, body: { error: "Planilla no encontrada" } };
  assertDraft(run.status);

  const line = await prisma.hrPayrollLine.findUnique({ where: { id: params.lineId } });
  if (!line) throw { status: 404, body: { error: "Línea no encontrada" } };

  const base = updates.baseSalary !== undefined ? updates.baseSalary : Number(line.baseSalary);
  const bonuses = updates.bonuses !== undefined ? updates.bonuses : Number(line.bonuses);
  const deductions = updates.deductions !== undefined ? updates.deductions : Number(line.deductions);

  const saved = await prisma.hrPayrollLine.update({
    where: { id: params.lineId },
    data: { ...updates, netPay: computeNet(base, bonuses, deductions) }
  });

  return NextResponse.json({
    data: {
      id: saved.id,
      baseSalary: Number(saved.baseSalary),
      bonuses: Number(saved.bonuses),
      deductions: Number(saved.deductions),
      netPay: Number(saved.netPay)
    }
  });
}

export const PATCH = withApiErrorHandling(handler);
