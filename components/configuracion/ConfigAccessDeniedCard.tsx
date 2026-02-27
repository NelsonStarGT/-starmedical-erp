import Link from "next/link";

type ConfigAccessDeniedCardProps = {
  sectionLabel: string;
  requirementLabel: string;
  backHref?: string;
  backLabel?: string;
};

export default function ConfigAccessDeniedCard({
  sectionLabel,
  requirementLabel,
  backHref = "/admin/configuracion",
  backLabel = "Volver a Configuración"
}: ConfigAccessDeniedCardProps) {
  return (
    <section className="rounded-xl border border-[#4aadf5]/40 bg-[#F8FAFC] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Acceso restringido</p>
      <h2 className="mt-1 text-sm font-semibold text-slate-900">{sectionLabel}</h2>
      <p className="mt-1 text-xs text-slate-600">Necesitas {requirementLabel} para ingresar a esta sección.</p>
      <div className="mt-3">
        <Link
          href={backHref}
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#4aadf5]"
        >
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
