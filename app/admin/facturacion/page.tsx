import Link from "next/link";
import BillingKpiStrip from "@/components/facturacion/BillingKpiStrip";
import BillingTrayCards from "@/components/facturacion/BillingTrayCards";
import { formatBillingDate, formatBillingMoney } from "@/lib/billing/format";
import { listBillingCases, listBillingDashboardSummary, listBillingStatsByTray } from "@/lib/billing/service";

function toTs(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

export default function FacturacionDashboardPage() {
  const summary = listBillingDashboardSummary();
  const trays = listBillingStatsByTray();
  const cases = listBillingCases();

  const pendingAuth = [...cases]
    .filter((item) => item.status === "PENDIENTE_AUTORIZACION")
    .sort((a, b) => toTs(a.authorizations[0]?.dueAt) - toTs(b.authorizations[0]?.dueAt))
    .slice(0, 4);

  const creditRisk = [...cases]
    .filter((item) => item.status === "CREDITO_ABIERTO")
    .sort((a, b) => b.balanceAmount - a.balanceAmount)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2e75ba]">Facturación StarMedical</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Dashboard operativo
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Gestión por expedientes, múltiples pagadores y trazabilidad completa para cobro clínico antes de AR/Finanzas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/facturacion/bandeja/PENDIENTES_COBRO"
              className="rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f968d]"
            >
              Ir a bandeja
            </Link>
            <Link
              href="/admin/facturacion/documentos"
              className="rounded-lg border border-[#4aadf5]/60 bg-[#4aadf5]/10 px-4 py-2 text-sm font-semibold text-[#2e75ba]"
            >
              Documentos
            </Link>
          </div>
        </div>
      </section>

      <BillingKpiStrip summary={summary} />

      <BillingTrayCards trays={trays} />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Alertas de autorización
            </h2>
            <Link href="/admin/facturacion/bandeja/PENDIENTE_AUTORIZACION" className="text-xs font-semibold text-[#2e75ba] hover:underline">
              Ver bandeja
            </Link>
          </div>
          {pendingAuth.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No hay autorizaciones pendientes.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingAuth.map((item) => (
                <li key={item.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{item.caseNumber}</p>
                  <p className="text-xs text-slate-600">
                    {item.patientName} · vence {formatBillingDate(item.authorizations[0]?.dueAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Crédito con mayor exposición
            </h2>
            <Link href="/admin/facturacion/bandeja/CREDITO" className="text-xs font-semibold text-[#2e75ba] hover:underline">
              Ver crédito
            </Link>
          </div>
          {creditRisk.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No hay expedientes en crédito.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {creditRisk.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{item.caseNumber}</p>
                  <p className="text-xs text-slate-600">{item.responsibleEntity.name}</p>
                  <p className="text-xs font-semibold text-[#2e75ba]">Saldo {formatBillingMoney(item.balanceAmount)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
