"use client";

import { cn } from "@/lib/utils";
import type { AgendaRow, MedicalPersona } from "./types";
import RowActionsMenu from "./RowActionsMenu";

function statusLabel(status: AgendaRow["status"]) {
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
    case "no_show":
      return "No-show";
    case "canceled":
      return "Cancelado";
    case "rescheduled":
      return "Reprogramado";
  }
}

function statusPillClasses(status: AgendaRow["status"]) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "in_consult":
      return "border-indigo-200 bg-indigo-50 text-indigo-900";
    case "done":
      return "border-slate-200 bg-slate-50 text-slate-800";
    case "triage":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "no_show":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "canceled":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "rescheduled":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function triageLabel(status: AgendaRow["triageStatus"]) {
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

function triagePillClasses(status: AgendaRow["triageStatus"]) {
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

function priorityPill(priority: AgendaRow["priority"]) {
  switch (priority) {
    case "Alta":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "Media":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "Baja":
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

export default function AgendaTable({
  rows,
  persona,
  showDoctorInSpecialty,
  isReviewed,
  onToggleReviewed,
  onAction,
  onQuickHistory
}: {
  rows: AgendaRow[];
  persona: MedicalPersona;
  showDoctorInSpecialty: boolean;
  isReviewed: (row: AgendaRow) => boolean;
  onToggleReviewed: (row: AgendaRow) => void;
  onAction: (actionKey: string, row: AgendaRow) => void;
  onQuickHistory: (row: AgendaRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-[#2e75ba] text-white">
          <tr>
            <th className="w-[92px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Hora</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
            <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Edad/Sexo</th>
            <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Teléfono</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Servicio</th>
            <th className="w-[150px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
            <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Triage</th>
            <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Espera (min)</th>
            <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">DX/Resultados</th>
            <th className="w-[150px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                Sin pacientes programados para este filtro.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id} className={cn(idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-slate-900">{row.time}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{row.patient.name}</span>
                      <span
                        className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", priorityPill(row.priority))}
                      >
                        {row.priority}
                      </span>
                      {isReviewed(row) ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                          Revisado
                        </span>
                      ) : null}
                      {!row.checkedIn && (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Sin check-in
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">ID {row.patient.id}</div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="text-sm text-slate-800">
                    <div className="font-semibold">{row.patient.age}</div>
                    <div className="text-xs text-slate-500">{row.patient.sex}</div>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="text-sm text-slate-700">{row.patient.phone || "—"}</span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="min-w-[190px]">
                    <div className="font-semibold text-slate-900">{row.specialty}</div>
                    {showDoctorInSpecialty && <div className="mt-1 text-xs text-slate-500">{row.doctor.name}</div>}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      statusPillClasses(row.status)
                    )}
                  >
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                      triagePillClasses(row.triageStatus)
                    )}
                  >
                    {triageLabel(row.triageStatus)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={cn("font-semibold", row.waitMin >= 20 ? "text-rose-700" : "text-slate-800")}>
                    {row.waitMin}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        row.diagnostic.pending
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      )}
                    >
                      DX {row.diagnostic.pending ? "pendiente" : "ok"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        row.diagnostic.resultsReady
                          ? "border-sky-200 bg-sky-50 text-sky-900"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      )}
                    >
                      Resultados {row.diagnostic.resultsReady ? "listos" : "—"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        row.diagnostic.principalDxSelected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      DX principal {row.diagnostic.principalDxSelected ? "sí" : "no"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <div className="inline-flex justify-end">
                    <RowActionsMenu
                      row={row}
                      persona={persona}
                      reviewed={isReviewed(row)}
                      onAction={onAction}
                      onQuickHistory={onQuickHistory}
                      onToggleReviewed={onToggleReviewed}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
