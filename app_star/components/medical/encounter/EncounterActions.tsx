"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { EncounterStatus } from "./types";

function statusPill(status: EncounterStatus) {
  if (status === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "open") return "border-sky-200 bg-sky-50 text-sky-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function statusLabel(status: EncounterStatus) {
  if (status === "closed") return "Cerrado";
  if (status === "open") return "Abierto";
  return "Borrador";
}

export default function EncounterActions({
  status,
  canClose,
  onSaveDraft,
  onCloseAndSign,
  onAddFollowUp,
  onGoDiagnostics
}: {
  status: EncounterStatus;
  canClose: boolean;
  onSaveDraft: () => void;
  onCloseAndSign: () => void;
  onAddFollowUp: () => void;
  onGoDiagnostics?: () => void;
}) {
  const readOnly = status === "closed";

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">Acciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estado</span>
          <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", statusPill(status))}>
            {statusLabel(status)}
          </span>
        </div>

        {readOnly && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            Consulta cerrada: lectura únicamente.
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={readOnly}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
              readOnly
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            )}
          >
            Guardar borrador
          </button>

          <button
            type="button"
            onClick={onCloseAndSign}
            disabled={readOnly || !canClose}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
              readOnly || !canClose
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-diagnostics-primary text-white hover:opacity-90"
            )}
          >
            Cerrar / Firmar
          </button>

          {!canClose && !readOnly && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Requiere diagnóstico principal para cerrar.
            </div>
          )}
        </div>

        {onGoDiagnostics ? (
          <button
            type="button"
            onClick={onGoDiagnostics}
            className={cn(
              "w-full rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
              "border-[#4aadf533] bg-[#4aadf5]/10 text-[#2e75ba] hover:bg-[#4aadf5]/15"
            )}
          >
            Ir a Diagnóstico clínico
          </button>
        ) : null}

        {readOnly && (
          <button
            type="button"
            onClick={onAddFollowUp}
            className="rounded-xl bg-diagnostics-corporate px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            Agregar seguimiento
          </button>
        )}

        <div className="text-[11px] text-slate-500">
          TODO: conectar guardado/cierre a APIs reales (Encounter + auditoría). Órdenes se operan en Diagnóstico clínico.
        </div>
      </CardContent>
    </Card>
  );
}
