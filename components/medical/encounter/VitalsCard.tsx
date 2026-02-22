"use client";

import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { EncounterVitals } from "./types";
import { calculateBodyMassIndex } from "@/lib/medical/clinical";

function fieldClasses(readOnly: boolean) {
  return cn(
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    readOnly ? "bg-slate-50" : "bg-white focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
  );
}

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export default function VitalsCard({
  value,
  onChange,
  readOnly
}: {
  value: EncounterVitals;
  onChange: (next: EncounterVitals) => void;
  readOnly: boolean;
}) {
  const computedBodyMassIndex = useMemo(
    () => calculateBodyMassIndex(value.weightKg, value.heightCm),
    [value.heightCm, value.weightKg]
  );

  useEffect(() => {
    if (readOnly) return;
    const legacyCircumference = value.abdominalCircumferenceCm ?? value.circumferenceCm ?? null;
    if (value.bodyMassIndex === computedBodyMassIndex && value.circumferenceCm === legacyCircumference) return;
    onChange({
      ...value,
      bodyMassIndex: computedBodyMassIndex,
      circumferenceCm: legacyCircumference
    });
  }, [
    computedBodyMassIndex,
    onChange,
    readOnly,
    value,
    value.abdominalCircumferenceCm,
    value.bodyMassIndex,
    value.circumferenceCm
  ]);

  return (
    <Card className="shadow-soft">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm text-slate-700">Vitales</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Triage / enfermería · vista rápida</p>
        </div>
        <div className="text-right text-[11px] text-slate-500">
          <div className="font-semibold text-slate-700">{value.capturedBy || "—"}</div>
          <div className="font-mono">{value.capturedAt ? value.capturedAt.slice(0, 10) : "—"}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">TA</label>
            <input
              value={value.bloodPressure ?? ""}
              onChange={(e) => onChange({ ...value, bloodPressure: e.target.value || null })}
              disabled={readOnly}
              placeholder="118/76"
              className={fieldClasses(readOnly)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">FC</label>
            <div className="relative">
              <input
                value={value.heartRate ?? ""}
                onChange={(e) => onChange({ ...value, heartRate: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="80"
                className={cn(fieldClasses(readOnly), "pr-12")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                lpm
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">FR</label>
            <div className="relative">
              <input
                value={value.respRate ?? ""}
                onChange={(e) => onChange({ ...value, respRate: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="16"
                className={cn(fieldClasses(readOnly), "pr-12")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                rpm
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Temp</label>
            <div className="relative">
              <input
                value={value.temperatureC ?? ""}
                onChange={(e) => onChange({ ...value, temperatureC: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="36.6"
                className={cn(fieldClasses(readOnly), "pr-12")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                °C
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">SpO2</label>
            <div className="relative">
              <input
                value={value.spo2 ?? ""}
                onChange={(e) => onChange({ ...value, spo2: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="98"
                className={cn(fieldClasses(readOnly), "pr-10")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                %
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Peso</label>
            <div className="relative">
              <input
                value={value.weightKg ?? ""}
                onChange={(e) => onChange({ ...value, weightKg: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="67"
                className={cn(fieldClasses(readOnly), "pr-10")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                kg
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Talla</label>
            <div className="relative">
              <input
                value={value.heightCm ?? ""}
                onChange={(e) => onChange({ ...value, heightCm: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="165"
                className={cn(fieldClasses(readOnly), "pr-10")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                cm
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Circ.</label>
            <div className="relative">
              <input
                value={value.abdominalCircumferenceCm ?? value.circumferenceCm ?? ""}
                onChange={(e) => onChange({ ...value, abdominalCircumferenceCm: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="82"
                className={cn(fieldClasses(readOnly), "pr-10")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                cm
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Glucometría</label>
            <div className="relative">
              <input
                value={value.glucometryMgDl ?? ""}
                onChange={(e) => onChange({ ...value, glucometryMgDl: parseNumber(e.target.value) })}
                disabled={readOnly}
                inputMode="numeric"
                placeholder="96"
                className={cn(fieldClasses(readOnly), "pr-14")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                mg/dL
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">IMC</label>
            <div className="relative">
              <input
                value={value.bodyMassIndex ?? ""}
                readOnly
                disabled
                placeholder="—"
                className={cn(fieldClasses(true), "pr-12")}
              />
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                kg/m²
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-3 text-xs text-slate-600">
          TODO(encounter-vitals): estos vitales deberían venir de Triage/Enfermería (QueueItem/Vitals) y respetar RBAC
          (médico: ver; enfermería: editar).
        </div>
      </CardContent>
    </Card>
  );
}
