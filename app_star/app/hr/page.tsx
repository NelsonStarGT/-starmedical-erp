"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type DashboardResponse = {
  kpis: {
    totalEmployees: number;
    internalEmployees: number;
    externalEmployees: number;
    docsExpiring: number;
    docsOutdated: number;
    attendanceWorkedDays: number;
    attendancePendingDays: number;
    assignmentsPending: number;
    pendingEmployees: number;
  };
  charts: { byBranch: { branchId: string; branchName: string; count: number }[] };
  alerts: { severity: "info" | "warning" | "critical"; title: string; count: number; href: string }[];
  payroll: { draft: number; approved: number };
};

async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch("/api/hr/dashboard", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "No se pudo cargar el dashboard");
  }
  return res.json();
}

const cards = (data?: DashboardResponse["kpis"]) => [
  { label: "Colaboradores", value: data?.totalEmployees ?? 0, href: "/hr/employees" },
  { label: "Internos", value: data?.internalEmployees ?? 0, href: "/hr/employees" },
  { label: "Externos", value: data?.externalEmployees ?? 0, href: "/hr/employees" },
  { label: "Expedientes pendientes", value: data?.pendingEmployees ?? 0, href: "/hr/employees/pending" },
  { label: "Docs por vencer", value: data?.docsExpiring ?? 0, href: "/hr/employees" },
  { label: "Docs por actualizar", value: data?.docsOutdated ?? 0, href: "/hr/employees" },
  { label: "Asistencia trabajados (7d)", value: data?.attendanceWorkedDays ?? 0, href: "/hr/attendance" },
  { label: "Asistencia pendientes (7d)", value: data?.attendancePendingDays ?? 0, href: "/hr/attendance" },
  { label: "Asignaciones pendientes", value: data?.assignmentsPending ?? 0, href: "/hr/employees" }
];

export default function HrIndexPage() {
  const { toasts, dismiss, showToast } = useToast();
  const dashboardQuery = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
    retry: 1
  });

  const alerts = dashboardQuery.data?.alerts || [];
  const branches = dashboardQuery.data?.charts.byBranch || [];

  const shortcuts = useMemo(
    () => [
      { label: "Nuevo colaborador", href: "/hr/employees?new=1", primary: true },
      { label: "Ver empleados", href: "/hr/employees" },
      { label: "Ir a asistencia", href: "/hr/attendance" },
      { label: "Ir a nómina", href: "/hr/payroll" },
      { label: "Ir a ajustes", href: "/hr/settings" }
    ],
    []
  );

  return (
    <div className="p-6 space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Dashboard RRHH</h1>
          <p className="text-sm text-slate-500">Visión general de colaboradores, documentos y asistencia.</p>
        </div>
        <div className="flex gap-2">
          {shortcuts
            .filter((s) => s.primary)
            .map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft hover:-translate-y-px transition"
              >
                {s.label}
              </Link>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {(dashboardQuery.isLoading ? Array.from({ length: 9 }) : cards(dashboardQuery.data?.kpis)).map((card: any, idx) => {
          const body = (
            <Card key={idx} className="shadow-none hover:border-brand-primary/30">
              <CardContent className="pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{dashboardQuery.isLoading ? "..." : card?.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">{dashboardQuery.isLoading ? "—" : card?.value}</p>
              </CardContent>
            </Card>
          );
          return card?.href ? (
            <Link key={idx} href={card.href} className="block">{body}</Link>
          ) : (
            body
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
            {!dashboardQuery.isLoading && alerts.length === 0 && <p className="text-sm text-slate-500">Sin alertas.</p>}
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Link key={alert.title} href={alert.href} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                    <p className="text-xs text-slate-500">{alert.count} items</p>
                  </div>
                  <Badge variant={alert.severity === "critical" ? "warning" : alert.severity === "warning" ? "warning" : "info"}>
                    {alert.count}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Colaboradores por sucursal</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
            {!dashboardQuery.isLoading && branches.length === 0 && <p className="text-sm text-slate-500">Sin datos.</p>}
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.branchId} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <p className="text-sm text-slate-800">{b.branchName}</p>
                  <Badge variant="info">{b.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Atajos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {s.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      {dashboardQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Error al cargar dashboard.{" "}
          <button className="font-semibold underline" onClick={() => dashboardQuery.refetch()}>
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
