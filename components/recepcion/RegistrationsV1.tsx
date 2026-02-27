"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatRecepcionTime,
  RECEPCION_REGISTRATIONS_MOCK,
  type RecepcionRegistrationItem
} from "@/lib/recepcion/mock";

function statusTone(status: RecepcionRegistrationItem["status"]) {
  if (status === "APPROVED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function RegistrationsV1({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<RecepcionRegistrationItem[]>(RECEPCION_REGISTRATIONS_MOCK);

  const pending = useMemo(() => rows.filter((row) => row.status === "PENDING"), [rows]);

  const updateStatus = (id: string, status: RecepcionRegistrationItem["status"]) => {
    if (!canWrite) return;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Auto-registro</p>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-heading)' }}>
              Registros pendientes
            </h2>
            <p className="text-sm text-slate-600">
              Slot v1 preparado para links/QR. Si ya operas backend, puedes continuar en el módulo avanzado.
            </p>
          </div>

          <div className="rounded-full bg-[#2e75ba]/10 px-3 py-1 text-xs font-semibold text-[#2e75ba]">
            Pendientes: {pending.length}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/recepcion/registros"
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Abrir registros avanzados
          </Link>
          <button
            type="button"
            onClick={() => alert("Invitaciones por QR/link se habilitarán desde backend en v2.")}
            className="inline-flex h-10 items-center rounded-xl bg-[#4aa59c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f]"
          >
            Generar invitación (placeholder)
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Próximamente: bandeja de registros pendientes de auto-registro.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-3 py-2 text-left font-semibold">Contacto</th>
                  <th className="px-3 py-2 text-left font-semibold">Origen</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-2 text-slate-700">{formatRecepcionTime(row.submittedAt)}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                    <td className="px-3 py-2 text-slate-700">{row.contact}</td>
                    <td className="px-3 py-2 text-slate-700">{row.source}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs font-semibold", statusTone(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row.status !== "PENDING" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 size={12} />
                          Sin acciones
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => updateStatus(row.id, "APPROVED")}
                            className={cn(
                              "inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100",
                              !canWrite && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <Check size={12} />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => updateStatus(row.id, "REJECTED")}
                            className={cn(
                              "inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100",
                              !canWrite && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <X size={12} />
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!canWrite ? <p className="text-xs text-amber-700">Tu rol puede ver registros, pero no aprobar/rechazar.</p> : null}
    </div>
  );
}
