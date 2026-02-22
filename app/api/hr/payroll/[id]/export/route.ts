import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHrPermission } from "@/lib/api/rbac";
import { withApiErrorHandling } from "@/lib/api/http";

export const dynamic = "force-dynamic";

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;

  const run = await prisma.hrPayrollRun.findUnique({
    where: { id: params.id },
    include: { lines: { include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } } } }
  });
  if (!run) throw { status: 404, body: { error: "Planilla no encontrada" } };

  const rows = run.lines.map((l) => [
    l.employee.employeeCode,
    `${l.employee.firstName} ${l.employee.lastName}`,
    Number(l.baseSalary).toFixed(2),
    Number(l.bonuses).toFixed(2),
    Number(l.deductions).toFixed(2),
    Number(l.netPay).toFixed(2)
  ]);

  const header = ["employeeCode", "name", "baseSalary", "bonuses", "deductions", "netPay"];
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="payroll-${params.id}.csv"`
    }
  });
}

export const GET = withApiErrorHandling(handler);
