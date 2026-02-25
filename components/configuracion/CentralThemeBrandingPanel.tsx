"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import UploadField from "@/components/ui/UploadField";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { contrastRatio, isRecommendedContrast, isValidHexColor } from "@/lib/theme/utils";

type ThemeSnapshot = {
  tenantId: string;
  version: number;
  theme: {
    primary: string;
    accent: string;
    structure: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    ring: string;
  };
  fontHeadingKey: "montserrat" | "poppins";
  fontBodyKey: "nunito" | "inter";
  densityDefault: "compact" | "normal";
  logoUrl: string | null;
  logoAssetId: string | null;
  source: "db" | "defaults";
  updatedAt: string | null;
};

type ThemeForm = ThemeSnapshot["theme"] & {
  fontHeadingKey: ThemeSnapshot["fontHeadingKey"];
  fontBodyKey: ThemeSnapshot["fontBodyKey"];
  densityDefault: ThemeSnapshot["densityDefault"];
  logoUrl: string;
};

type ApiErrorPayload = {
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
  warnings?: string[];
};

const STAR_DEFAULTS = {
  primary: "#4aa59c",
  accent: "#4aadf5",
  structure: "#2e75ba",
  bg: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#dbe6f0",
  ring: "#4aadf5",
  fontHeadingKey: "montserrat" as const,
  fontBodyKey: "nunito" as const,
  densityDefault: "normal" as const
};

const FONT_HEADING_OPTIONS: Array<{ value: ThemeSnapshot["fontHeadingKey"]; label: string; family: string }> = [
  { value: "montserrat", label: "Montserrat", family: "Montserrat, Poppins, Inter, sans-serif" },
  { value: "poppins", label: "Poppins", family: "Poppins, Montserrat, Inter, sans-serif" }
];

const FONT_BODY_OPTIONS: Array<{ value: ThemeSnapshot["fontBodyKey"]; label: string; family: string }> = [
  { value: "nunito", label: "Nunito Sans", family: "Nunito Sans, Inter, sans-serif" },
  { value: "inter", label: "Inter", family: "Inter, Nunito Sans, sans-serif" }
];

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

function buildApiErrorMessage(payload: unknown, fallback: string) {
  const value = (payload && typeof payload === "object" ? payload : {}) as ApiErrorPayload;
  const codePrefix = typeof value.code === "string" && value.code.trim() ? `[${value.code}] ` : "";
  const base = typeof value.error === "string" && value.error.trim() ? value.error : fallback;
  const issues = Array.isArray(value.issues)
    ? value.issues
        .map((issue) => {
          const path = typeof issue?.path === "string" ? issue.path : "";
          const message = typeof issue?.message === "string" ? issue.message : "";
          if (!message) return null;
          return path ? `${path}: ${message}` : message;
        })
        .filter((entry): entry is string => Boolean(entry))
    : [];
  return `${codePrefix}${base}${issues.length ? ` (${issues.join(" | ")})` : ""}`;
}

export default function CentralThemeBrandingPanel() {
  const { toasts, showToast, dismiss } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState(1);
  const [source, setSource] = useState<ThemeSnapshot["source"]>("defaults");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [form, setForm] = useState<ThemeForm>({
    primary: STAR_DEFAULTS.primary,
    accent: STAR_DEFAULTS.accent,
    structure: STAR_DEFAULTS.structure,
    bg: STAR_DEFAULTS.bg,
    surface: STAR_DEFAULTS.surface,
    text: STAR_DEFAULTS.text,
    muted: STAR_DEFAULTS.muted,
    border: STAR_DEFAULTS.border,
    ring: STAR_DEFAULTS.ring,
    fontHeadingKey: STAR_DEFAULTS.fontHeadingKey,
    fontBodyKey: STAR_DEFAULTS.fontBodyKey,
    densityDefault: STAR_DEFAULTS.densityDefault,
    logoUrl: ""
  });

  const headingFontPreview = useMemo(
    () => FONT_HEADING_OPTIONS.find((item) => item.value === form.fontHeadingKey)?.family || FONT_HEADING_OPTIONS[0].family,
    [form.fontHeadingKey]
  );

  const bodyFontPreview = useMemo(
    () => FONT_BODY_OPTIONS.find((item) => item.value === form.fontBodyKey)?.family || FONT_BODY_OPTIONS[0].family,
    [form.fontBodyKey]
  );

  const localContrastWarnings = useMemo(() => {
    const out: string[] = [];
    if (isValidHexColor(form.text) && isValidHexColor(form.bg)) {
      const ratio = contrastRatio(form.text, form.bg);
      if (!isRecommendedContrast(form.text, form.bg)) {
        out.push(`Texto vs fondo: ${ratio}:1 (recomendado >= 4.5:1)`);
      }
    }

    if (isValidHexColor(form.structure) && isValidHexColor(form.surface)) {
      const ratio = contrastRatio(form.structure, form.surface);
      if (!isRecommendedContrast(form.structure, form.surface, 3.2)) {
        out.push(`Estructura vs superficie: ${ratio}:1 (recomendado >= 3.2:1)`);
      }
    }

    return out;
  }, [form.bg, form.structure, form.surface, form.text]);

  const loadTheme = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/theme", { cache: "no-store" });
      const json = await readJson<{ ok?: boolean; error?: string; data?: ThemeSnapshot }>(res);
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(buildApiErrorMessage(json, "No se pudo cargar configuración de tema."));
      }

      setVersion(json.data.version);
      setSource(json.data.source);
      setUpdatedAt(json.data.updatedAt);
      setLogoAssetId(json.data.logoAssetId || null);
      setWarnings([]);
      setForm({
        primary: json.data.theme.primary,
        accent: json.data.theme.accent,
        structure: json.data.theme.structure,
        bg: json.data.theme.bg,
        surface: json.data.theme.surface,
        text: json.data.theme.text,
        muted: json.data.theme.muted,
        border: json.data.theme.border,
        ring: json.data.theme.ring,
        fontHeadingKey: json.data.fontHeadingKey,
        fontBodyKey: json.data.fontBodyKey,
        densityDefault: json.data.densityDefault,
        logoUrl: json.data.logoUrl || ""
      });
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando tema", message: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  function validateBeforeSave() {
    const colors = [
      form.primary,
      form.accent,
      form.structure,
      form.bg,
      form.surface,
      form.text,
      form.muted,
      form.border,
      form.ring
    ];

    if (!colors.every((color) => isValidHexColor(color))) {
      throw new Error("Todos los colores deben estar en formato HEX #RRGGBB.");
    }
  }

  async function handleSave() {
    try {
      validateBeforeSave();
      setIsSaving(true);
      showToast({ tone: "info", title: "Guardando tema...", durationMs: 900 });

      const res = await fetch("/api/admin/config/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: version,
          patch: {
            theme: {
              primary: form.primary,
              accent: form.accent,
              structure: form.structure,
              bg: form.bg,
              surface: form.surface,
              text: form.text,
              muted: form.muted,
              border: form.border,
              ring: form.ring
            },
            fontHeadingKey: form.fontHeadingKey,
            fontBodyKey: form.fontBodyKey,
            densityDefault: form.densityDefault,
            logoUrl: form.logoUrl || null,
            logoAssetId
          }
        })
      });

      const json = await readJson<{
        ok?: boolean;
        code?: string;
        error?: string;
        issues?: Array<{ path?: string; message?: string }>;
        currentVersion?: number;
        data?: ThemeSnapshot;
        warnings?: string[];
      }>(res);

      if (res.status === 409 || json.code === "CONFLICT") {
        showToast({
          tone: "error",
          title: "Conflicto de versión",
          message: "Otro usuario guardó antes. Recargando configuración...",
          durationMs: 3200
        });
        await loadTheme();
        return;
      }

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(buildApiErrorMessage(json, "No se pudo guardar el tema."));
      }

      setVersion(json.data.version);
      setSource(json.data.source);
      setUpdatedAt(json.data.updatedAt);
      setWarnings(Array.isArray(json.warnings) ? json.warnings : []);
      showToast({ tone: "success", title: `Tema guardado · v${json.data.version}` });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando tema", message: (error as Error).message, durationMs: 4500 });
    } finally {
      setIsSaving(false);
    }
  }

  function restoreStarMedicalDefaults() {
    setForm((prev) => ({
      ...prev,
      primary: STAR_DEFAULTS.primary,
      accent: STAR_DEFAULTS.accent,
      structure: STAR_DEFAULTS.structure,
      bg: STAR_DEFAULTS.bg,
      surface: STAR_DEFAULTS.surface,
      text: STAR_DEFAULTS.text,
      muted: STAR_DEFAULTS.muted,
      border: STAR_DEFAULTS.border,
      ring: STAR_DEFAULTS.ring,
      fontHeadingKey: STAR_DEFAULTS.fontHeadingKey,
      fontBodyKey: STAR_DEFAULTS.fontBodyKey,
      densityDefault: STAR_DEFAULTS.densityDefault
    }));
    setWarnings([]);
  }

  const colorFields = [
    { key: "primary", label: "Primary (Teal)" },
    { key: "accent", label: "Accent (Sky)" },
    { key: "structure", label: "Structure (Corporate Blue)" },
    { key: "bg", label: "Background" },
    { key: "surface", label: "Surface" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Muted" },
    { key: "border", label: "Border" },
    { key: "ring", label: "Ring" }
  ] as const;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tema global StarMedical</CardTitle>
            <p className="text-sm text-slate-500">Tokens por tenant con preview en vivo y control de densidad para pantalla 16&quot;.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {colorFields.map((item) => (
                <div key={item.key}>
                  <label className="text-xs text-slate-600">{item.label}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={form[item.key]}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [item.key]: event.target.value
                        }))
                      }
                      className="h-10 w-10 rounded-lg border border-slate-200"
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                      value={form[item.key]}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [item.key]: event.target.value
                        }))
                      }
                      placeholder="#000000"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Tipografía títulos</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.fontHeadingKey}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fontHeadingKey: event.target.value as ThemeSnapshot["fontHeadingKey"] }))
                  }
                >
                  {FONT_HEADING_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-600">Tipografía cuerpo</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.fontBodyKey}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, fontBodyKey: event.target.value as ThemeSnapshot["fontBodyKey"] }))
                  }
                >
                  {FONT_BODY_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">Densidad por defecto</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.densityDefault}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, densityDefault: event.target.value as ThemeSnapshot["densityDefault"] }))
                }
              >
                <option value="normal">Normal</option>
                <option value="compact">Compacta</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Logo ERP</label>
              <UploadField
                value={form.logoUrl || ""}
                onChange={(url, info) => {
                  setForm((prev) => ({ ...prev, logoUrl: url || "" }));
                  setLogoAssetId(info?.assetId || null);
                }}
                accept="image/*"
                helperText="No se expone secreto; solo referencia de asset/logo."
                onUploadError={(message) => showToast({ tone: "error", title: "Error subiendo logo", message })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isLoading}
                className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b928a] disabled:opacity-60"
              >
                {isSaving ? "Guardando..." : "Guardar tema"}
              </button>

              <button
                type="button"
                onClick={restoreStarMedicalDefaults}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Restaurar a StarMedical
              </button>

              <button
                type="button"
                onClick={() => void loadTheme()}
                disabled={isLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Recargar
              </button>

              <span className="text-xs text-slate-500">
                Versión: <span className="font-semibold text-slate-700">{version}</span> · Fuente: {source === "db" ? "DB" : "Defaults"}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Última actualización: {updatedAt ? new Date(updatedAt).toLocaleString() : "No disponible"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview en vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-xl border p-4 shadow-sm"
              style={{
                backgroundColor: form.bg,
                color: form.text,
                borderColor: form.border,
                fontFamily: bodyFontPreview
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: form.structure, fontFamily: headingFontPreview }}>
                StarMedical ERP
              </p>
              <h3 className="mt-1 text-xl font-semibold" style={{ color: form.primary, fontFamily: headingFontPreview }}>
                Configuración visual activa
              </h3>
              <p className="mt-2 text-sm">Vista referencial para shell, tablas e inputs con densidad {form.densityDefault}.</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: form.primary }}>
                  Primario
                </button>
                <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: form.accent }}>
                  Acción
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg border" style={{ borderColor: form.border }}>
                <table className="w-full text-xs">
                  <thead style={{ backgroundColor: `${form.structure}22`, color: form.structure }}>
                    <tr>
                      <th className="px-2 py-1 text-left">Módulo</th>
                      <th className="px-2 py-1 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: `${form.surface}` }}>
                      <td className="px-2 py-1">Facturación</td>
                      <td className="px-2 py-1">Activo</td>
                    </tr>
                    <tr style={{ backgroundColor: `${form.bg}` }}>
                      <td className="px-2 py-1">Seguridad</td>
                      <td className="px-2 py-1">Revisión</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {localContrastWarnings.length > 0 ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                {localContrastWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {warnings.length > 0 ? (
              <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
