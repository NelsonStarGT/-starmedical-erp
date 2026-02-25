import NavigationPolicyPanel from "@/components/configuracion/NavigationPolicyPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigNavegacionPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Navegación"
        title="Sidebar colapsable por política"
        subtitle="Define si el menú inicia colapsado o forzado por tenant, con persistencia por usuario en localStorage."
      />

      <NavigationPolicyPanel />
    </div>
  );
}
