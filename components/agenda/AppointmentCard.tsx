"use client";

import { useState } from "react";
import { Cita, EstadoPagoCita, MedicoAgenda, PacienteAgenda, TipoCita } from "@/lib/types/agenda";
import { EstadoBadge } from "@/components/agenda/EstadoBadge";
import { cn } from "@/lib/utils";

type Props = {
  cita: Cita;
  paciente?: PacienteAgenda;
  medico?: MedicoAgenda;
  tipo?: TipoCita;
  onEdit?: () => void;
  onReagendar?: () => void;
  onConfirmar?: () => void;
  onWhatsApp?: () => void;
  onFacturar?: () => void;
  onExpediente?: () => void;
};

const pagoColor: Record<EstadoPagoCita, string> = {
  Pagado: "bg-green-500",
  Pendiente: "bg-amber-400",
  Facturado: "bg-blue-500"
};

export function AppointmentCard({
  cita,
  paciente,
  medico,
  tipo,
  onEdit,
  onReagendar,
  onConfirmar,
  onWhatsApp,
  onFacturar,
  onExpediente
}: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#E5E5E7] bg-white/95 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted",
        expanded ? "ring-2 ring-brand-primary/20" : ""
      )}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-full flex-col items-center">
          <span className="text-xs font-semibold text-slate-900">{cita.horaInicio}</span>
          <span className="text-[10px] text-slate-500">{cita.horaFin}</span>
          {cita.estadoPago && <span className={cn("mt-2 h-2 w-2 rounded-full", pagoColor[cita.estadoPago])} />}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {paciente ? `${paciente.nombre} ${paciente.apellidos || ""}` : "Paciente"} · {cita.horaInicio}
            </p>
            <EstadoBadge estado={cita.estado} className="px-2 py-0.5 text-[11px]" />
          </div>
          <p className="text-sm text-slate-700 truncate">{tipo?.nombre || "Servicio"} — {tipo?.descripcion}</p>
          <p className="text-xs text-slate-500">{medico?.nombre}</p>
          <p className="text-[11px] text-slate-400">#{cita.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 pb-4 text-sm text-slate-500 opacity-0 transition duration-150 group-hover:opacity-100">
        <Action label="Editar" onClick={onEdit}>✏️</Action>
        <Action label="Reagendar" onClick={onReagendar}>🔁</Action>
        <Action label="Confirmar" onClick={onConfirmar}>✔️</Action>
        <Action label="WhatsApp" onClick={onWhatsApp}>💬</Action>
        <Action label="Facturar" onClick={onFacturar}>💳</Action>
        <Action label="Expediente" onClick={onExpediente}>📄</Action>
        <button
          className="ml-auto text-xs font-semibold text-brand-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Cerrar" : "Detalles"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-[#E5E5E7] bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
          <p>{cita.notas || "Sin notas adicionales"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Origen: {cita.origen || "N/D"}</span>
            <span>Pago: {cita.estadoPago || "N/D"}</span>
            <span>{cita.pacienteRecurrente ? "Paciente recurrente" : "Paciente nuevo"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Action({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-slate-100"
      title={label}
      type="button"
    >
      <span>{children}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}
