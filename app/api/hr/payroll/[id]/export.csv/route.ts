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

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireHrPermission(req, "HR:PAYROLL:READ");
  if (auth.errorResponse) return auth.errorResponse;
  const format = req.nextUrl.searchParams.get("format") || "summary";

  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: {
      runEmployees: {
        include: {
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
      }
    }
  });
  if (!run) throw { status: 404, body: { error: "RUN_NOT_FOUND" } };

  const period = `${formatDate(run.periodStart)}-${formatDate(run.periodEnd)}`;
  const headerSummary = ["empleado", "codigo", "dpi", "biometrico", "sucursal", "periodo", "estado_corrida", "pago"].join(",");
  const headerDetails = [
    "empleado",
    "codigo",
    "fecha",
    "hora_entrada",
    "hora_salida",
    "estado_corrida",
    "pago",
    "comentarios"
  ].join(",");

  const rows =
    format === "details"
      ? run.runEmployees.flatMap((line) => {
          const emp = line.employee;
          const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
          const branch = emp?.branchAssignments?.[0]?.branch?.name || "";
          // Placeholder detail row per employee (no day-by-day yet)
          return [
            [
              escapeCsv(name),
              escapeCsv(emp?.employeeCode || ""),
              escapeCsv(period),
              "",
              "",
              escapeCsv(run.status),
              escapeCsv(line.paymentStatus),
              escapeCsv(branch)
            ].join(",")
          ];
        })
      : run.runEmployees.map((line) => {
          const emp = line.employee;
          const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim();
          const branch = emp?.branchAssignments?.[0]?.branch?.name || "";
          return [
            escapeCsv(name),
            escapeCsv(emp?.employeeCode || ""),
            escapeCsv(emp?.dpi || ""),
            escapeCsv(emp?.biometricId || ""),
            escapeCsv(branch),
            escapeCsv(period),
            escapeCsv(run.status),
            escapeCsv(line.paymentStatus)
          ].join(",");
        });

  const csv = [(format === "details" ? headerDetails : headerSummary), ...rows].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${run.code || run.id}.csv"`
    }
  });
}

export const GET = withApiErrorHandling(handler);
