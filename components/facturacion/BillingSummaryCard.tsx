import MoneyPill from "@/components/facturacion/MoneyPill";
import { getBillingCollectionProgress } from "@/lib/billing/operational";
import { type BillingCase } from "@/lib/billing/types";

export default function BillingSummaryCard({ expediente, title = "Resumen financiero" }: { expediente: BillingCase; title?: string }) {
  const progress = getBillingCollectionProgress(expediente);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
        {title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        <MoneyPill label="Total" amount={expediente.totalAmount} tone="neutral" />
        <MoneyPill label="Pagado" amount={expediente.paidAmount} tone="success" />
        <MoneyPill label="Saldo" amount={expediente.balanceAmount} tone="info" />
        {expediente.creditAmount > 0 ? <MoneyPill label="Crédito" amount={expediente.creditAmount} tone="warning" /> : null}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
          <span>Avance de cobro</span>
          <span className="font-semibold text-[#2e75ba]">{progress.percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#4aa59c]" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Entidad responsable</dt>
          <dd className="font-semibold text-slate-700">{expediente.responsibleEntity.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Origen clínico</dt>
          <dd className="font-semibold text-slate-700">{expediente.serviceArea}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Sede</dt>
          <dd className="font-semibold text-slate-700">{expediente.siteName}</dd>
        </div>
      </dl>
    </article>
  );
}
