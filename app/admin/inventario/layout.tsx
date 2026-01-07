"use client";

import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { label: "Dashboard", href: "/admin/inventario" },
  { label: "Productos", href: "/admin/inventario/productos" },
  { label: "Servicios", href: "/admin/inventario/servicios" },
  { label: "Combos / Paquetes", href: "/admin/inventario/combos" },
  { label: "Movimientos", href: "/admin/inventario/movimientos" },
  { label: "Solicitudes / Órdenes", href: "/admin/inventario/solicitudes" },
  { label: "Configuración", href: "/admin/inventario/configuracion" }
];

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
