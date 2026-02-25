import CentralCommunicationsPanel from "@/components/configuracion/CentralCommunicationsPanel";
import ServicesProcessingPanel from "@/components/configuracion/ServicesProcessingPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigServiciosPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Servicios"
        title="Servicios y comunicaciones"
        subtitle="Processing-service (PDF/imágenes/Excel/DOCX) y correo SMTP con checklist de entregabilidad por tenant."
      />

      <ServicesProcessingPanel />
      <CentralCommunicationsPanel />
    </div>
  );
}
