import type { ModuleTab } from "@/components/layout/ModuleTabs";

export const hrTabs: ModuleTab[] = [
  { label: "Empleados", href: "/hr/employees" },
  { label: "Asistencia", href: "/hr/attendance", matchPrefix: "/hr/attendance" },
  { label: "Nómina", href: "/hr/payroll", matchPrefix: "/hr/payroll" },
  { label: "Ajustes", href: "/hr/settings", matchPrefix: "/hr/settings" }
];
