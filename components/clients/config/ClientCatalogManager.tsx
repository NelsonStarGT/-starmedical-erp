"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientCatalogType } from "@prisma/client";
import { PlusCircle } from "lucide-react";
import {
  actionCreateClientCatalogItem,
  actionSetClientCatalogItemActive,
  actionUpdateClientCatalogItem
} from "@/app/admin/clientes/actions";
import ConfigDataTable, { type ConfigDataTableAction, type ConfigDataTableColumn } from "@/components/clients/config/ConfigDataTable";
import { cn } from "@/lib/utils";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type CatalogAction = "edit" | "toggle";

const columns: ConfigDataTableColumn<CatalogItem>[] = [
  {
    id: "name",
    header: "Nombre",
    render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>
  },
  {
    id: "description",
    header: "Descripción",
    render: (row) => <span className="text-slate-600">{row.description || "—"}</span>
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

export default function ClientCatalogManager({
  title,
  type,
  items
}: {
  title: string;
  type: ClientCatalogType;
  items: CatalogItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; description: string }>({ name: "", description: "" });

  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [items]
  );

  const rowActions = (row: CatalogItem): ConfigDataTableAction<CatalogItem>[] => [
    { id: "edit", label: "Editar" },
    { id: "toggle", label: row.isActive ? "Desactivar" : "Activar" }
  ];

  const create = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await actionCreateClientCatalogItem({ type, name, description });
        setName("");
        setDescription("");
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear el item.");
      }
    });
  };

  const saveEdit = () => {
    if (!editingId || !editDraft.name.trim()) return;
    startTransition(async () => {
      try {
        await actionUpdateClientCatalogItem({
          id: editingId,
          name: editDraft.name,
          description: editDraft.description
        });
        setEditingId(null);
        setEditDraft({ name: "", description: "" });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar.");
      }
    });
  };

  const onAction = (actionId: string, row: CatalogItem) => {
    const action = actionId as CatalogAction;
    if (action === "edit") {
      setEditingId(row.id);
      setEditDraft({ name: row.name, description: row.description ?? "" });
      return;
    }

    if (action === "toggle") {
      startTransition(async () => {
        try {
          await actionSetClientCatalogItemActive({ id: row.id, isActive: !row.isActive });
          setError(null);
          router.refresh();
        } catch (err) {
          setError((err as Error)?.message || "No se pudo actualizar estado.");
        }
      });
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Catálogos</p>

      {editingId ? (
        <div className="grid gap-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] p-3 md:grid-cols-[1.2fr_1fr_auto_auto]">
          <input
            value={editDraft.name}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            placeholder="Nombre"
          />
          <input
            value={editDraft.description}
            onChange={(event) => setEditDraft((prev) => ({ ...prev, description: event.target.value }))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
            placeholder="Descripción"
          />
          <button
            type="button"
            onClick={saveEdit}
            disabled={isPending || !editDraft.name.trim()}
            className={cn(
              "h-9 rounded-lg bg-[#4aa59c] px-4 text-sm font-semibold text-white hover:bg-[#4aadf5]",
              (isPending || !editDraft.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
            )}
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <ConfigDataTable
        title={title}
        subtitle="Tabla maestra de configuración del módulo Clientes."
        columns={columns}
        rows={sorted}
        actions={rowActions}
        onAction={onAction}
        enableSearch
        enableStatusFilter
        searchPlaceholder="Buscar ítem..."
        getSearchText={(row) => `${row.name} ${row.description ?? ""}`}
        emptyState="Sin ítems para este catálogo."
        headerActions={
          <div className="grid gap-2 sm:grid-cols-[1.1fr_1fr_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Nombre nuevo"
            />
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aadf5] focus:outline-none focus:ring-2 focus:ring-[#4aadf5]/20"
              placeholder="Descripción"
            />
            <button
              type="button"
              onClick={create}
              disabled={isPending || !name.trim()}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-lg bg-[#4aa59c] px-3 text-sm font-semibold text-white hover:bg-[#4aadf5]",
                (isPending || !name.trim()) && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <PlusCircle size={14} />
              Nuevo
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}
