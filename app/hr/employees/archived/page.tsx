"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { HrBranch, HrEmployeeStatus } from "@/types/hr";
import { EmployeesTabs } from "../EmployeesTabs";

type ArchivedEmployee = {
  id: string;
  fullName: string;
  employeeCode?: string | null;
  status: HrEmployeeStatus;
  terminatedAt?: string | null;
  archivedAt?: string | null;
  completedAt?: string | null;
  branchName?: string | null;
  employmentType?: string | null;
  isExternal?: boolean;
};

type ArchivedResponse = {
  data: ArchivedEmployee[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

async function fetchBranches(): Promise<HrBranch[]> {
  const res = await fetch("/api/hr/branches?includeInactive=1", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json().catch(() => ({}));
  return payload.data || [];
}

async function fetchArchived(filters: {
  search?: string;
  branchId?: string;
  type?: string;
  relationship?: string;
  year?: string;
  month?: string;
  page: number;
}): Promise<ArchivedResponse> {
  const qs = new URLSearchParams();
  if (filters.search) qs.set("search", filters.search);
  if (filters.branchId) qs.set("branchId", filters.branchId);
  if (filters.type) qs.set("type", filters.type);
  if (filters.relationship) qs.set("relationship", filters.relationship);
  if (filters.year) qs.set("year", filters.year);
  if (filters.month) qs.set("month", filters.month);
  qs.set("page", String(filters.page || 1));
  const res = await fetch(`/api/hr/employees/archived?${qs.toString()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "No se pudo cargar archivados");
  return json as ArchivedResponse;
}

const statusTone: Record<string, { label: string; variant: "info" | "warning" | "success" | "neutral" }> = {
  ACTIVE: { label: "Activo", variant: "success" },
  SUSPENDED: { label: "Suspendido", variant: "warning" },
  TERMINATED: { label: "Terminado", variant: "warning" },
  ARCHIVED: { label: "Archivado", variant: "info" }
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ArchivedEmployeesPage() {
  const { toasts, showToast, dismiss } = useToast();
  const [filters, setFilters] = useState<{
    search: string;
    branchId: string;
    type: string;
    relationship: string;
    year: string;
    month: string;
    page: number;
  }>({
    search: "",
    branchId: "",
    type: "",
    relationship: "",
    year: "",
    month: "",
    page: 1
  });

  const branchesQuery = useQuery({ queryKey: ["hr-branches"], queryFn: fetchBranches });
  const archivedQuery = useQuery({
    queryKey: ["hr-employees-archived", filters],
    queryFn: () => fetchArchived(filters),
    placeholderData: (prev) => prev
  });

  useEffect(() => {
    if (archivedQuery.error) {
      const message = (archivedQuery.error as Error)?.message || "Error al cargar archivados";
      showToast(message, "error");
    }
  }, [archivedQuery.error, showToast]);

  const rows = archivedQuery.data?.data || [];
  const meta = archivedQuery.data?.meta;
  const periodLabel = useMemo(() => {
    if (!filters.year) return "Todos los años";
    if (filters.month) return `Filtrado a ${filters.year}-${filters.month.padStart(2, "0")}`;
    return `Año ${filters.year}`;
  }, [filters.year, filters.month]);

  const updateFilters = (partial: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...partial, page: partial.page ?? 1 }));
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Empleados archivados</h1>
          <p className="text-xs text-slate-500">Incluye terminados y archivados para referencia histórica. {periodLabel}.</p>
          <div className="mt-2">
            <EmployeesTabs active="archived" />
          </div>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle className="text-base font-semibold text-slate-900">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 text-sm space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Búsqueda</label>
              <input
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Nombre, DPI, código o biométrico"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Sucursal</label>
              <select
                value={filters.branchId}
                onChange={(e) => updateFilters({ branchId: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Todas</option>
                {(branchesQuery.data || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => updateFilters({ type: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Todos</option>
                <option value="INTERNAL">Interno</option>
                <option value="EXTERNAL">Externo</option>
              </select>
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Relación</label>
              <select
                value={filters.relationship}
                onChange={(e) => updateFilters({ relationship: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Todas</option>
                <option value="DEPENDENCIA">Dependencia</option>
                <option value="SIN_DEPENDENCIA">Sin dependencia</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Año</label>
              <input
                value={filters.year}
                onChange={(e) => updateFilters({ year: e.target.value })}
                placeholder="2024"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              />
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-xs font-semibold text-slate-600">Mes</label>
              <select
                value={filters.month}
                onChange={(e) => updateFilters({ month: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="">Todos</option>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const value = `${idx + 1}`.padStart(2, "0");
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="md:col-span-2 flex items-end justify-start md:justify-end gap-2">
              <button
                onClick={() =>
                  setFilters({ search: "", branchId: "", type: "", relationship: "", year: "", month: "", page: 1 })
                }
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
              >
                Limpiar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Archivados</CardTitle>
          <Badge variant="info">
            {archivedQuery.isFetching ? "Actualizando..." : `${rows.length} / ${meta?.total ?? 0}`}
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Empleado</th>
                <th className="py-2 pr-4 font-medium">Código</th>
                <th className="py-2 pr-4 font-medium">Sucursal</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Fecha fin/archivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{emp.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {emp.isExternal ? "Externo" : "Interno"}
                      {emp.employmentType ? ` · ${emp.employmentType}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{emp.employeeCode || "—"}</td>
                  <td className="py-3 pr-4 text-slate-700">{emp.branchName || "—"}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusTone[emp.status].variant}>{statusTone[emp.status].label}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">
                    {emp.archivedAt ? (
                      <>
                        <span className="text-xs uppercase text-slate-500">Archivado </span>
                        <span>{formatDate(emp.archivedAt)}</span>
                      </>
                    ) : emp.terminatedAt ? (
                      <>
                        <span className="text-xs uppercase text-slate-500">Terminado </span>
                        <span>{formatDate(emp.terminatedAt)}</span>
                      </>
                    ) : emp.completedAt ? (
                      <>
                        <span className="text-xs uppercase text-slate-500">Finalizado </span>
                        <span>{formatDate(emp.completedAt)}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {archivedQuery.isLoading && <p className="text-sm text-slate-600 py-3">Cargando...</p>}
          {rows.length === 0 && !archivedQuery.isLoading && (
            <p className="text-sm text-slate-600 py-6 text-center">No hay colaboradores archivados con estos filtros.</p>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 text-xs text-slate-600">
              <span>
                Página {meta.page} de {meta.totalPages} · {meta.total} archivados
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                  disabled={filters.page <= 1}
                  className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => updateFilters({ page: Math.min(meta.totalPages, (filters.page || 1) + 1) })}
                  disabled={(filters.page || 1) >= meta.totalPages}
                  className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
