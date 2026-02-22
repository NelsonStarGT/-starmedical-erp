"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { usePermissions } from "@/hooks/usePermissions";

type RunStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "PAID" | "CLOSED";

type PayrollRunDetail = {
  id: string;
  code: string;
  runType: "REGULAR" | "EXTRA";
  status: RunStatus;
  periodStart: string;
  periodEnd: string;
  branchName?: string | null;
  createdAt: string;
  employees: {
    id: string;
    employeeId: string;
    employeeCode: string;
    name: string;
    branch?: string | null;
    status?: string | null;
    paymentStatus?: "PENDING" | "PAID" | "SIGNED" | null;
  }[];
};

const statusStyles: Record<RunStatus, string> = {
  DRAFT: "bg-[#4aadf5]/15 text-[#2e75ba]",
  REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-[#4aa59c]/20 text-[#2e8c7f]",
  PUBLISHED: "bg-[#2e75ba]/15 text-[#2e75ba]",
  PAID: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-200 text-slate-700"
};

async function fetchDetail(id: string): Promise<PayrollRunDetail> {
  const res = await fetch(`/api/hr/payroll/${id}`);
  if (!res.ok) throw new Error("No se pudo cargar la corrida");
  const json = await res.json();
  return json.data;
}

async function patchStatus(id: string, status: RunStatus) {
  const res = await fetch(`/api/hr/payroll/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo actualizar el estado");
  return json;
}

export default function PayrollDetailPage({ params }: { params: { id: string } }) {
  const { toasts, showToast, dismiss } = useToast();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission("HR:PAYROLL:WRITE");
  const qc = useQueryClient();
  const detailQuery = useQuery({ queryKey: ["payroll", params.id], queryFn: () => fetchDetail(params.id) });

  const statusMutation = useMutation({
    mutationFn: (status: RunStatus) => patchStatus(params.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["payroll", params.id] });
      showToast("Estado actualizado", "success");
    },
    onError: (err: any) => showToast(err?.message || "No se pudo actualizar", "error")
  });

  const detail = detailQuery.data;

  return (
    <div className="p-6 space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="rounded-3xl bg-gradient-to-r from-[#4aa59c] via-[#4aadf5] to-[#2e75ba] px-6 py-5 shadow-soft text-white flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Corrida de nómina</p>
          <h1 className="text-2xl font-bold">{detail?.code || "Cargando..."}</h1>
          <p className="text-sm opacity-90">
            {detail ? `${detail.periodStart} → ${detail.periodEnd}` : "Cargando rangos..."} ·{" "}
            <Link href="/hr/payroll" className="underline">
              Volver a Nómina
            </Link>
          </p>
        </div>
        {detail && <Badge className={statusStyles[detail.status]}>{detail.status}</Badge>}
      </div>

      {detail && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-slate-700">Resumen</CardTitle>
              <p className="text-xs text-slate-500">MVP sin cálculos, solo estructura.</p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/api/hr/payroll/${detail.id}/export.csv`}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Exportar CSV
              </a>
              {canUpdate &&
                (() => {
                  const sequence: RunStatus[] = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "PAID", "CLOSED"];
                  const idx = sequence.indexOf(detail.status);
                  const next = idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : null;
                  return next ? (
                    <button
                      onClick={() => statusMutation.mutate(next)}
                      className="rounded-full border border-[#4aadf5] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aadf5]/10 disabled:opacity-60"
                      disabled={statusMutation.isPending}
                    >
                      Avanzar a {next}
                    </button>
                  ) : null;
                })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="text-sm font-semibold text-slate-800">{detail.runType === "REGULAR" ? "Ordinaria" : "Extraordinaria"}</p>
                <p className="text-xs text-slate-500">Sucursal: {detail.branchName || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">Periodo</p>
                <p className="text-sm font-semibold text-slate-800">
                  {detail.periodStart} → {detail.periodEnd}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">Creada</p>
                <p className="text-sm font-semibold text-slate-800">{new Date(detail.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Empleado</th>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Sucursal</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Pago</th>
                    <th className="py-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.employees.map((line) => (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{line.name || "Sin nombre"}</td>
                      <td className="py-2 pr-3 text-slate-700">{line.employeeCode || "—"}</td>
                      <td className="py-2 pr-3 text-slate-700">{line.branch || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">{line.status || "—"}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {line.paymentStatus || "PENDING"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right space-x-2">
                        <a
                          href={`/api/hr/payroll/${detail.id}/employees/${line.employeeId}/export.csv`}
                          className="text-xs font-semibold text-[#2e75ba] hover:underline"
                        >
                          CSV
                        </a>
                        <a
                          href={`/api/hr/payroll/${detail.id}/employees/${line.employeeId}/payslip.pdf`}
                          className="text-xs font-semibold text-[#2e75ba] hover:underline"
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                  {!detail.employees.length && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        Sin empleados asociados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
