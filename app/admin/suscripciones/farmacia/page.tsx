import Link from "next/link";

export default function SubscriptionsPharmacyPage() {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h1 className="text-lg font-semibold text-[#2e75ba]">Suscripciones · Farmacia</h1>
        <p className="mt-1 text-sm text-slate-600">Espacio operativo para suscripciones por medicamento y programa de descuento.</p>
      </header>
      <div className="rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] p-4 text-sm text-slate-600">
        Base creada. La operación detallada se habilita en el commit de farmacia.
      </div>
      <Link
        href="/admin/suscripciones/membresias/configuracion"
        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Ir a configuración general
      </Link>
    </section>
  );
}
