"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type ConfiguracionAdvancedTabTarget =
  | "empresa"
  | "sucursales"
  | "tema"
  | "navegacion"
  | "patentes"
  | "facturacion"
  | "servicios"
  | "seguridad"
  | "comunicaciones";

type SetupStatus = "OK" | "FALTA" | "BLOQUEADO";

type BranchRow = {
  id: string;
  isActive: boolean;
  _count?: {
    businessHours?: number;
    satEstablishments?: number;
  };
};

type SetupSnapshot = {
  smokeOk: boolean;
  smokeCode?: string;
  companyReady: boolean;
  branchReady: boolean;
  hoursReady: boolean;
  satReady: boolean;
  securityReady: boolean;
  communicationReady: boolean;
};

type StepRow = {
  id: string;
  title: string;
  description: string;
  status: SetupStatus;
  actionLabel: string;
  action: () => void;
};

function statusClasses(status: SetupStatus) {
  if (status === "OK") return "bg-[#ecf8f6] text-[#1c5952]";
  if (status === "FALTA") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-700";
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

type Props = {
  onOpenAdvanced: (target: ConfiguracionAdvancedTabTarget) => void;
  onOpenOperation: () => void;
};

export default function CentralConfigSetupWizardPanel({ onOpenAdvanced, onOpenOperation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SetupSnapshot>({
    smokeOk: false,
    smokeCode: undefined,
    companyReady: false,
    branchReady: false,
    hoursReady: false,
    satReady: false,
    securityReady: false,
    communicationReady: false
  });

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [smokeRes, appRes, branchesRes, emailRes, rbacRes] = await Promise.all([
        fetch("/api/admin/config/smoke", { cache: "no-store" }),
        fetch("/api/admin/config/app", { cache: "no-store" }),
        fetch("/api/admin/config/branches?includeInactive=1", { cache: "no-store" }),
        fetch("/api/admin/config/email/global", { cache: "no-store" }),
        fetch("/api/admin/config/rbac", { cache: "no-store" })
      ]);

      const smokeJson = await readJson<{ ok?: boolean; code?: string }>(smokeRes);
      const appJson = await readJson<{ ok?: boolean; data?: { companyName?: string; timezone?: string } }>(appRes);
      const branchesJson = await readJson<{ ok?: boolean; data?: BranchRow[] }>(branchesRes);
      const emailJson = await readJson<{
        ok?: boolean;
        data?: {
          smtpHost?: string;
          fromEmail?: string;
        } | null;
      }>(emailRes);
      const rbacJson = await readJson<{
        roles?: unknown[];
        permissions?: unknown[];
        data?: {
          roles?: unknown[];
          permissions?: unknown[];
        };
      }>(rbacRes);

      const branches = Array.isArray(branchesJson.data) ? branchesJson.data : [];
      const hasActiveBranch = branches.some((row) => row.isActive);
      const hasAnyHours = branches.some((row) => Number(row._count?.businessHours || 0) > 0);
      const hasAnySat = branches.some((row) => Number(row._count?.satEstablishments || 0) > 0);

      const companyName = appJson.data?.companyName?.trim() || "";
      const timezone = appJson.data?.timezone?.trim() || "";
      const smtpHost = emailJson.data?.smtpHost?.trim() || "";
      const fromEmail = emailJson.data?.fromEmail?.trim() || "";

      const roles = Array.isArray(rbacJson.data?.roles)
        ? rbacJson.data.roles
        : Array.isArray(rbacJson.roles)
          ? rbacJson.roles
          : [];
      const permissions = Array.isArray(rbacJson.data?.permissions)
        ? rbacJson.data.permissions
        : Array.isArray(rbacJson.permissions)
          ? rbacJson.permissions
          : [];

      setSnapshot({
        smokeOk: smokeRes.ok && smokeJson.ok === true,
        smokeCode: smokeJson.code,
        companyReady: Boolean(companyName && timezone),
        branchReady: hasActiveBranch,
        hoursReady: hasAnyHours,
        satReady: hasAnySat,
        securityReady: roles.length > 0 && permissions.length > 0,
        communicationReady: Boolean(smtpHost && fromEmail)
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar setup wizard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const steps = useMemo<StepRow[]>(() => {
    const smokeStatus: SetupStatus = snapshot.smokeOk ? "OK" : "BLOQUEADO";

    return [
      {
        id: "step-1",
        title: "Paso 1 · Estado del sistema",
        description: snapshot.smokeOk
          ? "Smoke de Configuración Central en estado OK."
          : `Smoke falló o no ejecutado (${snapshot.smokeCode || "sin código"}).`,
        status: smokeStatus,
        actionLabel: "Ir a corregir",
        action: onOpenOperation
      },
      {
        id: "step-2",
        title: "Paso 2 · Empresa / Tenant",
        description: "Datos legales y de zona horaria para el ERP.",
        status: snapshot.companyReady ? "OK" : "FALTA",
        actionLabel: "Ir a corregir",
        action: () => onOpenAdvanced("empresa")
      },
      {
        id: "step-3",
        title: "Paso 3 · Sucursales",
        description: "Debe existir al menos una sucursal activa.",
        status: snapshot.branchReady ? "OK" : "FALTA",
        actionLabel: "Ir a corregir",
        action: () => onOpenAdvanced("sucursales")
      },
      {
        id: "step-4",
        title: "Paso 4 · Horarios vigentes",
        description: "Publica al menos una vigencia de horario sin solapes.",
        status: snapshot.hoursReady ? "OK" : "FALTA",
        actionLabel: "Ir a corregir",
        action: () => onOpenAdvanced("sucursales")
      },
      {
        id: "step-5",
        title: "Paso 5 · SAT / FEL",
        description: "Configura establecimientos SAT/FEL por sucursal.",
        status: snapshot.satReady ? "OK" : "FALTA",
        actionLabel: "Ir a corregir",
        action: () => onOpenAdvanced("sucursales")
      },
      {
        id: "step-6",
        title: "Paso 6 · Seguridad / Comunicaciones",
        description: snapshot.communicationReady
          ? "RBAC listo y SMTP validado."
          : "RBAC listo. SMTP es opcional pero recomendado para alertas.",
        status: snapshot.securityReady ? "OK" : "FALTA",
        actionLabel: "Ir a corregir",
        action: () => onOpenAdvanced(snapshot.securityReady ? "comunicaciones" : "seguridad")
      }
    ];
  }, [onOpenAdvanced, onOpenOperation, snapshot]);

  return (
    <Card className="border-[#2e75ba]/20 shadow-sm">
      <CardHeader>
        <CardTitle className="text-[#2e75ba]">Inicio · Setup Wizard</CardTitle>
        <p className="text-sm text-slate-600">
          Sigue este flujo para dejar Configuración Central operativa de punta a punta.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando checklist inicial...</p>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", statusClasses(step.status))}>
                    {step.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{step.description}</p>
                <button
                  type="button"
                  onClick={step.action}
                  className="mt-3 rounded-xl border border-[#4aadf5] px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#eff8ff]"
                >
                  {step.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
