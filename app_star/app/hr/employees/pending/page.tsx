"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { HrEmployee } from "@/types/hr";
import { usePermissions } from "@/hooks/usePermissions";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { EmployeesTabs } from "../EmployeesTabs";

type PendingResponse = {
  data: HrEmployee[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
};

async function fetchPending(page = 1, search?: string): Promise<PendingResponse> {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", "10");
  if (search) qs.set("search", search);
  const res = await fetch(`/api/hr/employees/pending?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "No se pudo cargar pendientes");
  }
  return res.json();
}

type DeleteReasons = {
  docsCount?: number;
  assignmentsCount?: number;
  userLinked?: boolean;
  attendanceCount?: number;
  rawEventsCount?: number;
  warningsCount?: number;
  progressLocked?: boolean;
};

const todayInputValue = () => {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

export default function PendingEmployeesPage() {
  const { hasPermission } = usePermissions();
  const qc = useQueryClient();
  const { toasts, showToast, dismiss } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string | null; message: string; reasons?: DeleteReasons } | null>(null);
  const [archiveDate, setArchiveDate] = useState(todayInputValue());
  const query = useQuery({
    queryKey: ["hr-employees-pending", page, search],
    queryFn: () => fetchPending(page, search),
    placeholderData: (prev) => prev
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/employees/${id}/draft`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error: any = new Error(json?.error || "No se pudo eliminar");
        if (json?.reasons) error.reasons = json.reasons;
        throw error;
      }
      return json;
    },
    onSuccess: () => {
      showToast("Proceso eliminado", "success");
      void qc.invalidateQueries({ queryKey: ["hr-employees-pending"] });
    },
    onError: (err: any, id) => {
      setArchiveDate(todayInputValue());
      setDeleteError({ id: id || null, message: err?.message || "No se pudo eliminar", reasons: err?.reasons });
      showToast(err?.message || "No se pudo eliminar", "error");
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (payload: { id: string; effectiveDate: string }) => {
      const res = await fetch(`/api/hr/employees/${payload.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effectiveDate: payload.effectiveDate })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo archivar");
      return json;
    },
    onSuccess: () => {
      setDeleteError(null);
      showToast("Colaborador archivado", "success");
      void qc.invalidateQueries({ queryKey: ["hr-employees-pending"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo archivar", "error")
  });

  const rows = useMemo(() => query.data?.data || [], [query.data]);
  const meta = query.data?.meta;
  const canWrite = hasPermission("HR:EMPLOYEES:WRITE");
  const canDelete = hasPermission("HR:EMPLOYEES:WRITE");

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Empleados pendientes</h1>
          <p className="text-xs text-slate-500">Estos colaboradores no están activos aún. Completa su expediente o archívalos si no continuarán.</p>
          <div className="mt-2">
            <EmployeesTabs active="pending" />
          </div>
        </div>
        <Link
          href="/hr/employees"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver activos
        </Link>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
          <CardTitle className="text-base">Listado de pendientes</CardTitle>
          <p className="text-xs text-amber-600">Estos colaboradores no están activos aún. Completa el expediente.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Buscar nombre, DPI, código o biométrico"
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Empleado</th>
                <th className="py-2 pr-4 font-medium">Código</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Paso actual</th>
                <th className="py-2 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((emp) => (
                <tr key={emp.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">
                      {emp.firstName || emp.lastName
                        ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim()
                        : "— Sin nombre —"}
                    </p>
                    <p className="text-xs text-slate-500">Pendiente de activar</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{emp.employeeCode || "—"}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="warning">Pendiente</Badge>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    <div className="flex flex-col gap-1">
                      <span>Paso {emp.onboardingStep || 1} / 6</span>
                      <div className="h-2 w-28 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-brand-primary"
                          style={{
                            width: `${Math.min(100, Math.round(((emp.onboardingStep || 1) / 6) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/hr/employees/new?id=${emp.id}`}
                        className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white shadow-soft hover:-translate-y-px transition"
                      >
                        Completar expediente
                      </Link>
                      {canWrite && (
                        <Link
                          href={`/hr/employees/new?id=${emp.id}&mode=edit`}
                          className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Editar proceso
                        </Link>
                      )}
                      <Link
                        href={`/hr/employees/new?id=${emp.id}&mode=view`}
                        className="flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Ver proceso
                      </Link>
                      {canDelete && emp.onboardingStatus === "DRAFT" && (emp.onboardingStep || 1) <= 1 && (
                        <button
                          onClick={() => setConfirmId(emp.id)}
                          title="Solo disponible para borradores sin información registrada"
                          className="flex items-center gap-1 rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isLoading && <p className="text-sm text-slate-600 py-3">Cargando...</p>}
          {rows.length === 0 && !query.isLoading && (
            <p className="text-sm text-slate-600 py-6 text-center">No hay pendientes por ahora.</p>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
              <span>
                Página {meta.page} de {meta.totalPages} · {meta.totalCount} pendientes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                >
                  Siguiente
                </button>
                {page < meta.totalPages && (
                  <button
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    className="rounded-lg bg-brand-primary px-3 py-1 text-white font-semibold shadow-soft hover:-translate-y-px transition"
                  >
                    Ver más
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Modal open={Boolean(confirmId)} onClose={() => setConfirmId(null)} title="Eliminar proceso de onboarding">
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            ¿Eliminar el proceso de{" "}
            {rows.find((r) => r.id === confirmId)?.firstName || rows.find((r) => r.id === confirmId)?.lastName
              ? `${rows.find((r) => r.id === confirmId)?.firstName ?? ""} ${rows.find((r) => r.id === confirmId)?.lastName ?? ""}`.trim()
              : "— Sin nombre —"}{" "}
            ({rows.find((r) => r.id === confirmId)?.employeeCode || "sin código"})? Esta acción no se puede deshacer.
          </p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setConfirmId(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs">
            Cancelar
            </button>
            <button
              onClick={() => {
                if (confirmId) deleteMutation.mutate(confirmId);
                setConfirmId(null);
              }}
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deleteError)} onClose={() => setDeleteError(null)} title="No se puede eliminar">
        <div className="space-y-3 text-sm text-slate-700">
          <p>{deleteError?.message || "Elimina primero las dependencias o archiva el colaborador."}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {deleteError?.reasons ? (
              <ul className="list-disc space-y-1 pl-4">
                {deleteError.reasons.progressLocked && <li>El proceso ya avanzó a onboarding activo.</li>}
                {(deleteError.reasons.docsCount || 0) > 0 && <li>Documentos cargados: {deleteError.reasons.docsCount}</li>}
                {(deleteError.reasons.assignmentsCount || 0) > 0 && (
                  <li>Asignaciones o relaciones laborales: {deleteError.reasons.assignmentsCount}</li>
                )}
                {(deleteError.reasons.attendanceCount || 0) > 0 && (
                  <li>Registros de asistencia o marcajes: {deleteError.reasons.attendanceCount}</li>
                )}
                {(deleteError.reasons.rawEventsCount || 0) > 0 && <li>Eventos crudos pendientes: {deleteError.reasons.rawEventsCount}</li>}
                {deleteError.reasons.userLinked && <li>Está vinculado a un usuario.</li>}
                {(deleteError.reasons.warningsCount || 0) > 0 && <li>Amonestaciones o llamadas registradas: {deleteError.reasons.warningsCount}</li>}
              </ul>
            ) : (
              <p>Hay dependencias registradas en el colaborador.</p>
            )}
          </div>
          {deleteError?.id && (
            <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2">
              <label className="text-xs text-slate-600">Archivar en vez de eliminar</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={archiveDate}
                  onChange={(e) => setArchiveDate(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
                />
                <button
                  onClick={() => archiveMutation.mutate({ id: deleteError.id!, effectiveDate: archiveDate })}
                  disabled={archiveMutation.isPending}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
                >
                  {archiveMutation.isPending ? "Archivando..." : "Archivar"}
                </button>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={() => setDeleteError(null)} className="rounded-md border border-slate-200 px-3 py-1 text-xs">
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
