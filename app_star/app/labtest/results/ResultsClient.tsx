"use client";

import { useMemo, useState } from "react";
import { LabTestItem, LabTestResult, LabTestStatus } from "@prisma/client";
import { MailIcon, MessageCircleIcon, ShieldCheckIcon, SendIcon, BadgeCheckIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/labtest/StatusChip";
import { safeFetchJson } from "@/lib/http/safeFetchJson";
import { Modal } from "@/components/ui/Modal";

type ItemRow = LabTestItem & { order: any; sample: any; results: LabTestResult[] };

type Props = {
  initialData: ItemRow[];
  labReady: boolean;
};

export default function ResultsClient({ initialData, labReady }: Props) {
  const [data, setData] = useState<ItemRow[]>(initialData);
  const [sendModal, setSendModal] = useState<{ open: boolean; orderId?: string; recipient?: string; channel?: "EMAIL" | "WHATSAPP" }>({
    open: false
  });
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ open: boolean; html?: string }>({ open: false });

  const refresh = async () => {
    const res = await safeFetchJson<{ ok: boolean; data: ItemRow[] }>("/api/labtest/results");
    setData(res.data || []);
  };

  const latestResult = (item: ItemRow) => {
    if (!item.results?.length) return null;
    return item.results.slice().sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
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

  const orders = useMemo(() => {
    const map = new Map<string, { order: any; items: ItemRow[] }>();
    data.forEach((item) => {
      const existing = map.get(item.order.id) || { order: item.order, items: [] };
      existing.items.push(item);
      map.set(item.order.id, existing);
    });
    return Array.from(map.values());
  }, [data]);

  const openSend = (order: any, channel: "EMAIL" | "WHATSAPP") => {
    if (order.status !== "RELEASED" || order.sentAt) return;
    setSendModal({
      open: true,
      orderId: order.id,
      channel,
      recipient: channel === "EMAIL" ? order.patient?.email || order.labPatient?.email : order.patient?.phone || order.labPatient?.phone
    });
  };

  const send = async () => {
    if (!sendModal.orderId || !sendModal.channel) return;
    await safeFetchJson("/api/labtest/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: sendModal.orderId,
        channel: sendModal.channel,
        recipient: sendModal.recipient
      })
    });
    setSendModal({ open: false });
    setMessage("Envío registrado");
    refresh();
  };

  const openPreview = async (orderId: string) => {
    const res = await safeFetchJson<{ ok: boolean; data: { html: string } }>(`/api/labtest/orders/${orderId}/document-preview`);
    setPreview({ open: true, html: res.data.html });
  };

  return (
    <div className="space-y-4">
      {!labReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate
        </div>
      )}

      {orders.length === 0 && (
        <EmptyState title="Sin resultados" description="No hay pendientes de validación/liberación." />
      )}

      {orders.map(({ order, items }) => (
        <div key={order.id} className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Orden {order.code}</p>
              <p className="text-lg font-semibold text-[#163d66]">
                {order.patient?.firstName || order.labPatient?.firstName || "Paciente"}
              </p>
              <p className="text-sm text-slate-600">
                Estado: {order.status} · Reporte #{order.reportSeq || "—"} {order.reportSeqDateKey ? `(${order.reportSeqDateKey})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                onClick={() => openPreview(order.id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff]"
              >
                <BadgeCheckIcon className="h-4 w-4" /> Preview
              </button>
              {order.sentAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
                  <BadgeCheckIcon className="h-4 w-4" /> Enviado ({order.sentChannel || "N/A"})
                </span>
              ) : (
                <>
                  <button
                    disabled={order.status !== "RELEASED"}
                    onClick={() => openSend(order, "WHATSAPP")}
                    className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
                  >
                    <MessageCircleIcon className="h-4 w-4" /> Enviar WhatsApp
                  </button>
                  <button
                    disabled={order.status !== "RELEASED"}
                    onClick={() => openSend(order, "EMAIL")}
                    className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
                  >
                    <MailIcon className="h-4 w-4" /> Enviar Email
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="divide-y divide-[#eef3fb] rounded-xl border border-[#e5edf8]">
            {items.map((row) => (
              <div key={row.id} className="grid gap-3 bg-white px-3 py-3 sm:grid-cols-4">
                <div>
                  <p className="text-sm font-semibold text-[#163d66]">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.sample?.barcode || "Sin muestra"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={row.status as LabTestStatus} />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => validate(row)}
                    disabled={row.status !== "RESULT_CAPTURED"}
                    className="inline-flex items-center gap-1 rounded-full border border-[#dce7f5] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff] disabled:opacity-50"
                  >
                    <ShieldCheckIcon className="h-4 w-4" /> Validar
                  </button>
                  <button
                    onClick={() => release(row)}
                    disabled={!["TECH_VALIDATED", "RESULT_CAPTURED"].includes(row.status)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1.5 text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-50"
                  >
                    <SendIcon className="h-4 w-4" /> Liberar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {sendModal.open && (
        <Modal
          open={sendModal.open}
          onClose={() => setSendModal({ open: false })}
          title="Enviar resultados"
          subtitle="Manual-first"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSendModal({ open: false })}
                className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
              >
                Cancelar
              </button>
              <button
                onClick={send}
                className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Enviar
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-sm text-slate-700">
            <label className="space-y-1">
              <span>Canal</span>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={sendModal.channel}
                onChange={(e) =>
                  setSendModal((s) => ({
                    ...s,
                    channel: e.target.value as "EMAIL" | "WHATSAPP"
                  }))
                }
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </label>
            <label className="space-y-1">
              <span>Destinatario</span>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={sendModal.recipient || ""}
                onChange={(e) => setSendModal((s) => ({ ...s, recipient: e.target.value }))}
              />
            </label>
          </div>
      </Modal>
    )}

      {preview.open && (
        <Modal
          open={preview.open}
          onClose={() => setPreview({ open: false })}
          title="Preview documento"
          subtitle="Encabezado + resultados + footer"
          footer={
            <div className="flex justify-end">
              <button
                onClick={() => setPreview({ open: false })}
                className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
              >
                Cerrar
              </button>
            </div>
          }
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-[#e5edf8] bg-white p-3">
            <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: preview.html || "" }} />
          </div>
        </Modal>
      )}

      {message && <div className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 text-sm text-[#1f6f68]">{message}</div>}
    </div>
  );
}
