"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import BillingByLegalEntityPanel from "@/components/configuracion/BillingByLegalEntityPanel";
import CentralBranchesConfigPanel from "@/components/configuracion/CentralBranchesConfigPanel";
import CentralCommunicationsPanel from "@/components/configuracion/CentralCommunicationsPanel";
import CentralConfigOperationPanel from "@/components/configuracion/CentralConfigOperationPanel";
import CentralConfigSetupWizardPanel, {
  ConfiguracionAdvancedTabTarget
} from "@/components/configuracion/CentralConfigSetupWizardPanel";
import CentralConfigSmokePanel from "@/components/configuracion/CentralConfigSmokePanel";
import CentralThemeBrandingPanel from "@/components/configuracion/CentralThemeBrandingPanel";
import LegalEntitiesPanel from "@/components/configuracion/LegalEntitiesPanel";
import NavigationPolicyPanel from "@/components/configuracion/NavigationPolicyPanel";
import SecurityPolicyPanel from "@/components/configuracion/SecurityPolicyPanel";
import ServicesProcessingPanel from "@/components/configuracion/ServicesProcessingPanel";
import TenantBasePanel from "@/components/configuracion/TenantBasePanel";
import TenantDateTimeConfigPanel from "@/components/configuracion/TenantDateTimeConfigPanel";
import { cn } from "@/lib/utils";

type RootTab = "inicio" | "operacion" | "avanzado";

type AdvancedSectionMeta = {
  id: ConfiguracionAdvancedTabTarget;
  label: string;
  hint: string;
  route: string;
};

const rootTabs: Array<{ id: RootTab; label: string; description: string }> = [
  {
    id: "inicio",
    label: "Inicio",
    description: "Setup Wizard para dejar la configuración central lista de punta a punta."
  },
  {
    id: "operacion",
    label: "Operación",
    description: "Health/consistencia: smoke, sede activa, horarios, SAT y banderas críticas."
  },
  {
    id: "avanzado",
    label: "Avanzado",
    description: "Servicios, seguridad, correo, facturación por patente y políticas de navegación."
  }
];

const advancedSections: AdvancedSectionMeta[] = [
  {
    id: "empresa",
    label: "Tenant / Empresa",
    hint: "Datos base corporativos, zona horaria y branding mínimo.",
    route: "/admin/configuracion"
  },
  {
    id: "sucursales",
    label: "Sucursales y horarios",
    hint: "CRUD de sucursales, vigencias de horario y SAT/FEL por sede.",
    route: "/admin/configuracion"
  },
  {
    id: "tema",
    label: "Tema",
    hint: "Tokens visuales globales, contraste y densidad.",
    route: "/admin/configuracion/tema"
  },
  {
    id: "navegacion",
    label: "Navegación",
    hint: "Sidebar colapsable y orden de módulos por tenant.",
    route: "/admin/configuracion/navegacion"
  },
  {
    id: "patentes",
    label: "Patentes",
    hint: "Legal Entities multi-tenant con validaciones de NIT.",
    route: "/admin/configuracion/patentes"
  },
  {
    id: "facturacion",
    label: "Facturación",
    hint: "Series/correlativos por patente y defaults por sucursal/tenant.",
    route: "/admin/configuracion/facturacion"
  },
  {
    id: "servicios",
    label: "Servicios",
    hint: "Processing-service y sandbox técnico por tenant.",
    route: "/admin/configuracion/servicios"
  },
  {
    id: "seguridad",
    label: "Seguridad",
    hint: "Policy por tenant + auditoría de mutaciones.",
    route: "/admin/configuracion/seguridad"
  },
  {
    id: "comunicaciones",
    label: "Comunicaciones",
    hint: "SMTP global, prueba de envío y checklist SPF/DKIM/DMARC.",
    route: "/admin/configuracion/servicios"
  }
];

const quickActions: Array<{ href: string; label: string; description: string }> = [
  {
    href: "/admin/configuracion/tema",
    label: "Validar tema",
    description: "Revisa contraste, branding y consistencia visual global."
  },
  {
    href: "/admin/configuracion/servicios",
    label: "Configurar servicios",
    description: "Ajusta processing-service, correo y llaves internas."
  },
  {
    href: "/admin/configuracion/procesamiento",
    label: "Auditar procesamiento",
    description: "Consulta jobs, artefactos y límites por tenant."
  }
];

function sectionDomId(target: ConfiguracionAdvancedTabTarget) {
  return `advanced-section-${target}`;
}

function renderAdvancedSection(target: ConfiguracionAdvancedTabTarget) {
  switch (target) {
    case "empresa":
      return (
        <div className="space-y-4">
          <TenantBasePanel />
          <TenantDateTimeConfigPanel />
        </div>
      );
    case "sucursales":
      return <CentralBranchesConfigPanel />;
    case "tema":
      return <CentralThemeBrandingPanel />;
    case "navegacion":
      return <NavigationPolicyPanel />;
    case "patentes":
      return <LegalEntitiesPanel />;
    case "facturacion":
      return <BillingByLegalEntityPanel />;
    case "servicios":
      return <ServicesProcessingPanel />;
    case "seguridad":
      return <SecurityPolicyPanel />;
    case "comunicaciones":
      return <CentralCommunicationsPanel />;
    default:
      return <TenantBasePanel />;
  }
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<RootTab>("inicio");
  const [advancedSection, setAdvancedSection] = useState<ConfiguracionAdvancedTabTarget>("empresa");

  const selectedAdvancedMeta = useMemo(
    () => advancedSections.find((entry) => entry.id === advancedSection) || advancedSections[0],
    [advancedSection]
  );

  const openAdvancedSection = useCallback((target: ConfiguracionAdvancedTabTarget) => {
    setTab("avanzado");
    setAdvancedSection(target);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const node = window.document.getElementById(sectionDomId(target));
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const openOperation = useCallback(() => {
    setTab("operacion");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const node = window.document.getElementById("config-operacion");
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  return (
    <div className="space-y-4 text-[#0f172a]" style={{ fontFamily: '"Inter", "Nunito Sans", var(--font-sans)' }}>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración central</p>
        <h1 className="text-xl font-semibold" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
          Inicio (Checklist de configuración)
        </h1>
        <p className="text-xs text-slate-600">
          Tablero operativo con setup wizard, diagnóstico rápido y accesos directos para dejar el tenant listo sin pasos manuales.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 transition hover:border-[#4aadf5]"
            >
              <p className="text-sm font-semibold text-[#2e75ba]">{action.label}</p>
              <p className="mt-0.5 text-xs text-slate-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {rootTabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition",
                  active
                    ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                    : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-[#4aadf5]"
                )}
              >
                <p className="text-sm font-semibold">{item.label}</p>
                <p className={cn("mt-1 text-xs", active ? "text-blue-50" : "text-slate-500")}>{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {tab === "inicio" ? (
        <section id="config-inicio" className="space-y-4">
          <CentralConfigSetupWizardPanel onOpenAdvanced={openAdvancedSection} onOpenOperation={openOperation} />
        </section>
      ) : null}

      {tab === "operacion" ? (
        <section id="config-operacion" className="space-y-4">
          <CentralConfigOperationPanel onOpenAdvanced={openAdvancedSection} />
          <CentralConfigSmokePanel />
        </section>
      ) : null}

      {tab === "avanzado" ? (
        <section id="config-avanzado" className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Secciones avanzadas</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {advancedSections.map((section) => {
                const active = section.id === advancedSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setAdvancedSection(section.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition",
                      active
                        ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                        : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-[#4aadf5]"
                    )}
                  >
                    <p className="text-sm font-semibold">{section.label}</p>
                    <p className={cn("mt-1 text-xs", active ? "text-blue-50" : "text-slate-500")}>{section.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div id={sectionDomId(advancedSection)} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">{selectedAdvancedMeta?.label}</p>
                <p className="text-xs text-slate-600">{selectedAdvancedMeta?.hint}</p>
              </div>
              <Link
                href={selectedAdvancedMeta?.route || "/admin/configuracion"}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4aadf5]"
              >
                Abrir ruta dedicada
              </Link>
            </div>

            {renderAdvancedSection(advancedSection)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
