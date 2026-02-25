"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type LegalEntityRow = {
  id: string;
  legalName: string;
  tradeName: string | null;
  nit: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  counts?: {
    satEstablishments: number;
    billingProfiles: number;
    tradeUnits: number;
  };
};

type LegalEntityForm = {
  id?: string;
  legalName: string;
  tradeName: string;
  nit: string;
  address: string;
  isActive: boolean;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

const emptyForm: LegalEntityForm = {
  legalName: "",
  tradeName: "",
  nit: "",
  address: "",
  isActive: true
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function describeError<T>(payload: ApiEnvelope<T> | null, fallback: string) {
  if (!payload) return fallback;
  const issues = Array.isArray(payload.issues)
    ? payload.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" · ")
    : "";
  const message = payload.error || fallback;
  return issues ? `${message} (${issues})` : message;
}

export default function LegalEntitiesPanel() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<LegalEntityRow[]>([]);
  const [form, setForm] = useState<LegalEntityForm>(emptyForm);

  const loadEntities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/config/legal-entities?includeInactive=1", { cache: "no-store" });
      const payload = await parseEnvelope<LegalEntityRow[]>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudieron cargar patentes."));
      }
      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando patentes", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  async function save() {
    try {
      setSaving(true);
      const isEdit = Boolean(form.id);
      const endpoint = isEdit ? `/api/admin/config/legal-entities/${form.id}` : "/api/admin/config/legal-entities";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim() || null,
          nit: form.nit.trim().toUpperCase() || null,
          address: form.address.trim() || null,
          isActive: form.isActive
        })
      });
      const payload = await parseEnvelope<LegalEntityRow>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo guardar la patente."));
      }

      showToast({ tone: "success", title: isEdit ? "Patente actualizada" : "Patente creada" });
      setForm(emptyForm);
      await loadEntities();
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando patente", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: LegalEntityRow) {
    try {
      const response = await fetch(`/api/admin/config/legal-entities/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive })
      });
      const payload = await parseEnvelope<LegalEntityRow>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo actualizar estado."));
      }

      showToast({ tone: "success", title: row.isActive ? "Patente desactivada" : "Patente activada" });
      await loadEntities();
    } catch (error) {
      showToast({ tone: "error", title: "Error actualizando", message: (error as Error).message });
    }
  }

  async function remove(row: LegalEntityRow) {
    if (!window.confirm(`¿Eliminar patente ${row.legalName}?`)) return;
    try {
      const response = await fetch(`/api/admin/config/legal-entities/${row.id}`, {
        method: "DELETE"
      });
      const payload = await parseEnvelope<{ id: string }>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo eliminar la patente."));
      }

      showToast({ tone: "success", title: "Patente eliminada" });
      await loadEntities();
      if (form.id === row.id) {
        setForm(emptyForm);
      }
    } catch (error) {
      showToast({ tone: "error", title: "Error eliminando", message: (error as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Patentes (Legal Entities)</CardTitle>
          <p className="text-sm text-slate-600">
            CRUD de patentes por tenant. Solo roles owner/admin pueden modificar; validación NIT en servidor y unicidad dentro del tenant.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#2e75ba]/10 text-xs uppercase text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left">Patente</th>
                  <th className="px-3 py-2 text-left">NIT</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{row.legalName}</p>
                      <p className="text-xs text-slate-500">{row.tradeName || "Sin nombre comercial"}</p>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.nit || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                          row.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {row.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#2e75ba] hover:underline"
                          onClick={() =>
                            setForm({
                              id: row.id,
                              legalName: row.legalName,
                              tradeName: row.tradeName || "",
                              nit: row.nit || "",
                              address: row.address || "",
                              isActive: row.isActive
                            })
                          }
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#4aa59c] hover:underline"
                          onClick={() => void toggle(row)}
                        >
                          {row.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600 hover:underline"
                          onClick={() => void remove(row)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                      No hay patentes registradas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-[#2e75ba]">{form.id ? "Editar patente" : "Nueva patente"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-600">Razón social</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.legalName}
                  onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">Nombre comercial</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.tradeName}
                  onChange={(event) => setForm((prev) => ({ ...prev, tradeName: event.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">NIT</label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase"
                  value={form.nit}
                  onChange={(event) => setForm((prev) => ({ ...prev, nit: event.target.value.toUpperCase() }))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">Dirección fiscal</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Activa
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || loading}
                  className="rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
                >
                  {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear patente"}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
