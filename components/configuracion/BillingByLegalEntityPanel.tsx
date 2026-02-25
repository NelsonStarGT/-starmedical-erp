"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type LegalEntityOption = {
  id: string;
  legalName: string;
  isActive: boolean;
};

type BranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

type BillingPreference = {
  tenantId: string;
  defaultLegalEntityId: string | null;
  branchDefaults: Record<string, string | null>;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type BillingSeries = {
  id: string;
  tenantId: string | null;
  legalEntityId: string;
  branchId: string | null;
  name: string;
  prefix: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BillingSeriesForm = {
  id?: string;
  legalEntityId: string;
  branchId: string;
  name: string;
  prefix: string;
  nextNumber: number;
  isDefault: boolean;
  isActive: boolean;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

const emptySeriesForm: BillingSeriesForm = {
  legalEntityId: "",
  branchId: "",
  name: "",
  prefix: "",
  nextNumber: 1,
  isDefault: true,
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

export default function BillingByLegalEntityPanel() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingSeries, setSavingSeries] = useState(false);

  const [legalEntities, setLegalEntities] = useState<LegalEntityOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [seriesRows, setSeriesRows] = useState<BillingSeries[]>([]);

  const [defaultLegalEntityId, setDefaultLegalEntityId] = useState("");
  const [branchDefaults, setBranchDefaults] = useState<Record<string, string | null>>({});
  const [preferenceUpdatedAt, setPreferenceUpdatedAt] = useState<string | null>(null);

  const [seriesFilter, setSeriesFilter] = useState("");
  const [seriesForm, setSeriesForm] = useState<BillingSeriesForm>(emptySeriesForm);

  const legalNameById = useMemo(() => {
    return new Map(legalEntities.map((row) => [row.id, row.legalName]));
  }, [legalEntities]);

  const branchNameById = useMemo(() => {
    return new Map(branches.map((row) => [row.id, row.name]));
  }, [branches]);

  const filteredSeries = useMemo(() => {
    if (!seriesFilter) return seriesRows;
    return seriesRows.filter((row) => row.legalEntityId === seriesFilter);
  }, [seriesRows, seriesFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [legalRes, branchRes, prefRes, seriesRes] = await Promise.all([
        fetch("/api/admin/config/legal-entities?includeInactive=1", { cache: "no-store" }),
        fetch("/api/admin/config/branches?includeInactive=1", { cache: "no-store" }),
        fetch("/api/admin/config/billing/preference", { cache: "no-store" }),
        fetch("/api/admin/config/billing/series?includeInactive=1", { cache: "no-store" })
      ]);

      const [legalJson, branchJson, prefJson, seriesJson] = await Promise.all([
        parseEnvelope<LegalEntityOption[]>(legalRes),
        parseEnvelope<BranchOption[]>(branchRes),
        parseEnvelope<BillingPreference>(prefRes),
        parseEnvelope<BillingSeries[]>(seriesRes)
      ]);

      if (!legalRes.ok || legalJson.ok === false) throw new Error(describeError(legalJson, "No se pudieron cargar patentes."));
      if (!branchRes.ok || branchJson.ok === false) throw new Error(describeError(branchJson, "No se pudieron cargar sucursales."));
      if (!prefRes.ok || prefJson.ok === false) throw new Error(describeError(prefJson, "No se pudo cargar preferencia de facturación."));
      if (!seriesRes.ok || seriesJson.ok === false) throw new Error(describeError(seriesJson, "No se pudieron cargar series."));

      const nextLegals = (legalJson.data || []).filter((row) => row.isActive);
      const nextBranches = branchJson.data || [];
      const preference = prefJson.data;

      setLegalEntities(nextLegals);
      setBranches(nextBranches);
      setSeriesRows(seriesJson.data || []);

      const fallbackLegalId = preference?.defaultLegalEntityId || nextLegals[0]?.id || "";
      setDefaultLegalEntityId(fallbackLegalId);
      setBranchDefaults((preference?.branchDefaults || {}) as Record<string, string | null>);
      setPreferenceUpdatedAt(preference?.updatedAt || null);

      setSeriesFilter((current) => current || fallbackLegalId);
      setSeriesForm((current) => ({
        ...current,
        legalEntityId: current.legalEntityId || fallbackLegalId
      }));
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando facturación", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function savePreference() {
    try {
      setSavingPreference(true);
      const response = await fetch("/api/admin/config/billing/preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultLegalEntityId: defaultLegalEntityId || null,
          branchDefaults
        })
      });
      const payload = await parseEnvelope<BillingPreference>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar preferencia."));
      }

      setPreferenceUpdatedAt(payload.data.updatedAt || null);
      showToast({ tone: "success", title: "Preferencia guardada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando preferencia", message: (error as Error).message });
    } finally {
      setSavingPreference(false);
    }
  }

  async function saveSeries() {
    try {
      setSavingSeries(true);
      const isEdit = Boolean(seriesForm.id);
      const endpoint = isEdit ? `/api/admin/config/billing/series/${seriesForm.id}` : "/api/admin/config/billing/series";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalEntityId: seriesForm.legalEntityId,
          branchId: seriesForm.branchId || null,
          name: seriesForm.name.trim(),
          prefix: seriesForm.prefix.trim().toUpperCase(),
          nextNumber: Number(seriesForm.nextNumber) || 1,
          isDefault: seriesForm.isDefault,
          isActive: seriesForm.isActive
        })
      });
      const payload = await parseEnvelope<BillingSeries>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo guardar serie."));
      }

      showToast({ tone: "success", title: isEdit ? "Serie actualizada" : "Serie creada" });
      setSeriesForm((prev) => ({
        ...emptySeriesForm,
        legalEntityId: prev.legalEntityId || defaultLegalEntityId
      }));
      await loadData();
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando serie", message: (error as Error).message });
    } finally {
      setSavingSeries(false);
    }
  }

  async function toggleSeries(row: BillingSeries) {
    try {
      const response = await fetch(`/api/admin/config/billing/series/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive })
      });
      const payload = await parseEnvelope<BillingSeries>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo cambiar estado de la serie."));
      }
      showToast({ tone: "success", title: row.isActive ? "Serie desactivada" : "Serie activada" });
      await loadData();
    } catch (error) {
      showToast({ tone: "error", title: "Error actualizando serie", message: (error as Error).message });
    }
  }

  async function removeSeries(row: BillingSeries) {
    if (!window.confirm(`¿Eliminar serie ${row.prefix} · ${row.name}?`)) return;
    try {
      const response = await fetch(`/api/admin/config/billing/series/${row.id}`, { method: "DELETE" });
      const payload = await parseEnvelope<{ id: string }>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo eliminar la serie."));
      }
      showToast({ tone: "success", title: "Serie eliminada" });
      if (seriesForm.id === row.id) {
        setSeriesForm((prev) => ({ ...emptySeriesForm, legalEntityId: prev.legalEntityId || defaultLegalEntityId }));
      }
      await loadData();
    } catch (error) {
      showToast({ tone: "error", title: "Error eliminando serie", message: (error as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Preferencia por patente</CardTitle>
          <p className="text-sm text-slate-600">
            Selecciona la patente default por tenant y por sucursal. El flujo de emisión prioriza esta configuración y valida en servidor.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">Patente default del tenant</label>
              <select
                value={defaultLegalEntityId}
                onChange={(event) => setDefaultLegalEntityId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={loading || savingPreference}
              >
                <option value="">Sin default</option>
                {legalEntities.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.legalName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Última actualización</p>
              <p>{preferenceUpdatedAt ? new Date(preferenceUpdatedAt).toLocaleString() : "Sin cambios"}</p>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#2e75ba]/10 text-xs uppercase text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left">Sucursal</th>
                  <th className="px-3 py-2 text-left">Patente default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((branch) => (
                  <tr key={branch.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{branch.name}</p>
                      <p className="text-xs text-slate-500">{branch.code || "Sin código"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={branchDefaults[branch.id] || ""}
                        onChange={(event) =>
                          setBranchDefaults((prev) => ({
                            ...prev,
                            [branch.id]: event.target.value || null
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        disabled={loading || savingPreference}
                      >
                        <option value="">Usar default tenant</option>
                        {legalEntities.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.legalName}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!loading && branches.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-sm text-slate-500">
                      No hay sucursales disponibles.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="button"
              onClick={() => void savePreference()}
              disabled={loading || savingPreference}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {savingPreference ? "Guardando..." : "Guardar preferencia"}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-[#2e75ba]">Series por patente</CardTitle>
            <p className="text-sm text-slate-600">Una serie default activa por patente. Correlativo se reserva en servidor al emitir.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={seriesFilter}
                onChange={(event) => setSeriesFilter(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todas las patentes</option>
                {legalEntities.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.legalName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-[#2e75ba]/10 text-xs uppercase text-[#2e75ba]">
                  <tr>
                    <th className="px-3 py-2 text-left">Serie</th>
                    <th className="px-3 py-2 text-left">Patente</th>
                    <th className="px-3 py-2 text-left">Sucursal</th>
                    <th className="px-3 py-2 text-left">Próximo</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSeries.map((row) => (
                    <tr key={row.id} className="odd:bg-white even:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">
                          {row.prefix} · {row.name}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-xs">
                          {row.isDefault ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">Default</span>
                          ) : null}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 font-semibold",
                              row.isActive ? "bg-sky-50 text-[#2e75ba]" : "bg-slate-200 text-slate-600"
                            )}
                          >
                            {row.isActive ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{legalNameById.get(row.legalEntityId) || row.legalEntityId}</td>
                      <td className="px-3 py-2 text-slate-700">{row.branchId ? branchNameById.get(row.branchId) || row.branchId : "Todas"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.nextNumber}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-[#2e75ba] hover:underline"
                            onClick={() =>
                              setSeriesForm({
                                id: row.id,
                                legalEntityId: row.legalEntityId,
                                branchId: row.branchId || "",
                                name: row.name,
                                prefix: row.prefix,
                                nextNumber: row.nextNumber,
                                isDefault: row.isDefault,
                                isActive: row.isActive
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-[#4aa59c] hover:underline"
                            onClick={() => void toggleSeries(row)}
                          >
                            {row.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-600 hover:underline"
                            onClick={() => void removeSeries(row)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredSeries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                        No hay series para el filtro actual.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#2e75ba]">{seriesForm.id ? "Editar serie" : "Nueva serie"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Patente</label>
              <select
                value={seriesForm.legalEntityId}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, legalEntityId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Selecciona patente</option>
                {legalEntities.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.legalName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Sucursal (opcional)</label>
              <select
                value={seriesForm.branchId}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, branchId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Todas las sucursales</option>
                {branches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Nombre</label>
              <input
                value={seriesForm.name}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Prefijo</label>
              <input
                value={seriesForm.prefix}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, prefix: event.target.value.toUpperCase() }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Próximo correlativo</label>
              <input
                type="number"
                min={1}
                value={seriesForm.nextNumber}
                onChange={(event) =>
                  setSeriesForm((prev) => ({
                    ...prev,
                    nextNumber: Number(event.target.value) || 1
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={seriesForm.isDefault}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
              />
              Serie default
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={seriesForm.isActive}
                onChange={(event) => setSeriesForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Activa
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveSeries()}
                disabled={savingSeries || loading}
                className="rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
              >
                {savingSeries ? "Guardando..." : seriesForm.id ? "Guardar serie" : "Crear serie"}
              </button>
              {seriesForm.id ? (
                <button
                  type="button"
                  onClick={() => setSeriesForm((prev) => ({ ...emptySeriesForm, legalEntityId: prev.legalEntityId || defaultLegalEntityId }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
