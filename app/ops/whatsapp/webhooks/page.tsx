import SectionPlaceholder from "../_components/SectionPlaceholder";

export default function OpsWhatsAppWebhooksPage() {
  return (
    <div className="space-y-4">
      <SectionPlaceholder
        title="Webhooks"
        description="Administra callbacks de entrega, eventos de lectura y derivación a colas internas. Mock listo para conectar."
        items={[
          "Endpoints por workspace/número",
          "Secret rotation",
          "Replay de eventos con cola interna"
        ]}
      />
    </div>
  );
}
