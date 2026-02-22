'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { pacientesMock } from "@/lib/mock/pacientes";
import { medicosMock } from "@/lib/mock/medicos";
import { sucursalesMock } from "@/lib/mock/sucursales";
import { tiposCitaMock } from "@/lib/mock/tiposCita";
import { salasMock } from "@/lib/mock/salas";
import { empresasMock } from "@/lib/mock/empresas";
import { Cita, PacienteAgenda } from "@/lib/types/agenda";
import { NuevaCitaModal } from "@/components/agenda/NuevaCitaModal";
import { DetalleCitaModal } from "@/components/agenda/DetalleCitaModal";
import { EstadoBadge } from "@/components/agenda/EstadoBadge";
import { useAgendaUpdates } from "@/hooks/useAgendaUpdates";

const estados = ["Programada", "Confirmada", "En sala", "Atendida", "No se presentó", "Cancelada"] as const;
const currentUserId = "admin-1";

export default function AgendaCitasPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState(pacientesMock);
  const [filters, setFilters] = useState({
    fecha: "",
    medico: "",
    paciente: "",
    estado: "",
    sucursal: ""
  });
  const [showNueva, setShowNueva] = useState(false);
  const [editing, setEditing] = useState<Cita | null>(null);
  const [detalle, setDetalle] = useState<Cita | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agenda");
      const json = await res.json();
      setCitas(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useAgendaUpdates(({ type, data }) => {
    setCitas((prev) => {
      if (type === "appointment_deleted") return prev.filter((c) => c.id !== data.id);
      if (type === "appointment_updated") return prev.map((c) => (c.id === data.id ? data : c));
      if (type === "appointment_created") return [...prev, data];
      return prev;
    });
  });

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const paciente = pacientes.find((p) => p.id === c.pacienteId);
      const pacienteLabel = (
        paciente
          ? `${paciente.nombre} ${paciente.apellidos || ""}`
          : c.pacienteDisplayName || [c.pacienteNombre, c.pacienteApellidos].filter(Boolean).join(" ")
      ).trim();
      const byFecha = filters.fecha ? c.fecha === filters.fecha : true;
      const byMedico = filters.medico ? c.medicoId === filters.medico : true;
      const byEstado = filters.estado ? c.estado === filters.estado : true;
      const bySucursal = filters.sucursal ? c.sucursalId === filters.sucursal : true;
      const byPaciente = filters.paciente
        ? pacienteLabel.toLowerCase().includes(filters.paciente.toLowerCase())
        : true;
      return byFecha && byMedico && byEstado && bySucursal && byPaciente;
    });
  }, [citas, filters, pacientes]);

  const handleSave = async (cita: Cita) => {
    const method = cita.id ? "PUT" : "POST";
    const res = await fetch("/api/agenda", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "No se pudo guardar");
      return;
    }
    const json = await res.json();
    const saved: Cita = json.data;
    setCitas((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [...prev, saved];
    });
    setShowNueva(false);
    setEditing(null);
  };

  const handleCreatePaciente = (p: PacienteAgenda) => {
    setPacientes((prev) => [...prev, p]);
  };

  const handleChangeEstado = async (id: string, estado: Cita["estado"]) => {
    const target = citas.find((c) => c.id === id);
    if (!target) return;
    await handleSave({ ...target, estado });
    setMenuAbierto(null);
    setEstadoAbierto(null);
  };

  const openModalNueva = (cita?: Cita) => {
    setEditing(cita || null);
    setShowNueva(true);
  };

  const renderAcciones = (cita: Cita) => (
    <div className="relative">
      <button
        className="rounded-full border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        onClick={() => setMenuAbierto(menuAbierto === cita.id ? null : cita.id)}
      >
        ⋯
      </button>
      {menuAbierto === cita.id && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-soft z-10">
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() => {
              setDetalle(cita);
              setMenuAbierto(null);
            }}
          >
            Ver
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() => {
              openModalNueva(cita);
              setMenuAbierto(null);
            }}
          >
            Editar
          </button>
          <div className="border-t border-slate-100">
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => setEstadoAbierto(estadoAbierto === cita.id ? null : cita.id)}
            >
              <span>Cambiar estado</span>
              <span className="text-xs text-slate-500">▼</span>
            </button>
            {estadoAbierto === cita.id && (
              <div className="px-3 pb-3">
                <select
                  value={cita.estado}
                  onChange={(e) => handleChangeEstado(cita.id, e.target.value as Cita["estado"])}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {estados.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const getPaciente = (id: string) => pacientes.find((p) => p.id === id);
  const getPacienteLabel = (cita: Cita) => {
    const paciente = getPaciente(cita.pacienteId);
    return (
      paciente
        ? `${paciente.nombre} ${paciente.apellidos || ""}`
        : cita.pacienteDisplayName || [cita.pacienteNombre, cita.pacienteApellidos].filter(Boolean).join(" ")
    ).trim() || "Paciente";
  };
  const getMedico = (id: string) => medicosMock.find((m) => m.id === id)?.nombre || "Especialista";
  const getSucursal = (id: string) => sucursalesMock.find((s) => s.id === id)?.nombre || "Sucursal";
  const getTipo = (id: string) => tiposCitaMock.find((t) => t.id === id)?.nombre || "Tipo de cita";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Lista de citas</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => openModalNueva()}
              className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
            >
              Nueva cita
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              type="date"
              value={filters.fecha}
              onChange={(e) => setFilters({ ...filters, fecha: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={filters.medico}
              onChange={(e) => setFilters({ ...filters, medico: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Especialista</option>
              {medicosMock.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <input
              placeholder="Paciente"
              value={filters.paciente}
              onChange={(e) => setFilters({ ...filters, paciente: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={filters.estado}
              onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Estado</option>
              {estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select
              value={filters.sucursal}
              onChange={(e) => setFilters({ ...filters, sucursal: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Sucursal</option>
              {sucursalesMock.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:hidden space-y-2">
            {citasFiltradas.map((c) => {
              const pacienteLabel = getPacienteLabel(c);
              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pacienteLabel}</p>
                      <p className="text-xs text-slate-500">{getTipo(c.tipoCitaId)}</p>
                    </div>
                    <EstadoBadge estado={c.estado} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{c.fecha} · {c.horaInicio} - {c.horaFin}</p>
                  <p className="text-xs text-slate-500">{getMedico(c.medicoId)} · {getSucursal(c.sucursalId)}</p>
                  <div className="mt-2 flex justify-end">{renderAcciones(c)}</div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Especialista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sucursal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {citasFiltradas.map((c) => {
                  const pacienteLabel = getPacienteLabel(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">{c.fecha}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {c.horaInicio} - {c.horaFin}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {pacienteLabel}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{getMedico(c.medicoId)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{getSucursal(c.sucursalId)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{getTipo(c.tipoCitaId)}</td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={c.estado} />
                      </td>
                      <td className="px-4 py-3">
                        {renderAcciones(c)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <NuevaCitaModal
        open={showNueva}
        onClose={() => {
          setShowNueva(false);
          setEditing(null);
        }}
        onSave={handleSave}
        onCreatePaciente={handleCreatePaciente}
        pacientes={pacientes}
        medicos={medicosMock}
        sucursales={sucursalesMock}
        tipos={tiposCitaMock}
        salas={salasMock}
        empresas={empresasMock}
        citasExistentes={citas}
        currentUserId={currentUserId}
        initialData={editing || undefined}
      />

      {detalle && (
        <DetalleCitaModal
          cita={detalle}
          onClose={() => setDetalle(null)}
          onUpdate={(cita) => {
            handleSave(cita);
            setDetalle(null);
          }}
          pacientes={pacientes}
          medicos={medicosMock}
          sucursales={sucursalesMock}
          tipos={tiposCitaMock}
        />
      )}
    </div>
  );
}
