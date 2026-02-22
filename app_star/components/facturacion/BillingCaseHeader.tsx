import BillingStatusBadge from "@/components/facturacion/BillingStatusBadge";
import LockedByUserIndicator from "@/components/facturacion/LockedByUserIndicator";
import MoneyPill from "@/components/facturacion/MoneyPill";
import { getBillingCollectionProgress, getBillingPrimaryPayer } from "@/lib/billing/operational";
import { type BillingCase } from "@/lib/billing/types";

export default function BillingCaseHeader({ expediente }: { expediente: BillingCase }) {
  const progress = getBillingCollectionProgress(expediente);
  const primaryPayer = getBillingPrimaryPayer(expediente);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Expediente de cobro</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
            {expediente.caseNumber}
          </h2>
          <p className="text-sm text-slate-600">
            {expediente.patientName} · {expediente.patientCode} · {expediente.episode.visitCode}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#4aadf5]/12 px-2.5 py-1 text-xs font-semibold text-[#2e75ba]">Origen {expediente.serviceArea}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Sede {expediente.siteName}</span>
            {primaryPayer ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Pagador {primaryPayer.payerName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BillingStatusBadge status={expediente.status} />
          <LockedByUserIndicator lock={expediente.lock} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <MoneyPill label="Total" amount={expediente.totalAmount} tone="neutral" />
        <MoneyPill label="Pagado" amount={expediente.paidAmount} tone="success" />
        <MoneyPill label="Saldo" amount={expediente.balanceAmount} tone="info" />
        {expediente.creditAmount > 0 ? <MoneyPill label="Crédito" amount={expediente.creditAmount} tone="warning" /> : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
          <span>Avance de cierre del expediente</span>
          <span className="font-semibold text-[#2e75ba]">{progress.percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#4aa59c]" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </section>
  );
}
