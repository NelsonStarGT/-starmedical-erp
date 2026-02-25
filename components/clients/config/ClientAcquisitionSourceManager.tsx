"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, PlusCircle, Save, ToggleLeft, ToggleRight } from "lucide-react";
import {
  actionCreateClientAcquisitionDetailOption,
  actionCreateClientAcquisitionSource,
  actionSetClientAcquisitionDetailOptionActive,
  actionSetClientAcquisitionSourceActive,
  actionUpdateClientAcquisitionDetailOption,
  actionUpdateClientAcquisitionSource
} from "@/app/admin/clientes/actions";
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

  const [selectedSourceId, setSelectedSourceId] = useState<string>(sources[0]?.id ?? "");

  const [sourceForm, setSourceForm] = useState({ name: "", code: "", category: "" });
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceDraft, setSourceDraft] = useState({ name: "", code: "", category: "" });

  const [detailForm, setDetailForm] = useState({ name: "", code: "" });
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [detailDraft, setDetailDraft] = useState({ name: "", code: "" });

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    [sources]
  );

  const sourceDetails = useMemo(
    () => details.filter((item) => item.sourceId === selectedSourceId).sort((a, b) => a.name.localeCompare(b.name)),
    [details, selectedSourceId]
  );

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
        setError((err as Error)?.message || "No se pudo crear canal.");
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
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar canal.");
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
        setError((err as Error)?.message || "No se pudo crear detalle.");
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
        setError(null);
        router.refresh();
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar detalle.");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-diagnostics-corporate">Canales y comercial</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          ¿Cómo nos conoció?
        </h3>
        <p className="text-sm text-slate-600">Gestiona canales y sus detalles. El canal “Referido” activa selector de cliente en formularios.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Canales</p>
          <div className="space-y-2">
            {sortedSources.map((source) => {
              const editing = editingSourceId === source.id;
              return (
                <article key={source.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceId(source.id)}
                      className={cn(
                        "text-left",
                        selectedSourceId === source.id ? "text-[#2e75ba]" : "text-slate-900"
                      )}
                    >
                      {editing ? (
                        <div className="space-y-2">
                          <input
                            value={sourceDraft.name}
                            onChange={(e) => setSourceDraft((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-800"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={sourceDraft.code}
                              onChange={(e) => setSourceDraft((prev) => ({ ...prev, code: e.target.value }))}
                              placeholder="Código"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                            <input
                              value={sourceDraft.category}
                              onChange={(e) => setSourceDraft((prev) => ({ ...prev, category: e.target.value }))}
                              placeholder="Categoría"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">{source.name}</p>
                          <p className="text-xs text-slate-500">{source.code || "—"} · {source.category || "Sin categoría"}</p>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {editing ? (
                        <button
                          type="button"
                          onClick={saveSource}
                          disabled={isPending || !sourceDraft.name.trim()}
                          className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          <Save size={12} /> Guardar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSourceId(source.id);
                            setSourceDraft({
                              name: source.name,
                              code: source.code ?? "",
                              category: source.category ?? ""
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          <Edit3 size={12} /> Editar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          startTransition(async () => {
                            try {
                              await actionSetClientAcquisitionSourceActive({
                                id: source.id,
                                isActive: !source.isActive
                              });
                              router.refresh();
                            } catch (err) {
                              setError((err as Error)?.message || "No se pudo cambiar estado del canal.");
                            }
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {source.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {source.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nuevo canal</p>
            <div className="mt-2 space-y-2">
              <input
                value={sourceForm.name}
                onChange={(e) => setSourceForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre *"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={sourceForm.code}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Código"
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <input
                  value={sourceForm.category}
                  onChange={(e) => setSourceForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Categoría"
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={createSource}
                disabled={isPending || !sourceForm.name.trim()}
                className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <PlusCircle size={12} /> Crear canal
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Detalle del canal seleccionado</p>
          {!selectedSourceId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Selecciona un canal para gestionar sus detalles.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {sourceDetails.map((detail) => {
                  const editing = editingDetailId === detail.id;
                  return (
                    <article key={detail.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        {editing ? (
                          <div className="flex-1 space-y-2">
                            <input
                              value={detailDraft.name}
                              onChange={(e) => setDetailDraft((prev) => ({ ...prev, name: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-semibold"
                            />
                            <input
                              value={detailDraft.code}
                              onChange={(e) => setDetailDraft((prev) => ({ ...prev, code: e.target.value }))}
                              placeholder="Código"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{detail.name}</p>
                            <p className="text-xs text-slate-500">{detail.code}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          {editing ? (
                            <button
                              type="button"
                              onClick={saveDetail}
                              disabled={isPending || !detailDraft.name.trim()}
                              className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              <Save size={12} /> Guardar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDetailId(detail.id);
                                setDetailDraft({ name: detail.name, code: detail.code });
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                            >
                              <Edit3 size={12} /> Editar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await actionSetClientAcquisitionDetailOptionActive({
                                    id: detail.id,
                                    isActive: !detail.isActive
                                  });
                                  router.refresh();
                                } catch (err) {
                                  setError((err as Error)?.message || "No se pudo cambiar estado del detalle.");
                                }
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {detail.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                            {detail.isActive ? "Activo" : "Inactivo"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!sourceDetails.length && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Sin detalles para este canal.</div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nuevo detalle</p>
                <div className="mt-2 space-y-2">
                  <input
                    value={detailForm.name}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre *"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    value={detailForm.code}
                    onChange={(e) => setDetailForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="Código"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={createDetail}
                    disabled={isPending || !detailForm.name.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <PlusCircle size={12} /> Crear detalle
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}
