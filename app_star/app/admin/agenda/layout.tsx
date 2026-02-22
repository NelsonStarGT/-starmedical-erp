"use client";

import { Tabs } from "@/components/ui/Tabs";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const tabs = resolveModuleTabs("agenda", {
  hrefs: {
    // TODO(nav): No existe ruta para "Dashboard" en Agenda; queda deshabilitado hasta que exista.
    calendario: "/admin/agenda",
    citas: "/admin/agenda/citas",
    // TODO(nav): No existe ruta para "Recursos" en Agenda; queda deshabilitado hasta que exista.
    configuracion: "/admin/agenda/configuracion"
  }
}).map(({ label, href }) => ({ label, href }));

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
