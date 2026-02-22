"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClientCatalogType } from "@prisma/client";
import { Edit3, PlusCircle, Save, ToggleLeft, ToggleRight } from "lucide-react";
import {
  actionCreateClientCatalogItem,
  actionSetClientCatalogItemActive,
  actionUpdateClientCatalogItem
} from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

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

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name));
  }, [items]);

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

  const toggle = (id: string, next: boolean) => {
    startTransition(async () => {
      try {
        await actionSetClientCatalogItemActive({ id, isActive: next });
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar el estado.");
      }
    });
  };

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setEditDraft({ name: item.name, description: item.description ?? "" });
    setError(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      try {
        await actionUpdateClientCatalogItem({ id: editingId, name: editDraft.name, description: editDraft.description });
        setEditingId(null);
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo guardar.");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Catálogo</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          {title}
        </h3>
      </div>

      <div className="grid gap-2">
        {sorted.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                      />
                      <textarea
                        value={editDraft.description}
                        onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Descripción (opcional)"
                        className="min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                      {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold",
                      item.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    )}
                  >
                    {item.isActive ? "Activo" : "Inactivo"}
                  </span>

                  {isEditing ? (
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isPending || !editDraft.name.trim()}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
                        (isPending || !editDraft.name.trim()) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
                      )}
                    >
                      <Save size={16} />
                      Guardar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate"
                    >
                      <Edit3 size={16} />
                      Editar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggle(item.id, !item.isActive)}
                    disabled={isPending}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-diagnostics-secondary hover:text-diagnostics-corporate",
                      isPending && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {item.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!sorted.length && (
          <div className="rounded-xl border border-slate-200 bg-diagnostics-background px-4 py-3 text-sm text-slate-700">
            No hay items todavía.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Agregar nuevo</p>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre *"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-diagnostics-primary focus:outline-none focus:ring-2 focus:ring-diagnostics-primary/30"
          />
        </div>
        <button
          type="button"
          onClick={create}
          disabled={isPending || !name.trim()}
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-diagnostics-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-diagnostics-primary/90",
            (isPending || !name.trim()) && "cursor-not-allowed opacity-60 hover:bg-diagnostics-primary"
          )}
        >
          <PlusCircle size={16} />
          Crear item
        </button>
      </div>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}

