"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { AgendaRow, QuickHistory } from "./types";

export default function QuickHistoryModal({
  open,
  onClose,
  row,
  history
}: {
  open: boolean;
  onClose: () => void;
  row: AgendaRow | null;
  history: QuickHistory | null;
}) {
  if (!row) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      subtitle="Ficha rápida (mock)"
      title={row.patient.name}
      className="max-w-3xl"
      footer={
        <div className="text-xs text-slate-500">
          TODO: cargar alergias/diagnósticos/resultados/notas desde el Encounter/EMR (fuente única de verdad).
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Alergias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {history && history.allergies.length > 0 ? (
              history.allergies.map((a) => (
                <div key={a} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  {a}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500">
                Sin alergias registradas
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Últimos 3 diagnósticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {history && history.lastDx.length > 0 ? (
              history.lastDx.map((dx) => (
                <div key={dx} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  {dx}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500">
                Sin diagnósticos previos
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Últimos 3 resultados (resumen)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {history && history.lastResults.length > 0 ? (
              history.lastResults.slice(0, 3).map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">{r.title}</div>
                    <div className="text-[11px] font-medium text-slate-500">{r.date}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{r.summary}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500">
                Sin resultados recientes
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Notas relevantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {history && history.notes.length > 0 ? (
              history.notes.map((note, idx) => (
                <div key={`${idx}-${note}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  {note}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500">
                Sin notas relevantes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
}
