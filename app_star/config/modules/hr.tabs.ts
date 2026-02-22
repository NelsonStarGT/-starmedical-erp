import type { ModuleTab } from "@/components/layout/ModuleTabs";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

export const hrTabs: ModuleTab[] = resolveModuleTabs("rrhh", {
  hrefs: {
    dashboard: "/hr",
    empleados: "/hr/employees",
    asistencia: "/hr/attendance",
    nomina: "/hr/payroll",
    // TODO(nav): No existe ruta para "Documentos" en RRHH; queda deshabilitado hasta que exista.
    ajustes: "/hr/settings"
  }
}).map(({ label, href, matchPrefix, disabled }) => ({ label, href, matchPrefix, disabled }));
