"use client";

import { useMemo, useState } from "react";
import { BellRing, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RECEPCION_QUEUE_MOCK,
  RECEPCION_QUEUE_STATUS_COLOR,
  RECEPCION_QUEUE_STATUS_LABELS,
  type RecepcionQueueItem,
  type RecepcionQueueStatus
} from "@/lib/recepcion/mock";

const STATUS_OPTIONS: RecepcionQueueStatus[] = [
  "PENDIENTE",
  "EN_ESPERA",
  "EN_ADMISION",
  "EN_CONSULTA",
  "FINALIZADO"
];

export default function QueueBoardV1({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<RecepcionQueueItem[]>(RECEPCION_QUEUE_MOCK);
  const [selectedId, setSelectedId] = useState<string>(RECEPCION_QUEUE_MOCK[0]?.id || "");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((entry) => entry.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const updateStatus = (nextStatus: RecepcionQueueStatus) => {
    if (!selected || !canWrite) return;
    setItems((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              status: nextStatus
            }
          : row
      )
    );
    setFlashMessage(`Estado actualizado a ${RECEPCION_QUEUE_STATUS_LABELS[nextStatus]} (solo UI v1).`);
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
      <article className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Cola / Sala de espera</h2>
          <span className="text-xs text-slate-500">{items.length} en cola</span>
        </div>

        <div className="mt-3 space-y-2">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Sin cola aún. Este panel quedará conectado a backend persistente en v2.
            </div>
          ) : (
            items.map((item) => {
              const active = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    active
                      ? "border-[#4aa59c] bg-[#F8FAFC]"
                      : "border-slate-200 bg-white hover:border-[#4aadf5]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                      <p className="text-xs text-slate-600">{item.code} · {item.reason}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", RECEPCION_QUEUE_STATUS_COLOR[item.status])}>
                      {RECEPCION_QUEUE_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Espera: {item.waitMinutes} min · Prioridad: {item.priority}</p>
                </button>
              );
            })
          )}
        </div>
      </article>

      <article className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Detalle</h3>

        {!selected ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Selecciona un paciente de la cola para ver detalle.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
              <p className="text-base font-semibold text-slate-900">{selected.clientName}</p>
              <p className="text-sm text-slate-600">{selected.documentRef}</p>
              <p className="mt-1 text-sm text-slate-600">Motivo: {selected.reason}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Estado actual</label>
              <select
                value={selected.status}
                onChange={(event) => updateStatus(event.target.value as RecepcionQueueStatus)}
                disabled={!canWrite}
                className={cn(
                  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30",
                  !canWrite && "cursor-not-allowed bg-slate-100 text-slate-400"
                )}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {RECEPCION_QUEUE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFlashMessage("Llamado enviado al tablero/altavoz (placeholder v1).")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#4aa59c] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f988f]"
              >
                <PhoneCall size={15} />
                Llamar paciente
              </button>
              <button
                type="button"
                onClick={() => setFlashMessage("Notificación interna enviada (placeholder v1).")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#4aadf5] hover:text-[#2e75ba]"
              >
                <BellRing size={15} />
                Notificar
              </button>
            </div>

            {!canWrite ? (
              <p className="text-xs text-amber-700">Tu rol tiene vista de cola, pero no permisos de escritura.</p>
            ) : null}

            {flashMessage ? <p className="text-xs text-slate-500">{flashMessage}</p> : null}
          </div>
        )}
      </article>
    </section>
  );
}
