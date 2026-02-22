"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import type { ClinicalTemplateDefinition, ClinicalTemplateField, ClinicalTemplateFieldKind } from "@/components/medical/encounter/types";
import { createDefaultClinicalTemplate } from "@/lib/medical/clinical";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = ["Básica", "Completa", "Laboral/empleo", "Pediátrica", "Control"];

function id(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneTemplate(template: ClinicalTemplateDefinition): ClinicalTemplateDefinition {
  return JSON.parse(JSON.stringify(template)) as ClinicalTemplateDefinition;
}

function createEmptyField(): ClinicalTemplateField {
  return {
    id: id("fld"),
    key: "campo_nuevo",
    label: "Campo nuevo",
    kind: "text",
    required: false,
    visible: true,
    defaultValue: ""
  };
}

function blankTemplate(): ClinicalTemplateDefinition {
  const base = createDefaultClinicalTemplate();
  return {
    ...base,
    id: id("tpl"),
    title: "Nueva plantilla clínica",
    type: "Básica",
    isDefault: false,
    sections: [
      {
        id: id("sec"),
        title: "Sección inicial",
        description: "",
        fields: [createEmptyField()]
      }
    ]
  };
}

function prettyDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ClinicalTemplatesAdminClient() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templates, setTemplates] = useState<ClinicalTemplateDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClinicalTemplateDefinition | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/medical/templates", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar plantillas.");
      const list = (json.data || []) as ClinicalTemplateDefinition[];
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

  const updateDraft = (next: ClinicalTemplateDefinition) => setDraft(cloneTemplate(next));

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/medical/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar la plantilla");

      const saved = json.data as ClinicalTemplateDefinition;
      await loadTemplates();
      setSelectedId(saved.id);
      showToast("Plantilla clínica guardada.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrent = async () => {
    if (!draft?.id) return;
    const approved = window.confirm("¿Eliminar esta plantilla clínica?");
    if (!approved) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/medical/templates/${encodeURIComponent(draft.id)}`, { method: "DELETE" });
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

  const addSection = () => {
    if (!draft) return;
    updateDraft({
      ...draft,
      sections: [
        ...draft.sections,
        {
          id: id("sec"),
          title: "Nueva sección",
          description: "",
          fields: [createEmptyField()]
        }
      ]
    });
  };

  const updateSection = (sectionId: string, patch: Partial<ClinicalTemplateDefinition["sections"][number]>) => {
    if (!draft) return;
    updateDraft({
      ...draft,
      sections: draft.sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    });
  };

  const removeSection = (sectionId: string) => {
    if (!draft) return;
    updateDraft({
      ...draft,
      sections: draft.sections.filter((section) => section.id !== sectionId)
    });
  };

  const addField = (sectionId: string) => {
    if (!draft) return;
    updateDraft({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId ? { ...section, fields: [...section.fields, createEmptyField()] } : section
      )
    });
  };

  const updateField = (
    sectionId: string,
    fieldId: string,
    patch: Partial<{ key: string; label: string; kind: ClinicalTemplateFieldKind; required: boolean; visible: boolean; defaultValue: string }>
  ) => {
    if (!draft) return;

    updateDraft({
      ...draft,
      sections: draft.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          fields: section.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
        };
      })
    });
  };

  const removeField = (sectionId: string, fieldId: string) => {
    if (!draft) return;
    updateDraft({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId ? { ...section, fields: section.fields.filter((field) => field.id !== fieldId) } : section
      )
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración clínica</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Plantillas clínicas</h2>
        <p className="mt-1 text-sm text-slate-600">
          Administra estructura de formularios y reglas de campos para el documento clínico.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
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
                      <p className="text-xs text-slate-600">{template.type}</p>
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">Selecciona una plantilla.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Título</span>
                  <input
                    value={draft.title}
                    onChange={(event) => updateDraft({ ...draft, title: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                    placeholder="Historia Clínica Básica"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tipo</span>
                  <select
                    value={draft.type}
                    onChange={(event) => updateDraft({ ...draft, type: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.isDefault}
                  onChange={(event) => updateDraft({ ...draft, isDefault: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#2e75ba]"
                />
                Usar como plantilla default en consultaM
              </label>

              <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Configuración de signos vitales</p>
                <p className="mt-1 text-sm text-slate-600">Los signos vitales se configuran en Plantillas de signos vitales.</p>
                <Link
                  href="/modulo-medico/configuracion/plantillas-signos-vitales"
                  className="mt-3 inline-flex rounded-lg border border-[#4aa59c]/35 bg-[#4aa59c]/10 px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#4aa59c]/15"
                >
                  Ir a plantillas de signos vitales
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Secciones del formulario</p>
                  <button
                    type="button"
                    onClick={addSection}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Agregar sección
                  </button>
                </div>

                {draft.sections.map((section) => (
                  <article key={section.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <input
                        value={section.title}
                        onChange={(event) => updateSection(section.id, { title: event.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="Título de sección"
                      />
                      <input
                        value={section.description || ""}
                        onChange={(event) => updateSection(section.id, { description: event.target.value })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="Descripción"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Eliminar sección
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.fields.map((field) => (
                        <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 md:grid-cols-12">
                          <input
                            value={field.label}
                            onChange={(event) => updateField(section.id, field.id, { label: event.target.value })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba] md:col-span-3"
                            placeholder="Etiqueta"
                          />
                          <input
                            value={field.key}
                            onChange={(event) => updateField(section.id, field.id, { key: event.target.value })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono outline-none focus:border-[#2e75ba] md:col-span-2"
                            placeholder="clave"
                          />
                          <select
                            value={field.kind}
                            onChange={(event) => updateField(section.id, field.id, { kind: event.target.value as ClinicalTemplateFieldKind })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba] md:col-span-2"
                          >
                            <option value="rich_text">Editor rico</option>
                            <option value="textarea">Textarea</option>
                            <option value="text">Texto</option>
                            <option value="number">Número</option>
                          </select>
                          <input
                            value={field.defaultValue}
                            onChange={(event) => updateField(section.id, field.id, { defaultValue: event.target.value })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e75ba] md:col-span-3"
                            placeholder="Valor por defecto"
                          />
                          <div className="flex items-center gap-2 md:col-span-1">
                            <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(event) => updateField(section.id, field.id, { required: event.target.checked })}
                              />
                              Req
                            </label>
                            <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                checked={field.visible}
                                onChange={(event) => updateField(section.id, field.id, { visible: event.target.checked })}
                              />
                              Visible
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeField(section.id, field.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 md:col-span-1"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addField(section.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Agregar campo
                    </button>
                  </article>
                ))}
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
