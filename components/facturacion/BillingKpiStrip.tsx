import { type BillingDashboardSummary } from "@/lib/billing/types";
import { formatBillingMoney } from "@/lib/billing/format";

function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#102a43]">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

export default function BillingKpiStrip({ summary }: { summary: BillingDashboardSummary }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Expedientes abiertos" value={String(summary.totalOpenCases)} helper="En bandejas operativas" />
      <Kpi label="Saldo abierto" value={formatBillingMoney(summary.totalOpenBalance)} helper="Pendiente de recaudar" />
      <Kpi label="Crédito abierto" value={formatBillingMoney(summary.creditOpenAmount)} helper="Empresas / aseguradoras" />
      <Kpi
        label="Documentos pendientes"
        value={String(summary.pendingDocuments)}
        helper={`${summary.pendingAuthorization} con autorización pendiente`}
      />
    </section>
  );
}
