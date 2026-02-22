"use client";

import { useState } from "react";
import { LabTestStatus } from "@prisma/client";
import { StatusChip } from "@/components/labtest/StatusChip";
import { PriorityBadge } from "@/components/labtest/PriorityBadge";
import { Modal } from "@/components/ui/Modal";

type SampleRow = any;

export function SamplesClient({ initialData }: { initialData: SampleRow[] }) {
  const [samples] = useState<SampleRow[]>(initialData || []);
  const [selected, setSelected] = useState<SampleRow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (sample: SampleRow) => {
    try {
      await navigator.clipboard?.writeText(sample.barcode);
      setCopiedId(sample.id);
      setTimeout(() => setCopiedId((prev) => (prev === sample.id ? null : prev)), 1500);
    } catch (_err) {
      // noop feedback for clipboard failure
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Muestras</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Trazabilidad de muestras</h2>
        <p className="text-sm text-slate-600">
          REQUESTED → READY_FOR_COLLECTION → COLLECTED → QUEUED → IN_PROCESS → RESULT_CAPTURED → TECH_VALIDATED → RELEASED → SENT
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Secuencia</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Barcode</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Paciente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {samples.map((sample, idx) => (
              <tr key={sample.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                <td className="px-4 py-3 text-sm font-semibold text-[#163d66]">
                  {sample.specimenSeq || "—"}
                  <div className="text-[11px] text-slate-500">{sample.specimenSeqDateKey || ""}</div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-[#163d66]">
                  {sample.barcode}
                  <div className="text-[11px] text-slate-500">Seq: {sample.specimenSeq || "—"}</div>
                  <div className="mt-1 flex gap-2 text-[11px] text-[#2e75ba]">
                    <button className="underline" onClick={() => handleCopy(sample)}>
                      Copiar
                    </button>
                    {copiedId === sample.id && <span className="text-[#1f6f68]">Copiado</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {sample.order.patient?.firstName || sample.order.labPatient?.firstName || "Paciente"}
                  <div className="text-xs text-slate-500">{sample.order.code}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 space-y-1">
                  {sample.items.map((it: any) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <PriorityBadge priority={sample.order.priority} />
                      <span className="text-slate-700">{it.name}</span>
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={sample.status as LabTestStatus} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  <button
                    onClick={() => setSelected(sample)}
                    className="rounded-full border border-[#dce7f5] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
                  >
                    Reimprimir etiqueta
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          open
          title="Reimprimir etiqueta"
          onClose={() => setSelected(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
              >
                Cerrar
              </button>
              <button className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm">Imprimir (placeholder)</button>
            </div>
          }
        >
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-[#163d66]">Barcode:</span> {selected.barcode}
            </p>
            <p>
              <span className="font-semibold text-[#163d66]">Secuencia:</span> {selected.specimenSeq || "—"} {selected.specimenSeqDateKey || ""}
            </p>
            <p>
              <span className="font-semibold text-[#163d66]">Paciente:</span>{" "}
              {selected.order.patient?.firstName || selected.order.labPatient?.firstName || "Paciente"}
            </p>
            <p className="text-xs text-slate-500">Impresión simulada para flujo manual-first.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
