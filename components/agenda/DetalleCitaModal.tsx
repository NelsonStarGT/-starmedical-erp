"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Cita, MedicoAgenda, PacienteAgenda, SucursalAgenda, TipoCita } from "@/lib/types/agenda";
import { EstadoBadge } from "@/components/agenda/EstadoBadge";

type Props = {
  cita: Cita;
  onClose: () => void;
  onUpdate: (cita: Cita) => void;
  pacientes: PacienteAgenda[];
  medicos: MedicoAgenda[];
  sucursales: SucursalAgenda[];
  tipos: TipoCita[];
};

const estados = ["Programada", "Confirmada", "En sala", "Atendida", "No se presentó", "Cancelada"] as const;

export function DetalleCitaModal({ cita, onClose, onUpdate, pacientes, medicos, sucursales, tipos }: Props) {
  const [draft, setDraft] = useState<Cita>(cita);

  useEffect(() => {
    setDraft(cita);
  }, [cita]);

  const paciente = pacientes.find((p) => p.id === draft.pacienteId);
  const medico = medicos.find((m) => m.id === draft.medicoId);
  const sucursal = sucursales.find((s) => s.id === draft.sucursalId);
  const tipo = tipos.find((t) => t.id === draft.tipoCitaId);

  const handleSave = () => {
    onUpdate({ ...draft, ultimaActualizacion: new Date().toISOString() });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalle de cita"
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Cerrar
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
          >
            Guardar cambios
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Paciente</p>
            <p className="text-base font-semibold text-slate-900">
              {paciente?.nombre} {paciente?.apellidos}
            </p>
            <p className="text-xs text-slate-500">{paciente?.telefono || paciente?.celular}</p>
          </div>
          <EstadoBadge estado={draft.estado} />
        </div>
        <div>
          <p className="text-xs text-slate-500">Especialista</p>
          <p className="font-semibold text-slate-900">{medico?.nombre}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-slate-500">Fecha</p>
            <p className="font-semibold text-slate-900">{draft.fecha}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Hora</p>
            <p className="font-semibold text-slate-900">
              {draft.horaInicio} - {draft.horaFin}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-slate-500">Sucursal</p>
            <p className="font-semibold text-slate-900">{sucursal?.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tipo de cita</p>
            <p className="font-semibold text-slate-900">{tipo?.nombre}</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Estado</label>
          <select
            value={draft.estado}
            onChange={(e) => setDraft({ ...draft, estado: e.target.value as Cita["estado"] })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            {estados.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Estado de pago</label>
          <select
            value={draft.estadoPago || "Pendiente"}
            onChange={(e) => setDraft({ ...draft, estadoPago: e.target.value as any })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
            <option value="Facturado">Facturado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Notas</label>
          <textarea
            rows={3}
            value={draft.notas || ""}
            onChange={(e) => setDraft({ ...draft, notas: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div className="text-[11px] text-slate-500">
          Última actualización: {new Date(draft.ultimaActualizacion).toLocaleString()}
        </div>
      </div>
    </Modal>
  );
}
