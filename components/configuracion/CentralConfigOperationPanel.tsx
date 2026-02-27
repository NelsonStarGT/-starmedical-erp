"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ConfiguracionAdvancedTabTarget } from "@/components/configuracion/CentralConfigSetupWizardPanel";

type SmokePayload = {
  ok?: boolean;
  code?: string;
  error?: string;
};

type BranchRow = {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
  _count?: {
    businessHours?: number;
    satEstablishments?: number;
  };
};

type ActiveBranchPayload = {
  ok?: boolean;
  data?: {
    branchId?: string | null;
    branch?: {
      id: string;
      name: string;
      code?: string | null;
    } | null;
  };
  error?: string;
};

type HoursPayload = {
  ok?: boolean;
  data?: {
    current?: CurrentHoursRow | null;
  };
};

type CurrentHoursRow = {
  id: string;
  slotMinutesDefault: number | null;
  scheduleJson?: Record<string, string[]>;
};

type EstablishmentsPayload = {
  ok?: boolean;
  data?: {
    items?: Array<{
      id: string;
      isActive: boolean;
    }>;
  };
};

type ThemePayload = {
  ok?: boolean;
  data?: {
    version?: number;
    source?: "db" | "defaults";
    theme?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
};

type FlagsPayload = {
  ok?: boolean;
  data?: {
    strictMode?: boolean;
    flags?: {
      portal?: {
        enabled?: boolean;
        strictAvailability?: boolean;
      };
      branches?: {
        preventDeactivateWithFutureAppointments?: boolean;
      };
      sat?: {
        requireActiveSeries?: boolean;
      };
    };
  };
};

type AlertRow = {
  id: string;
  tone: "warning" | "error";
  message: string;
  actionLabel: string;
  targetTab: ConfiguracionAdvancedTabTarget;
};

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

type Props = {
  onOpenAdvanced: (target: ConfiguracionAdvancedTabTarget) => void;
};

export default function CentralConfigOperationPanel({ onOpenAdvanced }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [smoke, setSmoke] = useState<SmokePayload>({});
  const [activeBranch, setActiveBranch] = useState<BranchRow | null>(null);
  const [currentHours, setCurrentHours] = useState<CurrentHoursRow | null>(null);
  const [satItems, setSatItems] = useState<Array<{ id: string; isActive: boolean }>>([]);
  const [theme, setTheme] = useState<ThemePayload["data"] | null>(null);
  const [flags, setFlags] = useState<FlagsPayload["data"] | null>(null);

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [smokeRes, activeBranchRes, themeRes, flagsRes] = await Promise.all([
        configApiFetch("/api/admin/config/smoke", { cache: "no-store" }),
        configApiFetch("/api/admin/session/active-branch", { cache: "no-store" }),
        configApiFetch("/api/admin/config/theme", { cache: "no-store" }),
        configApiFetch("/api/admin/config/system-flags", { cache: "no-store" })
      ]);

      const smokeJson = await readJson<SmokePayload>(smokeRes);
      const activeBranchJson = await readJson<ActiveBranchPayload>(activeBranchRes);
      const themeJson = await readJson<ThemePayload>(themeRes);
      const flagsJson = await readJson<FlagsPayload>(flagsRes);

      setSmoke({
        ok: smokeRes.ok && smokeJson.ok === true,
        code: smokeJson.code,
        error: smokeJson.error
      });
      setTheme(themeRes.ok && themeJson.ok ? themeJson.data || null : null);
      setFlags(flagsRes.ok && flagsJson.ok ? flagsJson.data || null : null);

      const resolvedActiveBranch =
        activeBranchRes.ok && activeBranchJson.ok && activeBranchJson.data?.branch
          ? {
              id: activeBranchJson.data.branch.id,
              name: activeBranchJson.data.branch.name,
              code: activeBranchJson.data.branch.code ?? null,
              isActive: true
            }
          : null;
      setActiveBranch(resolvedActiveBranch);

      if (!resolvedActiveBranch) {
        setCurrentHours(null);
        setSatItems([]);
        return;
      }

      const [hoursRes, satRes] = await Promise.all([
        configApiFetch(`/api/admin/config/branches/${resolvedActiveBranch.id}/hours`, { cache: "no-store" }),
        configApiFetch(`/api/admin/config/branches/${resolvedActiveBranch.id}/establishments`, { cache: "no-store" })
      ]);

      const hoursJson = await readJson<HoursPayload>(hoursRes);
      const satJson = await readJson<EstablishmentsPayload>(satRes);

      setCurrentHours(hoursRes.ok && hoursJson.ok ? hoursJson.data?.current || null : null);
      setSatItems(
        satRes.ok && satJson.ok && Array.isArray(satJson.data?.items)
          ? satJson.data.items.map((row) => ({ id: row.id, isActive: row.isActive }))
          : []
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar panel operativo.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const alerts = useMemo<AlertRow[]>(() => {
    const rows: AlertRow[] = [];

    if (!smoke.ok) {
      rows.push({
        id: "smoke-fail",
        tone: "error",
        message: smoke.error || "Smoke de Configuración Central con fallas.",
        actionLabel: "Revisar sucursales",
        targetTab: "sucursales"
      });
    }

    if (!activeBranch) {
      rows.push({
        id: "no-active-branch",
        tone: "error",
        message: "No hay sede activa definida para esta sesión.",
        actionLabel: "Ir a Sucursales y horarios",
        targetTab: "sucursales"
      });
    }

    if (activeBranch && !currentHours) {
      rows.push({
        id: "no-hours",
        tone: "warning",
        message: `La sede activa ${activeBranch.name} no tiene horario vigente publicado.`,
        actionLabel: "Publicar horario",
        targetTab: "sucursales"
      });
    }

    if (!theme || theme.source !== "db") {
      rows.push({
        id: "theme-defaults",
        tone: "warning",
        message: "Theme/branding en defaults. Publica la configuración global.",
        actionLabel: "Ir a tema",
        targetTab: "tema"
      });
    }

    return rows;
  }, [activeBranch, currentHours, smoke, theme]);

  const satActiveCount = satItems.filter((row) => row.isActive).length;

  return (
    <div className="space-y-4">
      <Card className="border-[#2e75ba]/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Operación</CardTitle>
          <p className="text-sm text-slate-600">
            Estado operativo de sede, SAT, tema y flags críticos para evitar fallas en producción.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Cargando estado operativo...</p>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Sede activa</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{activeBranch?.name || "No definida"}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Horario vigente: {currentHours ? "Publicado" : "No configurado"}
                </p>
                <p className="text-xs text-slate-600">
                  Slot default: {currentHours?.slotMinutesDefault ? `${currentHours.slotMinutesDefault} min` : "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">SAT / FEL</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {satItems.length === 0 ? "Sin establecimientos" : `${satItems.length} establecimientos`}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Activos: {satActiveCount} · Draft/inactivos: {Math.max(satItems.length - satActiveCount, 0)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Theme global</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {theme?.source === "db" ? `Versión ${theme.version || "—"}` : "Usando defaults"}
                </p>
                <p className="mt-1 text-xs text-slate-600">Primary: {theme?.theme?.primary || "#2e75ba"}</p>
                <p className="text-xs text-slate-600">Accent: {theme?.theme?.accent || "#4aa59c"}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Feature flags</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  Strict mode: {flags?.strictMode ? "ON" : "OFF"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Portal: {flags?.flags?.portal?.enabled ? "Habilitado" : "Deshabilitado"}
                </p>
                <p className="text-xs text-slate-600">
                  Strict availability: {flags?.flags?.portal?.strictAvailability ? "ON" : "OFF"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Alertas accionables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-600">Sin alertas críticas en el estado actual.</p>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border px-3 py-2 text-sm md:flex-row md:items-center md:justify-between",
                  alert.tone === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <p>{alert.message}</p>
                <button
                  type="button"
                  onClick={() => onOpenAdvanced(alert.targetTab)}
                  className="rounded-lg border border-current px-2 py-1 text-xs font-semibold"
                >
                  {alert.actionLabel}
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">
          Smoke: <span className={cn("font-semibold", smoke.ok ? "text-[#1c5952]" : "text-rose-700")}>{smoke.ok ? "OK" : "FAIL"}</span>
          {smoke.code ? <span className="ml-2 text-xs text-slate-500">({smoke.code})</span> : null}
        </p>
      </div>
    </div>
  );
}
