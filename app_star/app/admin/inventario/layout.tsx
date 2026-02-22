"use client";

import { Tabs } from "@/components/ui/Tabs";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const tabs = resolveModuleTabs("inventario", {
  hrefs: {
    dashboard: "/admin/inventario",
    productos: "/admin/inventario/productos",
    servicios: "/admin/inventario/servicios",
    combos: "/admin/inventario/combos",
    movimientos: "/admin/inventario/movimientos",
    // Nota: este href ya existe hoy en el menú como "Solicitudes / Órdenes". No se cambia la ruta.
    ordenes: "/admin/inventario/solicitudes",
    configuracion: "/admin/inventario/configuracion",
    // TODO(nav): No existe ruta para "Reportes" en Inventario; queda deshabilitado hasta que exista.
  }
}).map(({ label, href }) => ({ label, href }));

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
