'use client';

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { HrBranch, HrEmployee, HrEmployeeStatus, LegalEntitySummary } from "@/types/hr";
import { HR_EMPLOYEE_STATUSES } from "@/types/hr";

type EmployeeResponse = {
  data: HrEmployee[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

const statusCopy: Record<HrEmployeeStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-50 text-emerald-700" },
  SUSPENDED: { label: "Suspendido", className: "bg-amber-50 text-amber-700" },
  TERMINATED: { label: "Terminado", className: "bg-rose-50 text-rose-700" }
};

const employmentLabels = {
  DEPENDENCIA: "Dependencia",
  HONORARIOS: "Honorarios",
  OUTSOURCING: "Outsourcing",
  TEMPORAL: "Temporal",
  PRACTICAS: "Prácticas"
};

async function fetchEmployees(filters: { search?: string; status?: string; branchId?: string; legalEntityId?: string; page: number }) {
  const qs = new URLSearchParams();
  if (filters.search) qs.set("search", filters.search);
  if (filters.status) qs.set("status", filters.status);
  if (filters.branchId) qs.set("branchId", filters.branchId);
  if (filters.legalEntityId) qs.set("legalEntityId", filters.legalEntityId);
  qs.set("page", String(filters.page || 1));

  const res = await fetch(`/api/hr/employees?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "No se pudo cargar empleados");
  }
  return (await res.json()) as EmployeeResponse;
}

async function fetchBranches() {
  const res = await fetch("/api/hr/branches", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return (payload.data || []) as HrBranch[];
}

async function fetchLegalEntities() {
  const res = await fetch("/api/finanzas/legal-entities", { cache: "no-store" });
  if (!res.ok) return [];
  const payload = await res.json();
  return (payload.data || []) as LegalEntitySummary[];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-GT", { year: "numeric", month: "short", day: "numeric" });
}

export default function EmployeesPage() {
  const [filters, setFilters] = useState<{ search?: string; status?: string; branchId?: string; legalEntityId?: string; page: number }>({
    search: "",
    status: "",
    branchId: "",
    legalEntityId: "",
    page: 1
  });

  const employeesQuery = useQuery({
    queryKey: ["hr-employees", filters],
    queryFn: () => fetchEmployees(filters),
    keepPreviousData: true
  });

  const branchesQuery = useQuery({
    queryKey: ["hr-branches"],
    queryFn: fetchBranches
  });

  const legalEntitiesQuery = useQuery({
    queryKey: ["legal-entities"],
    queryFn: fetchLegalEntities
  });

  const onFilterChange = (key: "search" | "status" | "branchId") => (value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const onLegalEntityChange = (value: string) => {
    setFilters((prev) => ({ ...prev, legalEntityId: value, page: 1 }));
  };

  const onPageChange = (direction: "next" | "prev") => {
    setFilters((prev) => {
      const nextPage = direction === "next" ? prev.page + 1 : prev.page - 1;
      const clamped = Math.max(1, nextPage);
      return { ...prev, page: clamped };
    });
  };

  const employees = employeesQuery.data?.data || [];
  const meta = employeesQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">RRHH</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Empleados</h1>
          <p className="text-sm text-slate-500 mt-1">Control de altas, movimientos y documentación.</p>
        </div>
        <Link
          href="/hr/employees/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition"
        >
          + Nuevo empleado
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">Búsqueda</label>
            <input
              type="text"
              placeholder="Código, nombre, correo, DPI..."
              value={filters.search}
              onChange={(e) => onFilterChange("search")(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange("status")(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">Todos</option>
              {HR_EMPLOYEE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusCopy[status].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Sucursal</label>
            <select
              value={filters.branchId}
              onChange={(e) => onFilterChange("branchId")(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">Todas</option>
              {(branchesQuery.data || []).map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Razón social</label>
            <select
              value={filters.legalEntityId}
              onChange={(e) => onLegalEntityChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            >
              <option value="">Todas</option>
              {(legalEntitiesQuery.data || []).map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.comercialName || entity.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Listado</CardTitle>
          <Badge variant="info">
            {employeesQuery.isFetching ? "Actualizando..." : `${employees.length} / ${meta?.total ?? 0}`}
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Código</th>
                <th className="py-2 pr-4 font-medium">Nombre</th>
                <th className="py-2 pr-4 font-medium">Razón social</th>
                <th className="py-2 pr-4 font-medium">Puesto</th>
                <th className="py-2 pr-4 font-medium">Sucursal</th>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Alertas</th>
                <th className="py-2 pr-4 font-medium">Inicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    Cargando empleados...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      <Link href={`/hr/employees/${employee.id}`} className="hover:text-brand-primary">
                        {employee.employeeCode}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{employee.fullName}</div>
                      <div className="text-xs text-slate-500">{employee.email || employee.phone || "—"}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{employee.primaryLegalEntity?.comercialName || employee.primaryLegalEntity?.name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">{employee.primaryPosition?.name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">{employee.primaryBranch?.name || "—"}</td>
                    <td className="py-3 pr-4 text-slate-700">
                      {employee.primaryEngagement ? employmentLabels[employee.primaryEngagement.employmentType] : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          statusCopy[employee.status].className
                        )}
                      >
                        {statusCopy[employee.status].label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {employee.alerts.documentsExpiring > 0 && (
                        <Badge variant="warning">{employee.alerts.documentsExpiring} doc</Badge>
                      )}
                      {employee.alerts.licenseExpiring && <Badge variant="warning" className="ml-2">Colegiado</Badge>}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{formatDate(employee.primaryEngagement?.startDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                Página {meta.page} de {meta.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange("prev")}
                  disabled={filters.page <= 1 || employeesQuery.isFetching}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => onPageChange("next")}
                  disabled={meta && filters.page >= meta.totalPages}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-50"
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
