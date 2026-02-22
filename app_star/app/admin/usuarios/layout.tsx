"use client";

import { Tabs } from "@/components/ui/Tabs";
import { UserProvider } from "@/components/users/UserProvider";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";

const tabs = resolveModuleTabs("usuarios", {
  hrefs: {
    dashboard: "/admin/usuarios",
    usuarios: "/admin/usuarios/lista",
    roles: "/admin/usuarios/permisos",
    // TODO(nav): No existe ruta para "Sucursales" en este módulo; queda deshabilitado hasta que exista.
    configuracion: "/admin/usuarios/configuracion"
  }
}).map(({ label, href }) => ({ label, href }));

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
