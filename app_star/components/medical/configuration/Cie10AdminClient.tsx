"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Cie10CodeRow = {
  id: string;
  code: string;
  title: string;
  chapter: string | null;
  chapterRange: string | null;
  level: 3 | 4;
  parentCode: string | null;
  isActive: boolean;
  source: "WHO_OPS_PDF" | "LOCAL";
  updatedAt: string;
};

type Cie10AuditRow = {
  id: string;
  action: "create" | "update" | "activate" | "deactivate";
  diffJson: Record<string, unknown>;
  actorUserId: string | null;
  createdAt: string;
};

type Cie10ListResponse = {
  items: Cie10CodeRow[];
  total: number;
  page: number;
  pageSize: number;
};

type DraftState = {
  id?: string;
  code: string;
  title: string;
  chapter: string;
  chapterRange: string;
  level: "3" | "4";
  parentCode: string;
  source: "WHO_OPS_PDF" | "LOCAL";
  isActive: boolean;
};

function emptyDraft(): DraftState {
  return {
    code: "",
    title: "",
    chapter: "",
    chapterRange: "",
    level: "3",
    parentCode: "",
    source: "LOCAL",
    isActive: true
  };
}

function toDraft(item: Cie10CodeRow): DraftState {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    chapter: item.chapter || "",
    chapterRange: item.chapterRange || "",
    level: String(item.level) as "3" | "4",
    parentCode: item.parentCode || "",
    source: item.source,
    isActive: item.isActive
  };
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function actionLabel(action: Cie10AuditRow["action"]) {
  switch (action) {
    case "create":
      return "Creacion";
    case "update":
      return "Actualizacion";
    case "activate":
      return "Activacion";
    case "deactivate":
      return "Desactivacion";
  }
}

export default function Cie10AdminClient() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState("");
  const [level, setLevel] = useState<"all" | "3" | "4">("all");
  const [active, setActive] = useState<"all" | "true" | "false">("true");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<Cie10ListResponse>({ items: [], total: 0, page: 1, pageSize: 25 });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<DraftState>(emptyDraft());
  const [auditItems, setAuditItems] = useState<Cie10AuditRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(data.total / data.pageSize || 1)), [data.total, data.pageSize]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (chapter.trim()) params.set("chapter", chapter.trim().toUpperCase());
      if (level !== "all") params.set("level", level);
      if (active !== "all") params.set("active", active);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/medical/cie10?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar catalogo CIE-10.");
      setData(json.data as Cie10ListResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar CIE-10";
      showToast(message, "error");
      setData({ items: [], total: 0, page: 1, pageSize });
    } finally {
      setLoading(false);
    }
  }, [active, chapter, level, page, pageSize, query, showToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditorDraft(emptyDraft());
    setAuditItems([]);
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditorOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/medical/cie10/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar detalle CIE-10.");
      setEditorDraft(toDraft(json.data.code as Cie10CodeRow));
      setAuditItems((json.data.audits || []) as Cie10AuditRow[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el codigo";
      showToast(message, "error");
      setEditorOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorDraft(emptyDraft());
    setAuditItems([]);
  };

  const saveDraft = async () => {
    const payload = {
      code: normalizeCode(editorDraft.code),
      title: editorDraft.title.trim(),
      chapter: editorDraft.chapter.trim() || null,
      chapterRange: editorDraft.chapterRange.trim() || null,
      level: Number(editorDraft.level),
      parentCode: editorDraft.parentCode.trim() || null,
      source: editorDraft.source,
      isActive: editorDraft.isActive
    };

    if (!payload.code || !payload.title) {
      showToast("Codigo y titulo son obligatorios.", "error");
      return;
    }

    setSaving(true);
    try {
      const url = editorDraft.id ? `/api/medical/cie10/${encodeURIComponent(editorDraft.id)}` : "/api/medical/cie10";
      const method = editorDraft.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar codigo CIE-10.");

      showToast(editorDraft.id ? "Codigo actualizado." : "Codigo creado.", "success");
      closeEditor();
      await loadList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: Cie10CodeRow) => {
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/medical/cie10/${encodeURIComponent(row.id)}/toggle-active`, {
        method: "POST"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cambiar estado.");
      showToast(row.isActive ? "Codigo desactivado." : "Codigo activado.", "success");
      await loadList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cambiar estado";
      showToast(message, "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuracion clinica</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Catalogo CIE-10</h2>
        <p className="mt-1 text-sm text-slate-600">Busqueda, activacion y trazabilidad de codigos CIE-10 para ConsultaM.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <label className="space-y-1 lg:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Buscar</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Codigo o texto"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Capitulo</span>
            <input
              value={chapter}
              onChange={(event) => {
                setChapter(event.target.value);
                setPage(1);
              }}
              placeholder="Ej. X"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nivel</span>
            <select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as "all" | "3" | "4");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            >
              <option value="all">Todos</option>
              <option value="3">3 caracteres</option>
              <option value="4">4 caracteres</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Estado</span>
            <select
              value={active}
              onChange={(event) => {
                setActive(event.target.value as "all" | "true" | "false");
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            Total: <span className="font-semibold text-slate-900">{data.total}</span>
          </p>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">
              Filas:
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg bg-[#2e75ba] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              Crear codigo
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-[#f8fafc]">
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="px-3 py-2">Codigo</th>
                <th className="px-3 py-2">Titulo</th>
                <th className="px-3 py-2">Capitulo/Grupo</th>
                <th className="px-3 py-2">Nivel</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Actualizacion</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-sm text-slate-600">
                    Cargando catalogo...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-sm text-slate-600">
                    Sin resultados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                data.items.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900">{row.code}</td>
                    <td className="px-3 py-2 text-slate-800">{row.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      <div>{row.chapter || "—"}</div>
                      <div>{row.chapterRange || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.level}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          row.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-100 text-slate-700"
                        )}
                      >
                        {row.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{formatDate(row.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row.id)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Ver / Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          disabled={togglingId === row.id}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-semibold",
                            row.isActive
                              ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
                            togglingId === row.id && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {row.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">
            Pagina {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CIE-10</p>
                <h3 className="text-lg font-semibold text-slate-900">{editorDraft.id ? "Editar codigo" : "Crear codigo"}</h3>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            {loadingDetail ? (
              <div className="px-2 py-4 text-sm text-slate-600">Cargando detalle...</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Codigo</span>
                      <input
                        value={editorDraft.code}
                        onChange={(event) => setEditorDraft((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="Ej. I10 o J06.9"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nivel</span>
                      <select
                        value={editorDraft.level}
                        onChange={(event) => setEditorDraft((prev) => ({ ...prev, level: event.target.value as "3" | "4" }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                      >
                        <option value="3">3 caracteres</option>
                        <option value="4">4 caracteres</option>
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Titulo</span>
                    <input
                      value={editorDraft.title}
                      onChange={(event) => setEditorDraft((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                      placeholder="Descripcion del diagnostico"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Capitulo</span>
                      <input
                        value={editorDraft.chapter}
                        onChange={(event) => setEditorDraft((prev) => ({ ...prev, chapter: event.target.value.toUpperCase() }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="X"
                      />
                    </label>
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rango de capitulo</span>
                      <input
                        value={editorDraft.chapterRange}
                        onChange={(event) => setEditorDraft((prev) => ({ ...prev, chapterRange: event.target.value.toUpperCase() }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="J00-J99"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Codigo padre (nivel 4)</span>
                      <input
                        value={editorDraft.parentCode}
                        onChange={(event) => setEditorDraft((prev) => ({ ...prev, parentCode: event.target.value.toUpperCase() }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                        placeholder="Ej. J06"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Fuente</span>
                      <select
                        value={editorDraft.source}
                        onChange={(event) =>
                          setEditorDraft((prev) => ({ ...prev, source: event.target.value as "WHO_OPS_PDF" | "LOCAL" }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
                      >
                        <option value="LOCAL">LOCAL</option>
                        <option value="WHO_OPS_PDF">WHO_OPS_PDF</option>
                      </select>
                    </label>
                  </div>

                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editorDraft.isActive}
                      onChange={(event) => setEditorDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-[#2e75ba]"
                    />
                    Codigo activo
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[#f8fafc] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Auditoria reciente</p>
                  {editorDraft.id ? (
                    <div className="mt-2 space-y-2">
                      {auditItems.length === 0 ? (
                        <p className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">Sin eventos.</p>
                      ) : (
                        auditItems.map((audit) => (
                          <article key={audit.id} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                            <p className="text-xs font-semibold text-slate-800">{actionLabel(audit.action)}</p>
                            <p className="text-[11px] text-slate-500">{formatDate(audit.createdAt)}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                              Actor: {audit.actorUserId || "sistema"}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">La auditoria se mostrara luego de crear el codigo.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving || loadingDetail}
                className="rounded-md bg-[#2e75ba] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
