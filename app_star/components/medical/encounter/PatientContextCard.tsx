import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { CoverageType, EncounterPatient } from "./types";

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

function coverageClasses(type: CoverageType) {
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

function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return "PA";
  return words.map((word) => word[0] || "").join("").toUpperCase();
}

export default function PatientContextCard({ patient }: { patient: EncounterPatient }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="text-sm text-slate-700">Paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          {patient.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={patient.photoUrl}
              alt={patient.name}
              className="h-16 w-16 rounded-2xl border border-slate-200 bg-slate-100 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-700">
              {initials(patient.name)}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900">{patient.name}</p>
            <p className="text-sm text-slate-600">
              {patient.age} años · {patient.sex}
            </p>
            <p className="mt-1 text-xs text-slate-500">Historia clínica {patient.recordNumber}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Cobertura</p>
          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", coverageClasses(patient.coverageType))}>
            {coverageLabel(patient.coverageType)}
          </span>
          <p className="text-sm text-slate-700">{patient.coverageEntity || "Sin entidad asociada registrada"}</p>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Alertas clínicas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {patient.alerts.length === 0 ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                Sin alertas
              </span>
            ) : (
              patient.alerts.map((alert) => (
                <span
                  key={alert}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                >
                  {alert}
                </span>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
