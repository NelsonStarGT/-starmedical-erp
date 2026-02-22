"use client";

import { cn } from "@/lib/utils";
import AdminDiagnosticActionsMenu from "./AdminDiagnosticActionsMenu";
import type { AdminDiagnosticRow, DiagnosticAcceptance, DiagnosticOrderStatus, DiagnosticOrderType } from "./types";

function typePill(type: DiagnosticOrderType) {
  switch (type) {
    case "LAB":
      return "border-[#2e75ba]/25 bg-[#2e75ba]/10 text-[#2e75ba]";
    case "RX":
      return "border-slate-200 bg-slate-50 text-slate-800";
    case "USG":
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

function acceptanceLabel(a: DiagnosticAcceptance) {
  return a === "accepted" ? "Aceptó" : "No aceptó";
}

function acceptancePill(a: DiagnosticAcceptance) {
  return a === "accepted"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-rose-200 bg-rose-50 text-rose-900";
}

function statusLabel(status: DiagnosticOrderStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "in_progress":
      return "En proceso";
    case "ready":
      return "Resultados listos";
  }
}

function statusPill(status: DiagnosticOrderStatus) {
  switch (status) {
    case "ready":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

export default function AdminDiagnosticTable({
  rows,
  showDoctor,
  onInterpret,
  onAction,
  isReviewed,
  onToggleReviewed
}: {
  rows: AdminDiagnosticRow[];
  showDoctor: boolean;
  onInterpret: (row: AdminDiagnosticRow) => void;
  onAction: (actionKey: string, row: AdminDiagnosticRow) => void;
  isReviewed: (row: AdminDiagnosticRow) => boolean;
  onToggleReviewed: (row: AdminDiagnosticRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-[#2e75ba] text-white">
          <tr>
            <th className="w-[84px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Hora</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Examen</th>
            <th className="w-[120px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tipo</th>
            <th className="w-[150px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Aceptación</th>
            <th className="w-[170px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
            <th className="w-[270px] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                Sin registros para este filtro.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const notAccepted = row.acceptance === "rejected";
              const zebra = idx % 2 === 1 ? "bg-[#f8fafc]" : "bg-white";
              const rowBg = notAccepted ? "bg-rose-50/60" : zebra;
              const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
              return (
                <tr key={row.id} className={cn(rowBg)}>
                  <td className="px-3 py-3 align-top">
                    <div className="font-semibold text-slate-900">{row.time}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{row.date}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-[220px]">
                      <div className="font-semibold text-slate-900">{patientName || "Paciente"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>ID {row.patient.id}</span>
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
                    <div className="min-w-[240px]">
                      <div className="text-sm font-semibold text-slate-900">{row.examName}</div>
                      <div className="mt-1 text-[11px] text-slate-500">Orden: <span className="font-mono">{row.orderId}</span></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", typePill(row.type))}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", acceptancePill(row.acceptance))}>
                      {acceptanceLabel(row.acceptance)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", statusPill(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                    {isReviewed(row) ? (
                      <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                        Revisado
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onInterpret(row)}
                        className="rounded-full bg-diagnostics-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
                      >
                        Interpretar
                      </button>
                      <AdminDiagnosticActionsMenu
                        row={row}
                        reviewed={isReviewed(row)}
                        onToggleReviewed={onToggleReviewed}
                        onAction={onAction}
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
