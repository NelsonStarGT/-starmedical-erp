"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";

type SystemFeatureFlags = {
  portal: {
    enabled: boolean;
    strictAvailability: boolean;
  };
  sat: {
    requireActiveSeries: boolean;
  };
  branches: {
    preventDeactivateWithFutureAppointments: boolean;
  };
  theme: {
    requireValidHex: boolean;
  };
  reception: {
    forceBranchSelection: boolean;
  };
};

type SystemFeatureConfigSnapshot = {
  id: "global";
  version: number;
  flags: SystemFeatureFlags;
  strictMode: boolean;
  source: "db" | "defaults";
  updatedAt: string | null;
};

function emptyConfig(): SystemFeatureConfigSnapshot {
  return {
    id: "global",
    version: 1,
    strictMode: false,
    source: "defaults",
    updatedAt: null,
    flags: {
      portal: { enabled: true, strictAvailability: true },
      sat: { requireActiveSeries: true },
      branches: { preventDeactivateWithFutureAppointments: true },
      theme: { requireValidHex: true },
      reception: { forceBranchSelection: true }
    }
  };
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export default function CentralSystemFlagsPanel() {
  const { toasts, showToast, dismiss } = useConfigToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<SystemFeatureConfigSnapshot>(emptyConfig());

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await configApiFetch("/api/admin/config/system-flags", { cache: "no-store" });
      const json = await readJson<{ ok?: boolean; error?: string; data?: SystemFeatureConfigSnapshot }>(res);
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "No se pudo cargar feature flags.");
      }
      setConfig(json.data);
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error cargando feature flags",
        message: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  function setFlag<K1 extends keyof SystemFeatureFlags, K2 extends keyof SystemFeatureFlags[K1]>(
    section: K1,
    key: K2,
    value: boolean
  ) {
    setConfig((prev) => ({
      ...prev,
      flags: {
        ...prev.flags,
        [section]: {
          ...prev.flags[section],
          [key]: value
        }
      }
    }));
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      showToast({ tone: "info", title: "Guardando feature flags...", durationMs: 900 });

      const res = await configApiFetch("/api/admin/config/system-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: config.version,
          patch: {
            strictMode: config.strictMode,
            flags: config.flags
          }
        })
      });

      const json = await readJson<{
        ok?: boolean;
        code?: string;
        error?: string;
        currentVersion?: number;
        data?: SystemFeatureConfigSnapshot;
        issues?: Array<{ path?: string; message?: string }>;
      }>(res);

      if (res.status === 409 || json.code === "CONFLICT") {
        showToast({
          tone: "error",
          title: "Conflicto de versión",
          message: "Otro usuario guardó antes. Recargando configuración...",
          durationMs: 3500
        });
        await loadConfig();
        return;
      }

      if (res.status === 422 && Array.isArray(json.issues) && json.issues.length > 0) {
        const detail = json.issues
          .slice(0, 3)
          .map((issue) => `${issue.path || "patch"}: ${issue.message || "inválido"}`)
          .join(" | ");
        throw new Error(detail || "Datos inválidos para feature flags.");
      }

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error || "No se pudo guardar feature flags.");
      }

      setConfig(json.data);
      showToast({
        tone: "success",
        title: `Guardado ✅ Versión ${json.data.version}`
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error guardando feature flags",
        message: (error as Error).message,
        durationMs: 4500
      });
    } finally {
      setIsSaving(false);
    }
  }

  const strictBadge = config.strictMode ? "STRICT MODE: ON" : "STRICT MODE: OFF";

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags (comportamiento)</CardTitle>
          <p className="text-sm text-slate-500">
            Interruptores de comportamiento (seguridad y rollout) sin despliegue. En Strict Mode se eliminan fallbacks silenciosos.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                config.strictMode ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              {strictBadge}
            </span>
            <span className="text-xs text-slate-500">
              Versión: <span className="font-semibold text-slate-700">{config.version}</span> · Fuente:{" "}
              {config.source === "db" ? "DB" : "Defaults"}
            </span>
            <span className="text-xs text-slate-500">
              Última actualización: {config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "No disponible"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1"
                checked={config.strictMode}
                onChange={(event) => setConfig((prev) => ({ ...prev, strictMode: event.target.checked }))}
              />
              <span>
                <span className="font-semibold">Strict Mode global</span>
                <span className="mt-1 block text-xs text-slate-600">
                  Ignora fallbacks suaves y fuerza validaciones operativas en availability, sucursales, SAT y theme.
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-[#2e75ba]">Portal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.portal.enabled}
                    onChange={(event) => setFlag("portal", "enabled", event.target.checked)}
                  />
                  Portal habilitado
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.portal.strictAvailability}
                    onChange={(event) => setFlag("portal", "strictAvailability", event.target.checked)}
                  />
                  Strict availability
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-[#2e75ba]">SAT</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.sat.requireActiveSeries}
                    onChange={(event) => setFlag("sat", "requireActiveSeries", event.target.checked)}
                  />
                  Requerir serie FEL activa para emitir documento
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-[#2e75ba]">Sucursales</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.branches.preventDeactivateWithFutureAppointments}
                    onChange={(event) =>
                      setFlag("branches", "preventDeactivateWithFutureAppointments", event.target.checked)
                    }
                  />
                  Bloquear desactivación con citas futuras
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base text-[#2e75ba]">Theme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.theme.requireValidHex}
                    onChange={(event) => setFlag("theme", "requireValidHex", event.target.checked)}
                  />
                  Validación estricta de HEX
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={config.flags.reception.forceBranchSelection}
                    onChange={(event) => setFlag("reception", "forceBranchSelection", event.target.checked)}
                  />
                  Recepción exige sede activa seleccionada
                </label>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isLoading}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b928a] disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar flags"}
            </button>
            <button
              type="button"
              onClick={() => void loadConfig()}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {isLoading ? "Cargando..." : "Recargar"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
