"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";

type AppConfigSnapshot = {
  id: string;
  companyName: string;
  companyNit: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  timezone: string;
  logoUrl: string | null;
  brandColor: string | null;
  updatedAt: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
  data?: T | null;
};

type TenantBaseForm = {
  companyName: string;
  companyNit: string;
  companyPhone: string;
  companyAddress: string;
  timezone: string;
  logoUrl: string;
  brandColor: string;
};

const defaultForm: TenantBaseForm = {
  companyName: "",
  companyNit: "",
  companyPhone: "",
  companyAddress: "",
  timezone: "America/Guatemala",
  logoUrl: "",
  brandColor: "#2e75ba"
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function describeError<T>(payload: ApiEnvelope<T> | null, fallback: string) {
  if (!payload) return fallback;
  const code = payload.code ? `[${payload.code}] ` : "";
  const issues = Array.isArray(payload.issues)
    ? payload.issues
        .map((issue) => {
          const path = String(issue?.path || "").trim();
          const message = String(issue?.message || "").trim();
          if (!message) return "";
          return path ? `${path}: ${message}` : message;
        })
        .filter(Boolean)
        .join(" | ")
    : "";

  return `${code}${payload.error || fallback}${issues ? ` (${issues})` : ""}`;
}

export default function TenantBasePanel() {
  const { toasts, dismiss, showToast } = useConfigToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBaseForm>(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await configApiFetch("/api/admin/config/app", { cache: "no-store" });
      const payload = await parseEnvelope<AppConfigSnapshot>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo cargar empresa base."));
      }

      const row = payload.data;
      if (!row) {
        setForm(defaultForm);
        setUpdatedAt(null);
        return;
      }

      setForm({
        companyName: row.companyName || "",
        companyNit: row.companyNit || "",
        companyPhone: row.companyPhone || "",
        companyAddress: row.companyAddress || "",
        timezone: row.timezone || "America/Guatemala",
        logoUrl: row.logoUrl || "",
        brandColor: row.brandColor || "#2e75ba"
      });
      setUpdatedAt(row.updatedAt || null);
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando empresa", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    try {
      setSaving(true);
      const response = await configApiFetch("/api/admin/config/app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          companyNit: form.companyNit || null,
          companyPhone: form.companyPhone || null,
          companyAddress: form.companyAddress || null,
          timezone: form.timezone,
          logoUrl: form.logoUrl || null,
          brandColor: form.brandColor || null
        })
      });
      const payload = await parseEnvelope<AppConfigSnapshot>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar empresa base."));
      }

      setUpdatedAt(payload.data.updatedAt || null);
      showToast({ tone: "success", title: "Empresa base actualizada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando empresa", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Tenant / Empresa base</CardTitle>
          <p className="text-sm text-slate-600">Datos corporativos, zona horaria y branding minimo para setup inicial del ERP.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">Nombre empresa</label>
              <input
                value={form.companyName}
                onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="StarMedical"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">NIT</label>
              <input
                value={form.companyNit}
                onChange={(event) => setForm((prev) => ({ ...prev, companyNit: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="1234567-8"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Telefono</label>
              <input
                value={form.companyPhone}
                onChange={(event) => setForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="+502 5555 5555"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Zona horaria</label>
              <input
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="America/Guatemala"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Logo URL (opcional)</label>
              <input
                value={form.logoUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Color corporativo</label>
              <input
                value={form.brandColor}
                onChange={(event) => setForm((prev) => ({ ...prev, brandColor: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                placeholder="#2e75ba"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Direccion</label>
            <textarea
              rows={3}
              value={form.companyAddress}
              onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Direccion fiscal"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar empresa"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {loading ? "Recargando..." : "Recargar"}
            </button>
            <span className="text-xs text-slate-500">
              Ultima actualizacion: {updatedAt ? new Date(updatedAt).toLocaleString() : "Sin registros"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
