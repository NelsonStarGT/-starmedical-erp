"use client";

import { useEffect, useMemo, useState } from "react";
import { LabArea, LabSampleType, LabTestOrder, LabTestPriority, LabTestStatus } from "@prisma/client";
import { BeakerIcon, MailIcon, MessageCircleIcon, PlusIcon, QrCodeIcon } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PriorityBadge } from "@/components/labtest/PriorityBadge";
import { StatusChip } from "@/components/labtest/StatusChip";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type OrderDTO = LabTestOrder & {
  patient?: any;
  labPatient?: any;
  items?: any[];
  samples?: any[];
};

type Props = {
  initialData: OrderDTO[];
  labReady: boolean;
};

export default function RequirementsClient({ initialData, labReady }: Props) {
  const [data, setData] = useState<OrderDTO[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; priority?: string; area?: string; fasting?: string }>({});
  const [sampleModal, setSampleModal] = useState<{ open: boolean; orderId?: string; itemIds?: string[] }>({ open: false });
  const [samplePayload, setSamplePayload] = useState({
    barcode: "",
    type: "BLOOD" as LabSampleType,
    fastingConfirmed: false,
    area: "HEMATOLOGY" as LabArea
  });
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.area) params.set("area", filters.area);
      if (filters.fasting) params.set("fasting", filters.fasting);
      const res = await safeFetchJson<{ ok: boolean; data: OrderDTO[] }>(`/api/labtest/requirements?${params.toString()}`);
      setData(res.data || []);
    } catch (err: any) {
      console.error(err);
      setActionMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.priority, filters.area, filters.fasting]);

  const handleContact = async (orderId: string, channel: "WHATSAPP" | "EMAIL", recipient: string) => {
    if (!recipient) return setActionMsg("Falta teléfono/correo del paciente");
    try {
      await safeFetchJson(`/api/labtest/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, channel, recipient })
      });
      setActionMsg("Contacto registrado");
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  const openSampleModal = (orderId: string, itemIds: string[]) => {
    const barcode = `LAB-${orderId.slice(-4).toUpperCase()}`;
    setSelectedItems(itemIds);
    setSamplePayload((prev) => ({ ...prev, barcode }));
    setSampleModal({ open: true, orderId, itemIds });
  };

  const saveSample = async () => {
    if (!sampleModal.orderId) return;
    const itemIds = selectedItems.length ? selectedItems : sampleModal.itemIds;
    try {
      await safeFetchJson(`/api/labtest/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: sampleModal.orderId,
          barcode: samplePayload.barcode,
          type: samplePayload.type,
          area: samplePayload.area,
          fastingConfirmed: samplePayload.fastingConfirmed,
          itemIds
        })
      });
      setSampleModal({ open: false });
      setSelectedItems([]);
      await fetchData();
      setActionMsg("Muestra registrada");
    } catch (err: any) {
      setActionMsg(err.message);
    }
  };

  const columns = useMemo(() => {
    return [
      {
        header: "Paciente",
        render: (row: OrderDTO) => (
          <div>
            <p className="font-semibold text-[#163d66]">{row.patient?.firstName || row.labPatient?.firstName || "Paciente"}</p>
            <p className="text-xs text-slate-500">{row.patient?.dpi || row.labPatient?.docId || row.code}</p>
          </div>
        )
      },
      {
        header: "Pruebas",
        render: (row: OrderDTO) => (
          <div className="flex flex-wrap gap-2">
            {(row.items || []).map((it) => (
              <span key={it.id} className="inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-3 py-1 text-xs font-semibold text-[#2e75ba]">
                <BeakerIcon className="h-4 w-4" /> {it.name}
              </span>
            ))}
          </div>
        )
      },
      {
        header: "Requisitos",
        render: (row: OrderDTO) => (
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${row.fastingRequired ? "bg-[#e8f1ff] text-[#2e75ba]" : "bg-slate-100 text-slate-600"}`}>
                Ayuno requerido: {row.fastingRequired ? "Sí" : "No"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                Confirmado: {row.fastingConfirmed === null ? "n/a" : row.fastingConfirmed ? "Sí" : "No"}
              </span>
            </div>
            <p className="text-xs text-slate-500">{row.requirementsNotes || ""}</p>
          </div>
        )
      },
      {
        header: "Prioridad",
        render: (row: OrderDTO) => <PriorityBadge priority={row.priority as LabTestPriority} />
      },
      {
        header: "Estado",
        render: (row: OrderDTO) => <StatusChip status={row.status as LabTestStatus} />
      },
      {
        header: "Acciones",
        render: (row: OrderDTO) => (
          <div className="flex flex-col gap-2 text-sm">
            <button
              onClick={() => openSampleModal(row.id, (row.items || []).map((it) => it.id))}
              className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-3 py-1.5 text-white shadow-sm hover:bg-[#3f8f87]"
            >
              <PlusIcon className="h-4 w-4" /> Registrar muestra
            </button>
            <button
              onClick={() => handleContact(row.id, "WHATSAPP", row.labPatient?.phone || row.patient?.phone || "")}
              className="inline-flex items-center gap-2 rounded-full border border-[#e5edf8] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff]"
            >
              <MessageCircleIcon className="h-4 w-4" /> Contactar WhatsApp
            </button>
            <button
              onClick={() => handleContact(row.id, "EMAIL", row.labPatient?.email || row.patient?.email || "")}
              className="inline-flex items-center gap-2 rounded-full border border-[#e5edf8] px-3 py-1.5 text-[#2e75ba] hover:bg-[#e8f1ff]"
            >
              <MailIcon className="h-4 w-4" /> Contactar Email
            </button>
          </div>
        )
      }
    ];
  }, []);

  return (
    <div className="space-y-4">
      <FilterBar
        actions={
          <button
            onClick={fetchData}
            className="rounded-full border border-[#dce7f5] bg-white px-3 py-1.5 text-sm font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>
        }
      >
        <select
          className="rounded-full border border-[#dce7f5] bg-white px-3 py-1.5 text-sm text-slate-700"
          value={filters.status || ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
        >
          <option value="">Estado</option>
          {Object.values(LabTestStatus).map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <select
          className="rounded-full border border-[#dce7f5] bg-white px-3 py-1.5 text-sm text-slate-700"
          value={filters.priority || ""}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value || undefined }))}
        >
          <option value="">Prioridad</option>
          {Object.values(LabTestPriority).map((pr) => (
            <option key={pr} value={pr}>
              {pr}
            </option>
          ))}
        </select>
        <select
          className="rounded-full border border-[#dce7f5] bg-white px-3 py-1.5 text-sm text-slate-700"
          value={filters.area || ""}
          onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || undefined }))}
        >
          <option value="">Área</option>
          {Object.values(LabArea).map((ar) => (
            <option key={ar} value={ar}>
              {ar}
            </option>
          ))}
        </select>
        <select
          className="rounded-full border border-[#dce7f5] bg-white px-3 py-1.5 text-sm text-slate-700"
          value={filters.fasting || ""}
          onChange={(e) => setFilters((f) => ({ ...f, fasting: e.target.value || undefined }))}
        >
          <option value="">Ayuno</option>
          <option value="required">Requerido</option>
          <option value="confirmed">Confirmado</option>
          <option value="unconfirmed">No confirmado</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns as any}
        data={data}
        zebra
        empty={
          <EmptyState
            title="Sin órdenes"
            description={
              labReady ? "No hay órdenes pendientes." : "Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate"
            }
            action={
              <button
                onClick={fetchData}
                className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Actualizar
              </button>
            }
          />
        }
      />

      {sampleModal.open && (
        <Modal
          open={sampleModal.open}
          onClose={() => setSampleModal({ open: false })}
          title="Registrar muestra"
          subtitle="Captura manual"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSampleModal({ open: false })}
                className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
              >
                Cancelar
              </button>
              <button
                onClick={saveSample}
                className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar
              </button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {sampleModal.itemIds && sampleModal.itemIds.length > 1 && (
              <div className="sm:col-span-2 space-y-2">
                <p className="text-sm font-semibold text-[#163d66]">Selecciona pruebas a asociar</p>
                {(data.find((o) => o.id === sampleModal.orderId)?.items || []).map((it: any) => (
                  <label key={it.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(it.id)}
                      onChange={(e) =>
                        setSelectedItems((prev) => (e.target.checked ? [...prev, it.id] : prev.filter((x) => x !== it.id)))
                      }
                    />
                    {it.name}
                  </label>
                ))}
              </div>
            )}
            <label className="space-y-1 text-sm text-slate-700">
              <span>Tipo de muestra</span>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={samplePayload.type}
                onChange={(e) => setSamplePayload((p) => ({ ...p, type: e.target.value as LabSampleType }))}
              >
                {Object.values(LabSampleType).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Área</span>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={samplePayload.area}
                onChange={(e) => setSamplePayload((p) => ({ ...p, area: e.target.value as LabArea }))}
              >
                {Object.values(LabArea).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Barcode</span>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-[#dce7f5] px-3 py-2"
                  value={samplePayload.barcode}
                  onChange={(e) => setSamplePayload((p) => ({ ...p, barcode: e.target.value }))}
                />
                <button
                  onClick={() => setSamplePayload((p) => ({ ...p, barcode: `LAB-${Math.random().toString(36).slice(2, 8).toUpperCase()}` }))}
                  className="rounded-full border border-[#dce7f5] px-3 py-2 text-sm text-[#2e75ba]"
                  type="button"
                >
                  <QrCodeIcon className="h-4 w-4" />
                </button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#dce7f5]"
                checked={samplePayload.fastingConfirmed}
                onChange={(e) => setSamplePayload((p) => ({ ...p, fastingConfirmed: e.target.checked }))}
              />
              Ayuno confirmado
            </label>
          </div>
        </Modal>
      )}

      {actionMsg && (
        <div className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 text-sm text-[#1f6f68]">
          {actionMsg}
        </div>
      )}
      {!labReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
          Ejecuta migración LabTest: npx prisma migrate dev --name labtest-fixes && npx prisma generate
        </div>
      )}
    </div>
  );
}
