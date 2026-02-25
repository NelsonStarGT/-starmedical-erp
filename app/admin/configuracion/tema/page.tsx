import CentralThemeBrandingPanel from "@/components/configuracion/CentralThemeBrandingPanel";
import PageHeader from "@/components/layout/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ConfigTemaPage() {
  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        eyebrow="Configuración · Tema"
        title="Tema global y branding"
        subtitle="Variables CSS + Tailwind por tenant, preview en vivo, validación HEX y recomendación de contraste."
      />

      <CentralThemeBrandingPanel />
    </div>
  );
}
