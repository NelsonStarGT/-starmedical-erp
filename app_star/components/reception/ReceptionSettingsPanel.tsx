"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  actionGetReceptionSlaSettings,
  actionListReceptionSlaAudit,
  actionRestoreReceptionSlaRecommended,
  actionSaveReceptionSlaAdvanced,
  actionSaveReceptionSlaSimple
} from "@/app/admin/reception/actions";
import { RECEPTION_AREAS, RECEPTION_AREA_LABELS } from "@/lib/reception/constants";
import { RECEPTION_SLA_MAX, RECEPTION_SLA_MIN, RECEPTION_SLA_RECOMMENDED, type ReceptionSlaPolicy } from "@/lib/reception/sla-config";
import type { ReceptionCapability } from "@/lib/reception/permissions";
import { cn } from "@/lib/utils";

type AuditRow = Awaited<ReturnType<typeof actionListReceptionSlaAudit>>[number];

type Props = {
  siteId: string;
  capabilities: ReceptionCapability[];
  initialPolicy: ReceptionSlaPolicy;
  initialAudit: AuditRow[];
};

type AreaRow = {
  area: (typeof RECEPTION_AREAS)[number];
  waitingWarningMin: number;
  waitingCriticalMin: number;
  inServiceMaxMin: number;
};

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
    "focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30",
    disabled && "cursor-not-allowed bg-slate-50 text-slate-400"
  );
}

function toAreaRows(policy: ReceptionSlaPolicy): AreaRow[] {
  return RECEPTION_AREAS.map((area) => {
    const thresholds = policy.areaThresholds[area] ?? policy.thresholds;
    return {
      area,
      waitingWarningMin: thresholds.waitingWarningMin,
      waitingCriticalMin: thresholds.waitingCriticalMin,
      inServiceMaxMin: thresholds.inServiceMaxMin
    };
  });
}

function validateSimple(input: { waitingWarningMin: number; waitingCriticalMin: number; inServiceMaxMin: number }) {
  const values = [
    { label: "Espera warning", value: input.waitingWarningMin },
    { label: "Espera critical", value: input.waitingCriticalMin },
    { label: "Atención en curso", value: input.inServiceMaxMin }
  ];
  for (const item of values) {
    if (!Number.isFinite(item.value) || item.value < RECEPTION_SLA_MIN || item.value > RECEPTION_SLA_MAX) {
      throw new Error(`${item.label} debe estar entre ${RECEPTION_SLA_MIN} y ${RECEPTION_SLA_MAX}.`);
    }
  }
  if (input.waitingCriticalMin < input.waitingWarningMin) {
    throw new Error("Espera critical debe ser mayor o igual a espera warning.");
  }
}

export default function ReceptionSettingsPanel({ siteId, capabilities, initialPolicy, initialAudit }: Props) {
  const canEdit = capabilities.includes("SETTINGS_EDIT");
  const canAdvanced = canEdit;

  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [policy, setPolicy] = useState(initialPolicy);
  const [audit, setAudit] = useState(initialAudit);

  const [applyToAllAreas, setApplyToAllAreas] = useState(initialPolicy.applyToAllAreas);
  const [waitingWarningMin, setWaitingWarningMin] = useState(initialPolicy.thresholds.waitingWarningMin);
  const [waitingCriticalMin, setWaitingCriticalMin] = useState(initialPolicy.thresholds.waitingCriticalMin);
  const [inServiceMaxMin, setInServiceMaxMin] = useState(initialPolicy.thresholds.inServiceMaxMin);
  const [areaRows, setAreaRows] = useState<AreaRow[]>(() => toAreaRows(initialPolicy));

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshFromServer = async () => {
    const [nextPolicy, nextAudit] = await Promise.all([
      actionGetReceptionSlaSettings(siteId),
      actionListReceptionSlaAudit(siteId)
    ]);
    setPolicy(nextPolicy);
    setAudit(nextAudit);
    setApplyToAllAreas(nextPolicy.applyToAllAreas);
    setWaitingWarningMin(nextPolicy.thresholds.waitingWarningMin);
    setWaitingCriticalMin(nextPolicy.thresholds.waitingCriticalMin);
    setInServiceMaxMin(nextPolicy.thresholds.inServiceMaxMin);
    setAreaRows(toAreaRows(nextPolicy));
  };

  const saveSimple = () => {
    if (!canEdit) return;
    startTransition(async () => {
      try {
        validateSimple({ waitingWarningMin, waitingCriticalMin, inServiceMaxMin });
        const next = await actionSaveReceptionSlaSimple({
          siteId,
          applyToAllAreas,
          waitingWarningMin,
          waitingCriticalMin,
          inServiceMaxMin
        });
        setPolicy(next);
        setAreaRows(toAreaRows(next));
        setAudit(await actionListReceptionSlaAudit(siteId));
        setSuccess("Configuración simple guardada.");
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar configuración simple.");
      }
    });
  };

  const saveAdvanced = () => {
    if (!canAdvanced) return;
    startTransition(async () => {
      try {
        validateSimple({ waitingWarningMin, waitingCriticalMin, inServiceMaxMin });
        for (const row of areaRows) {
          validateSimple({
            waitingWarningMin: row.waitingWarningMin,
            waitingCriticalMin: row.waitingCriticalMin,
            inServiceMaxMin: row.inServiceMaxMin
          });
        }

        const next = await actionSaveReceptionSlaAdvanced({
          siteId,
          applyToAllAreas,
          waitingWarningMin,
          waitingCriticalMin,
          inServiceMaxMin,
          areaRows
        });
        setPolicy(next);
        setAudit(await actionListReceptionSlaAudit(siteId));
        setSuccess("Configuración avanzada guardada.");
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar configuración avanzada.");
      }
    });
  };

  const restoreRecommended = () => {
    if (!canEdit) return;
    startTransition(async () => {
      try {
        await actionRestoreReceptionSlaRecommended(siteId);
        await refreshFromServer();
        setSuccess("Se restauraron valores recomendados.");
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo restaurar configuración.");
      }
    });
  };

  const latestUpdatedLabel = useMemo(() => {
    if (!policy.updatedAt) return "Sin cambios guardados";
    const date = new Date(policy.updatedAt);
    return `Último cambio: ${date.toLocaleString("es-GT")}`;
  }, [policy.updatedAt]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Settings</p>
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              Timings SLA por sede
            </h2>
            <p className="mt-1 text-sm text-slate-600">Modo Simple por defecto y Modo Avanzado para supervisión.</p>
            <p className="mt-1 text-xs text-slate-500">{latestUpdatedLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreRecommended}
              disabled={!canEdit || isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                canEdit && !isPending ? "hover:border-[#4aadf5] hover:text-[#2e75ba]" : "cursor-not-allowed opacity-60"
              )}
            >
              <RotateCcw size={14} /> Restaurar recomendados
            </button>
            <button
              type="button"
              onClick={mode === "advanced" ? saveAdvanced : saveSimple}
              disabled={!canEdit || isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2",
                canEdit && !isPending ? "hover:bg-[#3f988f]" : "cursor-not-allowed opacity-60"
              )}
            >
              <Save size={14} /> Guardar
            </button>
          </div>
        </div>

        {!canEdit ? (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Perfil con acceso de lectura. Solo Supervisor/Admin con capability puede editar timings.
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("simple")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              mode === "simple" ? "border-[#2e75ba] bg-[#4aadf5]/10 text-[#2e75ba]" : "border-slate-200 bg-white text-slate-600"
            )}
          >
            Modo Simple
          </button>
          {canAdvanced ? (
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                mode === "advanced" ? "border-[#2e75ba] bg-[#4aadf5]/10 text-[#2e75ba]" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              Modo Avanzado
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-[#2e75ba]">Parámetros base</h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Espera warning (min)</label>
                <input
                  type="number"
                  min={RECEPTION_SLA_MIN}
                  max={RECEPTION_SLA_MAX}
                  value={waitingWarningMin}
                  disabled={!canEdit || isPending}
                  onChange={(e) => setWaitingWarningMin(Number(e.target.value || 0))}
                  className={fieldClasses(!canEdit || isPending)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Espera critical (min)</label>
                <input
                  type="number"
                  min={RECEPTION_SLA_MIN}
                  max={RECEPTION_SLA_MAX}
                  value={waitingCriticalMin}
                  disabled={!canEdit || isPending}
                  onChange={(e) => setWaitingCriticalMin(Number(e.target.value || 0))}
                  className={fieldClasses(!canEdit || isPending)}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500">Atención en curso (máximo min)</label>
                <input
                  type="number"
                  min={RECEPTION_SLA_MIN}
                  max={RECEPTION_SLA_MAX}
                  value={inServiceMaxMin}
                  disabled={!canEdit || isPending}
                  onChange={(e) => setInServiceMaxMin(Number(e.target.value || 0))}
                  className={fieldClasses(!canEdit || isPending)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={applyToAllAreas}
                disabled={!canEdit || isPending}
                onChange={(e) => setApplyToAllAreas(e.target.checked)}
              />
              Aplicar a todas las áreas
            </label>

            <p className="text-xs text-slate-500">
              Rango válido: {RECEPTION_SLA_MIN}–{RECEPTION_SLA_MAX} min. Critical debe ser mayor o igual a warning.
            </p>
          </div>

          {mode === "advanced" && canAdvanced ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-[#2e75ba]">Overrides por área</h3>
              <p className="mt-1 text-xs text-slate-500">Opcional por prioridad (MVP actual: nivel área).</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-[#f8fafc] text-[11px] uppercase tracking-[0.12em] text-[#2e75ba]">
                    <tr>
                      <th className="px-3 py-2 text-left">Área</th>
                      <th className="px-3 py-2 text-left">Warning</th>
                      <th className="px-3 py-2 text-left">Critical</th>
                      <th className="px-3 py-2 text-left">Atención max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaRows.map((row, idx) => (
                      <tr key={row.area} className={cn("border-t border-slate-100", idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                        <td className="px-3 py-2 text-slate-700">{RECEPTION_AREA_LABELS[row.area]}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={RECEPTION_SLA_MIN}
                            max={RECEPTION_SLA_MAX}
                            disabled={!canEdit || isPending}
                            value={row.waitingWarningMin}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setAreaRows((prev) => prev.map((it) => (it.area === row.area ? { ...it, waitingWarningMin: value } : it)));
                            }}
                            className={fieldClasses(!canEdit || isPending)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={RECEPTION_SLA_MIN}
                            max={RECEPTION_SLA_MAX}
                            disabled={!canEdit || isPending}
                            value={row.waitingCriticalMin}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setAreaRows((prev) => prev.map((it) => (it.area === row.area ? { ...it, waitingCriticalMin: value } : it)));
                            }}
                            className={fieldClasses(!canEdit || isPending)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={RECEPTION_SLA_MIN}
                            max={RECEPTION_SLA_MAX}
                            disabled={!canEdit || isPending}
                            value={row.inServiceMaxMin}
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setAreaRows((prev) => prev.map((it) => (it.area === row.area ? { ...it, inServiceMaxMin: value } : it)));
                            }}
                            className={fieldClasses(!canEdit || isPending)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-[#2e75ba]">Valores recomendados</h3>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Warning espera: {RECEPTION_SLA_RECOMMENDED.waitingWarningMin} min</p>
                <p>Critical espera: {RECEPTION_SLA_RECOMMENDED.waitingCriticalMin} min</p>
                <p>Atención en curso: {RECEPTION_SLA_RECOMMENDED.inServiceMaxMin} min</p>
              </div>
            </div>
          )}
        </div>

        {success ? <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}
        {error ? <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      </div>

      <div className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2e75ba]">Historial de cambios</h3>
        <div className="mt-3 space-y-2">
          {audit.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
              Sin cambios auditados todavía.
            </div>
          ) : (
            audit.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{row.action}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(row.timestamp).toLocaleString("es-GT")} · {row.actorName ?? "Sistema"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#4aadf5]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2e75ba]">
                    {typeof row.metadata === "object" && row.metadata && "mode" in row.metadata
                      ? String((row.metadata as { mode?: string }).mode)
                      : "update"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
