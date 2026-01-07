"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type Policy = {
  marginProductsPct?: number | null;
  marginServicesPct?: number | null;
  roundingMode: string;
  autoApplyOnCreate: boolean;
};

const roundingOptions = [
  { value: "NONE", label: "Sin redondeo" },
  { value: "Q0.05", label: "Q0.05" },
  { value: "Q0.10", label: "Q0.10" },
  { value: "Q1.00", label: "Q1.00" }
];

export function MarginPolicy({ token }: { token?: string }) {
  const [policy, setPolicy] = useState<Policy>({
    marginProductsPct: 45,
    marginServicesPct: 45,
    roundingMode: "NONE",
    autoApplyOnCreate: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventario/margin-policy", { headers });
      const data = await res.json();
      if (res.ok && data.data) setPolicy({ ...policy, ...data.data });
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/inventario/margin-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(policy)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setMessage("Política guardada");
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-slate-500">Cargando política…</p>}
      <p className="text-xs text-slate-600">
        Esta política solo es informativa: calcula precios sugeridos, pero no modifica precios hasta que el usuario presione “Aplicar margen” en el
        formulario de producto/servicio.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-slate-600">Margen default productos (%)</label>
          <input
            type="number"
            value={policy.marginProductsPct ?? ""}
            onChange={(e) => setPolicy({ ...policy, marginProductsPct: Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            placeholder="45"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Margen default servicios (%)</label>
          <input
            type="number"
            value={policy.marginServicesPct ?? ""}
            onChange={(e) => setPolicy({ ...policy, marginServicesPct: Number(e.target.value) })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            placeholder="45"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SearchableSelect
          label="Redondeo"
          value={policy.roundingMode}
          onChange={(v) => setPolicy({ ...policy, roundingMode: (v as string) || "NONE" })}
          options={roundingOptions}
          includeAllOption={false}
        />
        <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={policy.autoApplyOnCreate}
            onChange={(e) => setPolicy({ ...policy, autoApplyOnCreate: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/30"
          />
          Aplicar automáticamente al crear
        </label>
      </div>
      {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar política"}
        </button>
      </div>
    </div>
  );
}
