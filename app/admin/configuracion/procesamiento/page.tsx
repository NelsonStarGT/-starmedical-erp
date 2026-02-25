import ProcessingDocumentsPanel from "@/components/configuracion/ProcessingDocumentsPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigProcesamientoPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Procesamiento"
        title="Procesamiento de documentos"
        subtitle="Operación y auditoría multi-tenant del processing-service: jobs, artefactos, políticas, almacenamiento y salud."
      />

      <ProcessingDocumentsPanel />
    </div>
  );
}
