"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { VitalTemplateDefinition, VitalTemplateField, VitalTemplateKey } from "@/components/medical/encounter/types";
import { createDefaultVitalTemplate } from "@/lib/medical/clinical";
import { cn } from "@/lib/utils";

const FIELD_UNITS: Record<VitalTemplateKey, string> = {
  bloodPressure: "mmHg",
  heartRate: "lpm",
  respRate: "rpm",
  temperatureC: "°C",
  spo2: "%",
  weightKg: "kg",
  heightCm: "cm",
  glucometryMgDl: "mg/dL",
  abdominalCircumferenceCm: "cm",
  bodyMassIndex: "kg/m²"
};

function id(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneTemplate(template: VitalTemplateDefinition): VitalTemplateDefinition {
  return JSON.parse(JSON.stringify(template)) as VitalTemplateDefinition;
}

function normalizeFieldOrder(fields: VitalTemplateField[]) {
  return fields
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((field, index) => ({ ...field, order: (index + 1) * 10 }));
}

function blankTemplate(): VitalTemplateDefinition {
  const base = createDefaultVitalTemplate();
  return {
    ...base,
    id: id("vtpl"),
    title: "Nueva plantilla de signos vitales",
    isDefault: false,
    fields: normalizeFieldOrder(base.fields)
  };
}

function prettyDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function VitalsTemplatesAdminClient() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templates, setTemplates] = useState<VitalTemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VitalTemplateDefinition | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/medical/vitals-templates", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar plantillas de signos vitales.");

      const list = (json.data || []) as VitalTemplateDefinition[];
      setTemplates(list);
      const defaultId = list.find((item) => item.isDefault)?.id || list[0]?.id || null;
      setSelectedId((prev) => (prev && list.some((item) => item.id === prev) ? prev : defaultId));
      const base = list.find((item) => item.id === defaultId) || null;
      setDraft(base ? cloneTemplate(base) : blankTemplate());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar plantillas";
      showToast(message, "error");
      setTemplates([]);
      setSelectedId(null);
      setDraft(blankTemplate());
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setDraft(cloneTemplate(selectedTemplate));
  }, [selectedTemplate]);

  const updateDraft = (next: VitalTemplateDefinition) => setDraft(cloneTemplate(next));

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/medical/vitals-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar la plantilla");

      const saved = json.data as VitalTemplateDefinition;
      await loadTemplates();
      setSelectedId(saved.id);
      showToast("Plantilla de signos vitales guardada.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!draft?.id) return;
    const approved = window.confirm("¿Eliminar esta plantilla de signos vitales?");
    if (!approved) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/medical/vitals-templates/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo eliminar");
      showToast("Plantilla eliminada.", "success");
      await loadTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const sortedDraftFields = useMemo(() => {
    if (!draft) return [];
    return draft.fields.slice().sort((a, b) => a.order - b.order);
  }, [draft]);

  const updateField = (key: VitalTemplateKey, patch: Partial<VitalTemplateField>) => {
    if (!draft) return;
    const next = draft.fields.map((field) => {
      if (field.key !== key) return field;
      const merged = { ...field, ...patch };
      if (merged.key === "bodyMassIndex") {
        merged.required = false;
      }
      return merged;
    });
    updateDraft({ ...draft, fields: normalizeFieldOrder(next) });
  };

  const moveField = (key: VitalTemplateKey, direction: "up" | "down") => {
    if (!draft) return;
    const ordered = sortedDraftFields.slice();
    const index = ordered.findIndex((field) => field.key === key);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ordered.length) return;
    const current = ordered[index];
    ordered[index] = ordered[target];
    ordered[target] = current;
    updateDraft({ ...draft, fields: normalizeFieldOrder(ordered) });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración clínica</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Plantillas de signos vitales</h2>
        <p className="mt-1 text-sm text-slate-600">Define visibilidad, orden, unidad y fuente de captura para vitales en ConsultaM.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plantillas</p>
            <button
              type="button"
              onClick={() => {
                const created = blankTemplate();
                setSelectedId(created.id);
                setDraft(created);
              }}
              className="rounded-lg border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-2.5 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aa59c]/20"
            >
              Crear
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">Cargando plantillas...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              Sin plantillas guardadas.
            </div>
          ) : (
            templates.map((template) => {
              const selected = template.id === selectedId;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(template.id);
                    setDraft(cloneTemplate(template));
                  }}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    selected ? "border-[#2e75ba]/35 bg-[#f2f8ff]" : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{template.title}</p>
                      <p className="text-xs text-slate-600">{template.fields.length} campos</p>
                    </div>
                    {template.isDefault ? (
                      <span className="rounded-full border border-[#4aa59c]/35 bg-[#4aa59c]/12 px-2 py-0.5 text-[11px] font-semibold text-[#2e75ba]">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Actualizada: {prettyDate(template.updatedAt)}</p>
                </button>
              );
            })
          )}
        </aside>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          {!draft ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Selecciona una plantilla de signos vitales.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Título</span>
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft({ ...draft, title: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                    placeholder="Signos vitales básicos"
                  />
                </label>

                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.isDefault}
                    onChange={(event) => updateDraft({ ...draft, isDefault: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#2e75ba]"
                  />
                  Usar como plantilla default en consultaM
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Campos de signos vitales</p>
                <div className="space-y-2">
                  {sortedDraftFields.map((field, index) => (
                    <article key={field.key} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-12">
                      <div className="md:col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Campo</p>
                        <p className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-700">{field.key}</p>
                      </div>

                      <label className="md:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Etiqueta</p>
                        <input
                          value={field.label}
                          onChange={(event) => updateField(field.key, { label: event.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba]"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Unidad</p>
                        <input
                          value={field.unit}
                          onChange={(event) => updateField(field.key, { unit: event.target.value })}
                          placeholder={FIELD_UNITS[field.key]}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba]"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fuente</p>
                        <select
                          value={field.source}
                          onChange={(event) => updateField(field.key, { source: event.target.value as "triage" | "manual" })}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba]"
                        >
                          <option value="triage">Triage</option>
                          <option value="manual">Manual</option>
                        </select>
                      </label>

                      <div className="md:col-span-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reglas</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.visible}
                              onChange={(event) => updateField(field.key, { visible: event.target.checked })}
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                            Visible
                          </label>
                          <label className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={field.key === "bodyMassIndex"}
                              onChange={(event) => updateField(field.key, { required: event.target.checked })}
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                            Obligatorio
                          </label>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Min</span>
                            <input
                              value={typeof field.min === "number" ? field.min : ""}
                              inputMode="decimal"
                              onChange={(event) =>
                                updateField(field.key, {
                                  min: parseOptionalNumber(event.target.value)
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2e75ba]"
                            />
                          </label>
                          <label>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Max</span>
                            <input
                              value={typeof field.max === "number" ? field.max : ""}
                              inputMode="decimal"
                              onChange={(event) =>
                                updateField(field.key, {
                                  max: parseOptionalNumber(event.target.value)
                                })
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2e75ba]"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="md:col-span-12 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveField(field.key, "up")}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Mover ${field.label} hacia arriba`}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === sortedDraftFields.length - 1}
                          onClick={() => moveField(field.key, "down")}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Mover ${field.label} hacia abajo`}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={deleteCurrent}
                  disabled={deleting || saving || !templates.some((item) => item.id === draft.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "Eliminando..." : "Eliminar plantilla"}
                </button>

                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving || deleting}
                  className="rounded-lg bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Guardando..." : "Guardar plantilla"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
