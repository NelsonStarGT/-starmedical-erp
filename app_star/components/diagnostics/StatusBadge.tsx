'use client';

import { DiagnosticItemStatus, DiagnosticOrderStatus } from "@/lib/diagnostics/types";
import { cn } from "@/lib/utils";

type Props = {
  status: DiagnosticOrderStatus | DiagnosticItemStatus | string;
  className?: string;
};

const labels: Record<string, string> = {
  DRAFT: "Borrador",
  PAID: "Pagada",
  IN_PROGRESS: "En proceso",
  READY: "Lista",
  RELEASED: "Liberada",
  CANCELLED: "Cancelada",
  ORDERED: "Ordenado",
  COLLECTED: "Muestra",
  IN_ANALYSIS: "En análisis",
  PENDING_VALIDATION: "Pend. validación",
  VALIDATED: "Validado",
  SIGNED: "Firmado"
};

const tone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border border-slate-200",
  PAID: "bg-[#e5f5f2] text-[#1f6f68] border border-[#bde3dc]",
  IN_PROGRESS: "bg-[#e8f1ff] text-[#2e75ba] border border-[#cbd9f5]",
  READY: "bg-[#ecfeff] text-[#0f6ab7] border border-[#bae6fd]",
  RELEASED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border border-rose-200",
  ORDERED: "bg-slate-100 text-slate-700 border border-slate-200",
  COLLECTED: "bg-[#fef9c3] text-amber-700 border border-amber-200",
  IN_ANALYSIS: "bg-[#fff3e0] text-orange-700 border border-orange-200",
  PENDING_VALIDATION: "bg-[#eef2ff] text-indigo-700 border border-indigo-200",
  VALIDATED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  SIGNED: "bg-[#e0e7ff] text-indigo-800 border border-[#c7d2fe]"
};

export function StatusBadge({ status, className }: Props) {
  const style = tone[status] || "bg-slate-100 text-slate-700 border border-slate-200";
  const label = labels[status] || status;
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style, className)}>
      {label}
    </span>
  );
}
