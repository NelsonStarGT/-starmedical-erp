"use client";

import { cn } from "@/lib/utils";
import AdminPatientsActionsMenu from "./AdminPatientsActionsMenu";
import type { AdminPatientRow, ClientKind } from "./types";

function statusLabel(status: AdminPatientRow["status"]) {
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

function statusPillClasses(status: AdminPatientRow["status"]) {
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

function kindLabel(kind: ClientKind) {
  switch (kind) {
    case "particular":
      return "Particular";
    case "empresa":
      return "Empresa";
    case "institucion":
      return "Institución";
  }
}

function kindPillClasses(kind: ClientKind) {
  switch (kind) {
    case "empresa":
      return "border-[#2e75ba]/25 bg-[#2e75ba]/10 text-[#2e75ba]";
    case "institucion":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

export default function AdminPatientsTable({
  rows,
  showDoctor,
  onEnterEncounter,
  onAction
}: {
  rows: AdminPatientRow[];
  showDoctor: boolean;
  onEnterEncounter: (row: AdminPatientRow) => void;
  onAction: (actionKey: string, row: AdminPatientRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-[#2e75ba] text-white">
          <tr>
            <th className="w-[72px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">#</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Motivo (Recepción)</th>
            <th className="w-[170px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Cliente</th>
            <th className="w-[150px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
            <th className="w-[260px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                Sin pacientes para este filtro.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const num = pad2(idx);
              const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
              return (
                <tr key={row.id} className={cn(idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white")}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-mono text-xs font-semibold text-slate-700">{num}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{row.time}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-[240px]">
                      <div className="font-semibold text-slate-900">{patientName || "Paciente"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>ID {row.patient.id}</span>
                        {row.patient.phone ? (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{row.patient.phone}</span>
                          </>
                        ) : null}
                        {showDoctor ? (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-semibold text-slate-600">{row.doctor.name}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="max-w-[520px]">
                      <div className="text-sm text-slate-700">{row.receptionReason || "—"}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Solo lectura · capturado en Recepción
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", kindPillClasses(row.clientKind))}>
                      {kindLabel(row.clientKind)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", statusPillClasses(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEnterEncounter(row)}
                        className="rounded-full bg-diagnostics-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                      >
                        Entrar a cita
                      </button>
                      <AdminPatientsActionsMenu row={row} onAction={onAction} />
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
