"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionButtons, type ReceptionAction } from "@/components/reception/ActionButtons";
import { ReasonModal } from "@/components/reception/ReasonModal";
import { actionEnqueueVisit, actionTransitionVisitStatus } from "@/app/admin/reception/actions";
import type { ReceptionArea, ReceptionVisitStatus } from "@/lib/reception/constants";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type Props = {
  visitId: string;
  siteId: string;
  status: ReceptionVisitStatus;
  currentArea: ReceptionArea;
  canEnqueue: boolean;
  capabilities: ReceptionCapability[];
  resumeStatus?: ReceptionVisitStatus | null;
};

export default function VisitActions({
  visitId,
  siteId,
  status,
  currentArea,
  canEnqueue,
  capabilities,
  resumeStatus
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reasonDialog, setReasonDialog] = useState<{
    toStatus: ReceptionVisitStatus;
    title: string;
    description: string;
    confirmLabel: string;
    placeholder: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const can = (cap: ReceptionCapability) => capabilities.includes(cap);
  const canCheckIn = can("VISIT_CHECKIN");
  const canBasicTransition = can("VISIT_TRANSITION_BASIC");
  const canCancel = can("VISIT_CANCEL");
  const canNoShow = can("VISIT_NO_SHOW");
  const canHold = canCancel;
  const canCheckout = canBasicTransition || can("VISIT_CHECKOUT_OVERRIDE");

  const run = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      try {
        await fn();
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "Acción no completada.");
      }
    });
  };

  const actions: ReceptionAction[] = [];

  if (status === "ARRIVED") {
    actions.push({
      key: "checkin",
      label: "Registrar admisión",
      variant: "primary",
      disabled: isPending || !canCheckIn,
      onClick: () => run(() => actionTransitionVisitStatus({ visitId, toStatus: "CHECKED_IN" }))
    });
  }

  if (status === "CHECKED_IN" && canEnqueue && can("QUEUE_ENQUEUE")) {
    actions.push({
      key: "enqueue",
      label: "Encolar",
      variant: "primary",
      disabled: isPending,
      onClick: () => run(() => actionEnqueueVisit({ visitId, siteId, area: currentArea }))
    });
  }

  if ((status === "IN_SERVICE" || status === "IN_DIAGNOSTIC") && canBasicTransition) {
    actions.push({
      key: "ready",
      label: "Listo para salida",
      variant: "secondary",
      disabled: isPending,
      onClick: () => run(() => actionTransitionVisitStatus({ visitId, toStatus: "READY_FOR_DISCHARGE" }))
    });
  }

  if (status === "READY_FOR_DISCHARGE" && canCheckout) {
    actions.push({
      key: "checkout",
      label: "Cerrar visita",
      variant: "primary",
      disabled: isPending,
      onClick: () => run(() => actionTransitionVisitStatus({ visitId, toStatus: "CHECKED_OUT" }))
    });
  }

  if (status === "ARRIVED" && canNoShow) {
    actions.push({
      key: "noShow",
      label: "No-show",
      variant: "ghost",
      disabled: isPending,
      onClick: () => {
        setReasonDialog({
          toStatus: "NO_SHOW",
          title: "Marcar no-show",
          description: "Confirma el motivo para registrar que el paciente no se presentó.",
          confirmLabel: "Confirmar no-show",
          placeholder: "Ej: No llegó a recepción / no respondió llamado…"
        });
      }
    });
  }

  if ((status === "ARRIVED" || status === "CHECKED_IN") && canCancel) {
    actions.push({
      key: "cancel",
      label: "Cancelar",
      variant: "ghost",
      disabled: isPending,
      onClick: () => {
        setReasonDialog({
          toStatus: "CANCELLED",
          title: "Cancelar visita",
          description: "Esta acción cancelará la visita. El motivo quedará en auditoría.",
          confirmLabel: "Confirmar cancelación",
          placeholder: "Ej: Paciente solicitó cancelar / error de registro…"
        });
      }
    });
  }

  if ((status === "CHECKED_IN" || status === "IN_QUEUE") && canHold) {
    actions.push({
      key: "hold",
      label: "Pausar visita",
      variant: "ghost",
      disabled: isPending,
      onClick: () => {
        setReasonDialog({
          toStatus: "ON_HOLD",
          title: "Pausar visita",
          description: "La visita quedará en espera. Registra el motivo.",
          confirmLabel: "Confirmar pausa",
          placeholder: "Ej: Esperando autorización / paciente en baño…"
        });
      }
    });
  }

  if (status === "ON_HOLD" && canHold && resumeStatus) {
    const resumeTarget = resumeStatus;
    actions.push({
      key: "resume",
      label: "Reanudar",
      variant: "secondary",
      disabled: isPending,
      onClick: () => {
        setReasonDialog({
          toStatus: resumeTarget,
          title: "Reanudar visita",
          description: "La visita regresará al estado previo. Registra el motivo.",
          confirmLabel: "Confirmar reanudación",
          placeholder: "Ej: Se resolvió motivo de pausa…"
        });
      }
    });
  }

  if (actions.length === 0) {
    actions.push({
      key: "noop",
      label: "Sin acciones disponibles",
      variant: "ghost",
      disabled: true
    });
  }

  return (
    <div className="space-y-2">
      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <ActionButtons actions={actions} />

      <ReasonModal
        open={Boolean(reasonDialog)}
        onClose={() => setReasonDialog(null)}
        title={reasonDialog?.title ?? "Motivo requerido"}
        subtitle="Auditoría de visita"
        description={reasonDialog?.description}
        placeholder={reasonDialog?.placeholder}
        confirmLabel={reasonDialog?.confirmLabel ?? "Confirmar"}
        isPending={isPending}
        onConfirm={(reason) => {
          const payload = reasonDialog;
          if (!payload) return;
          run(async () => {
            await actionTransitionVisitStatus({
              visitId,
              toStatus: payload.toStatus,
              reason
            });
            setReasonDialog(null);
          });
        }}
      />
    </div>
  );
}
