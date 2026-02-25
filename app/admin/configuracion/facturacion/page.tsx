import BillingByLegalEntityPanel from "@/components/configuracion/BillingByLegalEntityPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigFacturacionPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Facturación"
        title="Series y correlativos por patente"
        subtitle="Relación de facturas con patente + serie default activa. Próximo correlativo visible y validado en backend."
      />

      <BillingByLegalEntityPanel />
    </div>
  );
}
