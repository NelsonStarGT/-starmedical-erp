import SectionPlaceholder from "../_components/SectionPlaceholder";

export default function OpsWhatsAppMetricsPage() {
  return (
    <div className="space-y-4">
      <SectionPlaceholder
        title="Métricas y SLA"
        description="Panel con tiempos de respuesta, niveles de SLA y conversión por bandeja. Enlazaremos aquí la data real cuando se active el gateway."
        items={[
          "Tiempo medio de primera respuesta",
          "Conversaciones por folder y asesor",
          "Alertas de SLA y escalaciones"
        ]}
      />
    </div>
  );
}
