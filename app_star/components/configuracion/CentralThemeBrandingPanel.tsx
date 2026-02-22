"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import UploadField from "@/components/ui/UploadField";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type ThemeSnapshot = {
  id: "global";
  version: number;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    surface: string;
    text: string;
  };
  fontKey: "inter" | "poppins" | "montserrat" | "nunito" | "roboto";
  logoUrl: string | null;
  logoAssetId: string | null;
  source: "db" | "defaults";
  updatedAt: string | null;
};

type ApiErrorPayload = {
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

const FONT_OPTIONS: Array<{ value: ThemeSnapshot["fontKey"]; label: string; family: string }> = [
  { value: "inter", label: "Inter", family: "Inter, system-ui, sans-serif" },
  { value: "poppins", label: "Poppins", family: "Poppins, system-ui, sans-serif" },
  { value: "montserrat", label: "Montserrat", family: "Montserrat, system-ui, sans-serif" },
  { value: "nunito", label: "Nunito", family: "Nunito, system-ui, sans-serif" },
  { value: "roboto", label: "Roboto", family: "Roboto, system-ui, sans-serif" }
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

function isValidHex(value: string) {
  return HEX_COLOR_REGEX.test(value.trim());
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CentralThemeBrandingPanel() {
  const { toasts, showToast, dismiss } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState(1);
  const [source, setSource] = useState<ThemeSnapshot["source"]>("defaults");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);

  const [form, setForm] = useState({
    primary: "#2e75ba",
    secondary: "#4aadf5",
    accent: "#4aa59c",
    bg: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    fontKey: "inter" as ThemeSnapshot["fontKey"],
    logoUrl: ""
  });

  const fontFamilyPreview = useMemo(
    () => FONT_OPTIONS.find((item) => item.value === form.fontKey)?.family || FONT_OPTIONS[0].family,
    [form.fontKey]
  );

  const loadTheme = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/theme", { cache: "no-store" });
      const json = await readJson<{ ok?: boolean; error?: string; data?: ThemeSnapshot }>(res);
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(buildApiErrorMessage(json, "No se pudo cargar theme config."));
      }

      setVersion(json.data.version);
      setSource(json.data.source);
      setUpdatedAt(json.data.updatedAt);
      setLogoAssetId(json.data.logoAssetId || null);
      setForm({
        primary: json.data.theme.primary,
        secondary: json.data.theme.secondary,
        accent: json.data.theme.accent,
        bg: json.data.theme.bg,
        surface: json.data.theme.surface,
        text: json.data.theme.text,
        fontKey: json.data.fontKey,
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
    const colors = [form.primary, form.secondary, form.accent, form.bg, form.surface, form.text];
    if (!colors.every(isValidHex)) {
      throw new Error("Todos los colores deben usar formato HEX #RRGGBB.");
    }

    if (form.logoUrl && !isValidHttpUrl(form.logoUrl)) {
      throw new Error("logoUrl debe ser URL válida (http/https).");
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
              secondary: form.secondary,
              accent: form.accent,
              bg: form.bg,
              surface: form.surface,
              text: form.text
            },
            fontKey: form.fontKey,
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
      }>(res);

      if (res.status === 409 || json.code === "CONFLICT") {
        showToast({
          tone: "error",
          title: "Conflicto de versión",
          message: "Otro usuario guardó antes. Recargando configuración...",
          durationMs: 3000
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
      showToast({ tone: "success", title: `Guardado ✅ Versión ${json.data.version}` });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando tema", message: (error as Error).message, durationMs: 4500 });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tema / Branding ERP</CardTitle>
            <p className="text-sm text-slate-500">Tokens visuales globales para shell admin, módulos y PDFs futuros.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { key: "primary", label: "Primary" },
                { key: "secondary", label: "Secondary" },
                { key: "accent", label: "Accent" },
                { key: "bg", label: "Background" },
                { key: "surface", label: "Surface" },
                { key: "text", label: "Text" }
              ].map((item) => (
                <div key={item.key}>
                  <label className="text-xs text-slate-600">{item.label}</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={form[item.key as keyof typeof form] as string}
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
                      value={form[item.key as keyof typeof form] as string}
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

            <div>
              <label className="text-xs text-slate-600">Tipografía global</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.fontKey}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fontKey: event.target.value as ThemeSnapshot["fontKey"] }))
                }
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
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
                helperText="PNG/JPG recomendado para header y PDFs"
                onUploadError={(message) => showToast({ tone: "error", title: "Error subiendo logo", message })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-2xl border p-4 shadow-sm"
              style={{
                backgroundColor: form.bg,
                color: form.text,
                borderColor: `${form.secondary}66`,
                fontFamily: fontFamilyPreview
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: form.secondary }}>
                StarMedical ERP
              </p>
              <h3 className="mt-1 text-xl font-semibold" style={{ color: form.primary }}>
                Configuración visual activa
              </h3>
              <p className="mt-2 text-sm">
                Este preview representa botones, badges y superficies del shell administrativo.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: form.primary }}
                >
                  Botón primario
                </button>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: form.accent }}
                >
                  Acción rápida
                </button>
              </div>

              <div
                className="mt-4 rounded-xl border p-3"
                style={{
                  backgroundColor: form.surface,
                  borderColor: `${form.primary}44`
                }}
              >
                <p className="text-sm font-semibold" style={{ color: form.primary }}>
                  Card de ejemplo
                </p>
                <p className="text-xs" style={{ color: form.text }}>
                  Preparado para integrar facturación/PDF y componentes comunes.
                </p>
              </div>
            </div>

            {source === "defaults" ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Usando defaults (no publicado). Guarda para persistir este branding en base de datos.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
