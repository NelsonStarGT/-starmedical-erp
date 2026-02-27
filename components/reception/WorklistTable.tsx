"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  MoreHorizontal,
  PauseCircle,
  PhoneCall,
  Play,
  PlayCircle,
  Search,
  Shuffle,
  SkipForward
} from "lucide-react";
import type { ReceptionWorklistItem, WorklistFilters } from "@/lib/reception/dashboard.types";
import type { ReceptionCapability } from "@/lib/reception/permissions";
import {
  PRIORITY_LABELS,
  QUEUE_STATUS_LABELS,
  RECEPTION_AREA_LABELS,
  VISIT_STATUS_LABELS,
  type ReceptionArea,
  type ReceptionPriority
} from "@/lib/reception/constants";
import { AreaPills } from "@/components/reception/AreaPills";
import { ActionButton } from "@/components/reception/ActionButtons";
import { ReasonModal } from "@/components/reception/ReasonModal";
import VitalsWizardModal from "@/components/reception/VitalsWizardModal";
import { usePolling } from "@/lib/reception/ui-polling";
import { actionEnqueueVisit, actionGetReceptionWorklist } from "@/app/admin/reception/actions";
import { cn } from "@/lib/utils";
import { useQueueActions } from "@/lib/reception/useQueueActions";
import { useQueuePermissions } from "@/lib/reception/useQueuePermissions";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";

type Props = {
  siteId: string;
  initialItems: ReceptionWorklistItem[];
  initialNextByArea: Record<string, string | null>;
  capabilities: ReceptionCapability[];
  mode?: "default" | "companies";
};

const ACTIVE_STATUS_OPTIONS = [
  "ARRIVED",
  "CHECKED_IN",
  "IN_QUEUE",
  "CALLED",
  "IN_SERVICE",
  "IN_DIAGNOSTIC",
  "READY_FOR_DISCHARGE",
  "ON_HOLD"
] as const;

const PRIORITY_OPTIONS: ReceptionPriority[] = ["URGENT", "COMPANY", "PREFERENTIAL", "NORMAL"];

function getSlaConfig(state: ReceptionWorklistItem["slaState"]) {
  if (state === "critical") {
    return { label: "Crítico", tone: "bg-rose-100 text-rose-700" };
  }
  if (state === "warning") {
    return { label: "Warning", tone: "bg-amber-100 text-amber-700" };
  }
  return { label: "OK", tone: "bg-[#4aa59c]/10 text-[#2e75ba]" };
}

function nextActionClasses(kind: "primary" | "warning" | "critical" | "neutral") {
  if (kind === "critical") {
    return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
  }
  if (kind === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
  }
  if (kind === "primary") {
    return "border-[#4aa59c]/40 bg-[#4aa59c]/10 text-[#2e75ba] hover:bg-[#4aa59c]/20";
  }
  return "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]";
}

export function WorklistTable({ siteId, initialItems, initialNextByArea, capabilities, mode = "default" }: Props) {
  const [items, setItems] = useState(initialItems);
  const [nextByArea, setNextByArea] = useState<Record<string, string | null>>(initialNextByArea);
  const [filters, setFilters] = useState<WorklistFilters>(() =>
    mode === "companies"
      ? {
          companyOnly: true
        }
      : {}
  );
  const [searchText, setSearchText] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [minMinutes, setMinMinutes] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitalsTarget, setVitalsTarget] = useState<ReceptionWorklistItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;
  const [isEnqueuePending, startEnqueueTransition] = useTransition();

  useEffect(() => {
    if (mode !== "companies") return;
    setFilters((prev) => ({ ...prev, companyOnly: true }));
  }, [mode]);

  useEffect(() => {
    const focusSearch = () => searchInputRef.current?.focus();
    window.addEventListener("reception:focus-search", focusSearch as EventListener);
    return () => window.removeEventListener("reception:focus-search", focusSearch as EventListener);
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!effectiveSiteId) {
        setError("Selecciona una sede activa para operar.");
        return;
      }
      const data = await actionGetReceptionWorklist({
        siteId: effectiveSiteId,
        filters: {
          ...filters,
          companyOnly: mode === "companies" ? true : filters.companyOnly,
          minMinutesInState: minMinutes ? Number(minMinutes) : undefined
        }
      });
      setItems(data.items);
      setNextByArea(data.nextQueueItemByArea);
      setError(null);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar la lista operativa.");
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveSiteId, filters, minMinutes, mode]);

  const permissions = useQueuePermissions(capabilities);
  const {
    isPending,
    callNext,
    startService,
    complete,
    resumeService,
    requestPause,
    requestSkip,
    requestTransfer,
    reasonModal
  } = useQueueActions({
    siteId: effectiveSiteId,
    onAfter: refresh,
    onError: (message) => setError(message)
  });
  const isBusy = isPending || isEnqueuePending;

  usePolling({ intervalMs: 10000, onTick: refresh });

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 300);
    return () => clearTimeout(timer);
  }, [refresh]);

  const handleEnqueue = (row: ReceptionWorklistItem) => {
    if (!permissions.canEnqueue || !effectiveSiteId) return;
    startEnqueueTransition(async () => {
      try {
        await actionEnqueueVisit({
          visitId: row.visitId,
          siteId: effectiveSiteId,
          area: row.areaActual,
          priorityOverride: row.prioridad
        });
        await refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo encolar.");
      }
    });
  };

  const handleQueueAction = (
    action: "pause" | "resume" | "start" | "complete" | "skip" | "transfer",
    queueItemId?: string | null,
    areaActual?: ReceptionArea | null
  ) => {
    if (!queueItemId) return;
    if (action === "pause") return requestPause(queueItemId, areaActual ?? null);
    if (action === "skip") return requestSkip(queueItemId, areaActual ?? null);
    if (action === "transfer") return requestTransfer(queueItemId, areaActual ?? null);
    if (action === "resume") return resumeService(queueItemId);
    if (action === "start") return startService(queueItemId);
    if (action === "complete") return complete(queueItemId);
  };

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of items) {
      if (!row.companyId || !row.companyName) continue;
      map.set(row.companyId, row.companyName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [items]);

  const visibleCompanyOptions = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return companyOptions;
    return companyOptions.filter((row) => row.name.toLowerCase().includes(q));
  }, [companyOptions, companySearch]);

  const filteredItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const fields = [
        row.ticketCode,
        row.patientDisplayName,
        row.companyName,
        row.convenioPlan,
        row.authorizationStatus
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return fields.includes(q);
    });
  }, [items, searchText]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#dce7f5] bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Recepción</p>
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
              {mode === "companies" ? "Empresas" : "Lista operativa"}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === "companies"
                ? "Vista operativa de pacientes con empresa/convenio en llegada."
                : "Vista única de pacientes activos con SLA, signos y siguiente acción."}
            </p>
          </div>
          <span className={cn("text-xs text-slate-500", isRefreshing && "text-[#4aa59c]")}>{isRefreshing ? "Actualizando..." : "Actualizado"}</span>
        </div>

        <div className="mt-4 space-y-3">
          <AreaPills
            allowAll
            value={filters.area ?? null}
            onChange={(area) => setFilters((prev) => ({ ...prev, area: area ?? undefined }))}
          />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_1fr_0.9fr]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por ticket, paciente o empresa"
                aria-label="Buscar en lista operativa"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-9 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </div>

            <select
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value ? (e.target.value as WorklistFilters["status"]) : undefined
                }))
              }
              aria-label="Filtrar por estado"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              <option value="">Estado (todos)</option>
              {ACTIVE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {VISIT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <select
              value={filters.priority ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: e.target.value ? (e.target.value as WorklistFilters["priority"]) : undefined
                }))
              }
              aria-label="Filtrar por prioridad"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              <option value="">Prioridad (todas)</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
              placeholder="> minutos en estado"
              aria-label="Filtrar por minutos en estado"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            />
          </div>

          {mode === "companies" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Buscar empresa"
                aria-label="Buscar empresa"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
              <select
                value={filters.companyClientId ?? ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    companyOnly: true,
                    companyClientId: e.target.value || undefined
                  }))
                }
                aria-label="Filtrar por empresa"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              >
                <option value="">Empresa (todas)</option>
                {visibleCompanyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(filters.onlyPendingAuthorization)}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      companyOnly: true,
                      onlyPendingAuthorization: e.target.checked || undefined
                    }))
                  }
                />
                Solo pendientes autorización
              </label>
            </div>
          )}
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-sm">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.15em] text-[#2e75ba]">
              <tr>
                <th className="px-4 py-3 text-left">Ticket</th>
                <th className="px-4 py-3 text-left">Paciente</th>
                {mode === "companies" ? <th className="px-4 py-3 text-left">Empresa</th> : null}
                {mode === "companies" ? <th className="px-4 py-3 text-left">Convenio/Plan</th> : null}
                {mode === "companies" ? <th className="px-4 py-3 text-left">Autorización</th> : null}
                <th className="px-4 py-3 text-left">Área</th>
                <th className="px-4 py-3 text-left">Visita</th>
                <th className="px-4 py-3 text-left">Cola</th>
                <th className="px-4 py-3 text-left">Prioridad</th>
                <th className="px-4 py-3 text-left">Signos</th>
                <th className="px-4 py-3 text-left">SLA</th>
                <th className="px-4 py-3 text-left">Min</th>
                <th className="px-4 py-3 text-left">Siguiente acción</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={mode === "companies" ? 14 : 11} className="px-4 py-6 text-center text-sm text-slate-500">
                    Sin visitas activas para los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, idx) => {
                  const isNext = row.queueItemId && row.areaActual ? nextByArea[row.areaActual] === row.queueItemId : false;

                  const primaryAction = (() => {
                    if (!row.estadoCola && permissions.canEnqueue) {
                      return {
                        label: "Encolar",
                        icon: <Play size={14} />,
                        variant: "primary" as const,
                        onClick: () => handleEnqueue(row)
                      };
                    }
                    if (row.estadoCola === "WAITING" && isNext && permissions.canCallNext) {
                      return {
                        label: "Llamar",
                        icon: <PhoneCall size={14} />,
                        variant: "secondary" as const,
                        onClick: () => callNext(row.areaActual)
                      };
                    }
                    if (row.estadoCola === "CALLED" && permissions.canStart) {
                      return {
                        label: "Iniciar",
                        icon: <Play size={14} />,
                        variant: "primary" as const,
                        onClick: () => handleQueueAction("start", row.queueItemId, row.areaActual)
                      };
                    }
                    if (row.estadoCola === "IN_SERVICE" && permissions.canComplete) {
                      return {
                        label: "Finalizar",
                        icon: <CheckCircle2 size={14} />,
                        variant: "primary" as const,
                        onClick: () => handleQueueAction("complete", row.queueItemId, row.areaActual)
                      };
                    }
                    if (row.estadoCola === "PAUSED" && permissions.canPauseResume) {
                      return {
                        label: "Reanudar",
                        icon: <PlayCircle size={14} />,
                        variant: "secondary" as const,
                        onClick: () => handleQueueAction("resume", row.queueItemId, row.areaActual)
                      };
                    }
                    return null;
                  })();

                  const secondaryActions = [
                    row.estadoCola && permissions.canTransfer
                      ? {
                          label: "Transferir",
                          action: () => handleQueueAction("transfer", row.queueItemId, row.areaActual),
                          icon: <Shuffle size={14} />
                        }
                      : null,
                    row.estadoCola === "IN_SERVICE" && permissions.canPauseResume
                      ? {
                          label: "Pausar",
                          action: () => handleQueueAction("pause", row.queueItemId, row.areaActual),
                          icon: <PauseCircle size={14} />
                        }
                      : null,
                    (row.estadoCola === "WAITING" || row.estadoCola === "CALLED") && permissions.canSkip
                      ? {
                          label: "Omitir",
                          action: () => handleQueueAction("skip", row.queueItemId, row.areaActual),
                          icon: <SkipForward size={14} />
                        }
                      : null
                  ].filter(Boolean) as Array<{ label: string; action: () => void; icon: JSX.Element }>;

                  const sla = getSlaConfig(row.slaState);

                  const nextActionControl = (() => {
                    if (row.nextAction === "Registrar signos") {
                      return (
                        <button
                          type="button"
                          onClick={() => setVitalsTarget(row)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            nextActionClasses("primary"),
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2"
                          )}
                        >
                          Registrar signos
                        </button>
                      );
                    }

                    if (row.nextAction === "Llamar" && permissions.canCallNext) {
                      return (
                        <button
                          type="button"
                          onClick={() => callNext(row.areaActual)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            nextActionClasses("critical"),
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c] focus-visible:ring-offset-2"
                          )}
                        >
                          Llamar
                        </button>
                      );
                    }

                    return <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{row.nextAction}</span>;
                  })();

                  return (
                    <tr key={row.visitId} className={cn("border-t border-slate-100", idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                      <td className="px-4 py-3 font-semibold text-[#2e75ba]">{row.ticketCode ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.patientDisplayName}</td>
                      {mode === "companies" ? <td className="px-4 py-3 text-slate-700">{row.companyName ?? "—"}</td> : null}
                      {mode === "companies" ? <td className="px-4 py-3 text-slate-700">{row.convenioPlan ?? "—"}</td> : null}
                      {mode === "companies" ? (
                        <td className="px-4 py-3 text-slate-700">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {row.authorizationStatus ?? "—"}
                          </span>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-slate-700">{RECEPTION_AREA_LABELS[row.areaActual] || row.areaActual}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[#4aadf5]/10 px-2 py-1 text-xs font-semibold text-[#2e75ba]">
                          {VISIT_STATUS_LABELS[row.estadoVisita] ?? row.estadoVisita}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {row.estadoCola ? QUEUE_STATUS_LABELS[row.estadoCola] ?? row.estadoCola : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{PRIORITY_LABELS[row.prioridad] ?? row.prioridad}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                            row.vitalsStatus === "COMPLETE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {row.vitalsStatus === "COMPLETE" ? "Completos" : "Pendientes"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-semibold", sla.tone)}>{sla.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.tiempoEnEstado}</td>
                      <td className="px-4 py-3">{nextActionControl}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/recepcion/visit/${row.visitId}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                          >
                            Detalle <ArrowUpRight size={14} />
                          </Link>

                          {primaryAction ? (
                            <ActionButton
                              label={primaryAction.label}
                              icon={primaryAction.icon}
                              variant={primaryAction.variant}
                              disabled={isBusy}
                              onClick={primaryAction.onClick}
                            />
                          ) : null}

                          {secondaryActions.length > 0 ? (
                            <details className="relative">
                              <summary className="flex cursor-pointer list-none items-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 hover:border-[#4aadf5] hover:text-[#2e75ba]">
                                <MoreHorizontal size={14} />
                              </summary>
                              <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                                {secondaryActions.map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    disabled={isBusy}
                                    onClick={action.action}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#f8fafc] hover:text-[#2e75ba]"
                                  >
                                    {action.icon}
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReasonModal
        open={reasonModal.open}
        onClose={reasonModal.onClose}
        title={reasonModal.title}
        subtitle={reasonModal.subtitle}
        description={reasonModal.description}
        fields={reasonModal.fields}
        placeholder={reasonModal.placeholder}
        confirmLabel={reasonModal.confirmLabel}
        isPending={isPending}
        onConfirm={reasonModal.onConfirm}
      />

      <VitalsWizardModal
        open={Boolean(vitalsTarget)}
        onClose={() => setVitalsTarget(null)}
        target={
          vitalsTarget
            ? {
                mode: "visit",
                visitId: vitalsTarget.visitId,
                siteId: effectiveSiteId,
                patientLabel: vitalsTarget.patientDisplayName,
                ticketCode: vitalsTarget.ticketCode
              }
            : null
        }
        autoCloseOnSave
        onSaved={refresh}
      />
    </section>
  );
}
