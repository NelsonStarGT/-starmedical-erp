"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { SoapNoteValue } from "./types";

function fieldClasses(readOnly: boolean) {
  return cn(
    "min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition",
    readOnly ? "bg-slate-50" : "bg-white focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
  );
}

export default function SoapNote({
  value,
  onChange,
  readOnly
}: {
  value: SoapNoteValue;
  onChange: (next: SoapNoteValue) => void;
  readOnly: boolean;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">Nota clínica (SOAP)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">S — Subjetivo</label>
          <textarea
            value={value.subjective}
            onChange={(e) => onChange({ ...value, subjective: e.target.value })}
            className={fieldClasses(readOnly)}
            disabled={readOnly}
            placeholder="Síntomas, antecedentes relevantes, contexto."
          />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">O — Objetivo</label>
          <textarea
            value={value.objective}
            onChange={(e) => onChange({ ...value, objective: e.target.value })}
            className={fieldClasses(readOnly)}
            disabled={readOnly}
            placeholder="Signos vitales, examen físico, hallazgos."
          />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">A — Análisis</label>
          <textarea
            value={value.assessment}
            onChange={(e) => onChange({ ...value, assessment: e.target.value })}
            className={fieldClasses(readOnly)}
            disabled={readOnly}
            placeholder="Impresión diagnóstica, razonamiento clínico."
          />
        </div>
        <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-3 text-xs text-slate-600">
          La nota final queda bloqueada al cerrar/firma. Follow-ups posteriores son append-only.
        </div>
      </CardContent>
    </Card>
  );
}

