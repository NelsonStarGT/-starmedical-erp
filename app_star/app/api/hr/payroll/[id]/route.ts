import { NextRequest, NextResponse } from "next/server";
import { PayrollRunStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { safeJson, withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function getHandler(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(_req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: {
      branch: { select: { name: true } },
      runEmployees: {
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              status: true,
              branchAssignments: { where: { isPrimary: true }, select: { branch: { select: { name: true } } } }
            }
          }
        }
      }
    }
  });

  if (!run) throw { status: 404, body: { error: "Corrida no encontrada" } };

  const totals = { employees: run.runEmployees.length };

  return NextResponse.json({
    ok: true,
    data: {
      id: run.id,
      code: run.code,
      runType: run.runType,
      status: run.status,
      branchId: run.branchId,
      branchName: run.branch?.name || null,
      periodStart: formatDate(run.periodStart),
      periodEnd: formatDate(run.periodEnd),
      createdAt: run.createdAt.toISOString(),
      totals,
      employees: run.runEmployees.map((re) => ({
        id: re.id,
        employeeId: re.employeeId,
        employeeCode: re.employee?.employeeCode || "",
        name: `${re.employee?.firstName || ""} ${re.employee?.lastName || ""}`.trim(),
        branch: re.employee?.branchAssignments?.[0]?.branch?.name || null,
        status: re.employee?.status || null,
        paymentStatus: re.paymentStatus,
        paidAt: re.paidAt ? re.paidAt.toISOString() : null,
        signedAt: re.signedAt ? re.signedAt.toISOString() : null
      }))
    }
  });
}

async function patchHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:WRITE");
  if (auth.errorResponse) return auth.errorResponse;
  const body = await safeJson(req);
  const status = body?.status as PayrollRunStatus | undefined;

  if (!status || !Object.values(PayrollRunStatus).includes(status)) {
    throw { status: 400, body: { error: "Estado inválido" } };
  }

  const updated = await prisma.payrollRun.update({
    where: { id: params.id },
    data: { status }
  });

  return NextResponse.json({ ok: true, data: { id: updated.id, status: updated.status } });
}

export const GET = withApiErrorHandling(getHandler);
export const PATCH = withApiErrorHandling(patchHandler);
