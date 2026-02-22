"use client";

import { useEffect, useState } from "react";
import { LabArea, LabTestItem, LabTestResult, LabTestStatus } from "@prisma/client";
import { BeakerIcon, CheckCircleIcon, ClockIcon, PenLineIcon, SendIcon } from "lucide-react";
import { PriorityBadge } from "@/components/labtest/PriorityBadge";
import { StatusChip } from "@/components/labtest/StatusChip";
import { safeFetchJson } from "@/lib/http/safeFetchJson";
import { Modal } from "@/components/ui/Modal";
import { isMissingLabTableError } from "@/lib/labtest/dbGuard";

type ItemRow = LabTestItem & { order: any; sample: any; results: LabTestResult[] };

export default function WorkbenchAreaClient({
  items,
  area,
  areaSlug,
  labReady,
  sla,
  autoInProcess
}: {
  items: ItemRow[];
  area: LabArea;
  areaSlug: string;
  labReady: boolean;
  sla: { routine: number; urgent: number; stat: number };
  autoInProcess?: boolean;
}) {
  const [rows, setRows] = useState<ItemRow[]>(items);
  const [message, setMessage] = useState<string | null>(null);
  const [captureModal, setCaptureModal] = useState<{ open: boolean; itemId?: string; valueText?: string; unit?: string }>({ open: false });

  const refresh = async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; data: ItemRow[] }>(`/api/labtest/workbench/${areaSlug}`);
      const sorted = (res.data || []).sort((a, b) => {
        if (a.priority === "STAT" && b.priority !== "STAT") return -1;
        if (b.priority === "STAT" && a.priority !== "STAT") return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setRows(sorted);
    } catch (err: any) {
      if (isMissingLabTableError(err)) setMessage("Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate");
      else setMessage(err.message);
    }
  };

  const latestResult = (item: ItemRow) => {
    if (!item.results?.length) return null;
    return item.results.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
  };

  const markInProcess = async (itemId: string) => {
    const statPending = rows.some((r) => r.priority === "STAT" && ["QUEUED", "IN_PROCESS", "RESULT_CAPTURED"].includes(r.status));
    const target = rows.find((r) => r.id === itemId);
    if (statPending && target && target.priority !== "STAT") {
      setMessage("Existen STAT pendientes. Atiende STAT antes de procesar rutina.");
      return;
    }
    try {
      await safeFetchJson("/api/labtest/items/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "IN_PROCESS" })
      });
      setMessage("Marcado en proceso");
      refresh();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const openCapture = (itemId: string) => setCaptureModal({ open: true, itemId, valueText: "", unit: "" });

  const saveCapture = async () => {
    if (!captureModal.itemId) return;
    try {
      await safeFetchJson("/api/labtest/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: captureModal.itemId, valueText: captureModal.valueText, unit: captureModal.unit })
      });
      setCaptureModal({ open: false });
      setMessage("Resultado capturado");
      refresh();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const validate = async (item: ItemRow) => {
    const res = latestResult(item);
    if (!res) return setMessage("Sin resultado para validar");
    await safeFetchJson("/api/labtest/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId: res.id })
    });
    setMessage("Validado");
    refresh();
  };

  const release = async (item: ItemRow) => {
    const res = latestResult(item);
    if (!res) return setMessage("Sin resultado para liberar");
    await safeFetchJson("/api/labtest/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId: res.id })
    });
    setMessage("Liberado");
    refresh();
  };

  const isActionDisabled = (item: ItemRow, action: "process" | "validate" | "release" | "capture") => {
    if (action === "process") return !["READY_FOR_COLLECTION", "COLLECTED", "QUEUED"].includes(item.status);
    if (action === "capture") return item.status !== "IN_PROCESS";
    if (action === "validate") return item.status !== "RESULT_CAPTURED";
    if (action === "release") return !["TECH_VALIDATED", "RESULT_CAPTURED"].includes(item.status);
    return false;
  };

  useEffect(() => {
    if (!autoInProcess) return;
    rows
      .filter((item) => !isActionDisabled(item, "process"))
      .slice(0, 3)
      .forEach((item) => markInProcess(item.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInProcess]);

  const slaBadge = (item: ItemRow) => {
    const elapsedMin = Math.round((Date.now() - new Date(item.order.createdAt).getTime()) / 60000);
    const target =
      item.order.priority === "STAT"
        ? sla.stat
        : item.order.priority === "URGENT"
          ? sla.urgent
          : sla.routine;
    const remaining = target - elapsedMin;
    let tone = "bg-[#e8f1ff] text-[#2e75ba]";
    let label = "OK";
    if (remaining <= 15) {
      tone = "bg-amber-100 text-amber-700";
      label = "Por vencer";
    }
    if (remaining <= 0) {
      tone = "bg-rose-100 text-rose-700";
      label = "Vencido";
    }
    return { tone, remaining, target, elapsed: elapsedMin, label };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Workbench</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Área: {area.toLowerCase()}</h2>
        <p className="text-sm text-slate-600">Captura manual, validar y liberar.</p>
        {!labReady && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate
          </p>
        )}
        {rows.some((r) => r.priority === "STAT" && r.status !== "RELEASED") && (
          <div className="mt-3 rounded-xl border border-[#fbbf24] bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            STAT pendientes. Prioriza estos estudios antes de continuar con rutina.
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {rows.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#e8f1ff] p-3 text-[#2e75ba]">
                  <BeakerIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{item.order.code}</p>
                  <p className="text-lg font-semibold text-[#163d66]">{item.name}</p>
                  <p className="text-sm text-slate-600">
                    {item.order.patient?.firstName || item.order.labPatient?.firstName || "Paciente"} · {item.sample?.barcode || "Sin muestra"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={item.priority} />
                <StatusChip status={item.status} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${slaBadge(item).tone}`}
                title={`SLA ${slaBadge(item).target} min · transcurridos ${slaBadge(item).elapsed} min`}
              >
                SLA {slaBadge(item).label} · {slaBadge(item).elapsed} / {slaBadge(item).target} min
              </span>
              <button
                onClick={() => markInProcess(item.id)}
                disabled={isActionDisabled(item, "process")}
                className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
              >
                <ClockIcon className="h-4 w-4" /> Marcar en proceso
              </button>
              <button
                onClick={() => openCapture(item.id)}
                disabled={isActionDisabled(item, "capture")}
                className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
              >
                <PenLineIcon className="h-4 w-4" /> Capturar resultado
              </button>
              <button
                onClick={() => validate(item)}
                disabled={isActionDisabled(item, "validate")}
                className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1.5 text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" /> Validar
              </button>
              <button
                onClick={() => release(item)}
                disabled={isActionDisabled(item, "release")}
                className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
              >
                <SendIcon className="h-4 w-4" /> Liberar
              </button>
            </div>
          </div>
        ))}
        {labReady && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#dce7f5] bg-white p-6 text-sm text-slate-600 shadow-sm">
            No hay ítems en la cola de {area.toLowerCase()}.
          </div>
        )}
        {!labReady && (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate
          </div>
        )}
      </div>

      {captureModal.open && (
        <Modal
          open={captureModal.open}
          onClose={() => setCaptureModal({ open: false })}
          title="Capturar resultado"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCaptureModal({ open: false })}
                className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
              >
                Cancelar
              </button>
              <button
                onClick={saveCapture}
                className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Resultado</span>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={captureModal.valueText || ""}
                onChange={(e) => setCaptureModal((s) => ({ ...s, valueText: e.target.value }))}
              />
            </label>
            <label className="space-y-1">
              <span>Unidad</span>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={captureModal.unit || ""}
                onChange={(e) => setCaptureModal((s) => ({ ...s, unit: e.target.value }))}
              />
            </label>
          </div>
        </Modal>
      )}

      {message && <div className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 text-sm text-[#1f6f68]">{message}</div>}
    </div>
  );
}
