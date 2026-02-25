import LegalEntitiesPanel from "@/components/configuracion/LegalEntitiesPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigPatentesPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Patentes"
        title="Gestión de entidades legales"
        subtitle="Multi-tenant de patentes (LegalEntity) con CRUD, activación y validaciones de NIT por tenant."
      />

      <LegalEntitiesPanel />
    </div>
  );
}
