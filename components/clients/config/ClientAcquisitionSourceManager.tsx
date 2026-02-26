"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import {
  actionCreateClientAcquisitionDetailOption,
  actionCreateClientAcquisitionSource,
  actionSetClientAcquisitionDetailOptionActive,
  actionSetClientAcquisitionSourceActive,
  actionUpdateClientAcquisitionDetailOption,
  actionUpdateClientAcquisitionSource
} from "@/app/admin/clientes/actions";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

type SourceRow = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

type DetailRow = {
  id: string;
  sourceId: string;
  name: string;
  code: string;
  isActive: boolean;
};

type SourceAction = "edit" | "toggle" | "details";
type DetailAction = "edit" | "toggle";

const sourceColumns: ConfigDataTableColumn<SourceRow>[] = [
  {
    id: "name",
    header: "Nombre",
    render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>
  },
  {
    id: "code",
    header: "Código/Key",
    render: (row) => <span className="font-mono text-xs text-slate-600">{row.code || "—"}</span>
  },
  {
    id: "category",
    header: "Tipo",
    render: (row) => <span className="text-slate-600">{row.category || "General"}</span>
  },
  {
    id: "status",
    header: "Estado",
    render: (row) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
        )}
      >
        {row.isActive ? "Activo" : "Inactivo"}
      </span>
    )
  }
];

const detailColumns: ConfigDataTableColumn<DetailRow>[] = [
  {
    id: "name",
    header: "Nombre",
    render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>
  },
  {
    id: "code",
    header: "Código/Key",
    render: (row) => <span className="font-mono text-xs text-slate-600">{row.code || "—"}</span>
  },
  {
    id: "status",
    header: "Estado",
    render: (row) => (
      <span
        className={cn(
          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
        )}
      >
        {row.isActive ? "Activo" : "Inactivo"}
      </span>
    )
  }
];

export default function ClientAcquisitionSourceManager({
  sources,
  details
}: {
  sources: SourceRow[];
  details: DetailRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [sourceForm, setSourceForm] = useState({ name: "", code: "", category: "" });
  const [detailForm, setDetailForm] = useState({ name: "", code: "" });

  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [sourceDraft, setSourceDraft] = useState({ name: "", code: "", category: "" });
  const [detailDraft, setDetailDraft] = useState({ name: "", code: "" });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sources[0]?.id ?? "");

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [sources]
  );

  const selectedSource = useMemo(
    () => sortedSources.find((source) => source.id === selectedSourceId) ?? null,
    [sortedSources, selectedSourceId]
  );

  const sourceDetails = useMemo(
    () => details.filter((item) => item.sourceId === selectedSourceId).sort((a, b) => a.name.localeCompare(b.name)),
    [details, selectedSourceId]
  );

  const sourceActions = (row: SourceRow): ConfigDataTableAction<SourceRow>[] => [
    { id: "edit", label: "Editar" },
    { id: "toggle", label: row.isActive ? "Desactivar" : "Activar" },
    { id: "details", label: "Ver detalles" }
  ];

  const detailActions = (row: DetailRow): ConfigDataTableAction<DetailRow>[] => [
    { id: "edit", label: "Editar" },
    { id: "toggle", label: row.isActive ? "Desactivar" : "Activar" }
  ];

  const createSource = () => {
    if (!sourceForm.name.trim()) return;
    startTransition(async () => {
      try {
        const created = await actionCreateClientAcquisitionSource({
          name: sourceForm.name,
          code: sourceForm.code,
          category: sourceForm.category
        });
        setSourceForm({ name: "", code: "", category: "" });
        setSelectedSourceId(created.id);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el canal.");
      }
    });
  };

  const saveSource = () => {
    if (!editingSourceId || !sourceDraft.name.trim()) return;
    startTransition(async () => {
      try {
        await actionUpdateClientAcquisitionSource({
          id: editingSourceId,
          name: sourceDraft.name,
          code: sourceDraft.code,
          category: sourceDraft.category
        });
        setEditingSourceId(null);
        setSourceDraft({ name: "", code: "", category: "" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar el canal.");
      }
    });
  };

  const createDetail = () => {
    if (!selectedSourceId || !detailForm.name.trim()) return;
    startTransition(async () => {
      try {
        await actionCreateClientAcquisitionDetailOption({
          sourceId: selectedSourceId,
          name: detailForm.name,
          code: detailForm.code
        });
        setDetailForm({ name: "", code: "" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el detalle.");
      }
    });
  };

  const saveDetail = () => {
    if (!editingDetailId || !detailDraft.name.trim()) return;
    startTransition(async () => {
      try {
        await actionUpdateClientAcquisitionDetailOption({
          id: editingDetailId,
          name: detailDraft.name,
          code: detailDraft.code
        });
        setEditingDetailId(null);
        setDetailDraft({ name: "", code: "" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar el detalle.");
      }
    });
  };

  const onSourceAction = (actionId: string, row: SourceRow) => {
    const action = actionId as SourceAction;
    if (action === "edit") {
      setEditingSourceId(row.id);
      setSourceDraft({
        name: row.name,
        code: row.code ?? "",
        category: row.category ?? ""
      });
      return;
    }

    if (action === "details") {
      setSelectedSourceId(row.id);
      setDetailsOpen(true);
      return;
    }

    if (action === "toggle") {
      startTransition(async () => {
        try {
          await actionSetClientAcquisitionSourceActive({
            id: row.id,
            isActive: !row.isActive
          });
          setError(null);
          router.refresh();
        } catch (err) {
          setError((err as Error)?.message || "No se pudo cambiar el estado del canal.");
        }
      });
    }
  };

  const onDetailAction = (actionId: string, row: DetailRow) => {
    const action = actionId as DetailAction;
    if (action === "edit") {
      setEditingDetailId(row.id);
      setDetailDraft({ name: row.name, code: row.code ?? "" });
      return;
    }

    if (action === "toggle") {
      startTransition(async () => {
        try {
          await actionSetClientAcquisitionDetailOptionActive({
            id: row.id,
            isActive: !row.isActive
          });
          setError(null);
          router.refresh();
        } catch (err) {
          setError((err as Error)?.message || "No se pudo cambiar estado del detalle.");
        }
      });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Canales y comercial</p>

      {editingSourceId ? (
        <div className="grid gap-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-3 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
          <input
            value={sourceDraft.name}
            onChange={(event) => setSourceDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            placeholder="Nombre"
          />
          <input
            value={sourceDraft.code}
            onChange={(event) => setSourceDraft((prev) => ({ ...prev, code: event.target.value }))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            placeholder="Código/Key"
          />
          <input
            value={sourceDraft.category}
            onChange={(event) => setSourceDraft((prev) => ({ ...prev, category: event.target.value }))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            placeholder="Tipo"
          />
          <button
            type="button"
            onClick={saveSource}
            disabled={isPending || !sourceDraft.name.trim()}
            className={cn(
              "h-9 rounded-lg bg-[#4aa59c] px-4 text-sm font-semibold text-white hover:bg-[#4aadf5]",
              (isPending || !sourceDraft.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
            )}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditingSourceId(null)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <ConfigDataTable
        title="Canales"
        subtitle="Canal de adquisición con selector de detalles por fila."
        columns={sourceColumns}
        rows={sortedSources}
        actions={sourceActions}
        onAction={onSourceAction}
        enableSearch
        enableStatusFilter
        searchPlaceholder="Buscar canal..."
        getSearchText={(row) => `${row.name} ${row.code ?? ""} ${row.category ?? ""}`}
        emptyState="Sin canales registrados."
        headerActions={
          <div className="grid gap-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <input
              value={sourceForm.name}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Nombre canal"
            />
            <input
              value={sourceForm.code}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, code: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Código/Key"
            />
            <input
              value={sourceForm.category}
              onChange={(event) => setSourceForm((prev) => ({ ...prev, category: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Tipo"
            />
            <button
              type="button"
              onClick={createSource}
              disabled={isPending || !sourceForm.name.trim()}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                (isPending || !sourceForm.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <PlusCircle size={14} />
              Nuevo
            </button>
          </div>
        }
      />

      <Modal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setEditingDetailId(null);
        }}
        title={`Detalles del canal${selectedSource ? ` · ${selectedSource.name}` : ""}`}
        subtitle="Canales y comercial"
        className="max-w-5xl"
      >
        {editingDetailId ? (
          <div className="mb-3 grid gap-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-3 md:grid-cols-[1.2fr_1fr_auto_auto]">
            <input
              value={detailDraft.name}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Nombre"
            />
            <input
              value={detailDraft.code}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, code: event.target.value }))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Código/Key"
            />
            <button
              type="button"
              onClick={saveDetail}
              disabled={isPending || !detailDraft.name.trim()}
              className={cn(
                "h-9 rounded-lg bg-[#4aa59c] px-4 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                (isPending || !detailDraft.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditingDetailId(null)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cancelar
            </button>
          </div>
        ) : null}

        <ConfigDataTable
          title="Opciones del canal"
          columns={detailColumns}
          rows={sourceDetails}
          actions={detailActions}
          onAction={onDetailAction}
          enableSearch
          enableStatusFilter
          searchPlaceholder="Buscar detalle..."
          getSearchText={(row) => `${row.name} ${row.code ?? ""}`}
          emptyState="Sin detalles para este canal."
          headerActions={
            <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_auto]">
              <input
                value={detailForm.name}
                onChange={(event) => setDetailForm((prev) => ({ ...prev, name: event.target.value }))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
                placeholder="Nombre detalle"
              />
              <input
                value={detailForm.code}
                onChange={(event) => setDetailForm((prev) => ({ ...prev, code: event.target.value }))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
                placeholder="Código/Key"
              />
              <button
                type="button"
                onClick={createDetail}
                disabled={isPending || !selectedSourceId || !detailForm.name.trim()}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                  (isPending || !selectedSourceId || !detailForm.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
                )}
              >
                <PlusCircle size={14} />
                Nuevo
              </button>
            </div>
          }
        />
      </Modal>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}
