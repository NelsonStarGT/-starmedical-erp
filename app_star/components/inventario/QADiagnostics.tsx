"use client";

import { useEffect, useMemo, useState } from "react";

type QAItem = { id: string; label: string; link?: string; extra?: string };
type QAFinding = { key: string; title: string; severity: "OK" | "WARN" | "ERROR"; items: QAItem[] };

export function QADiagnostics({ token }: { token?: string }) {
  const [findings, setFindings] = useState<QAFinding[]>([]);
  const [status, setStatus] = useState<"OK" | "WARN" | "ERROR">("OK");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventario/qa/run", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ejecutar QA");
      setFindings(data.findings || []);
      setStatus(data.status || "OK");
    } catch (err: any) {
      setError(err?.message || "Error al ejecutar QA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeColor =
    status === "ERROR" ? "bg-rose-100 text-rose-700" : status === "WARN" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeColor}`}>Estado: {status}</span>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {loading ? "Ejecutando…" : "Ejecutar QA"}
        </button>
        <a
          href="/api/inventario/qa/export/xlsx"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Exportar QA (Excel)
        </a>
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {findings.map((f) => (
          <div key={f.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{f.title}</p>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                  f.severity === "ERROR"
                    ? "bg-rose-100 text-rose-700"
                    : f.severity === "WARN"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {f.severity}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {f.items.slice(0, 5).map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>{item.label}</span>
                  {item.link && (
                    <a href={item.link} className="text-xs font-semibold text-brand-primary underline">
                      Ver
                    </a>
                  )}
                </li>
              ))}
              {f.items.length === 0 && <li className="text-xs text-slate-500">Sin hallazgos</li>}
              {f.items.length > 5 && <li className="text-[11px] text-slate-500">+{f.items.length - 5} más…</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
