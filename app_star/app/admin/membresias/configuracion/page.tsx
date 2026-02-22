"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Config = {
  reminderDays: number;
  graceDays: number;
  inactiveAfterDays: number;
  autoRenewWithPayment: boolean;
  prorateOnMidmonth: boolean;
  blockIfBalanceDue: boolean;
  requireInitialPayment: boolean;
  cashTransferMinMonths: number;
  priceChangeNoticeDays: number;
  updatedAt?: string;
  createdAt?: string;
  lastUpdatedBy?: { id?: string; name?: string | null; email?: string | null } | null;
};

const API_BASE = "/api/memberships";

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Error ${res.status} on ${url}`);
  return json;
}

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export default function MembresiasConfiguracionPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    safeFetchJson(`${API_BASE}/config`, { cache: "no-store" })
      .then((json) => {
        setConfig(json.data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const json = await safeFetchJson(`${API_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      setConfig(json.data);
      setMessage("Configuración guardada y aplicada.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof Config, value: any) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configuración de membresías</h1>
        <p className="text-sm text-slate-600">Reglas de renovación, gracia, bloqueo y prorrateo aplican a todos los contratos.</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando configuración…</p>}
      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{message}</p>}

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Parámetros</CardTitle>
            <div className="text-xs text-slate-500 mt-1">
              Última modificación: {formatDateTime(config.updatedAt || config.createdAt)} ·{" "}
              {config.lastUpdatedBy?.name || config.lastUpdatedBy?.email || "No registrado"}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberField label="Aviso de renovación (días)" value={config.reminderDays} onChange={(v) => updateField("reminderDays", v)} />
            <NumberField label="Período de gracia (días)" value={config.graceDays} onChange={(v) => updateField("graceDays", v)} />
            <NumberField label="Inactivar después de (días)" value={config.inactiveAfterDays} onChange={(v) => updateField("inactiveAfterDays", v)} />
            <NumberField label="Meses mínimos para transferir" value={config.cashTransferMinMonths} onChange={(v) => updateField("cashTransferMinMonths", v)} />
            <NumberField label="Aviso cambio de precio (días)" value={config.priceChangeNoticeDays} onChange={(v) => updateField("priceChangeNoticeDays", v)} />

            <ToggleField label="Auto renovar con pago" value={config.autoRenewWithPayment} onChange={(v) => updateField("autoRenewWithPayment", v)} />
            <ToggleField label="Prorratear altas/upgrade" value={config.prorateOnMidmonth} onChange={(v) => updateField("prorateOnMidmonth", v)} />
            <ToggleField label="Bloquear beneficios con saldo" value={config.blockIfBalanceDue} onChange={(v) => updateField("blockIfBalanceDue", v)} />
            <ToggleField label="Pago inicial obligatorio (B2C)" value={config.requireInitialPayment} onChange={(v) => updateField("requireInitialPayment", v)} />
          </CardContent>
          <div className="flex justify-end gap-2 px-6 pb-4">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => window.location.reload()}
            >
              Restablecer
            </button>
            <button
              className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-primary/15"
              onClick={saveConfig}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      {label}
      <input
        type="number"
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
      <span>{label}</span>
    </label>
  );
}
