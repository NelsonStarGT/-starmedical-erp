import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, ClipboardList, FileText, HandCoins, History, Layers, ShieldAlert, Users } from "lucide-react";
import BillingCaseHeader from "@/components/facturacion/BillingCaseHeader";
import BillingCaseTabs, { isBillingCaseTabId, type BillingCaseTabId } from "@/components/facturacion/BillingCaseTabs";
import BillingSummaryCard from "@/components/facturacion/BillingSummaryCard";
import PriorityChip from "@/components/facturacion/PriorityChip";
import QuickPayPanel from "@/components/facturacion/QuickPayPanel";
import { getSessionUserFromCookies } from "@/lib/auth";
import { canRunBillingSupervisorActions } from "@/lib/billing/access";
import { formatBillingDate, formatBillingMoney } from "@/lib/billing/format";
import {
  formatBillingAgeCompact,
  getBillingPrimaryPayer,
  getBillingPriority,
  getBillingQuickActionsAvailability,
  getBillingStatusAgeMinutes,
  getPaymentMethodLabel
} from "@/lib/billing/operational";
import { getBillingCaseById } from "@/lib/billing/service";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function SectionCard({
  title,
  icon,
  children
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[#4aadf5]/15 p-2 text-[#2e75ba]">{icon}</span>
        <h3 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
          {title}
        </h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function renderTab(tab: BillingCaseTabId, expediente: NonNullable<ReturnType<typeof getBillingCaseById>>) {
  if (tab === "resumen") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Contexto operativo" icon={<ClipboardList className="h-4 w-4" />}>
          <dl className="grid gap-2 text-sm text-slate-700">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Visita</dt>
              <dd className="font-semibold">{expediente.episode.visitCode}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Origen</dt>
              <dd className="font-semibold">{expediente.episode.origin}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Sede</dt>
              <dd className="font-semibold">{expediente.episode.branchName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Creado</dt>
              <dd className="font-semibold">{formatBillingDate(expediente.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Última actualización</dt>
              <dd className="font-semibold">{formatBillingDate(expediente.updatedAt)}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Cobertura y alertas" icon={<ShieldAlert className="h-4 w-4" />}>
          {expediente.authorizations.filter((item) => item.status === "PENDIENTE").length > 0 ? (
            <div className="space-y-2">
              {expediente.authorizations
                .filter((item) => item.status === "PENDIENTE")
                .map((auth) => (
                  <div key={auth.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-sm font-semibold text-amber-800">Autorización pendiente · {auth.payerName}</p>
                    <p className="text-xs text-amber-700">Solicitada {formatBillingDate(auth.requestedAt)} · vence {formatBillingDate(auth.dueAt)}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin autorizaciones pendientes.</p>
          )}

          <div className="mt-3 space-y-2">
            {expediente.payers.map((payer) => (
              <div key={payer.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{payer.payerName}</span>
                  <span className="text-slate-500">{payer.responsibilityPct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#4aa59c]" style={{ width: `${Math.min(100, Math.max(0, payer.responsibilityPct))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  }

  if (tab === "items") {
    return (
      <SectionCard title="Items cobrables" icon={<Layers className="h-4 w-4" />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Código</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                <th className="px-3 py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expediente.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">{item.code}</td>
                  <td className="px-3 py-2 text-slate-700">{item.description}</td>
                  <td className="px-3 py-2 text-slate-700">{item.kind}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatBillingMoney(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  }

  if (tab === "pagadores") {
    return (
      <SectionCard title="Pagadores y split de responsabilidad" icon={<Users className="h-4 w-4" />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Pagador</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold text-right">Responsabilidad</th>
                <th className="px-3 py-2 font-semibold text-right">Asignado</th>
                <th className="px-3 py-2 font-semibold text-right">Pagado</th>
                <th className="px-3 py-2 font-semibold text-right">Pendiente</th>
                <th className="px-3 py-2 font-semibold">Vence crédito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expediente.payers.map((payer) => (
                <tr key={payer.id}>
                  <td className="px-3 py-2 font-medium text-slate-800">{payer.payerName}</td>
                  <td className="px-3 py-2 text-slate-700">{payer.payerType}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{payer.responsibilityPct}%</td>
                  <td className="px-3 py-2 text-right text-slate-700">{formatBillingMoney(payer.amountAssigned)}</td>
                  <td className="px-3 py-2 text-right text-emerald-700">{formatBillingMoney(payer.amountPaid)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#2e75ba]">{formatBillingMoney(payer.amountPending)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatBillingDate(payer.creditDueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    );
  }

  if (tab === "pagos") {
    return (
      <div className="space-y-4">
        <SectionCard title="Pagos aplicados" icon={<HandCoins className="h-4 w-4" />}>
          {expediente.payments.length === 0 ? (
            <p className="text-sm text-slate-500">Sin pagos aplicados.</p>
          ) : (
            <ul className="space-y-2">
              {expediente.payments.map((payment) => (
                <li key={payment.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{formatBillingMoney(payment.amount)}</p>
                    <span className="rounded-full bg-[#4aadf5]/12 px-2 py-1 text-[11px] font-semibold text-[#2e75ba]">
                      {getPaymentMethodLabel(payment.method)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{formatBillingDate(payment.appliedAt)} · {payment.cashierUserName}</p>
                  <p className="text-xs text-slate-500">{payment.reference ?? "Sin referencia"}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Anticipos y saldo a favor" icon={<HandCoins className="h-4 w-4" />}>
          <p className="text-sm text-slate-600">Saldo actual del expediente: {formatBillingMoney(expediente.balanceAmount)}</p>
          <p className="mt-2 text-xs text-slate-500">
            Aquí se concentran abonos parciales, aplicación de anticipos y remanentes sin salir del contexto del expediente.
          </p>
        </SectionCard>
      </div>
    );
  }

  if (tab === "documentos") {
    return (
      <SectionCard title="Documentos fiscales" icon={<FileText className="h-4 w-4" />}>
        {expediente.documents.length === 0 ? (
          <p className="text-sm text-slate-500">Sin documentos aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Serie/Folio</th>
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expediente.documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{doc.type}</td>
                    <td className="px-3 py-2 text-slate-700">{doc.status}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {doc.series ?? "—"}
                      {doc.folio ? `-${doc.folio}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{formatBillingDate(doc.issuedAt)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatBillingMoney(doc.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Historial de auditoría" icon={<History className="h-4 w-4" />}>
      <ul className="space-y-2">
        {[...expediente.auditTrail]
          .sort((a, b) => Date.parse(b.happenedAt) - Date.parse(a.happenedAt))
          .map((event) => (
            <li key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">{event.action}</p>
              <p className="text-xs text-slate-600">
                {event.actorName} · {formatBillingDate(event.happenedAt)}
              </p>
              {event.details ? <p className="text-xs text-slate-500">{event.details}</p> : null}
            </li>
          ))}
      </ul>
    </SectionCard>
  );
}

export default async function FacturacionExpedientePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const cookieStore = await cookies();
  const user = await getSessionUserFromCookies(cookieStore);
  const canRunSupervisorActions = canRunBillingSupervisorActions(user);

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const expediente = getBillingCaseById(resolvedParams.id);
  if (!expediente) {
    notFound();
  }

  const tabParam = firstParam(resolvedSearchParams?.tab);
  const activeTab: BillingCaseTabId = isBillingCaseTabId(tabParam) ? tabParam : "resumen";
  const baseHref = `/admin/facturacion/expedientes/${expediente.id}`;

  const priority = getBillingPriority(expediente);
  const actions = getBillingQuickActionsAvailability(expediente);
  const primaryPayer = getBillingPrimaryPayer(expediente);
  const statusAge = formatBillingAgeCompact(getBillingStatusAgeMinutes(expediente));

  return (
    <div className="space-y-4">
      <Link
        href="/admin/facturacion/bandeja/PENDIENTES_COBRO"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a bandejas
      </Link>

      <BillingCaseHeader expediente={expediente} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <BillingCaseTabs baseHref={baseHref} activeTab={activeTab} />
          {renderTab(activeTab, expediente)}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <BillingSummaryCard expediente={expediente} />

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-billing-heading)" }}>
              Decisiones críticas
            </h3>
            <p className="mt-1 text-xs text-slate-500">Acciones de cobro sin perder contexto del expediente.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {actions.canCollect ? (
                <QuickPayPanel
                  caseId={expediente.id}
                  intent="COBRAR"
                  caseNumber={expediente.caseNumber}
                  patientName={expediente.patientName}
                  balanceAmount={expediente.balanceAmount}
                  canRunSupervisorActions={canRunSupervisorActions}
                />
              ) : null}

              {actions.canPartial ? (
                <QuickPayPanel
                  caseId={expediente.id}
                  intent="ABONO"
                  caseNumber={expediente.caseNumber}
                  patientName={expediente.patientName}
                  balanceAmount={expediente.balanceAmount}
                  canRunSupervisorActions={canRunSupervisorActions}
                />
              ) : null}

              {actions.canCredit ? (
                <QuickPayPanel
                  caseId={expediente.id}
                  intent="CREDITO"
                  caseNumber={expediente.caseNumber}
                  patientName={expediente.patientName}
                  balanceAmount={expediente.balanceAmount}
                  canRunSupervisorActions={canRunSupervisorActions}
                />
              ) : null}

              {actions.canEmitDocument ? (
                <QuickPayPanel
                  caseId={expediente.id}
                  intent="EMITIR_DOC"
                  caseNumber={expediente.caseNumber}
                  patientName={expediente.patientName}
                  balanceAmount={expediente.balanceAmount}
                  requiresSupervisor={actions.requiresSupervisor}
                  canRunSupervisorActions={canRunSupervisorActions}
                />
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <PriorityChip level={priority.level} reason={priority.reason} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusAge} en estado</span>
            </div>

            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Pagador principal</dt>
                <dd className="font-semibold text-slate-700">{primaryPayer?.payerName ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Saldo pendiente</dt>
                <dd className="font-semibold text-[#2e75ba]">{formatBillingMoney(expediente.balanceAmount)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Guardrails operativos</h3>
                <ul className="mt-1 space-y-1 text-xs text-amber-800">
                  <li>No cerrar expediente con saldo pendiente.</li>
                  <li>Referencia obligatoria para tarjeta/transferencia.</li>
                  <li>Anulación/NC solo con rol supervisor.</li>
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
