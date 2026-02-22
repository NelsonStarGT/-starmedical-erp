"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type {
  EncounterOrderGlobalNotes,
  EncounterOrderRequestItem,
  EncounterOrderRequestModality,
  EncounterOrderRequestPriority,
  EncounterOrderRequestStatus
} from "@/components/medical/encounter/types";
import {
  searchMedicalServices,
  type EncounterOrderPatchPayload,
  type EncounterOrderPostPayload,
  type MedicalServiceSearchItem
} from "@/lib/medical/ordersClient";

type ToastVariant = "success" | "error" | "info";

type ServiceFilter = "ALL" | EncounterOrderRequestModality;

type OrderDraftMap = Record<
  string,
  {
    notes: string;
    priority: EncounterOrderRequestPriority;
    status: EncounterOrderRequestStatus;
  }
>;

function fieldClasses(disabled = false) {
  return cn(
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    disabled ? "cursor-not-allowed bg-slate-50 text-slate-500" : "focus:border-[#2e75ba] focus:ring-2 focus:ring-[#2e75ba]/15"
  );
}

function modalityChipClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-1 text-xs font-semibold transition",
    active ? "border-[#2e75ba]/30 bg-[#f2f8ff] text-[#2e75ba]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );
}

function modalityLabel(modality: EncounterOrderRequestModality) {
  if (modality === "RX") return "Rayos X";
  if (modality === "USG") return "Ultrasonido";
  return "Laboratorio";
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function priorityLabel(priority: EncounterOrderRequestPriority) {
  return priority === "urgent" ? "Urgente" : "Rutina";
}

function statusLabel(status: EncounterOrderRequestStatus) {
  if (status === "ordered") return "Ordenada";
  if (status === "in_progress") return "En proceso";
  if (status === "completed") return "Realizada";
  if (status === "cancelled") return "Cancelada";
  return "Ordenada";
}

export default function OrdersPanel({
  items,
  globalNotes,
  readOnly,
  loading = false,
  saving = false,
  onAddOrder,
  onRemoveOrder,
  onUpdateOrder,
  onChangeGlobalNotes,
  onPrintOrder,
  onToast
}: {
  items: EncounterOrderRequestItem[];
  globalNotes: EncounterOrderGlobalNotes;
  readOnly: boolean;
  loading?: boolean;
  saving?: boolean;
  onAddOrder?: (payload: EncounterOrderPostPayload) => Promise<boolean> | boolean;
  onRemoveOrder?: (orderId: string) => Promise<boolean> | boolean;
  onUpdateOrder?: (orderId: string, payload: EncounterOrderPatchPayload) => Promise<boolean> | boolean;
  onChangeGlobalNotes?: (next: EncounterOrderGlobalNotes) => void;
  onPrintOrder?: (modality: EncounterOrderRequestModality) => void;
  onToast?: (message: string, kind: ToastVariant) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ServiceFilter>("ALL");
  const [options, setOptions] = useState<MedicalServiceSearchItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<OrderDraftMap>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next: OrderDraftMap = {};
    for (const item of items) {
      next[item.id] = {
        notes: item.notes || "",
        priority: item.priority,
        status: item.status
      };
    }
    setOrderDrafts(next);
  }, [items]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;

    const normalized = query.trim();
    if (!normalized) {
      setOptions([]);
      setDropdownOpen(false);
      setSearching(false);
      setActiveIndex(0);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const run = async () => {
        setSearching(true);
        try {
          const found = await searchMedicalServices(normalized, filter);
          if (cancelled) return;
          setOptions(found);
          setDropdownOpen(true);
          setActiveIndex(0);
        } catch {
          if (!cancelled) {
            setOptions([]);
            setDropdownOpen(true);
            onToast?.("No se pudo buscar catálogo de servicios.", "error");
          }
        } finally {
          if (!cancelled) setSearching(false);
        }
      };
      void run();
    }, 250);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter, onToast, query]);

  const orderedItems = useMemo(
    () => items.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [items]
  );

  const grouped = useMemo(() => {
    return {
      LAB: orderedItems.filter((item) => item.modality === "LAB"),
      RX: orderedItems.filter((item) => item.modality === "RX"),
      USG: orderedItems.filter((item) => item.modality === "USG")
    };
  }, [orderedItems]);

  const addOrder = async (service: MedicalServiceSearchItem) => {
    if (!onAddOrder || readOnly || addingId) return;
    setAddingId(service.id);
    try {
      const saved = await onAddOrder({
        modality: service.modality,
        serviceId: service.id,
        serviceCode: service.code,
        title: service.title,
        quantity: 1,
        notes: null,
        priority: "routine",
        status: "ordered"
      });
      if (saved === false) return;
      setQuery("");
      setOptions([]);
      setDropdownOpen(false);
    } finally {
      setAddingId(null);
    }
  };

  const removeOrder = async (orderId: string) => {
    if (!onRemoveOrder || readOnly || removingId) return;
    setRemovingId(orderId);
    try {
      const removed = await onRemoveOrder(orderId);
      if (removed === false) return;
    } finally {
      setRemovingId(null);
    }
  };

  const saveOrderChanges = async (item: EncounterOrderRequestItem) => {
    if (!onUpdateOrder || readOnly || savingOrderId) return;
    const draft = orderDrafts[item.id];
    if (!draft) return;
    setSavingOrderId(item.id);
    try {
      const saved = await onUpdateOrder(item.id, {
        notes: draft.notes.trim() || null,
        priority: draft.priority,
        status: draft.status
      });
      if (saved === false) return;
    } finally {
      setSavingOrderId(null);
    }
  };

  const orderDirty = (item: EncounterOrderRequestItem) => {
    const draft = orderDrafts[item.id];
    if (!draft) return false;
    return (
      (item.notes || "") !== draft.notes ||
      item.priority !== draft.priority ||
      item.status !== draft.status
    );
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Órdenes médicas</p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">LAB · RX · USG</h3>
        <p className="mt-1 text-sm text-slate-600">
          Selecciona exámenes del catálogo interno y agrega notas clínicas para laboratorio/rayos/ultrasonido.
        </p>
        {readOnly ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Consulta cerrada: no se pueden modificar órdenes médicas.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "LAB", "RX", "USG"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={modalityChipClass(filter === item)}
            >
              {item === "ALL" ? "Todos" : item}
            </button>
          ))}
        </div>

        <div className="mt-3 relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (options.length > 0) setDropdownOpen(true);
            }}
            onKeyDown={(event) => {
              if (!dropdownOpen || options.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => (prev + 1) % options.length);
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const option = options[activeIndex];
                if (option) void addOrder(option);
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setDropdownOpen(false);
              }
            }}
            disabled={readOnly}
            placeholder="Buscar exámenes: hemograma, rayos X tórax, ultrasonido..."
            className={cn(fieldClasses(readOnly), "pl-10")}
          />

          {dropdownOpen ? (
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {searching ? (
                <p className="px-3 py-2 text-sm text-slate-500">Buscando...</p>
              ) : options.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">Sin coincidencias.</p>
              ) : (
                options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => void addOrder(option)}
                    disabled={readOnly || addingId !== null}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50",
                      index === activeIndex && "bg-[#f2f8ff]"
                    )}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{option.title}</p>
                      <p className="text-xs text-slate-500">
                        {option.code || "Sin código"} · {option.modality}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2e75ba]/25 bg-[#f2f8ff] px-2 py-0.5 text-[11px] font-semibold text-[#2e75ba]">
                      <PlusIcon className="h-3.5 w-3.5" />
                      Agregar
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notas globales por modalidad</p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {(["LAB", "RX", "USG"] as const).map((modality) => (
            <label key={`global-note-${modality}`} className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Nota {modality}</span>
              <textarea
                rows={4}
                value={globalNotes[modality]}
                onChange={(event) =>
                  onChangeGlobalNotes?.({
                    ...globalNotes,
                    [modality]: event.target.value
                  })
                }
                disabled={readOnly}
                className={fieldClasses(readOnly)}
                placeholder={`Nota clínica para ${modalityLabel(modality).toLowerCase()}...`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Órdenes agregadas</p>
          <div className="flex flex-wrap items-center gap-2">
            {(["LAB", "RX", "USG"] as const).map((modality) => (
              <button
                key={`print-${modality}`}
                type="button"
                onClick={() => onPrintOrder?.(modality)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#2e75ba]/25 bg-[#f2f8ff] px-3 py-1.5 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f2ff]"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Imprimir Orden {modality}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Cargando órdenes...</p>
        ) : orderedItems.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            Sin órdenes médicas registradas.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {(["LAB", "RX", "USG"] as const).map((modality) => {
              const modalityItems = grouped[modality];
              if (modalityItems.length === 0) return null;
              return (
                <section key={`group-${modality}`} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[#2e75ba]/25 bg-[#f2f8ff] px-2.5 py-0.5 text-[11px] font-semibold text-[#2e75ba]">
                      {modalityLabel(modality)}
                    </span>
                    <span className="text-[11px] text-slate-500">{modalityItems.length} orden(es)</span>
                  </div>
                  <div className="space-y-2">
                    {modalityItems.map((item) => {
                      const draft = orderDrafts[item.id] || {
                        notes: item.notes || "",
                        priority: item.priority,
                        status: item.status
                      };
                      const dirty = orderDirty(item);
                      return (
                        <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">
                                {item.serviceCode || "Sin código"} · {formatDateTime(item.createdAt)} · {item.createdByName}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                {statusLabel(draft.status)}
                              </span>
                              <button
                                type="button"
                                onClick={() => void removeOrder(item.id)}
                                disabled={readOnly || removingId === item.id || saving}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white",
                                  readOnly || removingId === item.id || saving
                                    ? "cursor-not-allowed bg-slate-300"
                                    : "bg-rose-600 hover:bg-rose-700"
                                )}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Quitar
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto] lg:items-start">
                            <label className="space-y-1">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prioridad</span>
                              <select
                                value={draft.priority}
                                onChange={(event) =>
                                  setOrderDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      priority: event.target.value === "urgent" ? "urgent" : "routine"
                                    }
                                  }))
                                }
                                disabled={readOnly}
                                className={fieldClasses(readOnly)}
                              >
                                <option value="routine">{priorityLabel("routine")}</option>
                                <option value="urgent">{priorityLabel("urgent")}</option>
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estado</span>
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  setOrderDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      status:
                                        event.target.value === "in_progress"
                                          ? "in_progress"
                                          : event.target.value === "completed"
                                            ? "completed"
                                            : event.target.value === "cancelled"
                                              ? "cancelled"
                                              : "ordered"
                                    }
                                  }))
                                }
                                disabled={readOnly}
                                className={fieldClasses(readOnly)}
                              >
                                <option value="ordered">{statusLabel("ordered")}</option>
                                <option value="in_progress">{statusLabel("in_progress")}</option>
                                <option value="completed">{statusLabel("completed")}</option>
                                <option value="cancelled">{statusLabel("cancelled")}</option>
                              </select>
                            </label>

                            <label className="space-y-1">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notas del examen</span>
                              <textarea
                                rows={3}
                                value={draft.notes}
                                onChange={(event) =>
                                  setOrderDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...draft,
                                      notes: event.target.value
                                    }
                                  }))
                                }
                                disabled={readOnly}
                                className={fieldClasses(readOnly)}
                                placeholder="Indicaciones clínicas específicas para este examen."
                              />
                            </label>

                            <div className="flex h-full flex-col justify-end">
                              <button
                                type="button"
                                onClick={() => void saveOrderChanges(item)}
                                disabled={readOnly || !dirty || savingOrderId === item.id || !onUpdateOrder}
                                className={cn(
                                  "rounded-lg px-3 py-1.5 text-xs font-semibold text-white",
                                  readOnly || !dirty || savingOrderId === item.id || !onUpdateOrder
                                    ? "cursor-not-allowed bg-slate-300"
                                    : "bg-[#2e75ba] hover:opacity-90"
                                )}
                              >
                                {savingOrderId === item.id ? "Guardando..." : "Guardar cambios"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
