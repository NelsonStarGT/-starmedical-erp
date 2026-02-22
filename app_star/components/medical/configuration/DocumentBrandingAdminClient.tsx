"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  createDefaultDocumentBrandingTemplate,
  pickDefaultDocumentBrandingTemplate,
  type DocumentBrandingScope,
  type DocumentBrandingTemplate
} from "@/lib/medical/documentBranding";

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/20"
  );
}

function chipClasses(active: boolean) {
  return cn(
    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
    active ? "border-[#2e75ba] bg-[#f2f8ff] text-[#2e75ba]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );
}

function generateTemplateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `branding-${Date.now()}`;
}

function numericOr(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function isListPayload(value: unknown): value is { items: DocumentBrandingTemplate[] } {
  if (!value || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return Array.isArray(raw.items);
}

function logoPositionClasses(position: DocumentBrandingTemplate["logoPosition"]) {
  if (position === "top-left") return "left-6";
  if (position === "top-right") return "right-6";
  return "left-1/2 -translate-x-1/2";
}

export default function DocumentBrandingAdminClient() {
  const { toasts, showToast, dismiss } = useToast();
  const [selectedScope, setSelectedScope] = useState<DocumentBrandingScope>("clinical");
  const [templates, setTemplates] = useState<DocumentBrandingTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocumentBrandingTemplate>(() =>
    createDefaultDocumentBrandingTemplate({
      id: generateTemplateId(),
      scope: "clinical",
      isDefault: true
    })
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/medical/document-branding?scope=${selectedScope}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar plantillas.");

      const payload = json?.data;
      const list = isListPayload(payload) ? payload.items.filter((item) => item.scope === selectedScope) : [];
      const next = list.length > 0 ? list : [createDefaultDocumentBrandingTemplate({ scope: selectedScope })];
      const selected = pickDefaultDocumentBrandingTemplate(next, selectedScope);
      setTemplates(next);
      setSelectedId(selected.id);
      setDraft(selected);
    } catch (error) {
      const fallback = createDefaultDocumentBrandingTemplate({ scope: selectedScope });
      setTemplates([fallback]);
      setSelectedId(fallback.id);
      setDraft(fallback);
      showToast(error instanceof Error ? error.message : "No se pudo cargar plantillas.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedScope, showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const selectedTemplate = useMemo(() => templates.find((item) => item.id === selectedId) || null, [selectedId, templates]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setDraft(selectedTemplate);
  }, [selectedTemplate]);

  const saveTemplate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/medical/document-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, scope: selectedScope })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar plantilla.");

      const saved = json.data as DocumentBrandingTemplate;
      showToast("Plantilla documental guardada.", "success");
      await loadTemplates();
      setSelectedId(saved.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar plantilla.", "error");
    } finally {
      setSaving(false);
    }
  };

  const createTemplate = () => {
    const next = createDefaultDocumentBrandingTemplate({
      id: generateTemplateId(),
      scope: selectedScope,
      title: "Nueva plantilla",
      isDefault: false,
      updatedAt: new Date().toISOString()
    });
    setTemplates((prev) => [next, ...prev.filter((item) => item.id !== next.id)]);
    setSelectedId(next.id);
    setDraft(next);
  };

  const deleteSelectedTemplate = async () => {
    if (!selectedId || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/medical/document-branding/${encodeURIComponent(selectedId)}`, {
        method: "DELETE"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo eliminar plantilla.");
      showToast("Plantilla eliminada.", "success");
      await loadTemplates();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo eliminar plantilla.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const previewBackgroundStyle = draft.backgroundImageUrl
    ? {
        backgroundImage: `url(${draft.backgroundImageUrl})`,
        backgroundPosition: draft.backgroundPosition === "center" ? "center" : draft.backgroundPosition === "top" ? "top center" : "bottom center",
        backgroundRepeat: "no-repeat",
        backgroundSize: `${Math.round(draft.backgroundScale * 100)}% auto`,
        opacity: draft.backgroundOpacity
      }
    : null;

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración clínica</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Documentos clínicos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define plantilla institucional para impresión/PDF: logo, fondo, pie de página y márgenes.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plantillas</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedScope}
              onChange={(event) => setSelectedScope(event.target.value as DocumentBrandingScope)}
              className={cn(fieldClasses(false), "w-auto min-w-[180px]")}
            >
              <option value="clinical">Consulta clínica</option>
              <option value="order_lab">Orden LAB</option>
              <option value="order_rx">Orden RX</option>
              <option value="order_usg">Orden USG</option>
            </select>
            <button type="button" onClick={createTemplate} className={chipClasses(false)}>
              Nueva plantilla
            </button>
            <button
              type="button"
              onClick={() => void saveTemplate()}
              disabled={loading || saving}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                loading || saving ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
              )}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => void deleteSelectedTemplate()}
              disabled={loading || deleting || templates.length <= 1}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                loading || deleting || templates.length <= 1 ? "cursor-not-allowed bg-slate-300" : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={chipClasses(template.id === selectedId)}
            >
              {template.title}
              {template.isDefault ? " · Default" : ""}
            </button>
          ))}
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Título</span>
              <input
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Default</span>
              <select
                value={draft.isDefault ? "yes" : "no"}
                onChange={(event) => setDraft((prev) => ({ ...prev, isDefault: event.target.value === "yes" }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              >
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Logo URL</span>
              <input
                value={draft.logoUrl || ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, logoUrl: event.target.value || null }))}
                disabled={loading || saving}
                placeholder="https://..."
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Ancho logo (px)</span>
              <input
                type="number"
                min={60}
                max={320}
                step={1}
                value={draft.logoWidthPx}
                onChange={(event) => setDraft((prev) => ({ ...prev, logoWidthPx: numericOr(event.target.value, prev.logoWidthPx) }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Posición logo</span>
              <select
                value={draft.logoPosition}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    logoPosition: event.target.value as DocumentBrandingTemplate["logoPosition"]
                  }))
                }
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              >
                <option value="top-left">Superior izquierda</option>
                <option value="top-center">Superior centro</option>
                <option value="top-right">Superior derecha</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fondo URL</span>
              <input
                value={draft.backgroundImageUrl || ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, backgroundImageUrl: event.target.value || null }))}
                disabled={loading || saving}
                placeholder="https://..."
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Opacidad</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={draft.backgroundOpacity}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    backgroundOpacity: numericOr(event.target.value, prev.backgroundOpacity)
                  }))
                }
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Escala</span>
              <input
                type="number"
                min={0.5}
                max={1.2}
                step={0.05}
                value={draft.backgroundScale}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    backgroundScale: numericOr(event.target.value, prev.backgroundScale)
                  }))
                }
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Posición fondo</span>
              <select
                value={draft.backgroundPosition}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    backgroundPosition: event.target.value as DocumentBrandingTemplate["backgroundPosition"]
                  }))
                }
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              >
                <option value="top">Superior</option>
                <option value="center">Centro</option>
                <option value="bottom">Inferior</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Footer</span>
              <select
                value={draft.footerEnabled ? "yes" : "no"}
                onChange={(event) => setDraft((prev) => ({ ...prev, footerEnabled: event.target.value === "yes" }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              >
                <option value="yes">Activo</option>
                <option value="no">Inactivo</option>
              </select>
            </label>
            <div />
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Footer izquierda</span>
              <input
                value={draft.footerLeftText}
                onChange={(event) => setDraft((prev) => ({ ...prev, footerLeftText: event.target.value }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Footer derecha</span>
              <input
                value={draft.footerRightText}
                onChange={(event) => setDraft((prev) => ({ ...prev, footerRightText: event.target.value }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen top (in)</span>
              <input
                type="number"
                min={0.35}
                max={1.5}
                step={0.05}
                value={draft.marginTopIn}
                onChange={(event) => setDraft((prev) => ({ ...prev, marginTopIn: numericOr(event.target.value, prev.marginTopIn) }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen right (in)</span>
              <input
                type="number"
                min={0.35}
                max={1.5}
                step={0.05}
                value={draft.marginRightIn}
                onChange={(event) => setDraft((prev) => ({ ...prev, marginRightIn: numericOr(event.target.value, prev.marginRightIn) }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen bottom (in)</span>
              <input
                type="number"
                min={0.35}
                max={1.5}
                step={0.05}
                value={draft.marginBottomIn}
                onChange={(event) => setDraft((prev) => ({ ...prev, marginBottomIn: numericOr(event.target.value, prev.marginBottomIn) }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen left (in)</span>
              <input
                type="number"
                min={0.35}
                max={1.5}
                step={0.05}
                value={draft.marginLeftIn}
                onChange={(event) => setDraft((prev) => ({ ...prev, marginLeftIn: numericOr(event.target.value, prev.marginLeftIn) }))}
                disabled={loading || saving}
                className={fieldClasses(loading || saving)}
              />
            </label>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Preview</p>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 p-3">
            <div className="mx-auto h-[500px] w-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="relative h-full w-full">
                {previewBackgroundStyle ? <div className="absolute inset-0" style={previewBackgroundStyle} /> : null}
                <div className="relative z-10 flex h-full flex-col px-5 py-4">
                  {draft.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.logoUrl}
                      alt="Logo institucional"
                      style={{ width: `${draft.logoWidthPx}px` }}
                      className={cn("absolute top-4 object-contain", logoPositionClasses(draft.logoPosition))}
                    />
                  ) : null}
                  <div className="pt-12">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">{draft.title}</p>
                    <h4 className="mt-2 text-sm font-semibold text-slate-900">Consulta clínica</h4>
                    <p className="text-xs text-slate-600">Contenido clínico institucional con membrete configurable.</p>
                  </div>
                  <div className="mt-auto border-t border-slate-200 pt-2">
                    {draft.footerEnabled ? (
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
                        <span>{draft.footerLeftText || " "}</span>
                        <span>{draft.footerRightText || " "}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">Footer inactivo</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}
