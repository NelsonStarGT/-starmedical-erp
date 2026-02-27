"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";
import { cn } from "@/lib/utils";
import BranchDayTimeRangesEditor, {
  normalizeDayRanges,
  validateDayRanges
} from "@/components/configuracion/BranchDayTimeRangesEditor";

type BranchRow = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    businessHours?: number;
    satEstablishments?: number;
  };
};

type BranchHoursRow = {
  id: string;
  branchId: string;
  validFrom: string;
  validTo: string | null;
  scheduleJson: Record<string, string[]>;
  slotMinutesDefault: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SatEstablishmentRow = {
  id: string;
  branchId: string;
  satEstablishmentCode: string;
  legalName: string;
  tradeName: string | null;
  address: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    series?: number;
  };
};

type BranchFormState = {
  id: string | null;
  name: string;
  code: string;
  address: string;
  phone: string;
  timezone: string;
  isActive: boolean;
};

type SatFormState = {
  id: string | null;
  satEstablishmentCode: string;
  legalName: string;
  tradeName: string;
  address: string;
  isActive: boolean;
};

type ApiErrorIssue = {
  path?: string;
  message?: string;
};

type ApiErrorPayload = {
  ok?: boolean;
  code?: string;
  error?: string;
  issues?: ApiErrorIssue[];
};

const weekdayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const weekdayLabel: Record<(typeof weekdayOrder)[number], string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo"
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toScheduleText(scheduleJson: Record<string, string[]> | null | undefined, key: (typeof weekdayOrder)[number]) {
  const values = scheduleJson?.[key] || [];
  if (!Array.isArray(values)) return "";
  return values.join(", ");
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

function buildApiErrorMessage(payload: unknown, fallback: string) {
  const value = (payload && typeof payload === "object" ? payload : {}) as ApiErrorPayload;
  const codePrefix = typeof value.code === "string" && value.code.trim().length > 0 ? `[${value.code}] ` : "";
  const base = typeof value.error === "string" && value.error.trim().length > 0 ? value.error : fallback;
  const issues = Array.isArray(value.issues)
    ? value.issues
        .map((issue) => {
          const path = typeof issue?.path === "string" ? issue.path.trim() : "";
          const message = typeof issue?.message === "string" ? issue.message.trim() : "";
          if (!message) return null;
          return path ? `${path}: ${message}` : message;
        })
        .filter((entry): entry is string => Boolean(entry))
    : [];

  return `${codePrefix}${base}${issues.length ? ` (${issues.join(" | ")})` : ""}`;
}

export default function CentralBranchesConfigPanel() {
  const { toasts, showToast, dismiss } = useConfigToast();

  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const [branchForm, setBranchForm] = useState<BranchFormState>({
    id: null,
    name: "",
    code: "",
    address: "",
    phone: "",
    timezone: "America/Guatemala",
    isActive: true
  });

  const [hours, setHours] = useState<BranchHoursRow[]>([]);
  const [currentHours, setCurrentHours] = useState<BranchHoursRow | null>(null);
  const [isLoadingHours, setIsLoadingHours] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<{
    validFrom: string;
    validTo: string;
    slotMinutesDefault: string;
    isActive: boolean;
    schedule: Record<(typeof weekdayOrder)[number], string[]>;
  }>({
    validFrom: formatDateInput(),
    validTo: "",
    slotMinutesDefault: "30",
    isActive: true,
    schedule: {
      mon: ["08:00-17:00"],
      tue: ["08:00-17:00"],
      wed: ["08:00-17:00"],
      thu: ["08:00-17:00"],
      fri: ["08:00-17:00"],
      sat: [],
      sun: []
    }
  });

  const [satItems, setSatItems] = useState<SatEstablishmentRow[]>([]);
  const [isLoadingSat, setIsLoadingSat] = useState(false);
  const [satForm, setSatForm] = useState<SatFormState>({
    id: null,
    satEstablishmentCode: "",
    legalName: "",
    tradeName: "",
    address: "",
    isActive: true
  });

  const selectedBranch = useMemo(
    () => branches.find((item) => item.id === selectedBranchId) ?? null,
    [branches, selectedBranchId]
  );

  const hoursDraftScheduleValidation = useMemo(() => {
    const daysWithErrors: (typeof weekdayOrder)[number][] = [];

    for (const day of weekdayOrder) {
      const validation = validateDayRanges(hoursDraft.schedule[day] || []);
      if (validation.hasErrors) {
        daysWithErrors.push(day);
      }
    }

    return {
      hasErrors: daysWithErrors.length > 0,
      daysWithErrors
    };
  }, [hoursDraft.schedule]);

  const loadBranches = useCallback(async () => {
    setIsLoadingBranches(true);
    try {
      const res = await configApiFetch("/api/admin/config/branches?includeInactive=1", { cache: "no-store" });
      const json = await readJson<{ ok?: boolean; error?: string; data?: BranchRow[] }>(res);
      if (!res.ok || !json.ok || !Array.isArray(json.data)) {
        throw new Error(buildApiErrorMessage(json, "No se pudo cargar sucursales."));
      }
      const rows = json.data;
      setBranches(rows);
      setSelectedBranchId((prev) => {
        if (prev && rows.some((item) => item.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando sucursales", message: (error as Error).message });
    } finally {
      setIsLoadingBranches(false);
    }
  }, [showToast]);

  const loadBranchHours = useCallback(
    async (branchId: string) => {
      setIsLoadingHours(true);
      try {
        const res = await configApiFetch(`/api/admin/config/branches/${branchId}/hours`, { cache: "no-store" });
        const json = await readJson<{
          ok?: boolean;
          error?: string;
          data?: { current: BranchHoursRow | null; items: BranchHoursRow[] };
        }>(res);
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(buildApiErrorMessage(json, "No se pudo cargar horarios."));
        }
        setCurrentHours(json.data.current ?? null);
        setHours(json.data.items || []);
      } catch (error) {
        setCurrentHours(null);
        setHours([]);
        showToast({ tone: "error", title: "Error cargando horarios", message: (error as Error).message });
      } finally {
        setIsLoadingHours(false);
      }
    },
    [showToast]
  );

  const loadSat = useCallback(
    async (branchId: string) => {
      setIsLoadingSat(true);
      try {
        const res = await configApiFetch(`/api/admin/config/branches/${branchId}/establishments`, { cache: "no-store" });
        const json = await readJson<{
          ok?: boolean;
          error?: string;
          data?: { items: SatEstablishmentRow[] };
        }>(res);
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(buildApiErrorMessage(json, "No se pudo cargar establecimientos SAT."));
        }
        setSatItems(json.data.items || []);
      } catch (error) {
        setSatItems([]);
        showToast({ tone: "error", title: "Error cargando SAT", message: (error as Error).message });
      } finally {
        setIsLoadingSat(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (!selectedBranchId) {
      setHours([]);
      setCurrentHours(null);
      setSatItems([]);
      return;
    }
    void loadBranchHours(selectedBranchId);
    void loadSat(selectedBranchId);
  }, [loadBranchHours, loadSat, selectedBranchId]);

  function resetBranchForm() {
    setBranchForm({
      id: null,
      name: "",
      code: "",
      address: "",
      phone: "",
      timezone: "America/Guatemala",
      isActive: true
    });
  }

  function loadBranchIntoForm(branch: BranchRow) {
    setBranchForm({
      id: branch.id,
      name: branch.name,
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
      timezone: branch.timezone || "America/Guatemala",
      isActive: branch.isActive
    });
  }

  async function handleSaveBranch() {
    const isEdit = Boolean(branchForm.id);
    const endpoint = isEdit ? `/api/admin/config/branches/${branchForm.id}` : "/api/admin/config/branches";
    const method = isEdit ? "PUT" : "POST";

    try {
      showToast({ tone: "info", title: isEdit ? "Actualizando sucursal..." : "Creando sucursal...", durationMs: 900 });
      const res = await configApiFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address || null,
          phone: branchForm.phone || null,
          timezone: branchForm.timezone,
          isActive: branchForm.isActive
        })
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo guardar la sucursal."));
      }

      await loadBranches();
      if (!isEdit) resetBranchForm();
      showToast({ tone: "success", title: isEdit ? "Sucursal actualizada" : "Sucursal creada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando sucursal", message: (error as Error).message });
    }
  }

  async function handleToggleBranch(branch: BranchRow) {
    try {
      const res = await configApiFetch(`/api/admin/config/branches/${branch.id}/toggle-active`, {
        method: "PATCH"
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo cambiar estado de sucursal."));
      }
      await loadBranches();
      showToast({ tone: "success", title: branch.isActive ? "Sucursal desactivada" : "Sucursal activada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error actualizando estado", message: (error as Error).message });
    }
  }

  function buildSchedulePayload() {
    const payload: Record<string, string[]> = {};
    for (const key of weekdayOrder) {
      payload[key] = normalizeDayRanges(hoursDraft.schedule[key] || []);
    }
    return payload;
  }

  async function handlePublishHours() {
    if (!selectedBranchId) return;

    try {
      const res = await configApiFetch(`/api/admin/config/branches/${selectedBranchId}/hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validFrom: hoursDraft.validFrom,
          validTo: hoursDraft.validTo || null,
          scheduleJson: buildSchedulePayload(),
          slotMinutesDefault: hoursDraft.slotMinutesDefault ? Number(hoursDraft.slotMinutesDefault) : null,
          isActive: hoursDraft.isActive
        })
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo publicar horario."));
      }
      await loadBranchHours(selectedBranchId);
      showToast({ tone: "success", title: "Horario publicado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error publicando horario", message: (error as Error).message });
    }
  }

  async function handleCloseCurrentHours() {
    if (!selectedBranchId || !currentHours) return;

    try {
      const res = await configApiFetch(`/api/admin/config/branches/${selectedBranchId}/hours/${currentHours.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validTo: new Date().toISOString(),
          isActive: false
        })
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo cerrar vigencia."));
      }
      await loadBranchHours(selectedBranchId);
      showToast({ tone: "success", title: "Vigencia cerrada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error cerrando vigencia", message: (error as Error).message });
    }
  }

  function resetSatForm() {
    setSatForm({
      id: null,
      satEstablishmentCode: "",
      legalName: "",
      tradeName: "",
      address: "",
      isActive: true
    });
  }

  function loadSatIntoForm(row: SatEstablishmentRow) {
    setSatForm({
      id: row.id,
      satEstablishmentCode: row.satEstablishmentCode,
      legalName: row.legalName,
      tradeName: row.tradeName || "",
      address: row.address,
      isActive: row.isActive
    });
  }

  async function handleSaveSat() {
    if (!selectedBranchId) return;

    const isEdit = Boolean(satForm.id);
    const endpoint = isEdit
      ? `/api/admin/config/branches/${selectedBranchId}/establishments/${satForm.id}`
      : `/api/admin/config/branches/${selectedBranchId}/establishments`;

    try {
      const res = await configApiFetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          satEstablishmentCode: satForm.satEstablishmentCode,
          legalName: satForm.legalName,
          tradeName: satForm.tradeName || null,
          address: satForm.address,
          isActive: satForm.isActive
        })
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo guardar establecimiento SAT."));
      }
      await loadSat(selectedBranchId);
      if (!isEdit) resetSatForm();
      showToast({ tone: "success", title: isEdit ? "Establecimiento actualizado" : "Establecimiento agregado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando SAT", message: (error as Error).message });
    }
  }

  async function handleToggleSat(row: SatEstablishmentRow) {
    if (!selectedBranchId) return;

    try {
      const res = await configApiFetch(`/api/admin/config/branches/${selectedBranchId}/establishments/${row.id}`, {
        method: "PATCH"
      });
      const json = await readJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || json.ok === false) {
        throw new Error(buildApiErrorMessage(json, "No se pudo actualizar establecimiento SAT."));
      }
      await loadSat(selectedBranchId);
      showToast({ tone: "success", title: row.isActive ? "Establecimiento desactivado" : "Establecimiento activado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error actualizando SAT", message: (error as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sucursales reales</CardTitle>
            <p className="text-sm text-slate-500">CRUD centralizado con estado, zona horaria y datos operativos.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Sucursal</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Código</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Teléfono</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Zona horaria</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {branches.map((branch) => (
                    <tr
                      key={branch.id}
                      className={cn(
                        "cursor-pointer transition hover:bg-slate-50",
                        selectedBranchId === branch.id && "bg-[#4aadf5]/10"
                      )}
                      onClick={() => setSelectedBranchId(branch.id)}
                    >
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{branch.name}</p>
                        <p className="text-xs text-slate-500">{branch.address || "Sin dirección"}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{branch.code || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{branch.phone || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{branch.timezone}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                            branch.isActive ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {branch.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
                            onClick={(event) => {
                              event.stopPropagation();
                              loadBranchIntoForm(branch);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleBranch(branch);
                            }}
                          >
                            {branch.isActive ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoadingBranches && branches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No hay sucursales. Crea la primera para operar Agenda/Recepción/Portales.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {isLoadingBranches ? <p className="text-xs text-slate-500">Cargando sucursales...</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{branchForm.id ? "Editar sucursal" : "Crear sucursal"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-slate-600">Nombre</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={branchForm.name}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Código</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={branchForm.code}
                  onChange={(event) => setBranchForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Teléfono</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={branchForm.phone}
                  onChange={(event) => setBranchForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Dirección</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={2}
                value={branchForm.address}
                onChange={(event) => setBranchForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Zona horaria</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={branchForm.timezone}
                  onChange={(event) => setBranchForm((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={branchForm.isActive}
                  onChange={(event) => setBranchForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Sucursal activa
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveBranch()}
                className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3b928a]"
              >
                {branchForm.id ? "Guardar cambios" : "Crear sucursal"}
              </button>
              {branchForm.id ? (
                <button
                  type="button"
                  onClick={resetBranchForm}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horarios por sucursal</CardTitle>
            <p className="text-sm text-slate-500">
              Define vigencias activas por día con rangos estructurados de apertura/cierre en formato 24h.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedBranch ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Selecciona una sucursal para configurar horarios.
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-[#4aadf5]/25 bg-[#4aadf5]/10 px-3 py-2 text-sm text-[#2e75ba]">
                  Sucursal: <span className="font-semibold">{selectedBranch.name}</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">Vigencia actual</p>
                  <p className="text-slate-600">
                    Desde: {currentHours ? formatDateTime(currentHours.validFrom) : "No definida"}
                  </p>
                  <p className="text-slate-600">
                    Hasta: {currentHours ? formatDateTime(currentHours.validTo) : "No definida"}
                  </p>
                  {currentHours ? (
                    <button
                      type="button"
                      onClick={() => void handleCloseCurrentHours()}
                      className="mt-2 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      Cerrar vigencia actual
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  {weekdayOrder.map((key) => (
                    <BranchDayTimeRangesEditor
                      key={key}
                      labelDay={weekdayLabel[key]}
                      value={hoursDraft.schedule[key]}
                      onChange={(next) =>
                        setHoursDraft((prev) => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            [key]: next
                          }
                        }))
                      }
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">Válido desde</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={hoursDraft.validFrom}
                      onChange={(event) => setHoursDraft((prev) => ({ ...prev, validFrom: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Válido hasta</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={hoursDraft.validTo}
                      onChange={(event) => setHoursDraft((prev) => ({ ...prev, validTo: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Slot (min)</label>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={hoursDraft.slotMinutesDefault}
                      onChange={(event) => setHoursDraft((prev) => ({ ...prev, slotMinutesDefault: event.target.value }))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handlePublishHours()}
                  disabled={hoursDraftScheduleValidation.hasErrors}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    hoursDraftScheduleValidation.hasErrors
                      ? "cursor-not-allowed bg-slate-300 text-slate-600"
                      : "bg-[#4aa59c] text-white hover:bg-[#3b928a]"
                  )}
                >
                  Publicar horario
                </button>
                {hoursDraftScheduleValidation.hasErrors ? (
                  <p className="text-xs font-medium text-rose-700">
                    Corrige rangos inválidos o solapados antes de publicar. Días con error:{" "}
                    {hoursDraftScheduleValidation.daysWithErrors.map((day) => weekdayLabel[day]).join(", ")}.
                  </p>
                ) : null}
              </>
            )}

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Historial</div>
              <div className="max-h-64 overflow-auto">
                {hours.map((row) => (
                  <div key={row.id} className="border-b border-slate-100 px-3 py-2 text-sm last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {formatDateTime(row.validFrom)} → {formatDateTime(row.validTo)}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          row.isActive ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {row.isActive ? "Activa" : "Cerrada"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Slot default: {row.slotMinutesDefault ?? "—"} min · Actualizado: {formatDateTime(row.updatedAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Lunes: {toScheduleText(row.scheduleJson, "mon") || "—"} · Sábado: {toScheduleText(row.scheduleJson, "sat") || "—"}
                    </p>
                  </div>
                ))}
                {!isLoadingHours && hours.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-slate-500">Sin vigencias registradas.</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Establecimientos SAT</CardTitle>
            <p className="text-sm text-slate-500">Múltiples establecimientos por sucursal, listos para series FEL.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedBranch ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Selecciona una sucursal para gestionar establecimientos SAT.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-600">Código SAT</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={satForm.satEstablishmentCode}
                      onChange={(event) =>
                        setSatForm((prev) => ({ ...prev, satEstablishmentCode: event.target.value.toUpperCase() }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Nombre legal</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={satForm.legalName}
                      onChange={(event) => setSatForm((prev) => ({ ...prev, legalName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Nombre comercial</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={satForm.tradeName}
                      onChange={(event) => setSatForm((prev) => ({ ...prev, tradeName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Dirección</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={satForm.address}
                      onChange={(event) => setSatForm((prev) => ({ ...prev, address: event.target.value }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={satForm.isActive}
                    onChange={(event) => setSatForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Establecimiento activo
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveSat()}
                    className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3b928a]"
                  >
                    {satForm.id ? "Guardar establecimiento" : "Agregar establecimiento"}
                  </button>
                  {satForm.id ? (
                    <button
                      type="button"
                      onClick={resetSatForm}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancelar edición
                    </button>
                  ) : null}
                </div>

                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Código</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Nombre legal</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Dirección</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {satItems.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{row.satEstablishmentCode}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <p>{row.legalName}</p>
                            <p className="text-xs text-slate-500">{row.tradeName || "—"}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.address}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                row.isActive ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {row.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                                onClick={() => loadSatIntoForm(row)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                                onClick={() => void handleToggleSat(row)}
                              >
                                {row.isActive ? "Desactivar" : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!isLoadingSat && satItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                            Sin establecimientos SAT para esta sucursal.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
