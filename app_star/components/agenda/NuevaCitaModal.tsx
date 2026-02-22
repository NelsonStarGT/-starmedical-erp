"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Cita, EmpresaAgenda, MedicoAgenda, PacienteAgenda, SalaAgenda, SucursalAgenda, TipoCita } from "@/lib/types/agenda";
import { v4 as uuid } from "uuid";
import { EstadoBadge } from "@/components/agenda/EstadoBadge";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (cita: Cita) => void;
  onCreatePaciente?: (paciente: PacienteAgenda) => void;
  pacientes: PacienteAgenda[];
  medicos: MedicoAgenda[];
  sucursales: SucursalAgenda[];
  tipos: TipoCita[];
  salas: SalaAgenda[];
  empresas: EmpresaAgenda[];
  citasExistentes: Cita[];
  currentUserId: string;
  defaultFecha?: string;
  defaultMedicoId?: string;
  initialData?: Partial<Cita>;
};

const estados = ["Programada", "Confirmada", "En sala", "Atendida", "No se presentó", "Cancelada"] as const;

export function NuevaCitaModal({
  open,
  onClose,
  onSave,
  onCreatePaciente,
  pacientes,
  medicos,
  sucursales,
  tipos,
  salas,
  empresas,
  citasExistentes,
  currentUserId,
  defaultFecha,
  defaultMedicoId,
  initialData
}: Props) {
  const [form, setForm] = useState<Partial<Cita>>({
    fecha: defaultFecha || "",
    horaInicio: "",
    horaFin: "",
    medicoId: defaultMedicoId || "",
    estado: "Programada",
    tipoCitaId: "",
    sucursalId: "",
    estadoPago: "Pendiente",
    pacienteRecurrente: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pacienteQuery, setPacienteQuery] = useState("");
  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [pacienteDraft, setPacienteDraft] = useState<Partial<PacienteAgenda>>({});

  useEffect(() => {
    if (!open) return;
    const nextForm: Partial<Cita> = initialData
      ? { ...initialData }
      : {
          fecha: defaultFecha || "",
          horaInicio: "",
          horaFin: "",
          medicoId: defaultMedicoId || "",
          estado: "Programada",
          tipoCitaId: "",
          sucursalId: ""
        };
    setForm(nextForm);
    const pac = pacientes.find((p) => p.id === nextForm.pacienteId);
    setPacienteQuery(pac ? formatPacienteResult(pac) : "");
    setErrors({});
  }, [open, initialData, defaultFecha, defaultMedicoId, pacientes]);

  const tipoCitaSeleccionado = useMemo(() => tipos.find((t) => t.id === form.tipoCitaId), [form.tipoCitaId, tipos]);

  const pacientesFiltrados = useMemo(() => {
    const term = pacienteQuery.trim().toLowerCase();
    if (!term) return pacientes.slice(0, 5);
    return pacientes.filter((p) => matchesPaciente(p, term)).slice(0, 8);
  }, [pacienteQuery, pacientes]);

  const selectedPaciente = useMemo(() => pacientes.find((p) => p.id === form.pacienteId), [form.pacienteId, pacientes]);

  const handleHoraInicioChange = (valor: string) => {
    const horaFinCalc = calcularHoraFin(valor, tipoCitaSeleccionado?.duracionMinutos || 30);
    setForm({ ...form, horaInicio: valor, horaFin: horaFinCalc });
  };

  const handleGuardarPaciente = () => {
    if (!pacienteDraft.nombre || !pacienteDraft.apellidos || !pacienteDraft.celular) {
      setErrors((prev) => ({ ...prev, pacienteId: "Completa nombre, apellidos y celular" }));
      return;
    }
    const nuevo: PacienteAgenda = {
      id: uuid(),
      nombre: pacienteDraft.nombre,
      apellidos: pacienteDraft.apellidos,
      telefono: pacienteDraft.telefono || pacienteDraft.celular,
      celular: pacienteDraft.celular,
      dpi: pacienteDraft.dpi,
      fechaNacimiento: pacienteDraft.fechaNacimiento,
      sexo: pacienteDraft.sexo
    };
    onCreatePaciente?.(nuevo);
    setForm({ ...form, pacienteId: nuevo.id });
    setPacienteQuery(formatPacienteResult(nuevo));
    setShowPacienteModal(false);
    setPacienteDraft({});
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.pacienteId) errs.pacienteId = "Paciente es obligatorio";
    if (!form.medicoId) errs.medicoId = "Especialista es obligatorio";
    if (!form.sucursalId) errs.sucursalId = "Sucursal es obligatoria";
    if (!form.tipoCitaId) errs.tipoCitaId = "Tipo de cita es obligatorio";
    if (!form.fecha) errs.fecha = "Fecha obligatoria";
    if (!form.horaInicio) errs.horaInicio = "Hora inicio obligatoria";
    const horaFinCalculada = form.horaFin || calcularHoraFin(form.horaInicio as string, tipoCitaSeleccionado?.duracionMinutos || 30);
    if (!horaFinCalculada) errs.horaFin = "Hora fin obligatoria";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const nowIso = new Date().toISOString();
    const cita: Cita = {
      id: form.id || uuid(),
      fecha: form.fecha as string,
      horaInicio: form.horaInicio as string,
      horaFin: horaFinCalculada,
      pacienteId: form.pacienteId as string,
      medicoId: form.medicoId as string,
      sucursalId: form.sucursalId as string,
      salaId: form.salaId,
      tipoCitaId: form.tipoCitaId as string,
      estado: (form.estado as any) || "Programada",
      estadoPago: (form.estadoPago as any) || "Pendiente",
      pacienteRecurrente: form.pacienteRecurrente ?? true,
      empresaId: form.empresaId,
      notas: form.notas,
      origen: form.origen,
      creadoPor: form.creadoPor || currentUserId,
      fechaCreacion: form.fechaCreacion || nowIso,
      ultimaActualizacion: nowIso
    };

    const traslape = validaTraslape(cita, citasExistentes);
    if (traslape) {
      setErrors((prev) => ({ ...prev, general: traslape }));
      return;
    }

    onSave(cita);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
      title={form.id ? "Editar cita" : "Nueva cita"}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {errors.general && <p className="text-sm text-red-600 sm:mr-auto">{errors.general}</p>}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
            >
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Paciente</label>
              <button
                onClick={() => setShowPacienteModal(true)}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Nuevo paciente
              </button>
            </div>
            <div className="relative">
              <input
                value={pacienteQuery}
                onChange={(e) => {
                  setPacienteQuery(e.target.value);
                  setForm({ ...form, pacienteId: undefined });
                }}
                placeholder="Nombre, DPI o teléfono"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              {pacienteQuery && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-soft">
                  {pacientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">Sin resultados</div>
                  ) : (
                    pacientesFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
                        onClick={() => {
                          setForm({ ...form, pacienteId: p.id });
                          setPacienteQuery(formatPacienteResult(p));
                        }}
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {p.nombre} {p.apellidos}
                        </span>
                        <span className="text-xs text-slate-600">
                          DPI {p.dpi || "N/D"} · {p.telefono || p.celular || "Sin teléfono"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedPaciente && (
              <p className="text-xs text-slate-500">Seleccionado: {selectedPaciente.nombre} {selectedPaciente.apellidos}</p>
            )}
            {errors.pacienteId && <p className="text-xs text-red-600">{errors.pacienteId}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Especialista</label>
          <select
              value={form.medicoId || ""}
              onChange={(e) => setForm({ ...form, medicoId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Selecciona</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.especialidad ? `· ${m.especialidad}` : ""}
                </option>
              ))}
            </select>
            {errors.medicoId && <p className="text-xs text-red-600">{errors.medicoId}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Sucursal</label>
            <select
              value={form.sucursalId || ""}
              onChange={(e) => setForm({ ...form, sucursalId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Selecciona</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {errors.sucursalId && <p className="text-xs text-red-600">{errors.sucursalId}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Sala / Recurso</label>
            <select
              value={form.salaId || ""}
              onChange={(e) => setForm({ ...form, salaId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Sin sala</option>
              {salas
                .filter((s) => !form.sucursalId || s.sucursalId === form.sucursalId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tipo de cita</label>
            <select
              value={form.tipoCitaId || ""}
              onChange={(e) => setForm({ ...form, tipoCitaId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Selecciona</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {errors.tipoCitaId && <p className="text-xs text-red-600">{errors.tipoCitaId}</p>}
            {tipoCitaSeleccionado?.duracionMinutos && (
              <p className="text-xs text-slate-500">
                Duración estimada: {tipoCitaSeleccionado.duracionMinutos} min
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Fecha</label>
            <input
              type="date"
              value={form.fecha || ""}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            {errors.fecha && <p className="text-xs text-red-600">{errors.fecha}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Hora inicio</label>
            <input
              type="time"
              value={form.horaInicio || ""}
              onChange={(e) => handleHoraInicioChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            {errors.horaInicio && <p className="text-xs text-red-600">{errors.horaInicio}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Hora fin</label>
            <input
              type="time"
              value={form.horaFin || ""}
              onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            {errors.horaFin && <p className="text-xs text-red-600">{errors.horaFin}</p>}
          </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Estado</label>
          <select
            value={form.estado || "Programada"}
            onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              {estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Tipo de paciente</label>
          <div className="flex gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={form.pacienteRecurrente === false}
                onChange={() => setForm({ ...form, pacienteRecurrente: false })}
              />
              <span>Paciente nuevo</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={form.pacienteRecurrente !== false}
                onChange={() => setForm({ ...form, pacienteRecurrente: true })}
              />
              <span>Recurrente</span>
            </label>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Estado de pago</label>
          <select
            value={form.estadoPago || "Pendiente"}
            onChange={(e) => setForm({ ...form, estadoPago: e.target.value as any })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
            <option value="Facturado">Facturado</option>
          </select>
        </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Empresa / Convenio</label>
            <select
              value={form.empresaId || ""}
              onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Sin empresa</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-sm font-medium text-slate-700">Notas</label>
            <textarea
              rows={3}
              value={form.notas || ""}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Motivo, instrucciones, etc."
            />
            {selectedPaciente && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <EstadoBadge estado={(form.estado as any) || "Programada"} />
                <span>DPI: {selectedPaciente.dpi || "N/D"}</span>
                <span>Contacto: {selectedPaciente.telefono || selectedPaciente.celular || "No registrado"}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={showPacienteModal}
        onClose={() => setShowPacienteModal(false)}
        title="Alta rápida de paciente"
        className="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowPacienteModal(false)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarPaciente}
              className="rounded-xl bg-brand-primary px-4 py-2 text-white text-sm font-semibold shadow-sm hover:shadow-md"
            >
              Guardar y seleccionar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nombres</label>
            <input
              value={pacienteDraft.nombre || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Apellidos</label>
            <input
              value={pacienteDraft.apellidos || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, apellidos: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Fecha de nacimiento</label>
            <input
              type="date"
              value={pacienteDraft.fechaNacimiento || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, fechaNacimiento: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Sexo</label>
            <select
              value={pacienteDraft.sexo || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, sexo: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Selecciona</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Celular</label>
            <input
              value={pacienteDraft.celular || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, celular: e.target.value })}
              placeholder="502..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">DPI (opcional)</label>
            <input
              value={pacienteDraft.dpi || ""}
              onChange={(e) => setPacienteDraft({ ...pacienteDraft, dpi: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

function calcularHoraFin(inicio: string, duracionMinutos: number) {
  if (!inicio) return "";
  const [h, m] = inicio.split(":").map(Number);
  const total = h * 60 + m + duracionMinutos;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function matchesPaciente(p: PacienteAgenda, term: string) {
  return (
    p.nombre.toLowerCase().includes(term) ||
    (p.apellidos || "").toLowerCase().includes(term) ||
    (p.dpi || "").toLowerCase().includes(term) ||
    (p.telefono || "").toLowerCase().includes(term) ||
    (p.celular || "").toLowerCase().includes(term)
  );
}

function formatPacienteResult(p: PacienteAgenda) {
  const nombre = `${p.nombre}${p.apellidos ? ` ${p.apellidos}` : ""}`;
  const telefono = p.telefono || p.celular || "Sin teléfono";
  return `${nombre} — DPI ${p.dpi || "N/D"} — ${telefono}`;
}

function validaTraslape(cita: Cita, citasExistentes: Cita[]) {
  const inicio = toMinutes(cita.horaInicio);
  const fin = toMinutes(cita.horaFin);
  const overlapWith = citasExistentes.find((c) => {
    if (c.id === cita.id) return false;
    if (c.fecha !== cita.fecha) return false;
    const start = toMinutes(c.horaInicio);
    const end = toMinutes(c.horaFin);
    const cruza = inicio < end && start < fin;
    const mismoMedico = c.medicoId === cita.medicoId;
    const mismaSala = cita.salaId && c.salaId && c.salaId === cita.salaId;
    return cruza && (mismoMedico || mismaSala);
  });

  if (!overlapWith) return "";

  const rango = `${overlapWith.horaInicio} - ${overlapWith.horaFin}`;
  const porMedico = overlapWith.medicoId === cita.medicoId;
  const porSala = cita.salaId && overlapWith.salaId && overlapWith.salaId === cita.salaId;
  if (porMedico && porSala) return `Conflicto por especialista y sala con la cita ${rango}`;
  if (porMedico) return `El especialista ya tiene una cita en ${rango}`;
  if (porSala) return `La sala/recurso ya tiene una cita en ${rango}`;
  return "Conflicto de horario";
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
