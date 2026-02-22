import SectionPlaceholder from "../_components/SectionPlaceholder";

export default function OpsWhatsAppIntegrationsPage() {
  return (
    <div className="space-y-4">
      <SectionPlaceholder
        title="Integraciones"
        description="Conecta el WhatsApp Center con ERP, CRM y sistemas clínicos. Esta vista es mock sin dependencias externas."
        items={[
          "Webhook hacia ERP/EMR",
          "Sincronización de contactos y etiquetas",
          "Logs de entregas y errores"
        ]}
      />
    </div>
  );
}
