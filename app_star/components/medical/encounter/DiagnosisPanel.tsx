"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import ICD10Spotlight from "@/components/medical/terminology/ICD10Spotlight";
import { cn } from "@/lib/utils";
import type { EncounterDiagnosis } from "./types";

type ToastVariant = "success" | "error" | "info";
const SPOTLIGHT_INPUT_ID = "consulta-dx-spotlight";

export default function DiagnosisPanel({
  diagnosis,
  onChangeDiagnosis,
  readOnly,
  onToast
}: {
  diagnosis: EncounterDiagnosis;
  onChangeDiagnosis: (next: EncounterDiagnosis) => void;
  readOnly: boolean;
  onToast?: (message: string, variant?: ToastVariant) => void;
}) {
  const removeSecondary = (code: string) => {
    if (readOnly) return;
    onChangeDiagnosis({
      principalCode: diagnosis.principalCode,
      secondaryCodes: diagnosis.secondaryCodes.filter((item) => item !== code)
    });
    onToast?.(`Diagnóstico secundario removido: ${code}`, "info");
  };

  const focusSpotlight = () => {
    const input = document.getElementById(SPOTLIGHT_INPUT_ID) as HTMLInputElement | null;
    input?.focus();
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm text-slate-700">Diagnósticos clínicos</CardTitle>
            <button
              type="button"
              onClick={focusSpotlight}
              disabled={readOnly}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                readOnly
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-[#2e75ba]/25 bg-[#f2f8ff] text-[#2e75ba] hover:bg-[#e8f2ff]"
              )}
            >
              + Agregar diagnóstico
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ICD10Spotlight
            value={diagnosis}
            onChange={onChangeDiagnosis}
            readOnly={readOnly}
            requiredPrincipal
            placeholder="Buscar diagnóstico (CIE-10)"
            inputId={SPOTLIGHT_INPUT_ID}
            onToast={onToast}
            maxResults={20}
          />

          <section className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">Diagnóstico principal</p>
              <button
                type="button"
                onClick={focusSpotlight}
                disabled={readOnly}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  readOnly ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-rose-200 bg-white text-rose-700"
                )}
              >
                Reemplazar
              </button>
            </div>
            {diagnosis.principalCode ? (
              <p className="mt-1 text-sm font-semibold text-rose-900">{diagnosis.principalCode}</p>
            ) : (
              <p className="mt-1 text-sm text-rose-700">No definido.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Diagnósticos secundarios</p>
            {diagnosis.secondaryCodes.length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">Sin diagnósticos secundarios.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {diagnosis.secondaryCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                  >
                    <span>{code}</span>
                    <button
                      type="button"
                      onClick={() => removeSecondary(code)}
                      disabled={readOnly}
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                        readOnly
                          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                      )}
                      aria-label={`Remover diagnóstico secundario ${code}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {!diagnosis.principalCode ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Falta diagnóstico principal CIE-10 para cerrar.
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            El diagnóstico principal CIE-10 es obligatorio para cerrar y firmar la consulta.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
