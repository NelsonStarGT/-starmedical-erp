"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { CRM_STAGE_LABELS } from "@/lib/crmConfig";
import { formatCurrency, formatDateTime } from "@/lib/crmFormat";
import { cn } from "@/lib/utils";

export type CrmDealDrawerDeal = {
  id: string;
  stage: string;
  pipelineType: "B2B" | "B2C";
  amount: number;
  amountEstimated?: number;
  slaStatus: "GREEN" | "YELLOW" | "RED";
  nextAction?: string | null;
  nextActionAt?: string | null;
  ownerId?: string | null;
  quoteCount?: number;
  quoteStatus?: string;
  account?: { id: string; name: string | null } | null;
  contact?: {
    id: string;
    firstName: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

type CrmDealDrawerProps = {
  open: boolean;
  onClose: () => void;
  deal: CrmDealDrawerDeal | null;
  normalizedType: "b2b" | "b2c";
  actionError?: string | null;
  activityContent?: ReactNode;
  tasksContent?: ReactNode;
  quotesContent?: ReactNode;
  closingContent?: ReactNode;
  extraContent?: ReactNode;
  quickActionsExtra?: ReactNode;
};

const secondaryBtnClass =
  "inline-flex h-[var(--crm-control-h)] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-[#4aadf5] hover:text-[#2e75ba]";
const primaryBtnClass =
  "inline-flex h-[var(--crm-control-h)] items-center justify-center rounded-lg bg-[#4aa59c] px-3 text-xs font-semibold text-white transition hover:bg-[#4aadf5]";

function getClientName(deal: CrmDealDrawerDeal) {
  if (deal.account?.name) return deal.account.name;
  const firstName = deal.contact?.firstName || "";
  const lastName = deal.contact?.lastName || "";
  const full = `${firstName} ${lastName}`.trim();
  return full || "Sin cliente";
}

function getSlaLabel(deal: CrmDealDrawerDeal) {
  if (!deal.nextAction || !deal.nextActionAt) return "Sin accion";
  return deal.slaStatus;
}

function sanitizePhone(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function SlaChip({ status, label }: { status?: string; label?: string }) {
  const colors =
    status === "RED"
      ? "border-rose-200 bg-rose-100 text-rose-700"
      : status === "YELLOW"
        ? "border-amber-200 bg-amber-100 text-amber-700"
        : "border-emerald-200 bg-emerald-100 text-emerald-700";
  return <span className={cn("rounded-full border px-2 py-1 text-[11px] font-semibold", colors)}>{label || status || "-"}</span>;
}

export function CrmDealDrawer({
  open,
  onClose,
  deal,
  normalizedType,
  actionError,
  activityContent,
  tasksContent,
  quotesContent,
  closingContent,
  extraContent,
  quickActionsExtra
}: CrmDealDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !deal) return null;

  const clientName = getClientName(deal);
  const stageLabel = CRM_STAGE_LABELS[deal.stage as keyof typeof CRM_STAGE_LABELS] || deal.stage;
  const phone = sanitizePhone(deal.contact?.phone);
  const email = deal.contact?.email || "";

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-slate-900/45" onClick={onClose} aria-label="Cerrar panel" />

      <aside className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl border border-slate-200 bg-white shadow-md md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[560px] md:max-h-none md:rounded-none md:border-y-0 md:border-r-0 md:border-l">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Deal drawer</p>
              <h2 className="truncate text-base font-semibold text-slate-900">{clientName}</h2>
              <p className="text-xs text-slate-600">{stageLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-[var(--crm-control-h)] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4">
            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Resumen</p>
                <SlaChip status={deal.slaStatus} label={getSlaLabel(deal)} />
              </div>
              <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                <p>
                  <span className="font-semibold">Tipo:</span> {deal.pipelineType === "B2B" ? "Empresa" : "Paciente"}
                </p>
                <p>
                  <span className="font-semibold">Owner:</span> {deal.ownerId || "Ventas"}
                </p>
                <p>
                  <span className="font-semibold">Monto:</span> {formatCurrency(deal.amount ?? deal.amountEstimated ?? 0)}
                </p>
                <p>
                  <span className="font-semibold">Cotizaciones:</span> {deal.quoteCount ?? 0} ({deal.quoteStatus || "SIN_COTIZAR"})
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold">Próxima acción:</span>{" "}
                  {deal.nextActionAt ? `${deal.nextAction || "Acción"} · ${formatDateTime(deal.nextActionAt)}` : "Sin próxima acción"}
                </p>
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Acciones rápidas</p>
              <div className="flex flex-wrap gap-2">
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className={secondaryBtnClass}>
                      Llamar
                    </a>
                    <a href={`https://wa.me/${phone.replace("+", "")}`} target="_blank" rel="noreferrer" className={secondaryBtnClass}>
                      WhatsApp
                    </a>
                  </>
                )}
                {email && (
                  <a href={`mailto:${email}`} className={secondaryBtnClass}>
                    Email
                  </a>
                )}
                <Link href={`/admin/crm/deal/${deal.id}?type=${normalizedType}#actividades`} className={secondaryBtnClass}>
                  Crear tarea
                </Link>
                <Link href={`/admin/crm/calendario?type=${normalizedType}`} className={secondaryBtnClass}>
                  Agendar cita
                </Link>
                <Link href={`/admin/crm/deal/${deal.id}?type=${normalizedType}#cotizaciones`} className={primaryBtnClass}>
                  Cotización
                </Link>
                <Link href={`/admin/crm/deal/${deal.id}?type=${normalizedType}`} className={secondaryBtnClass}>
                  Historial
                </Link>
                {quickActionsExtra}
              </div>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Actividad e historial</p>
              {activityContent || (
                <p className="text-xs text-slate-600">Revisa el historial completo o registra nueva actividad desde las acciones rápidas.</p>
              )}
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Tareas</p>
              {tasksContent || <p className="text-xs text-slate-600">Sin tareas cargadas en esta vista.</p>}
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Cotizaciones</p>
              {quotesContent || <p className="text-xs text-slate-600">Gestiona cotizaciones desde este panel o abre el detalle del deal.</p>}
            </section>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#2e75ba]">Cierres</p>
              {closingContent || <p className="text-xs text-slate-600">Ejecuta ganado/perdido con validaciones de etapa.</p>}
            </section>

            {extraContent ? <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-[var(--crm-card-pad)] shadow-sm">{extraContent}</section> : null}

            {actionError ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
