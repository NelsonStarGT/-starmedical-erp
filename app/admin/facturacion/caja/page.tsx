import Link from "next/link";
import { AlertTriangle, BadgeCheck, Coins, CreditCard, Landmark, ReceiptText, ShieldCheck, Timer } from "lucide-react";
import type { ReactNode } from "react";
import MoneyPill from "@/components/facturacion/MoneyPill";
import { formatBillingMoney } from "@/lib/billing/format";
import { listBillingCases } from "@/lib/billing/service";

function StageCard({
  title,
  subtitle,
  icon,
  children
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="rounded-lg bg-[#4aadf5]/15 p-2 text-[#2e75ba]">{icon}</span>
        <div>
          <h3 className="text-base font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
            {title}
          </h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function FacturacionCajaPage() {
  const cases = listBillingCases();

  const allPayments = cases.flatMap((item) => item.payments);
  const todayCollection = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingToCollect = cases
    .filter((item) => ["PENDIENTE_COBRO", "EN_PROCESO", "COBRO_PARCIAL"].includes(item.status))
    .reduce((sum, item) => sum + item.balanceAmount, 0);

  const cash = allPayments.filter((item) => item.method === "EFECTIVO").reduce((sum, item) => sum + item.amount, 0);
  const card = allPayments.filter((item) => item.method === "TARJETA").reduce((sum, item) => sum + item.amount, 0);
  const transfer = allPayments.filter((item) => item.method === "TRANSFERENCIA").reduce((sum, item) => sum + item.amount, 0);

  const pendingDocs = cases.filter((item) => item.status === "PAGADO_PEND_DOC").length;
  const missingReference = allPayments.filter((item) => item.method !== "EFECTIVO" && !item.reference?.trim()).length;
  const partialCount = cases.filter((item) => item.status === "COBRO_PARCIAL").length;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Facturación · Caja clínica</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Operación de turno
            </h1>
            <p className="mt-1 text-sm text-slate-600">Flujo operativo: apertura, cobro del día, validación y cierre.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f968d]">
              Abrir turno
            </button>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cerrar turno</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cobrado del día</p>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{formatBillingMoney(todayCollection)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Saldo por cobrar</p>
          <p className="mt-2 text-2xl font-semibold text-[#2e75ba]">{formatBillingMoney(pendingToCollect)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Parciales activos</p>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{partialCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Docs pendientes</p>
          <p className="mt-2 text-2xl font-semibold text-[#102a43]">{pendingDocs}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <StageCard title="1) Apertura de turno" subtitle="Checklist previo a operar" icon={<BadgeCheck className="h-4 w-4" />}>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Registrar fondo inicial y caja física asignada.</li>
            <li>Confirmar terminales y conexión documental activa.</li>
            <li>Verificar sede activa antes del primer cobro.</li>
          </ul>
        </StageCard>

        <StageCard title="2) Operación del día" subtitle="Control de errores en tiempo real" icon={<Timer className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-1.5">
            <MoneyPill label="Efectivo" amount={cash} tone="success" />
            <MoneyPill label="Tarjeta" amount={card} tone="info" />
            <MoneyPill label="Transfer" amount={transfer} tone="neutral" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{cases.filter((item) => item.status === "EN_PROCESO").length} en proceso</span>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">{missingReference} sin referencia</span>
          </div>
        </StageCard>

        <StageCard title="3) Cierre de turno" subtitle="Bloqueos y validaciones" icon={<ShieldCheck className="h-4 w-4" />}>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>No cerrar con pagos sin referencia.</li>
            <li>No cerrar con documentos fiscales pendientes críticos.</li>
            <li>Resolver diferencias de caja antes de confirmar.</li>
          </ul>
        </StageCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
            Distribución por método
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Coins className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">Efectivo</p>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-800">{formatBillingMoney(cash)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-[#2e75ba]">
                <CreditCard className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">Tarjeta</p>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-800">{formatBillingMoney(card)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Landmark className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">Transferencia</p>
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-800">{formatBillingMoney(transfer)}</p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Riesgos prevenidos por UX
            </h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            <li>Bloqueo visual de cierres con referencia faltante.</li>
            <li>Alertas de expedientes pagados sin documento emitido.</li>
            <li>Resumen de diferencias antes de cierre de turno.</li>
          </ul>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
            Atajos operativos
          </h2>
          <ReceiptText className="h-5 w-5 text-[#2e75ba]" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/facturacion/bandeja/PENDIENTES_COBRO"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Pendientes de cobro
          </Link>
          <Link
            href="/admin/facturacion/bandeja/COBRO_PARCIAL"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Cobro parcial
          </Link>
          <Link
            href="/admin/facturacion/bandeja/DOCUMENTOS_POR_EMITIR"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Documentos por emitir
          </Link>
          <Link
            href="/admin/facturacion/documentos"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            Gestión documental
          </Link>
        </div>
      </section>
    </div>
  );
}
