"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  actionCallNext,
  actionCompleteQueueItem,
  actionPauseQueueItem,
  actionResumeQueueItem,
  actionSkipQueueItem,
  actionStartServiceFromQueue,
  actionTransferQueueItem
} from "@/app/admin/reception/actions";
import { RECEPTION_AREAS, RECEPTION_AREA_LABELS, type ReceptionArea } from "@/lib/reception/constants";
import { cn } from "@/lib/utils";

type ReasonAction = "pause" | "skip" | "transfer";

type ReasonDialogState = {
  action: ReasonAction;
  queueItemId: string;
  fromArea?: ReceptionArea | null;
};

type Options = {
  siteId: string | null;
  onAfter?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export function useQueueActions({ siteId, onAfter, onError }: Options) {
  const [isPending, startTransition] = useTransition();
  const [reasonDialog, setReasonDialog] = useState<ReasonDialogState | null>(null);
  const [transferArea, setTransferArea] = useState<ReceptionArea | "">("");
  const [transferAreaError, setTransferAreaError] = useState<string | null>(null);

  useEffect(() => {
    if (!reasonDialog) return;
    if (reasonDialog.action !== "transfer") {
      setTransferArea("");
      setTransferAreaError(null);
      return;
    }

    const fromArea = reasonDialog.fromArea ?? null;
    const defaultTarget = (RECEPTION_AREAS as readonly ReceptionArea[]).find((area) => area !== fromArea) ?? "";
    setTransferArea(defaultTarget);
    setTransferAreaError(null);
  }, [reasonDialog]);

  const requireSiteId = () => {
    if (!siteId) {
      throw new Error("Sede requerida.");
    }
    return siteId;
  };

  const run = (fn: () => Promise<void>, fallbackMessage: string) => {
    startTransition(async () => {
      try {
        await fn();
        await onAfter?.();
      } catch (err) {
        onError?.((err as Error)?.message || fallbackMessage);
      }
    });
  };

  const callNext = (area: ReceptionArea) => {
    run(async () => {
      await actionCallNext({ siteId: requireSiteId(), area });
    }, "No se pudo llamar siguiente.");
  };

  const startService = (queueItemId: string) => {
    run(async () => {
      await actionStartServiceFromQueue({ queueItemId, siteId: requireSiteId() });
    }, "No se pudo iniciar atención.");
  };

  const complete = (queueItemId: string) => {
    run(async () => {
      await actionCompleteQueueItem({ queueItemId, siteId: requireSiteId() });
    }, "No se pudo finalizar.");
  };

  const resumeService = (queueItemId: string) => {
    run(async () => {
      await actionResumeQueueItem({ queueItemId, siteId: requireSiteId() });
    }, "No se pudo reanudar.");
  };

  const requestPause = (queueItemId: string, fromArea?: ReceptionArea | null) => {
    setReasonDialog({ action: "pause", queueItemId, fromArea: fromArea ?? null });
  };

  const requestSkip = (queueItemId: string, fromArea?: ReceptionArea | null) => {
    setReasonDialog({ action: "skip", queueItemId, fromArea: fromArea ?? null });
  };

  const requestTransfer = (queueItemId: string, fromArea?: ReceptionArea | null) => {
    setReasonDialog({ action: "transfer", queueItemId, fromArea: fromArea ?? null });
  };

  const closeReason = () => {
    setReasonDialog(null);
    setTransferAreaError(null);
  };

  const confirmReason = (reason: string) => {
    const payload = reasonDialog;
    if (!payload) return;

    run(async () => {
      const effectiveSiteId = requireSiteId();
      if (payload.action === "pause") {
        await actionPauseQueueItem({ queueItemId: payload.queueItemId, siteId: effectiveSiteId, reason });
        closeReason();
        return;
      }

      if (payload.action === "skip") {
        await actionSkipQueueItem({ queueItemId: payload.queueItemId, siteId: effectiveSiteId, reason });
        closeReason();
        return;
      }

      const toArea = transferArea || "";
      if (!toArea) {
        setTransferAreaError("Área requerida.");
        return;
      }

      await actionTransferQueueItem({ queueItemId: payload.queueItemId, siteId: effectiveSiteId, toArea, reason });
      closeReason();
    }, "No se pudo completar la acción.");
  };

  const transferFields = useMemo(() => {
    if (reasonDialog?.action !== "transfer") return null;
    return (
      <>
        <label className="text-xs font-semibold text-slate-600">
          Transferir a <span className="text-rose-600">*</span>
        </label>
        <select
          value={transferArea}
          onChange={(e) => {
            setTransferArea(e.target.value as ReceptionArea);
            setTransferAreaError(null);
          }}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 shadow-sm",
            transferAreaError ? "border-rose-200" : "border-slate-200"
          )}
        >
          {(RECEPTION_AREAS as readonly ReceptionArea[])
            .filter((area) => area !== (reasonDialog?.fromArea ?? null))
            .map((area) => (
              <option key={area} value={area}>
                {RECEPTION_AREA_LABELS[area] ?? area}
              </option>
            ))}
        </select>
        {transferAreaError ? <p className="text-sm text-rose-700">{transferAreaError}</p> : null}
      </>
    );
  }, [reasonDialog, transferArea, transferAreaError]);

  const action = reasonDialog?.action ?? null;
  const title =
    action === "transfer"
      ? "Transferir turno"
      : action === "skip"
        ? "Omitir turno"
        : "Pausar atención";
  const description =
    action === "transfer"
      ? "El turno se moverá a otra área y se registrará el motivo."
      : action === "skip"
        ? "El turno se marcará como omitido. Quedará registrado en la auditoría."
        : "La atención quedará en pausa y se registrará el motivo.";
  const placeholder =
    action === "transfer"
      ? "Ej: Se requiere laboratorio antes de consulta…"
      : action === "skip"
        ? "Ej: Paciente no respondió al llamado…"
        : "Ej: Paciente solicitó una pausa…";
  const confirmLabel =
    action === "transfer" ? "Confirmar transferencia" : action === "skip" ? "Confirmar omisión" : "Confirmar pausa";

  const reasonModal = {
    open: Boolean(reasonDialog),
    title,
    subtitle: "Motivo requerido",
    description,
    placeholder,
    confirmLabel,
    fields: action === "transfer" ? transferFields : null,
    onClose: closeReason,
    onConfirm: confirmReason
  };

  return {
    isPending,
    callNext,
    startService,
    complete,
    resumeService,
    requestPause,
    requestSkip,
    requestTransfer,
    reasonModal
  };
}
