import Link from "next/link";
import BillingStatusBadge from "@/components/facturacion/BillingStatusBadge";
import LockedByUserIndicator from "@/components/facturacion/LockedByUserIndicator";
import MoneyPill from "@/components/facturacion/MoneyPill";
import PriorityChip from "@/components/facturacion/PriorityChip";
import QuickPayPanel from "@/components/facturacion/QuickPayPanel";
import { formatBillingDate } from "@/lib/billing/format";
import {
  formatBillingAgeCompact,
  getBillingPrimaryPayer,
  getBillingPriority,
  getBillingQuickActionsAvailability,
  getBillingStatusAgeMinutes
} from "@/lib/billing/operational";
import { type BillingCase } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

type Props = {
  cases: BillingCase[];
  emptyMessage: string;
  canRunSupervisorActions?: boolean;
};

export default function BillingCaseTable({ cases, emptyMessage, canRunSupervisorActions = false }: Props) {
  if (!cases.length) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1380px] divide-y divide-slate-200 text-sm">
          <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Prioridad</th>
              <th className="px-3 py-3 font-semibold">Expediente</th>
              <th className="px-3 py-3 font-semibold">Paciente / entidad</th>
              <th className="px-3 py-3 font-semibold">Pagador principal</th>
              <th className="px-3 py-3 font-semibold">Montos</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold">Lock</th>
              <th className="px-3 py-3 font-semibold">Tiempo en estado</th>
              <th className="px-3 py-3 font-semibold text-right">Acciones rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map((item) => {
              const priority = getBillingPriority(item);
              const primaryPayer = getBillingPrimaryPayer(item);
              const agingLabel = formatBillingAgeCompact(getBillingStatusAgeMinutes(item));
              const actions = getBillingQuickActionsAvailability(item);

              return (
                <tr key={item.id} className={cn("align-top", priority.level === "ALTA" && "bg-rose-50/35")}> 
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <PriorityChip level={priority.level} reason={priority.reason} compact />
                      <p className="text-[11px] text-slate-500">{priority.reason}</p>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#102a43]">{item.caseNumber}</p>
                    <p className="text-xs text-slate-500">{item.episode.visitCode}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Actualizado: {formatBillingDate(item.updatedAt)}</p>
                  </td>

                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{item.patientName}</p>
                    <p className="text-xs text-slate-500">{item.patientCode}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.responsibleEntity.name} · {item.siteName} · {item.serviceArea}
                    </p>
                  </td>

                  <td className="px-3 py-3">
                    {primaryPayer ? (
                      <>
                        <p className="text-sm font-semibold text-slate-800">{primaryPayer.payerName}</p>
                        <p className="text-xs text-slate-500">
                          {primaryPayer.payerType} · {primaryPayer.responsibilityPct}%
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Sin pagador definido</p>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex max-w-[280px] flex-wrap gap-1.5">
                      <MoneyPill label="Total" amount={item.totalAmount} tone="neutral" />
                      <MoneyPill label="Pagado" amount={item.paidAmount} tone="success" />
                      <MoneyPill label="Saldo" amount={item.balanceAmount} tone="info" />
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <BillingStatusBadge status={item.status} />
                  </td>

                  <td className="px-3 py-3">
                    <LockedByUserIndicator lock={item.lock} />
                  </td>

                  <td className="px-3 py-3">
                    <p className={cn("text-sm font-semibold", priority.level === "ALTA" ? "text-rose-700" : "text-slate-700")}>{agingLabel}</p>
                    <p className="text-[11px] text-slate-500">en {item.status.toLowerCase().replaceAll("_", " ")}</p>
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {actions.canCollect ? (
                        <QuickPayPanel
                          caseId={item.id}
                          intent="COBRAR"
                          caseNumber={item.caseNumber}
                          patientName={item.patientName}
                          balanceAmount={item.balanceAmount}
                          canRunSupervisorActions={canRunSupervisorActions}
                          compact
                        />
                      ) : null}

                      {actions.canPartial ? (
                        <QuickPayPanel
                          caseId={item.id}
                          intent="ABONO"
                          caseNumber={item.caseNumber}
                          patientName={item.patientName}
                          balanceAmount={item.balanceAmount}
                          canRunSupervisorActions={canRunSupervisorActions}
                          compact
                        />
                      ) : null}

                      {actions.canCredit ? (
                        <QuickPayPanel
                          caseId={item.id}
                          intent="CREDITO"
                          caseNumber={item.caseNumber}
                          patientName={item.patientName}
                          balanceAmount={item.balanceAmount}
                          canRunSupervisorActions={canRunSupervisorActions}
                          compact
                        />
                      ) : null}

                      {actions.canEmitDocument ? (
                        <QuickPayPanel
                          caseId={item.id}
                          intent="EMITIR_DOC"
                          caseNumber={item.caseNumber}
                          patientName={item.patientName}
                          balanceAmount={item.balanceAmount}
                          compact
                          requiresSupervisor={actions.requiresSupervisor}
                          canRunSupervisorActions={canRunSupervisorActions}
                        />
                      ) : null}

                      <Link
                        href={`/admin/facturacion/expedientes/${item.id}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#2e75ba] hover:text-[#2e75ba]"
                      >
                        Abrir
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
