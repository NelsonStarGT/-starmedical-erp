"use client";

import { cn } from "@/lib/utils";
import RowActionsMenu from "@/components/medical/agenda/RowActionsMenu";
import type { MedicalPersona, WorklistRow } from "./types";
import { useCallback, useMemo, useState } from "react";

const OVERDUE_MIN = 20;

function isActiveStatusForDelay(status: WorklistRow["status"]) {
  return status === "waiting" || status === "triage" || status === "ready" || status === "in_consult";
}

function statusLabel(status: WorklistRow["status"]) {
  switch (status) {
    case "waiting":
      return "En espera";
    case "triage":
      return "En triage";
    case "ready":
      return "Listo";
    case "in_consult":
      return "En consulta";
    case "done":
      return "Finalizado";
    case "rescheduled":
      return "Reprogramado";
    case "no_show":
      return "No-show";
    case "canceled":
      return "Cancelado";
  }
}

function statusPillClasses(status: WorklistRow["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "in_consult":
      return "border-indigo-200 bg-indigo-50 text-indigo-900";
    case "done":
      return "border-slate-200 bg-slate-50 text-slate-800";
    case "triage":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "rescheduled":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "no_show":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "canceled":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function triageLabel(status: WorklistRow["triageStatus"]) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "in_progress":
      return "En curso";
    case "ready":
      return "Listo";
    case "not_required":
      return "No requerido";
  }
}

function triagePillClasses(status: WorklistRow["triageStatus"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "not_required":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

export default function WorklistTable({
  rows,
  persona,
  showDoctor,
  onAction,
  onQuickHistory
}: {
  rows: WorklistRow[];
  persona: MedicalPersona;
  showDoctor: boolean;
  onAction: (actionKey: string, row: WorklistRow) => void;
  onQuickHistory: (row: WorklistRow) => void;
}) {
  const [reviewedRowIds, setReviewedRowIds] = useState<string[]>([]);
  const reviewedSet = useMemo(() => new Set(reviewedRowIds), [reviewedRowIds]);

  const isReviewed = useCallback((row: WorklistRow) => reviewedSet.has(row.id), [reviewedSet]);

  const toggleReviewed = useCallback((row: WorklistRow) => {
    setReviewedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return Array.from(next);
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-[#2e75ba] text-white">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Ticket</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Triage</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Espera</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">DX/Resultados</th>
            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                Sin pacientes para este filtro.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const overdue = isActiveStatusForDelay(row.status) && row.waitMin >= OVERDUE_MIN;
              return (
                <tr key={row.queueItemId} className={cn(idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold text-slate-900">{row.ticketCode}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.time}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{row.patient.name}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {row.patient.age} · {row.patient.sex}
                        </span>
                        {overdue && (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                            Atrasado
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{row.patient.phone || "—"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{row.specialty}</span>
                        {showDoctor && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{row.doctor.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", statusPillClasses(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", triagePillClasses(row.triageStatus))}>
                      {triageLabel(row.triageStatus)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className={cn("font-semibold", overdue ? "text-rose-700" : "text-slate-800")}>
                      {row.waitMin} min
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.checkedIn ? "Check-in" : "Sin check-in"}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          row.diagnostic.pending ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                      >
                        DX {row.diagnostic.pending ? "pendiente" : "ok"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          row.diagnostic.resultsReady ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200 bg-slate-50 text-slate-700"
                        )}
                      >
                        Resultados {row.diagnostic.resultsReady ? "listos" : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="inline-flex justify-end">
                      <RowActionsMenu
                        row={row}
                        persona={persona}
                        reviewed={isReviewed(row)}
                        onAction={(key, r) => onAction(key, r as WorklistRow)}
                        onQuickHistory={(r) => onQuickHistory(r as WorklistRow)}
                        onToggleReviewed={(r) => toggleReviewed(r as WorklistRow)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
