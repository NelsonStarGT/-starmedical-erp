"use client";

import { Tabs } from "@/components/ui/Tabs";
import { ClientProvider } from "@/components/clients/ClientProvider";

const tabs = [
  { label: "Dashboard", href: "/admin/clientes" },
  { label: "Gestión de clientes", href: "/admin/clientes/lista" },
  { label: "Configuración", href: "/admin/clientes/configuracion" }
];

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      <div className="space-y-4">
        <Tabs items={tabs} />
        {children}
      </div>
    </ClientProvider>
  );
}
