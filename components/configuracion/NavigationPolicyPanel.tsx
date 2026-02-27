"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";

type NavigationPolicySnapshot = {
  tenantId: string;
  defaultSidebarCollapsed: boolean;
  forceSidebarCollapsed: boolean;
  moduleOrderingEnabled: boolean;
  moduleOrder: string[];
  updatedAt: string | null;
  source: "db" | "defaults";
};

type ApiEnvelope<T> = {
  ok?: boolean;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

const defaultPolicy: NavigationPolicySnapshot = {
  tenantId: "global",
  defaultSidebarCollapsed: false,
  forceSidebarCollapsed: false,
  moduleOrderingEnabled: false,
  moduleOrder: [],
  updatedAt: null,
  source: "defaults"
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function normalizeModuleOrder(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export default function NavigationPolicyPanel() {
  const { toasts, dismiss, showToast } = useConfigToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<NavigationPolicySnapshot>(defaultPolicy);
  const [moduleOrderInput, setModuleOrderInput] = useState("");

  const serializedDate = useMemo(() => {
    if (!policy.updatedAt) return "Sin cambios registrados";
    return new Date(policy.updatedAt).toLocaleString();
  }, [policy.updatedAt]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await configApiFetch("/api/admin/config/navigation", { cache: "no-store" });
        const payload = await parseEnvelope<NavigationPolicySnapshot>(response);
        if (!response.ok || payload.ok === false || !payload.data) {
          throw new Error(payload.error || "No se pudo cargar política de navegación.");
        }

        if (!active) return;
        setPolicy(payload.data);
        setModuleOrderInput((payload.data.moduleOrder || []).join("\n"));
      } catch (error) {
        if (!active) return;
        showToast({ tone: "error", title: "Error cargando política", message: (error as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  async function savePolicy() {
    try {
      setSaving(true);
      const payload = {
        defaultSidebarCollapsed: policy.defaultSidebarCollapsed,
        forceSidebarCollapsed: policy.forceSidebarCollapsed,
        moduleOrderingEnabled: policy.moduleOrderingEnabled,
        moduleOrder: normalizeModuleOrder(moduleOrderInput)
      };

      const response = await configApiFetch("/api/admin/config/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await parseEnvelope<NavigationPolicySnapshot>(response);
      if (!response.ok || json.ok === false || !json.data) {
        const issues = Array.isArray(json.issues)
          ? json.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" · ")
          : "";
        throw new Error(`${json.error || "No se pudo guardar la política."}${issues ? ` (${issues})` : ""}`);
      }

      setPolicy(json.data);
      setModuleOrderInput((json.data.moduleOrder || []).join("\n"));
      showToast({ tone: "success", title: "Política actualizada" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Navegación y sidebar</CardTitle>
          <p className="text-sm text-slate-600">
            Define comportamiento por tenant para menú colapsado por defecto y prepara orden de módulos con feature flag.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={policy.defaultSidebarCollapsed}
                onChange={(event) =>
                  setPolicy((prev) => ({
                    ...prev,
                    defaultSidebarCollapsed: event.target.checked
                  }))
                }
                disabled={loading || saving || policy.forceSidebarCollapsed}
              />
              <span>
                <span className="font-semibold">Sidebar colapsada por defecto</span>
                <span className="block text-xs text-slate-500">Se aplica cuando el usuario no tiene preferencia local guardada.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={policy.forceSidebarCollapsed}
                onChange={(event) =>
                  setPolicy((prev) => ({
                    ...prev,
                    forceSidebarCollapsed: event.target.checked,
                    defaultSidebarCollapsed: event.target.checked ? true : prev.defaultSidebarCollapsed
                  }))
                }
                disabled={loading || saving}
              />
              <span>
                <span className="font-semibold">Forzar sidebar colapsada</span>
                <span className="block text-xs text-slate-500">Ignora preferencia local y bloquea el botón de expandir.</span>
              </span>
            </label>
          </div>

          <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={policy.moduleOrderingEnabled}
              onChange={(event) => setPolicy((prev) => ({ ...prev, moduleOrderingEnabled: event.target.checked }))}
              disabled={loading || saving}
            />
            <span>
              <span className="font-semibold">Habilitar orden personalizado de módulos</span>
              <span className="block text-xs text-slate-500">Feature flag lista para rollout gradual.</span>
            </span>
          </label>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Orden de módulos (uno por línea)</label>
            <textarea
              rows={6}
              value={moduleOrderInput}
              onChange={(event) => setModuleOrderInput(event.target.value)}
              placeholder="admin\nfacturacion\ninventario"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              disabled={loading || saving}
            />
            <p className="mt-1 text-xs text-slate-500">Cuando la flag está activa, este orden se usa como base para navegación contextual y menú.</p>
          </div>

          {policy.forceSidebarCollapsed ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Política activa: el menú queda siempre colapsado para todos los usuarios del tenant.
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void savePolicy()}
              disabled={loading || saving}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar política"}
            </button>
            <span className="text-xs text-slate-500">Última actualización: {serializedDate}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
