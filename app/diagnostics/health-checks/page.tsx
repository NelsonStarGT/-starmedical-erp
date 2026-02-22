"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { usePermissions } from "@/hooks/usePermissions";

type CheckDefinition = {
  key: string;
  label: string;
  url: string;
  method?: "GET" | "HEAD";
  description?: string;
  allowStatuses?: number[];
};

type CheckResult = {
  status: "PASS" | "FAIL";
  statusCode?: number;
  message?: string;
};

const checks: CheckDefinition[] = [
  { key: "tokens", label: "/marcaje/tokens", url: "/marcaje/tokens", description: "UI tokens marcaje" },
  { key: "archived", label: "/hr/employees/archived", url: "/hr/employees/archived", description: "UI empleados archivados" },
  { key: "attendance", label: "/hr/attendance", url: "/hr/attendance", description: "UI registros asistencia" },
  { key: "diagnostics", label: "/diagnostics/orders", url: "/diagnostics/orders", description: "Worklists diagnósticos" },
  {
    key: "uploadLogo",
    label: "/api/upload/logo",
    url: "/api/upload/logo",
    description: "Ping upload logo (GET)",
    allowStatuses: [200]
  }
];

export default function HealthChecksPage() {
  const { hasPermission, loading } = usePermissions();
  const isAdmin = hasPermission("SYSTEM:ADMIN");
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const quickLinks = useMemo(() => checks.filter((c) => !c.label.startsWith("/api/")), []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const entries = await Promise.all(
      checks.map(async (check) => {
        try {
          const res = await fetch(check.url, { method: check.method || "GET", cache: "no-store" });
          const allowed = new Set(check.allowStatuses || [200, 204, 301, 302]);
          const pass = res.ok || allowed.has(res.status);
          let message = `${res.status} ${res.statusText || ""}`.trim();
          if (!pass) {
            const text = await res.text().catch(() => "");
            if (text) message = `${message} – ${text.slice(0, 200)}`;
          }
          return [check.key, { status: pass ? "PASS" : "FAIL", statusCode: res.status, message }] as const;
        } catch (err: any) {
          return [check.key, { status: "FAIL", message: err?.message || "No se pudo conectar" }] as const;
        }
      })
    );
    setResults(Object.fromEntries(entries));
    setLastRun(new Date());
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      void runChecks();
    }
  }, [loading, isAdmin, runChecks]);

  if (!isAdmin && !loading) {
    return (
      <div className="space-y-4">
        <Card className="border border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="text-rose-800">Acceso restringido</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-rose-800">Health checks solo está disponible para SYSTEM:ADMIN.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Health checks</p>
          <h1 className="text-2xl font-semibold text-slate-900">Smoke tests rápidos</h1>
          <p className="text-sm text-slate-600">Solo GET/health; no se ejecutan acciones destructivas.</p>
          <p className="text-xs text-slate-500">
            Última corrida: {lastRun ? lastRun.toLocaleString("es-GT") : "pendiente"} {running ? "• revisando..." : ""}
          </p>
        </div>
        <button
          onClick={runChecks}
          disabled={running || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
        >
          <ArrowPathIcon className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Revisando..." : "Re-ejecutar checks"}
        </button>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Enlaces rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.key}
              href={link.url}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-brand-primary/50 hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">Estado de endpoints</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Endpoint</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Detalle</th>
                <th className="px-3 py-2 font-semibold">Abrir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checks.map((check) => {
                const result = results[check.key];
                const statusLabel = result ? result.status : running ? "Revisando..." : "Pendiente";
                const isPass = result?.status === "PASS";
                return (
                  <tr key={check.key}>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{check.label}</div>
                      <div className="text-xs text-slate-500">{check.description}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={isPass ? "success" : "warning"}
                        className={isPass ? "" : "bg-rose-50 text-rose-700"}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isPass ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                          {statusLabel}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {result?.message || (running ? "Ejecutando..." : "—")}
                    </td>
                    <td className="px-3 py-3">
                      <Link href={check.url} className="text-xs font-semibold text-brand-primary hover:underline" target="_blank">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
