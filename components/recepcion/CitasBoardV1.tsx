"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus2, CalendarRange, List } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { cn } from "@/lib/utils";
import { RECEPCION_APPOINTMENTS_MOCK } from "@/lib/recepcion/mock";

type CitasView = "LISTA" | "CALENDARIO";

export default function CitasBoardV1({ canWrite }: { canWrite: boolean }) {
  const [view, setView] = useState<CitasView>("LISTA");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctor, setDoctor] = useState("TODOS");
  const [status, setStatus] = useState("TODOS");
  const [hint, setHint] = useState<string | null>(null);

  const doctors = useMemo(
    () => ["TODOS", ...Array.from(new Set(RECEPCION_APPOINTMENTS_MOCK.map((row) => row.doctorName)))],
    []
  );

  const statuses = useMemo(
    () => ["TODOS", ...Array.from(new Set(RECEPCION_APPOINTMENTS_MOCK.map((row) => row.status)))],
    []
  );

  const rows = useMemo(() => {
    return RECEPCION_APPOINTMENTS_MOCK.filter((row) => {
      if (doctor !== "TODOS" && row.doctorName !== doctor) return false;
      if (status !== "TODOS" && row.status !== status) return false;
      return true;
    });
  }, [doctor, status]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Agenda del día</p>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
              Citas
            </h2>
            <p className="text-sm text-slate-600">Toggle Lista/Calendario con filtros de fecha, doctor y estado.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("LISTA")}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                view === "LISTA"
                  ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
              )}
            >
              <List size={14} />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setView("CALENDARIO")}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                view === "CALENDARIO"
                  ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
              )}
            >
              <CalendarRange size={14} />
              Calendario
            </button>
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => setHint("Crear cita activará wizard persistente cuando se conecte módulo de agenda.")}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f988f]",
                !canWrite && "cursor-not-allowed opacity-60 hover:bg-[#4aa59c]"
              )}
            >
              <CalendarPlus2 size={14} />
              Crear cita
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <DateField value={date} onChange={setDate} label="Fecha" />
          <label className="space-y-1 text-xs font-semibold text-slate-500">
            Doctor
            <select
              value={doctor}
              onChange={(event) => setDoctor(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              {doctors.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-500">
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            >
              {statuses.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Si ya operas agenda avanzada, usa también {" "}
          <Link href="/admin/agenda/citas" className="font-semibold text-[#2e75ba] hover:text-[#4aadf5]">
            /admin/agenda/citas
          </Link>
          .
        </p>
      </section>

      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        {view === "LISTA" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Hora</th>
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-left font-semibold">Doctor</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                      No hay citas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={row.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.hour}</td>
                      <td className="px-3 py-2 text-slate-700">{row.clientName}</td>
                      <td className="px-3 py-2 text-slate-700">{row.doctorName}</td>
                      <td className="px-3 py-2 text-slate-700">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2">
                No hay bloques para mostrar en modo calendario.
              </div>
            ) : (
              rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">{row.hour}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{row.clientName}</p>
                  <p className="text-xs text-slate-600">{row.doctorName}</p>
                  <p className="mt-2 text-xs text-slate-500">Estado: {row.status}</p>
                </article>
              ))
            )}
          </div>
        )}
      </section>

      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {!canWrite ? <p className="text-xs text-amber-700">Tu rol puede ver citas, pero no crear/editar.</p> : null}
    </div>
  );
}
