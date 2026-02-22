import type { Metadata } from "next";
import AdminShellServer from "@/components/layout/AdminShellServer";
import ModuleTopTabs from "@/components/navigation/ModuleTopTabs";
import { resolveModuleTabs } from "@/lib/navigation/moduleTabs.visual";
import MarcajeQueryProvider from "./query-provider";

export const metadata: Metadata = {
  title: "Marcaje | StarMedical"
};

const marcajeTabs = resolveModuleTabs("marcaje", {
  hrefs: {
    dashboard: "/marcaje",
    // TODO(nav): No existe ruta dedicada para "Marcajes" aparte del Dashboard; queda deshabilitado.
    tokens: "/marcaje/tokens",
    // Nota: este href ya existe hoy en el módulo (link en la UI) para configurar Marcaje.
    configuracion: "/admin/configuracion/marcaje",
    // TODO(nav): No existen rutas para Dispositivos/Incidencias/Reportes; quedan deshabilitadas hasta que existan.
  }
});

export default function MarcajeLayout({ children }: { children: React.ReactNode }) {
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  const showDevBanner = process.env.NODE_ENV !== "production" || ["dev", "development", "staging"].includes(appEnv);
  return (
    <AdminShellServer showDevBanner={showDevBanner}>
      <MarcajeQueryProvider>
        <div className="space-y-4">
          <ModuleTopTabs items={marcajeTabs} />
          {children}
        </div>
      </MarcajeQueryProvider>
    </AdminShellServer>
  );
}
