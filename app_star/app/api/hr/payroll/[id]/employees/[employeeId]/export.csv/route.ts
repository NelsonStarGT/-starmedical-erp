import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function escapeCsv(value: string | null | undefined) {
  const v = value ?? "";
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

async function handler(req: NextRequest, { params }: { params: { id: string; employeeId: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const runEmployee = await prisma.payrollRunEmployee.findFirst({
    where: { payrollRunId: params.id, employeeId: params.employeeId },
    include: {
      payrollRun: { select: { code: true, status: true, periodStart: true, periodEnd: true } },
      employee: {
        select: {
          firstName: true,
          lastName: true,
          employeeCode: true,
          dpi: true,
          biometricId: true,
          branchAssignments: { where: { isPrimary: true }, select: { branch: { select: { name: true } } } }
        }
      }
    }
  });

  if (!runEmployee) throw { status: 404, body: { error: "RUN_EMPLOYEE_NOT_FOUND" } };

  const emp = runEmployee.employee;
  const run = runEmployee.payrollRun;
  const period = `${formatDate(run.periodStart)}-${formatDate(run.periodEnd)}`;
  const header = ["empleado", "codigo", "dpi", "biometrico", "sucursal", "periodo", "estado_corrida", "pago"].join(",");
  const row = [
    escapeCsv(`${emp?.firstName || ""} ${emp?.lastName || ""}`.trim()),
    escapeCsv(emp?.employeeCode || ""),
    escapeCsv(emp?.dpi || ""),
    escapeCsv(emp?.biometricId || ""),
    escapeCsv(emp?.branchAssignments?.[0]?.branch?.name || ""),
    escapeCsv(period),
    escapeCsv(run.status),
    escapeCsv(runEmployee.paymentStatus)
  ].join(",");

  const csv = [header, row].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${run.code || runEmployee.payrollRunId}-${emp?.employeeCode || params.employeeId}.csv"`
    }
  });
}

export const GET = withApiErrorHandling(handler);
