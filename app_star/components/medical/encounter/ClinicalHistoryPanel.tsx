"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import ICD10MultiSelect from "@/components/medical/terminology/ICD10MultiSelect";
import TextEditorEngine from "@/modules/text-editor/TextEditorEngine";
import LetterPages, { type LetterViewMode } from "@/components/medical/encounter/LetterPages";
import { calculateBodyMassIndex, deriveLegacyHistoryFields } from "@/lib/medical/clinical";
import type { DocumentBrandingTemplate } from "@/lib/medical/documentBranding";
import type {
  ClinicalTemplateDefinition,
  EncounterDiagnosis,
  EncounterHistoryDraft,
  EncounterHistoryType,
  EncounterRecentHistory,
  EncounterVitals,
  VitalTemplateKey
} from "./types";

function tabClasses(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-semibold transition",
    active ? "border-[#2e75ba] bg-[#2e75ba] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );
}

function fieldClasses(readOnly: boolean) {
  return cn(
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    readOnly ? "bg-slate-50" : "bg-white focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
  );
}

function historyTypeLabel(type: EncounterHistoryType) {
  switch (type) {
    case "basic":
      return "Básica";
    case "complete":
      return "Completa";
    case "employment":
      return "Laboral / empleo";
  }
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === "") return "—";
  return String(value);
}

const DEFAULT_VITALS_VISIBILITY: Record<VitalTemplateKey, boolean> = {
  bloodPressure: true,
  heartRate: true,
  respRate: true,
  temperatureC: true,
  spo2: true,
  weightKg: true,
  heightCm: true,
  glucometryMgDl: true,
  abdominalCircumferenceCm: true,
  bodyMassIndex: true
};

type Props = {
  history: EncounterHistoryDraft;
  onChangeHistory: (next: EncounterHistoryDraft) => void;
  diagnosis: EncounterDiagnosis;
  onChangeDiagnosis: (next: EncounterDiagnosis) => void;
  vitals: EncounterVitals;
  recentHistories: EncounterRecentHistory[];
  readOnly: boolean;
  showDiagnosisCard?: boolean;
  showRightRail?: boolean;
  templates?: ClinicalTemplateDefinition[];
  onSelectTemplate?: (templateId: string) => void;
  documentViewMode?: LetterViewMode;
  onChangeDocumentViewMode?: (next: LetterViewMode) => void;
  vitalVisibility?: Partial<Record<VitalTemplateKey, boolean>>;
  brandingTemplate?: DocumentBrandingTemplate | null;
};

export default function ClinicalHistoryPanel({
  history,
  onChangeHistory,
  diagnosis,
  onChangeDiagnosis,
  vitals,
  recentHistories,
  readOnly,
  showDiagnosisCard = true,
  showRightRail = true,
  templates = [],
  onSelectTemplate,
  documentViewMode = "paged",
  onChangeDocumentViewMode,
  vitalVisibility,
  brandingTemplate
}: Props) {
  const setSections = (nextSections: EncounterHistoryDraft["sections"]) => {
    const legacy = deriveLegacyHistoryFields(nextSections);
    onChangeHistory({
      ...history,
      sections: nextSections,
      consultationReason: legacy.consultationReason,
      antecedentes: legacy.antecedentes,
      physicalExam: legacy.physicalExam
    });
  };

  const updateFieldText = (sectionId: string, fieldId: string, value: string) => {
    const nextSections = history.sections.map((section) => {
      if (section.sectionId !== sectionId) return section;
      return {
        ...section,
        fields: section.fields.map((field) => (field.fieldId === fieldId ? { ...field, textValue: value } : field))
      };
    });
    setSections(nextSections);
  };

  const updateFieldNumber = (sectionId: string, fieldId: string, value: string) => {
    const numeric = value.trim() ? Number(value) : null;
    const nextSections = history.sections.map((section) => {
      if (section.sectionId !== sectionId) return section;
      return {
        ...section,
        fields: section.fields.map((field) =>
          field.fieldId === fieldId ? { ...field, numberValue: Number.isFinite(numeric) ? numeric : null } : field
        )
      };
    });
    setSections(nextSections);
  };

  const updateFieldRich = (
    sectionId: string,
    fieldId: string,
    payload: { json: Record<string, unknown>; html: string; text: string }
  ) => {
    const nextSections = history.sections.map((section) => {
      if (section.sectionId !== sectionId) return section;
      return {
        ...section,
        fields: section.fields.map((field) =>
          field.fieldId === fieldId
            ? {
                ...field,
                richValue: {
                  json: payload.json,
                  html: payload.html,
                  text: payload.text
                }
              }
            : field
        )
      };
    });
    setSections(nextSections);
  };

  const mergedVitalVisibility = {
    ...DEFAULT_VITALS_VISIBILITY,
    ...(vitalVisibility || {})
  };

  const currentBmi = vitals.bodyMassIndex ?? calculateBodyMassIndex(vitals.weightKg, vitals.heightCm);

  const letterPages = history.sections.map((section) => ({
    id: section.sectionId,
    title: section.title,
    subtitle: section.description,
    content: (
      <div className="space-y-4">
        {section.fields.filter((field) => field.visible).map((field) => {
          if (field.kind === "rich_text") {
            return (
              <div key={field.fieldId} className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{field.label}</p>
                <TextEditorEngine
                  variant="medical"
                  density="comfortable"
                  initialContent={field.richValue.json as any}
                  readOnly={readOnly}
                  onChange={(payload) =>
                    updateFieldRich(section.sectionId, field.fieldId, {
                      json: payload.json as Record<string, unknown>,
                      html: payload.html,
                      text: payload.text
                    })
                  }
                />
              </div>
            );
          }

          if (field.kind === "textarea") {
            return (
              <label key={field.fieldId} className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{field.label}</span>
                <textarea
                  value={field.textValue}
                  onChange={(event) => updateFieldText(section.sectionId, field.fieldId, event.target.value)}
                  disabled={readOnly}
                  className={cn(fieldClasses(readOnly), "min-h-[120px] resize-y")}
                  placeholder={field.defaultValue || "Escribe aquí"}
                />
              </label>
            );
          }

          if (field.kind === "number") {
            return (
              <label key={field.fieldId} className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{field.label}</span>
                <input
                  value={field.numberValue ?? ""}
                  onChange={(event) => updateFieldNumber(section.sectionId, field.fieldId, event.target.value)}
                  disabled={readOnly}
                  inputMode="decimal"
                  className={fieldClasses(readOnly)}
                  placeholder={field.defaultValue || "0"}
                />
              </label>
            );
          }

          return (
            <label key={field.fieldId} className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{field.label}</span>
              <input
                value={field.textValue}
                onChange={(event) => updateFieldText(section.sectionId, field.fieldId, event.target.value)}
                disabled={readOnly}
                className={fieldClasses(readOnly)}
                placeholder={field.defaultValue || "Escribe aquí"}
              />
            </label>
          );
        })}

        {section.fields.filter((field) => field.visible).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            Esta sección no tiene campos visibles.
          </div>
        ) : null}
      </div>
    )
  }));

  return (
    <div className={cn("grid grid-cols-1 gap-6", showRightRail && "2xl:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Historia clínica</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Tipo activo: {historyTypeLabel(history.type)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              [
                { key: "basic", label: "Básica" },
                { key: "complete", label: "Completa" },
                { key: "employment", label: "Laboral / empleo" }
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeHistory({ ...history, type: item.key })}
                aria-pressed={history.type === item.key}
                disabled={readOnly}
                className={cn(tabClasses(history.type === item.key), readOnly && "cursor-not-allowed opacity-60")}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Plantilla clínica</span>
              <select
                value={history.templateId || templates[0]?.id || ""}
                onChange={(event) => onSelectTemplate?.(event.target.value)}
                disabled={readOnly || templates.length === 0}
                className={fieldClasses(readOnly || templates.length === 0)}
              >
                {templates.length === 0 ? <option value="">Sin plantillas disponibles</option> : null}
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} · {template.type}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                {history.templateTitle || "Plantilla no seleccionada"}
              </span>
            </div>
          </div>
        </section>

        <LetterPages
          pages={letterPages}
          mode={documentViewMode}
          onModeChange={onChangeDocumentViewMode}
          brandingTemplate={brandingTemplate}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Al cerrar y firmar, se guarda snapshot inmutable de la historia para auditoría clínica/legal.
        </div>

        {showDiagnosisCard ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Diagnóstico principal (CIE-10)</h3>
            <div className="mt-3">
              <ICD10MultiSelect value={diagnosis} onChange={onChangeDiagnosis} readOnly={readOnly} requiredPrincipal />
            </div>
          </section>
        ) : null}
      </div>

      {showRightRail ? (
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Signos vitales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {mergedVitalVisibility.bloodPressure ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">TA</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.bloodPressure)}</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.heartRate ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">FC</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.heartRate)} lpm</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.respRate ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">FR</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.respRate)} rpm</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.temperatureC ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Temp</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.temperatureC)} °C</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.spo2 ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">SpO2</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.spo2)} %</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.weightKg ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Peso</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.weightKg)} kg</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.heightCm ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Talla</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.heightCm)} cm</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.glucometryMgDl ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Glucometría</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.glucometryMgDl)} mg/dL</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.abdominalCircumferenceCm ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Circ. abdominal</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(vitals.abdominalCircumferenceCm)} cm</p>
                  </div>
                ) : null}
                {mergedVitalVisibility.bodyMassIndex ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">IMC</p>
                    <p className="font-semibold text-slate-900">{valueOrDash(currentBmi)}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Solo lectura · datos provenientes de triage
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-sm text-slate-700">Últimos 3 encounters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentHistories.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                  Sin antecedentes de encounters.
                </div>
              ) : (
                recentHistories.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500">{item.date}</p>
                        <p className="text-sm font-semibold text-slate-900">{item.principalDxCode || "DX sin código"}</p>
                        <p className="text-xs text-slate-600">{item.summary}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Lectura
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
