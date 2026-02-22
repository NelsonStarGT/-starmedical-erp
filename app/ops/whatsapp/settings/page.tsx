import SectionPlaceholder from "../_components/SectionPlaceholder";

export default function OpsWhatsAppSettingsPage() {
  return (
    <div className="space-y-4">
      <SectionPlaceholder
        title="Configuración de WhatsApp"
        description="Administra workspaces, números y credenciales. Aquí se conectará el gateway oficial (stub actual)."
        items={[
          "Conectar números oficiales por workspace",
          "Configurar webhooks y credenciales",
          "Preferencias de SLA y escalaciones"
        ]}
      />
    </div>
  );
}
