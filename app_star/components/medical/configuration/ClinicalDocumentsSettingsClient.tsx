"use client";

import { useEffect, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  defaultMedicalDocumentSettings,
  normalizeMedicalDocumentSettings,
  type MedicalDocumentSettings
} from "@/lib/medical/documentSettings";

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/20"
  );
}

function marginInputValue(value: number) {
  if (!Number.isFinite(value)) return "0.75";
  return String(value);
}

export default function ClinicalDocumentsSettingsClient() {
  const [settings, setSettings] = useState<MedicalDocumentSettings>(() => defaultMedicalDocumentSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"logo" | "background" | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/medical/document-settings", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar configuración de documentos.");
        if (!cancelled) setSettings(normalizeMedicalDocumentSettings(json.data || null));
      } catch (error) {
        if (!cancelled) {
          setSettings(defaultMedicalDocumentSettings());
          showToast(error instanceof Error ? error.message : "No se pudo cargar configuración.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = normalizeMedicalDocumentSettings(settings);
      const res = await fetch("/api/medical/document-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar configuración.");
      setSettings(normalizeMedicalDocumentSettings(json.data || payload));
      showToast("Configuración de documentos clínicos guardada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar configuración.", "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (field: "logo" | "background", file: File) => {
    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok || !json?.url) throw new Error(json?.error || "No se pudo subir archivo.");
      const url = String(json.url);
      if (field === "logo") {
        setSettings((prev) => ({ ...prev, logoUrl: url }));
      } else {
        setSettings((prev) => ({ ...prev, letterheadBackgroundUrl: url }));
      }
      showToast("Archivo cargado correctamente.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo subir archivo.", "error");
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración clínica</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Documentos clínicos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Define hoja membretada para historia, evolución y receta exportable.
        </p>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Logo (URL o path)</span>
            <div className="space-y-2">
              <input
                value={settings.logoUrl || ""}
                onChange={(event) => setSettings((prev) => ({ ...prev, logoUrl: event.target.value || null }))}
                disabled={loading || saving || uploadingField === "logo"}
                placeholder="/uploads/logo-clinica.png"
                className={fieldClasses(loading || saving || uploadingField === "logo")}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  disabled={loading || saving || uploadingField === "logo"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile("logo", file);
                    event.currentTarget.value = "";
                  }}
                  className="hidden"
                />
                {uploadingField === "logo" ? "Subiendo..." : "Subir logo"}
              </label>
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fondo membretado (URL o path)</span>
            <div className="space-y-2">
              <input
                value={settings.letterheadBackgroundUrl || ""}
                onChange={(event) => setSettings((prev) => ({ ...prev, letterheadBackgroundUrl: event.target.value || null }))}
                disabled={loading || saving || uploadingField === "background"}
                placeholder="/uploads/fondo-hoja-clinica.png"
                className={fieldClasses(loading || saving || uploadingField === "background")}
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  disabled={loading || saving || uploadingField === "background"}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile("background", file);
                    event.currentTarget.value = "";
                  }}
                  className="hidden"
                />
                {uploadingField === "background" ? "Subiendo..." : "Subir fondo (imagen/PDF)"}
              </label>
            </div>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen superior</span>
            <input
              type="number"
              min={0.3}
              max={1.5}
              step={0.05}
              value={marginInputValue(settings.margins.topIn)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  margins: { ...prev.margins, topIn: Number(event.target.value) || prev.margins.topIn }
                }))
              }
              disabled={loading || saving}
              className={fieldClasses(loading || saving)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen derecho</span>
            <input
              type="number"
              min={0.3}
              max={1.5}
              step={0.05}
              value={marginInputValue(settings.margins.rightIn)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  margins: { ...prev.margins, rightIn: Number(event.target.value) || prev.margins.rightIn }
                }))
              }
              disabled={loading || saving}
              className={fieldClasses(loading || saving)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen inferior</span>
            <input
              type="number"
              min={0.3}
              max={1.5}
              step={0.05}
              value={marginInputValue(settings.margins.bottomIn)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  margins: { ...prev.margins, bottomIn: Number(event.target.value) || prev.margins.bottomIn }
                }))
              }
              disabled={loading || saving}
              className={fieldClasses(loading || saving)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Margen izquierdo</span>
            <input
              type="number"
              min={0.3}
              max={1.5}
              step={0.05}
              value={marginInputValue(settings.margins.leftIn)}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  margins: { ...prev.margins, leftIn: Number(event.target.value) || prev.margins.leftIn }
                }))
              }
              disabled={loading || saving}
              className={fieldClasses(loading || saving)}
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pie de página</span>
          <textarea
            value={settings.footerText}
            onChange={(event) => setSettings((prev) => ({ ...prev, footerText: event.target.value }))}
            disabled={loading || saving}
            rows={3}
            className={cn(fieldClasses(loading || saving), "resize-y")}
            placeholder="Emitido por StarMedical ERP · Documento clínico institucional."
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Estos cambios aplican a exportaciones nuevas y snapshots futuros.</p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold text-white",
              loading || saving ? "cursor-not-allowed bg-slate-300" : "bg-[#2e75ba] hover:opacity-90"
            )}
          >
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </article>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </section>
  );
}
