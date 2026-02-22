import type { ModuleTab } from "@/components/layout/ModuleTabs";

export const diagnosticsTabs: ModuleTab[] = [
  { label: "Dashboard", href: "/diagnostics" },
  { label: "Ingreso", href: "/diagnostics/intake", matchPrefix: "/diagnostics/intake" },
  { label: "Órdenes", href: "/diagnostics/orders", matchPrefix: "/diagnostics/orders" },
  { label: "Laboratorio", href: "/diagnostics/lab/worklist", matchPrefix: "/diagnostics/lab" },
  { label: "Rayos X", href: "/diagnostics/imaging/xray/worklist", matchPrefix: "/diagnostics/imaging/xray" },
  { label: "Ultrasonidos", href: "/diagnostics/imaging/us/worklist", matchPrefix: "/diagnostics/imaging/us" },
  { label: "Catálogo", href: "/diagnostics/catalog", matchPrefix: "/diagnostics/catalog" }
];
