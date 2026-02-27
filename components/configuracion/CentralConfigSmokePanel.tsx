"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

type SmokeCheckRow = {
  key: string;
  label: string;
  ok: boolean;
  count: number | null;
  error?: string;
};

type SmokeResult = {
  ok: boolean;
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
  checkedAt?: string;
  checks?: SmokeCheckRow[];
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export default function CentralConfigSmokePanel() {
  const { hasPermission, loading } = usePermissions();
  const canSee = useMemo(() => {
    return (
      hasPermission("SYSTEM:ADMIN") ||
      hasPermission("CONFIG_BRANCH_READ") ||
      hasPermission("CONFIG_SAT_READ") ||
      hasPermission("CONFIG_THEME_READ")
    );
  }, [hasPermission]);

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SmokeResult | null>(null);

  async function runSmoke() {
    setIsRunning(true);
    try {
      const res = await configApiFetch("/api/admin/config/smoke", { cache: "no-store" });
      const json = await readJson<SmokeResult>(res);
      if (!res.ok && res.status === 403) {
        setResult({
          ok: false,
          error: "No autorizado para ejecutar smoke de Configuración Central.",
          code: "FORBIDDEN"
        });
        return;
      }
      setResult(json);
    } catch (error) {
      setResult({
        ok: false,
        code: "SMOKE_FAILED",
        error: error instanceof Error ? error.message : "No se pudo ejecutar smoke."
      });
    } finally {
      setIsRunning(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smoke Config Central</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">Cargando permisos...</CardContent>
      </Card>
    );
  }

  if (!canSee) return null;

  return (
    <Card className="border-[#2e75ba]/20 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-[#2e75ba]">Smoke Configuración Central</CardTitle>
          <p className="mt-1 text-sm text-slate-600">Verifica que DB y tablas clave respondan antes de operar.</p>
        </div>
        <button
          type="button"
          onClick={() => void runSmoke()}
          disabled={isRunning}
          className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b928a] disabled:opacity-60"
        >
          {isRunning ? "Ejecutando..." : "Ejecutar smoke"}
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        {!result ? (
          <p className="text-sm text-slate-500">Ejecuta smoke para validar Branch, Hours, SAT, Theme y Feature Flags.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  result.ok ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-rose-100 text-rose-700"
                )}
              >
                {result.ok ? "SMOKE OK" : "SMOKE FAIL"}
              </span>
              {result.checkedAt ? <span className="text-xs text-slate-500">Ejecutado: {new Date(result.checkedAt).toLocaleString()}</span> : null}
              {result.code ? <span className="text-xs font-semibold text-slate-600">Code: {result.code}</span> : null}
            </div>

            {result.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <p>{result.error}</p>
                {Array.isArray(result.issues) && result.issues.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {result.issues.map((issue, index) => (
                      <li key={`${issue.path || "issue"}-${index}`}>
                        {issue.path ? `${issue.path}: ` : ""}
                        {issue.message || "Detalle no disponible"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {Array.isArray(result.checks) && result.checks.length > 0 ? (
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[#2e75ba]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Componente</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Estado</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Registros</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.checks.map((check, index) => (
                      <tr key={check.key} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="px-3 py-2 font-medium text-slate-800">{check.label}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs font-semibold",
                              check.ok ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {check.ok ? "OK" : "FAIL"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{check.count ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{check.error || "Sin errores"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
