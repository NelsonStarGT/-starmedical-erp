"use client";

import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { label: "Calendario", href: "/admin/agenda" },
  { label: "Citas", href: "/admin/agenda/citas" },
  { label: "Configuración", href: "/admin/agenda/configuracion" }
];

export default function AgendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
