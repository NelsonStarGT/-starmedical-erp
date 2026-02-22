import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { getOrderDetail } from "@/lib/server/diagnostics.service";
import type { DiagnosticClinicalSummary } from "@/lib/diagnostics/types";

export const runtime = "nodejs";

type PageProps = { params: { id: string } };

type TimelineStatus = "complete" | "in_progress" | "pending" | "cancelled";

type TimelineItem = {
  label: string;
  status: TimelineStatus;
  description?: string;
};

function statusStyles(status: TimelineStatus) {
  switch (status) {
    case "complete":
      return "bg-emerald-500 border-emerald-500 text-emerald-700";
    case "in_progress":
      return "bg-amber-400 border-amber-400 text-amber-700";
    case "cancelled":
      return "bg-rose-500 border-rose-500 text-rose-700";
    default:
      return "bg-slate-300 border-slate-300 text-slate-500";
  }
}

function buildClinicalText(summary: DiagnosticClinicalSummary) {
  const lab = summary.lab.expected
    ? summary.lab.completed
      ? "Lab: completado"
      : `Lab: ${summary.lab.released}/${summary.lab.total} liberados`
    : "Lab: —";
  const xr = summary.xr.expected
    ? summary.xr.completed
      ? "RX: completado"
      : `RX: ${summary.xr.pending}/${summary.xr.total} pendientes`
    : "RX: —";
  const us = summary.us.expected
    ? summary.us.completed
      ? "US: completado"
      : `US: ${summary.us.pending}/${summary.us.total} pendientes`
    : "US: —";
  return `${lab} · ${xr} · ${us}`;
}

export default async function DiagnosticsOrderDetailPage({ params }: PageProps) {
  let order;
  try {
    order = await getOrderDetail(params.id);
  } catch (err: any) {
    if (err?.status === 404) return notFound();
    throw err;
  }

  const summary = order.clinicalSummary;
  const adminStatus = order.adminStatus;
  const isCancelled = adminStatus === "CANCELLED";
  const isCompleted = adminStatus === "COMPLETED";
  const isSent = adminStatus === "SENT_TO_EXECUTION" || adminStatus === "COMPLETED";
  const isPaid = ["PAID", "SENT_TO_EXECUTION", "COMPLETED"].includes(adminStatus);
  const isPaymentInProgress = ["PENDING_PAYMENT", "INSURANCE_AUTH"].includes(adminStatus);

  const resultsComplete = summary ? summary.lab.completed && summary.xr.completed && summary.us.completed : false;
  const hasProgress = summary
    ? summary.lab.released + summary.xr.released + summary.us.released > 0
    : false;

  const timeline: TimelineItem[] = [
    {
      label: "Ingreso",
      status: isCancelled ? "cancelled" : "complete",
      description: "Registro administrativo creado."
    },
    {
      label: "Pago / Autorización",
      status: isCancelled ? "cancelled" : isPaid ? "complete" : isPaymentInProgress ? "in_progress" : "pending",
      description: isPaid ? "Pago confirmado." : isPaymentInProgress ? "En proceso de autorización." : "Pendiente de pago."
    },
    {
      label: "Enviado a ejecución",
      status: isCancelled ? "cancelled" : isSent ? "complete" : "pending",
      description: isSent ? "Orden enviada a LabTest / RX / US." : "Aún no se envía a ejecución."
    },
    {
      label: "En proceso (Lab / RX / US)",
      status: isCancelled
        ? "cancelled"
        : !isSent
          ? "pending"
          : resultsComplete
            ? "complete"
            : "in_progress",
      description: summary ? buildClinicalText(summary) : "Sin datos clínicos aún."
    },
    {
      label: "Resultados liberados",
      status: isCancelled
        ? "cancelled"
        : !isSent
          ? "pending"
          : resultsComplete
            ? "complete"
            : hasProgress
              ? "in_progress"
              : "pending",
      description: resultsComplete ? "Todos los resultados liberados." : "Resultados aún en proceso."
    },
    {
      label: "Orden completada",
      status: isCancelled ? "cancelled" : isCompleted ? "complete" : "pending",
      description: isCompleted ? "Cierre administrativo automático." : "Pendiente de cierre."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Orden</p>
          <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Detalle administrativo</h2>
          <p className="text-sm text-slate-600">Seguimiento completo del flujo diagnóstico.</p>
        </div>
        <Link
          href="/diagnostics/orders"
          className="inline-flex items-center gap-2 rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] shadow-sm hover:bg-[#e8f1ff]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a Órdenes
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Timeline clínico</h3>
          <div className="mt-6 space-y-5">
            {timeline.map((item, idx) => (
              <div key={item.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full border-2 ${statusStyles(item.status)}`} />
                  {idx < timeline.length - 1 && <div className="h-full w-px bg-[#e5edf8]" />}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#163d66]">{item.label}</span>
                    {item.status === "complete" && <CheckCircleIcon className="h-4 w-4 text-emerald-600" />}
                    {item.status === "in_progress" && <ClockIcon className="h-4 w-4 text-amber-600" />}
                    {item.status === "cancelled" && <XCircleIcon className="h-4 w-4 text-rose-600" />}
                  </div>
                  <p className="text-xs text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Paciente</p>
            <p className="mt-2 text-base font-semibold text-[#163d66]">
              {order.patient?.name || "Paciente"}
            </p>
            <p className="text-xs text-slate-500">{order.patient?.dpi || order.patient?.nit || order.patientId}</p>
            <p className="mt-3 text-xs text-slate-500">Orden: {order.id}</p>
          </div>

          <div className="rounded-2xl border border-[#dce7f5] bg-[#f8fafc] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Estado clínico</p>
            <p className="mt-2 text-sm text-slate-700">{summary ? buildClinicalText(summary) : "Sin información"}</p>
          </div>

          {isCompleted && (
            <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Acciones finales</p>
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
                >
                  Descargar reporte (PDF)
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-slate-400"
                >
                  Marcar como entregado (próx.)
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full rounded-full border border-[#dce7f5] bg-white px-4 py-2 text-sm font-semibold text-slate-400"
                >
                  Exportar (próx.)
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
