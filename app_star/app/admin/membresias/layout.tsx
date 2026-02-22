"use client";

import { Tabs } from "@/components/ui/Tabs";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const items = resolveModuleTabs("membresias", {
  hrefs: {
    dashboard: "/admin/membresias",
    gestion: "/admin/membresias/contratos",
    planes: "/admin/membresias/planes",
    // TODO(nav): No existe ruta para "Renovaciones" en Membresías; queda deshabilitado hasta que exista.
    // TODO(nav): No existe ruta para "Cobranza" en Membresías; queda deshabilitado hasta que exista.
    configuracion: "/admin/membresias/configuracion"
  },
  extra: [{ key: "impresion", label: "Impresión", href: "/admin/membresias/impresion" }]
}).map(({ label, href }) => ({ label, href }));

export default function MembresiasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Tabs items={items} />
      {children}
    </div>
  );
}
