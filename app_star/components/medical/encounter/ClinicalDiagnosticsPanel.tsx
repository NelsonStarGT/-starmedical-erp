"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import ICD10MultiSelect from "@/components/medical/terminology/ICD10MultiSelect";
import type { EncounterDiagnosis, EncounterOrder, EncounterOrderStatus, EncounterOrderType } from "./types";

type CatalogItem = {
  id: string;
  type: EncounterOrderType;
  title: string;
  hint?: string | null;
};

const CATALOG: CatalogItem[] = [
  { id: "lab-hemograma", type: "LAB", title: "Hemograma completo", hint: "Hematología" },
  { id: "lab-quimica", type: "LAB", title: "Química sanguínea", hint: "Perfil básico" },
  { id: "lab-lipidos", type: "LAB", title: "Perfil lipídico", hint: "Colesterol/Triglicéridos" },
  { id: "rx-torax", type: "RX", title: "Radiografía de tórax", hint: "PA + lateral" },
  { id: "rx-columna", type: "RX", title: "Radiografía columna lumbar", hint: "AP + lateral" },
  { id: "usg-abdomen", type: "USG", title: "Ultrasonido abdominal", hint: "Ayuno sugerido" },
  { id: "usg-pelvis", type: "USG", title: "Ultrasonido pélvico", hint: "Con vejiga llena" }
];

function typeLabel(type: EncounterOrderType) {
  if (type === "LAB") return "LAB";
  if (type === "RX") return "RX";
  return "USG";
}

function typePill(type: EncounterOrderType) {
  if (type === "LAB") return "border-sky-200 bg-sky-50 text-sky-900";
  if (type === "RX") return "border-indigo-200 bg-indigo-50 text-indigo-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function statusLabel(status: EncounterOrderStatus) {
  switch (status) {
    case "requested":
      return "Solicitado";
    case "in_progress":
      return "En proceso";
    case "results_ready":
      return "Resultados listos";
    case "cancelled":
      return "Cancelado";
  }
}

function statusPill(status: EncounterOrderStatus) {
  switch (status) {
    case "results_ready":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "in_progress":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800";
  }
}

function fieldClasses(readOnly: boolean) {
  return cn(
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition",
    readOnly ? "bg-slate-50" : "bg-white focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15"
  );
}

export default function ClinicalDiagnosticsPanel({
  diagnosis,
  onChangeDiagnosis,
  orders,
  onCreateOrder,
  readOnly
}: {
  diagnosis: EncounterDiagnosis;
  onChangeDiagnosis: (next: EncounterDiagnosis) => void;
  orders: EncounterOrder[];
  onCreateOrder: (payload: { type: EncounterOrderType; title: string; technicalComment: string | null }) => void;
  readOnly: boolean;
}) {
  const [catalogType, setCatalogType] = useState<EncounterOrderType>("LAB");
  const [query, setQuery] = useState("");
  const [comment, setComment] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((c) => c.type === catalogType).filter((c) => {
      if (!q) return true;
      return `${c.title} ${c.id} ${c.hint || ""}`.toLowerCase().includes(q);
    });
  }, [catalogType, query]);

  const selected = useMemo(() => (selectedId ? CATALOG.find((c) => c.id === selectedId) || null : null), [selectedId]);

  const createOrder = () => {
    if (readOnly) return;
    if (!selected) return;
    const note = comment.trim() || null;
    onCreateOrder({ type: selected.type, title: selected.title, technicalComment: note });
    setComment("");
    setSelectedId(null);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">CIE-10 (principal + secundarios)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ICD10MultiSelect value={diagnosis} onChange={onChangeDiagnosis} readOnly={readOnly} requiredPrincipal />
          <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-3 text-xs text-slate-600">
            CIE-10 se usa para estadística clínica y proyección de compras en farmacia (no se captura en recepción).
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Órdenes (LAB / RX / USG)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Catálogo diagnóstico
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Selecciona examen y agrega comentario técnico
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(["LAB", "RX", "USG"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setCatalogType(t);
                      setSelectedId(null);
                      setQuery("");
                    }}
                    aria-pressed={catalogType === t}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      catalogType === t
                        ? "border-diagnostics-primary bg-diagnostics-primary text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Buscar</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej.: hemograma, tórax, abdominal…"
                  className={fieldClasses(false)}
                />
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {filteredCatalog.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-slate-500">Sin resultados</div>
                  ) : (
                    filteredCatalog.map((item) => {
                      const active = selectedId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left transition",
                            active ? "bg-diagnostics-background" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.hint || "—"}</div>
                          </div>
                          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold", typePill(item.type))}>
                            {typeLabel(item.type)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Comentario técnico</label>
                  <span className="text-[11px] text-slate-500">Opcional</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={readOnly}
                  className={cn(fieldClasses(readOnly), "min-h-[136px]")}
                  placeholder="Ej.: Ayuno 8h, proyecciones específicas, prioridad clínica…"
                />
                <button
                  type="button"
                  onClick={createOrder}
                  disabled={readOnly || !selected}
                  className={cn(
                    "w-full rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                    readOnly || !selected
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-diagnostics-primary text-white hover:opacity-90"
                  )}
                >
                  Crear orden
                </button>
                <div className="text-[11px] text-slate-500">
                  TODO(encounter-orders): conectar a Diagnostics (Prisma DiagnosticOrder) y registrar eventos/flags.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                Sin órdenes aún.
              </div>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", typePill(ord.type))}>
                          {typeLabel(ord.type)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">{ord.createdAt.slice(0, 10)}</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{ord.title}</div>
                      {ord.technicalComment ? (
                        <div className="mt-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Comentario:</span> {ord.technicalComment}
                        </div>
                      ) : null}
                      {ord.status === "results_ready" && ord.resultPreview ? (
                        <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                          <div className="font-semibold">Resultados (preview)</div>
                          <div className="mt-1">{ord.resultPreview}</div>
                          <div className="mt-2 text-[11px] text-sky-800">
                            TODO: abrir visor de resultados completo (clínico) y anexar al Encounter.
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", statusPill(ord.status))}>
                      {statusLabel(ord.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-diagnostics-background p-3 text-xs text-slate-600">
            Flujo esperado (TODO): órdenes → recepción → finanzas → diagnóstico → regresa a médico (estatus + resultados).
            Integrar vía eventos/flags sanitizados en administrativo, y detalle clínico solo en Encounter.
            <div className="mt-2 space-y-1 text-[11px] text-slate-600">
              <div>TODO: clínico: `GET /api/medical/encounters/:id/diagnostics/summary`</div>
              <div>TODO: administrativo: `GET /api/reception/diagnostics/status?appointmentId=` (sin resultJson)</div>
              <div>TODO eventos: `diagnostic.result.status.changed.public` / `diagnostic.result.validated.clinical`</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
