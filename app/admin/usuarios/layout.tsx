"use client";

import { Tabs } from "@/components/ui/Tabs";
import { UserProvider } from "@/components/users/UserProvider";

const tabs = [
  { label: "Dashboard", href: "/admin/usuarios" },
  { label: "Gestión de usuarios", href: "/admin/usuarios/lista" },
  { label: "Configuración", href: "/admin/usuarios/configuracion" }
];

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="space-y-4">
        <Tabs items={tabs} />
        {children}
      </div>
    </UserProvider>
  );
}
