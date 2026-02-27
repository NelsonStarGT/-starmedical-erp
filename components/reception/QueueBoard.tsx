"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, PauseCircle, PhoneCall, PlayCircle, Shuffle, SkipForward } from "lucide-react";
import { RECEPTION_AREAS, RECEPTION_AREA_LABELS, PRIORITY_LABELS, QUEUE_STATUS_LABELS, type ReceptionArea, type ReceptionPriority, type ReceptionQueueStatus } from "@/lib/reception/constants";
import { usePolling } from "@/lib/reception/ui-polling";
import { ActionButton } from "@/components/reception/ActionButtons";
import { ReasonModal } from "@/components/reception/ReasonModal";
import { actionGetQueueBoardSnapshot } from "@/app/admin/reception/actions";
import { useReceptionBranch } from "@/app/admin/reception/BranchContext";
import { useQueueActions } from "@/lib/reception/useQueueActions";
import { useQueuePermissions } from "@/lib/reception/useQueuePermissions";
import { cn } from "@/lib/utils";
import type { ReceptionCapability } from "@/lib/reception/permissions";

type QueueBoardItem = {
  id: string;
  visitId: string;
  ticketCode: string | null;
  status: ReceptionQueueStatus;
  priority: ReceptionPriority;
  elapsedMinutes: number;
  roomLabel?: string | null;
};

type QueueBoardArea = {
  area: ReceptionArea;
  waiting: QueueBoardItem[];
  called: QueueBoardItem[];
  inService: QueueBoardItem[];
  paused: QueueBoardItem[];
};

type Snapshot = {
  siteId: string;
  generatedAt: string;
  areas: QueueBoardArea[];
  slaByArea: Record<string, "normal" | "warning" | "critical">;
};

type Props = {
  siteId: string;
  initialData: Snapshot;
  capabilities: ReceptionCapability[];
  focusArea?: ReceptionArea | null;
};

export function QueueBoard({ siteId, initialData, capabilities, focusArea }: Props) {
  const [data, setData] = useState<Snapshot>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeBranchId } = useReceptionBranch();
  const effectiveSiteId = activeBranchId ?? siteId;
  const permissions = useQueuePermissions(capabilities);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!effectiveSiteId) {
        setError("Selecciona una sede activa para operar.");
        return;
      }
      const next = await actionGetQueueBoardSnapshot(effectiveSiteId);
      setData(next);
      setError(null);
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar colas.");
    } finally {
      setIsRefreshing(false);
    }
  }, [effectiveSiteId]);

  usePolling({ intervalMs: 5000, onTick: refresh });

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 300);
    return () => clearTimeout(timer);
  }, [refresh]);

  const {
    isPending,
    callNext,
    startService,
    complete,
    resumeService,
    requestPause,
    requestSkip,
    requestTransfer,
    reasonModal
  } = useQueueActions({
    siteId: effectiveSiteId,
    onAfter: refresh,
    onError: (message) => setError(message)
  });

  const handleCallNext = (area: ReceptionArea) => {
    if (!permissions.canCallNext) return;
    callNext(area);
  };

  const handleAction = (
    action: "pause" | "resume" | "start" | "complete" | "skip" | "transfer",
    queueItemId: string,
    area: ReceptionArea
  ) => {
    if (action === "pause") {
      if (!permissions.canPauseResume) return;
      requestPause(queueItemId, area);
      return;
    }

    if (action === "skip") {
      if (!permissions.canSkip) return;
      requestSkip(queueItemId, area);
      return;
    }

    if (action === "transfer") {
      if (!permissions.canTransfer) return;
      requestTransfer(queueItemId, area);
      return;
    }

    if (action === "resume") {
      if (!permissions.canPauseResume) return;
      resumeService(queueItemId);
      return;
    }

    if (action === "start") {
      if (!permissions.canStart) return;
      startService(queueItemId);
      return;
    }

    if (action === "complete") {
      if (!permissions.canComplete) return;
      complete(queueItemId);
    }
  };

  const areasOrdered = RECEPTION_AREAS
    .map((area) => data.areas.find((item) => item.area === area))
    .filter(Boolean)
    .filter((area) => (focusArea ? area!.area === focusArea : true)) as QueueBoardArea[];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Recepción</p>
          <h2 className="text-lg font-semibold text-[#102a43]" style={{ fontFamily: "var(--font-reception-heading)" }}>
            Colas operativas por área
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Actualiza cada 5s.</span>
            {focusArea ? (
              <>
                <span className="text-slate-300">·</span>
                <span className="rounded-full bg-[#4aadf5]/10 px-3 py-1 font-semibold text-[#2e75ba]">
                  Filtrado: {RECEPTION_AREA_LABELS[focusArea] ?? focusArea}
                </span>
                <Link href="/admin/recepcion/queues" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
                  Ver todas
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <span className={cn("text-xs text-slate-500", isRefreshing && "text-[#4aa59c]")}>
          {isRefreshing ? "Actualizando..." : "En vivo"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {areasOrdered.map((area) => (
          <div key={area.area} className="rounded-xl border border-[#e5edf8] bg-white/95 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">
                  {RECEPTION_AREA_LABELS[area.area]}
                </p>
                <p className="text-sm text-slate-500">
                  {area.waiting.length} en espera · {area.called.length} llamados · {area.inService.length} en atención · {area.paused.length} en pausa
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <SlaPill tone={data.slaByArea?.[area.area] ?? "normal"} />
                {permissions.canCallNext && (
                  <ActionButton
                    label="Llamar siguiente"
                    icon={<PhoneCall size={14} />}
                    variant="primary"
                    disabled={isPending}
                    onClick={() => handleCallNext(area.area)}
                  />
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
                <QueueSection
                  title="En espera"
                  tone="waiting"
                  area={area.area}
                  items={area.waiting}
                  disabled={isPending}
                  canCallNext={permissions.canCallNext}
                  canPauseResume={permissions.canPauseResume}
                  canStart={permissions.canStart}
                  canComplete={permissions.canComplete}
                  canSkip={permissions.canSkip}
                  canTransfer={permissions.canTransfer}
                  onCallNext={handleCallNext}
                  onAction={handleAction}
                />
                <QueueSection
                  title="Llamados"
                  tone="calling"
                  area={area.area}
                  items={area.called}
                  disabled={isPending}
                  canCallNext={permissions.canCallNext}
                  canPauseResume={permissions.canPauseResume}
                  canStart={permissions.canStart}
                  canComplete={permissions.canComplete}
                  canSkip={permissions.canSkip}
                  canTransfer={permissions.canTransfer}
                  onCallNext={handleCallNext}
                  onAction={handleAction}
                />
                <QueueSection
                  title="En atención"
                  tone="service"
                  area={area.area}
                  items={area.inService}
                  disabled={isPending}
                  canCallNext={permissions.canCallNext}
                  canPauseResume={permissions.canPauseResume}
                  canStart={permissions.canStart}
                  canComplete={permissions.canComplete}
                  canSkip={permissions.canSkip}
                  canTransfer={permissions.canTransfer}
                  onCallNext={handleCallNext}
                  onAction={handleAction}
                />
                <QueueSection
                  title="Atención pausada"
                  tone="paused"
                  area={area.area}
                  items={area.paused}
                  disabled={isPending}
                  canCallNext={permissions.canCallNext}
                  canPauseResume={permissions.canPauseResume}
                  canStart={permissions.canStart}
                  canComplete={permissions.canComplete}
                  canSkip={permissions.canSkip}
                  canTransfer={permissions.canTransfer}
                  onCallNext={handleCallNext}
                  onAction={handleAction}
                />
            </div>
          </div>
        ))}
      </div>

      <ReasonModal
        open={reasonModal.open}
        onClose={reasonModal.onClose}
        title={reasonModal.title}
        subtitle={reasonModal.subtitle}
        description={reasonModal.description}
        fields={reasonModal.fields}
        placeholder={reasonModal.placeholder}
        confirmLabel={reasonModal.confirmLabel}
        isPending={isPending}
        onConfirm={reasonModal.onConfirm}
      />
    </section>
  );
}

function QueueSection({
  title,
  tone,
  area,
  items,
  onAction,
  onCallNext,
  disabled,
  canCallNext,
  canPauseResume,
  canStart,
  canComplete,
  canSkip,
  canTransfer
}: {
  title: string;
  tone: "waiting" | "calling" | "service" | "paused";
  area: ReceptionArea;
  items: QueueBoardItem[];
  onAction: (action: "pause" | "resume" | "start" | "complete" | "skip" | "transfer", queueItemId: string, area: ReceptionArea) => void;
  onCallNext: (area: ReceptionArea) => void;
  disabled?: boolean;
  canCallNext: boolean;
  canPauseResume: boolean;
  canStart: boolean;
  canComplete: boolean;
  canSkip: boolean;
  canTransfer: boolean;
}) {
  const toneStyles =
    tone === "waiting"
      ? "bg-slate-100 text-slate-600"
      : tone === "calling"
        ? "bg-[#4aadf5]/10 text-[#2e75ba]"
        : tone === "paused"
          ? "bg-amber-100 text-amber-700"
          : "bg-[#4aa59c]/10 text-[#2e75ba]";

  return (
    <div>
      <div className={cn("rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]", toneStyles)}>
        {title}
      </div>
      <div className="mt-2 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Sin turnos.
          </div>
        ) : (
          items.map((item, index) => {
            const isNextWaiting = tone === "waiting" && index === 0;
            return (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/recepcion/visit/${item.visitId}`}
                      className="text-sm font-semibold text-[#2e75ba] hover:text-[#4aadf5]"
                    >
                      {item.ticketCode ?? "—"}
                    </Link>
                    {isNextWaiting ? (
                      <span className="rounded-full bg-[#4aa59c]/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#2e75ba]">
                        Siguiente
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {PRIORITY_LABELS[item.priority] ?? item.priority} · {item.elapsedMinutes} min
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {QUEUE_STATUS_LABELS[item.status] ?? item.status}
                  </p>
                  {item.roomLabel && <p className="text-xs text-slate-500">{item.roomLabel}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {item.status === "WAITING" && (
                    <>
                      {isNextWaiting && canCallNext && (
                        <ActionButton
                          label="Llamar"
                          icon={<PhoneCall size={14} />}
                          variant="primary"
                          disabled={disabled}
                          onClick={() => onCallNext(area)}
                        />
                      )}
                      {canTransfer && (
                        <ActionButton
                          label="Transferir"
                          icon={<Shuffle size={14} />}
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onAction("transfer", item.id, area)}
                        />
                      )}
                      {canSkip && (
                        <ActionButton
                          label="Omitir"
                          icon={<SkipForward size={14} />}
                          variant="danger"
                          disabled={disabled}
                          onClick={() => onAction("skip", item.id, area)}
                        />
                      )}
                    </>
                  )}
                  {item.status === "PAUSED" && (
                    <>
                      {canPauseResume && (
                        <ActionButton
                          label="Reanudar"
                          icon={<PlayCircle size={14} />}
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onAction("resume", item.id, area)}
                        />
                      )}
                      {canTransfer && (
                        <ActionButton
                          label="Transferir"
                          icon={<Shuffle size={14} />}
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onAction("transfer", item.id, area)}
                        />
                      )}
                    </>
                  )}
                  {item.status === "CALLED" && (
                    <>
                      {canStart && (
                        <ActionButton
                          label="Iniciar"
                          icon={<PlayCircle size={14} />}
                          variant="primary"
                          disabled={disabled}
                          onClick={() => onAction("start", item.id, area)}
                        />
                      )}
                      {canTransfer && (
                        <ActionButton
                          label="Transferir"
                          icon={<Shuffle size={14} />}
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onAction("transfer", item.id, area)}
                        />
                      )}
                      {canSkip && (
                        <ActionButton
                          label="Omitir"
                          icon={<SkipForward size={14} />}
                          variant="danger"
                          disabled={disabled}
                          onClick={() => onAction("skip", item.id, area)}
                        />
                      )}
                    </>
                  )}
                  {item.status === "IN_SERVICE" && (
                    <>
                      {canPauseResume && (
                        <ActionButton
                          label="Pausar"
                          icon={<PauseCircle size={14} />}
                          variant="secondary"
                          disabled={disabled}
                          onClick={() => onAction("pause", item.id, area)}
                        />
                      )}
                      {canComplete && (
                        <ActionButton
                          label="Finalizar"
                          icon={<CheckCircle2 size={14} />}
                          variant="primary"
                          disabled={disabled}
                          onClick={() => onAction("complete", item.id, area)}
                        />
                      )}
                    </>
                  )}
                  <Link
                    href={`/admin/recepcion/visit/${item.visitId}`}
                    className="inline-flex items-center gap-1 rounded-full border border-transparent bg-transparent px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-[#2e75ba]"
                    aria-label="Ver detalle de visita"
                  >
                    Ver <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}

function SlaPill({ tone }: { tone: "normal" | "warning" | "critical" }) {
  const styles =
    tone === "critical"
      ? "bg-rose-100 text-rose-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-[#4aa59c]/10 text-[#2e75ba]";
  const label = tone === "critical" ? "Crítico" : tone === "warning" ? "Alerta" : "Normal";
  return (
    <span className={cn("rounded-full px-3 py-1 text-[11px] font-semibold uppercase", styles)}>
      SLA {label}
    </span>
  );
}
