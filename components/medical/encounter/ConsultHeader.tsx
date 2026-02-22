"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CoverageType, EncounterPatient, EncounterStatus } from "./types";

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return "PA";
  return words.map((word) => word[0] || "").join("").toUpperCase();
}

function statusLabel(status: EncounterStatus) {
  if (status === "closed") return "Cerrada";
  if (status === "open") return "En consulta";
  return "Borrador";
}

function statusPill(status: EncounterStatus) {
  if (status === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "open") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function coverageLabel(type: CoverageType) {
  switch (type) {
    case "particular":
      return "Particular";
    case "empresa":
      return "Empresa";
    case "institucion":
      return "Institución";
    case "aseguradora":
      return "Aseguradora";
  }
}

function coveragePill(type: CoverageType) {
  switch (type) {
    case "particular":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "empresa":
      return "border-indigo-200 bg-indigo-50 text-indigo-900";
    case "institucion":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "aseguradora":
      return "border-sky-200 bg-sky-50 text-sky-900";
  }
}

export default function ConsultHeader({
  patient,
  status,
  canClose,
  readOnly,
  onSaveDraft,
  onCloseAndSign,
  onExportPdf
}: {
  patient: EncounterPatient;
  status: EncounterStatus;
  canClose: boolean;
  readOnly: boolean;
  onSaveDraft: () => void;
  onCloseAndSign: () => void;
  onExportPdf?: () => void;
}) {
  return (
    <header className="sticky top-2 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-soft backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-3">
            {patient.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={patient.photoUrl}
                alt={patient.name}
                className="h-11 w-11 rounded-xl border border-slate-200 bg-slate-100 object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                {initials(patient.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-diagnostics-primary">Consulta médica</p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-slate-900">{patient.name}</h1>
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusPill(status))}>
                  {statusLabel(status)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>
                  {patient.age} años · {patient.sex}
                </span>
                <span className="text-slate-300">•</span>
                <span>Expediente {patient.recordNumber}</span>
                <span className="text-slate-300">•</span>
                <span className={cn("rounded-full border px-2 py-0.5 font-semibold", coveragePill(patient.coverageType))}>
                  {coverageLabel(patient.coverageType)}
                </span>
                <span className="text-slate-700">{patient.coverageEntity || "Sin entidad asociada"}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-[0.2em] text-rose-600">Alergias</span>
            {patient.alerts.length > 0 ? (
              patient.alerts.map((alert) => (
                <span key={alert} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-800">
                  {alert}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">Sin alertas</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={readOnly}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
              readOnly ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
            )}
          >
            Guardar borrador
          </button>
          {onExportPdf ? (
            <button
              type="button"
              onClick={onExportPdf}
              className="rounded-xl border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#4aa59c]/20"
            >
              Exportar PDF
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCloseAndSign}
            disabled={readOnly || !canClose}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
              readOnly || !canClose ? "cursor-not-allowed bg-slate-300" : "bg-rose-600 hover:bg-rose-700"
            )}
          >
            Cerrar y firmar
          </button>
          <Link
            href="/modulo-medico/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Volver al ERP
          </Link>
        </div>
      </div>
    </header>
  );
}
