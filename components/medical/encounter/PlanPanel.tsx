"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { EncounterPlanValue } from "./types";

function fieldClasses(readOnly: boolean, minH: string) {
  return cn(
    `w-full ${minH} rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition`,
    readOnly ? "bg-slate-50" : "bg-white focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
  );
}

export default function PlanPanel({
  value,
  onChange,
  readOnly
}: {
  value: EncounterPlanValue;
  onChange: (next: EncounterPlanValue) => void;
  readOnly: boolean;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">Plan (P)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Plan terapéutico</label>
          <textarea
            value={value.treatmentPlan}
            onChange={(e) => onChange({ ...value, treatmentPlan: e.target.value })}
            className={fieldClasses(readOnly, "min-h-[90px]")}
            disabled={readOnly}
            placeholder="Conducta, estudios, seguimiento."
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Medicaciones</label>
          <textarea
            value={value.medications}
            onChange={(e) => onChange({ ...value, medications: e.target.value })}
            className={fieldClasses(readOnly, "min-h-[90px]")}
            disabled={readOnly}
            placeholder="Nombre · dosis · frecuencia · duración"
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Indicaciones</label>
          <textarea
            value={value.instructions}
            onChange={(e) => onChange({ ...value, instructions: e.target.value })}
            className={fieldClasses(readOnly, "min-h-[90px]")}
            disabled={readOnly}
            placeholder="Signos de alarma, control, educación."
          />
        </div>
      </CardContent>
    </Card>
  );
}

