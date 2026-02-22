'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { pacientesMock } from "@/lib/mock/pacientes";
import { medicosMock } from "@/lib/mock/medicos";
import { sucursalesMock } from "@/lib/mock/sucursales";
import { tiposCitaMock } from "@/lib/mock/tiposCita";
import { citasMock } from "@/lib/mock/citas";
import { salasMock } from "@/lib/mock/salas";
import { empresasMock } from "@/lib/mock/empresas";
import { horariosMock } from "@/lib/mock/horarios";
import { Cita, MedicoAgenda, PacienteAgenda } from "@/lib/types/agenda";
import { NuevaCitaModal } from "@/components/agenda/NuevaCitaModal";
import { DetalleCitaModal } from "@/components/agenda/DetalleCitaModal";
import { EstadoBadge } from "@/components/agenda/EstadoBadge";
import { DoctorSelector } from "@/components/agenda/DoctorSelector";
import { FiltrosAgenda, type AgendaFilters } from "@/components/agenda/FiltrosAgenda";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";
import { AgendaMiniDashboard } from "@/components/agenda/AgendaMiniDashboard";
import { useAgendaUpdates } from "@/hooks/useAgendaUpdates";

type Vista = "mes" | "semana" | "dia" | "lista";

const hourHeight = 64;
const hours = Array.from({ length: 12 }, (_, i) => 7 + i); // 7am - 7pm

export default function AgendaCalendarPage() {
  const [vista, setVista] = useState<Vista>("semana");
  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const [selectedMedico, setSelectedMedico] = useState("");
  const [filters, setFilters] = useState<AgendaFilters>({
    medico: "",
    especialidad: "",
    tipo: "",
    empresa: "",
    pacienteRecurrente: "" as "nuevo" | "recurrente" | "",
    estado: ""
  });
  const [prefillMedico, setPrefillMedico] = useState<string>("");
  const [showNueva, setShowNueva] = useState(false);
  const [showDetalle, setShowDetalle] = useState<Cita | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacientes, setPacientes] = useState(pacientesMock);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nowLine, setNowLine] = useState(getMinutes(new Date()));
  const currentUserId = "admin-1";
  const [isFetching, setIsFetching] = useState(false);

  const loadCitas = async () => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      const range = getRangeForView(vista, selectedDate);
      if (range.date) params.set("date", range.date);
      if (range.from) params.set("from", range.from.toISOString());
      if (range.to) params.set("to", range.to.toISOString());
      if (filters.medico) params.set("specialistId", filters.medico);
      if (filters.estado) params.set("status", filters.estado);
      const res = await fetch(`/api/agenda?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCitas(json.data || []);
      } else {
        console.warn("No se pudieron cargar las citas, usando mock");
        setCitas(citasMock);
      }
    } catch (e) {
      console.error(e);
      setCitas(citasMock);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadCitas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, selectedDate, filters.medico, filters.estado]);

  useAgendaUpdates(({ type, data }) => {
    setCitas((prev) => {
      if (type === "appointment_deleted") {
        return prev.filter((c) => c.id !== data.id);
      }
      if (type === "appointment_created") {
        return [...prev, data as Cita];
      }
      if (type === "appointment_updated") {
        return prev.map((c) => (c.id === (data as Cita).id ? (data as Cita) : c));
      }
      return prev;
    });
  });

  useEffect(() => {
    const timer = setInterval(() => setNowLine(getMinutes(new Date())), 60000);
    return () => clearInterval(timer);
  }, []);

  const doctoresApple = useMemo<Array<MedicoAgenda & { estado: "Disponible" | "Ocupado"; foto?: string }>>(
    () =>
      medicosMock.map((m, idx) => ({
        ...m,
        estado: idx % 2 === 0 ? "Disponible" : "Ocupado",
        foto: undefined
      })),
    []
  );

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const paciente = pacientes.find((p) => p.id === c.pacienteId);
      if (filters.medico && c.medicoId !== filters.medico) return false;
      if (filters.especialidad) {
        const med = medicosMock.find((m) => m.id === c.medicoId);
        if (med?.especialidad !== filters.especialidad) return false;
      }
      if (filters.tipo && c.tipoCitaId !== filters.tipo) return false;
      if (filters.empresa && c.empresaId !== filters.empresa) return false;
      if (filters.pacienteRecurrente) {
        if (filters.pacienteRecurrente === "nuevo" && c.pacienteRecurrente) return false;
        if (filters.pacienteRecurrente === "recurrente" && !c.pacienteRecurrente) return false;
      }
      if (filters.estado) {
        if (filters.estado === "Activa" && c.estado === "Cancelada") return false;
        if (filters.estado === "Cancelada" && c.estado !== "Cancelada") return false;
        if (filters.estado === "Atendida" && c.estado !== "Atendida") return false;
        if (filters.estado === "Pendiente" && c.estadoPago === "Pagado") return false;
      }
      const matchVista =
        vista === "dia"
          ? c.fecha === selectedDate
          : vista === "semana"
            ? isInSameWeek(c.fecha, selectedDate)
            : vista === "mes"
              ? isSameMonth(c.fecha, selectedDate)
              : true;
      return matchVista;
    });
  }, [citas, filters, selectedDate, vista, pacientes]);

  const citasPorFecha = useMemo(() => {
    const mapa: Record<string, Cita[]> = {};
    citasFiltradas.forEach((c) => {
      mapa[c.fecha] = mapa[c.fecha] ? [...mapa[c.fecha], c] : [c];
    });
    return mapa;
  }, [citasFiltradas]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const citasDiaSeleccionado = useMemo(
    () => citasFiltradas.filter((c) => c.fecha === selectedDate).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [citasFiltradas, selectedDate]
  );

  const metrics = useMemo(() => {
    const delDia = citas.filter((c) => c.fecha === selectedDate);
    const total = delDia.length;
    const completadas = delDia.filter((c) => c.estado === "Atendida").length;
    const canceladas = delDia.filter((c) => c.estado === "Cancelada").length;
    const ingresos = delDia.reduce((acc) => acc + 350, 0); // mock promedio
    const noShow = total ? Math.round((delDia.filter((c) => c.estado === "No se presentó").length / total) * 100) : 0;
    return { total, completadas, canceladas, ingresos, noShowRate: noShow };
  }, [citas, selectedDate]);

  const handleGuardarCita = async (cita: Cita) => {
    const method = cita.id ? "PUT" : "POST";
    const res = await fetch("/api/agenda", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cita)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "No se pudo guardar la cita");
      return;
    }
    const json = await res.json();
    const saved: Cita = json.data;
    setCitas((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [...prev, saved];
    });
  };

  const handleCreatePaciente = (p: PacienteAgenda) => setPacientes((prev) => [...prev, p]);

  const handleDropOnSlot = async (fecha: string, hora: string, medicoId?: string) => {
    if (!draggingId) return;
    const cita = citas.find((c) => c.id === draggingId);
    if (!cita) return;
    const duracion = getMinutesFromHH(cita.horaFin) - getMinutesFromHH(cita.horaInicio);
    const nuevaHoraFin = addMinutesToHH(hora, duracion);
    await handleGuardarCita({ ...cita, fecha, horaInicio: hora, horaFin: nuevaHoraFin, medicoId: medicoId || cita.medicoId });
    setDraggingId(null);
  };

  const renderTimelineGrid = (content: (time: number) => ReactNode) => (
    <div className="relative" style={{ height: hours.length * hourHeight }}>
      {hours.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t border-[#E5E5E7] text-[11px] text-slate-300"
          style={{ top: (h - hours[0]) * hourHeight, height: hourHeight }}
        >
          <span className="absolute -left-10 top-0 text-xs text-slate-400">{String(h).padStart(2, "0")}:00</span>
        </div>
      ))}
      {content(nowLine)}
    </div>
  );

  const renderCitaBloque = (cita: Cita, index: number) => {
    const tipo = tiposCitaMock.find((t) => t.id === cita.tipoCitaId);
    const paciente = pacientes.find((p) => p.id === cita.pacienteId);
    const medico = medicosMock.find((m) => m.id === cita.medicoId);
    const pacienteLabel = (
      paciente
        ? `${paciente.nombre} ${paciente.apellidos || ""}`
        : cita.pacienteDisplayName || [cita.pacienteNombre, cita.pacienteApellidos].filter(Boolean).join(" ")
    ).trim() || "Paciente";
    const top = (horaToFloat(cita.horaInicio) - hours[0]) * hourHeight;
    const height = (horaToFloat(cita.horaFin) - horaToFloat(cita.horaInicio)) * hourHeight;
    return (
      <div
        key={cita.id}
        draggable
        onDragStart={() => setDraggingId(cita.id)}
        className="group absolute left-1 right-1 overflow-hidden rounded-2xl border border-[#E5E5E7] bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lifted"
        style={{
          top,
          height,
          background: `linear-gradient(135deg, ${tipo?.color || "#e0e7ff"}1a, #ffffff)`
        }}
        onClick={() => setShowDetalle(cita)}
      >
        <div className="flex items-center justify-between px-3 pt-2">
          <p className="text-sm font-semibold text-slate-900 truncate">{pacienteLabel}</p>
          <EstadoBadge estado={cita.estado} className="px-2 py-0.5 text-[11px]" />
        </div>
        <div className="px-3 text-xs text-slate-600">
          <p>{cita.horaInicio}–{cita.horaFin} · {tipo?.nombre}</p>
          <p className="text-[11px] text-slate-500">{medico?.nombre}</p>
        </div>
        <div className="flex items-center gap-2 px-3 pb-2 text-[11px] text-slate-500 opacity-0 transition duration-150 group-hover:opacity-100">
          <button className="hover:text-slate-800" onClick={(e) => { e.stopPropagation(); setShowDetalle(cita); }}>✏️ Editar</button>
          <button className="hover:text-slate-800" onClick={(e) => { e.stopPropagation(); setPrefillMedico(cita.medicoId); setShowNueva(true); }}>🔁 Reagendar</button>
          <button className="hover:text-slate-800" onClick={async (e) => { e.stopPropagation(); await handleGuardarCita({ ...cita, estado: "Confirmada" }); }}>✔️ Confirmar</button>
          <button className="hover:text-slate-800" onClick={(e) => e.stopPropagation()}>💳 Facturar</button>
        </div>
        {index === 0 && vista === "dia" && (
          <div className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ backgroundColor: cita.estadoPago === "Pagado" ? "#34C759" : cita.estadoPago === "Facturado" ? "#0A84FF" : "#FF9F0A" }} />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <AgendaMiniDashboard
        total={metrics.total}
        completadas={metrics.completadas}
        canceladas={metrics.canceladas}
        ingresos={metrics.ingresos}
        noShowRate={metrics.noShowRate}
      />

      <Card className="bg-white/95">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["mes", "semana", "dia", "lista"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold capitalize transition",
                  vista === v ? "bg-brand-primary text-white shadow-soft" : "bg-white text-slate-700 border border-[#E5E5E7] hover:shadow-soft"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
            <button
              onClick={() => { setPrefillMedico(selectedMedico); setShowNueva(true); }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:shadow-lifted"
            >
              Nueva cita
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FiltrosAgenda
            medicos={doctoresApple}
            tipos={tiposCitaMock}
            empresas={empresasMock}
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              if (next.medico) setSelectedMedico(next.medico);
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 space-y-4">
              {vista === "mes" && (
                <div className="grid grid-cols-7 gap-3">
                  {monthGrid.map(({ date, inMonth }) => {
                    const fechaStr = toISO(date);
                    const citasDia = citasPorFecha[fechaStr] || [];
                    const total = citasDia.length;
                    const canceladas = citasDia.filter((c) => c.estado === "Cancelada").length;
                    const finalizadas = citasDia.filter((c) => c.estado === "Atendida").length;
                    const dots = Array.from({ length: Math.min(total, 4) });
                    return (
                      <div
                        key={fechaStr}
                        title={`Totales: ${total} · Canceladas: ${canceladas} · Finalizadas: ${finalizadas}`}
                        onClick={() => { setSelectedDate(fechaStr); setVista("dia"); }}
                        className={cn(
                          "relative cursor-pointer rounded-2xl border px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-lifted",
                          inMonth ? "bg-white border-[#E5E5E7]" : "bg-slate-50 border-dashed border-[#E5E5E7]",
                          selectedDate === fechaStr ? "ring-2 ring-brand-primary/40" : ""
                        )}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="capitalize">{date.toLocaleDateString("es-GT", { weekday: "short" })}</span>
                          <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", selectedDate === fechaStr ? "bg-brand-primary text-white" : "text-slate-900")}>
                            {date.getDate()}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-1">
                          {dots.map((_, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "h-2 w-2 rounded-full",
                                idx === 0 ? "bg-brand-primary" : idx === 1 ? "bg-emerald-400" : idx === 2 ? "bg-amber-400" : "bg-slate-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {vista === "semana" && (
                <div className="overflow-hidden rounded-2xl border border-[#E5E5E7] bg-white shadow-soft">
                  <div className="grid grid-cols-8 gap-0">
                    <div className="col-span-1 text-xs text-slate-400 px-3 py-2">Hora</div>
                    {weekDays.map((fecha) => {
                      const fechaObj = parseDate(fecha);
                      const titulo = fechaObj.toLocaleDateString("es-GT", { weekday: "short", day: "numeric" });
                      const isToday = toISO(new Date()) === fecha;
                      return (
                        <div key={fecha} className="border-l border-[#E5E5E7] px-3 py-2 text-sm font-semibold text-slate-800 capitalize">
                          <div className={cn("inline-flex h-8 min-w-[48px] items-center justify-center rounded-full px-3", isToday ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700")}>
                            {titulo}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-8">
                    <div className="col-span-1 relative">
                      {hours.map((h) => (
                        <div key={h} className="h-16 border-t border-[#E5E5E7] text-xs text-slate-400 px-3 py-1">
                          {String(h).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                    {weekDays.map((fecha) => {
                      const citasDia = (citasPorFecha[fecha] || []).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
                      const disponibilidad = availabilityBlocks(fecha);
                      return (
                        <div key={fecha} className="relative border-l border-[#E5E5E7]">
                          {renderTimelineGrid(() => (
                            <>
                              {disponibilidad.map((b, idx) => (
                                <div
                                  key={idx}
                                  className="absolute left-1 right-1 rounded-xl bg-gradient-to-r from-brand-primary/8 to-brand-primary/4"
                                  style={{
                                    top: (horaToFloat(b.inicio) - hours[0]) * hourHeight,
                                    height: (horaToFloat(b.fin) - horaToFloat(b.inicio)) * hourHeight
                                  }}
                                />
                              ))}
                              {citasDia.map((c, idx) => renderCitaBloque(c, idx))}
                              <div
                                className="absolute left-0 right-0 h-0.5 bg-red-500/80"
                                style={{ top: ((nowLine / 60) - hours[0]) * hourHeight }}
                              />
                            </>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vista === "dia" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-2xl border border-[#E5E5E7] bg-white px-4 py-3 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-primary/10 to-brand-primary/30 flex items-center justify-center text-sm font-semibold text-brand-primary">
                        {selectedMedico ? medicosMock.find((m) => m.id === selectedMedico)?.nombre.slice(0, 2).toUpperCase() : "AP"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedMedico ? medicosMock.find((m) => m.id === selectedMedico)?.nombre : "Todos los especialistas"}
                        </p>
                        <p className="text-xs text-slate-500">Línea roja indica la hora actual</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPrefillMedico(selectedMedico)}
                      className="rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-semibold text-brand-primary"
                    >
                      + Cita rápida
                    </button>
                  </div>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `80px repeat(${Math.max(selectedMedico ? 1 : doctoresApple.length, 1)}, minmax(0,1fr))` }}
                  >
                    <div className="text-xs text-slate-400">
                      <div className="h-14" />
                      {hours.map((h) => (
                        <div key={h} className="h-16 flex items-start">
                          {String(h).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                    {(selectedMedico ? doctoresApple.filter((d) => d.id === selectedMedico) : doctoresApple).map((doc) => {
                      const citasDoc = citasDiaSeleccionado.filter((c) => c.medicoId === doc.id);
                      return (
                        <div key={doc.id} className="rounded-2xl border border-[#E5E5E7] bg-white shadow-soft">
                          <div className="flex h-14 items-center justify-between gap-2 px-3 border-b border-[#E5E5E7]">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-primary/10 to-brand-primary/30 flex items-center justify-center text-sm font-semibold text-brand-primary">
                                {doc.nombre.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{doc.nombre}</p>
                                <p className="text-[11px] text-slate-500">{doc.especialidad}</p>
                              </div>
                            </div>
                            <span className={doc.estado === "Disponible" ? "text-green-500" : "text-red-500"}>
                              {doc.estado === "Disponible" ? "🟢" : "🔴"}
                            </span>
                          </div>
                          <div className="relative" style={{ height: hours.length * hourHeight }}>
                            {hours.map((h) => (
                              <div
                                key={h}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropOnSlot(selectedDate, `${String(h).padStart(2, "0")}:00`, doc.id)}
                                className="absolute left-0 right-0 border-t border-[#E5E5E7] hover:bg-slate-50"
                                style={{ top: (h - hours[0]) * hourHeight, height: hourHeight }}
                              />
                            ))}
                            {citasDoc.map((c, idx) => renderCitaBloque(c, idx))}
                            <div
                              className="absolute left-0 right-0 h-0.5 bg-red-500"
                              style={{ top: ((nowLine / 60) - hours[0]) * hourHeight }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vista === "lista" && (
                <div className="space-y-3">
                  {citasFiltradas
                    .slice()
                    .sort((a, b) => `${a.fecha} ${a.horaInicio}`.localeCompare(`${b.fecha} ${b.horaInicio}`))
                    .map((c) => {
                      const paciente = pacientes.find((p) => p.id === c.pacienteId);
                      const medico = medicosMock.find((m) => m.id === c.medicoId);
                      const tipo = tiposCitaMock.find((t) => t.id === c.tipoCitaId);
                      return (
                        <AppointmentCard
                          key={c.id}
                          cita={c}
                          paciente={paciente}
                          medico={medico}
                          tipo={tipo}
                          onEdit={() => setShowDetalle(c)}
                          onReagendar={() => { setPrefillMedico(c.medicoId); setShowNueva(true); }}
                          onConfirmar={async () => await handleGuardarCita({ ...c, estado: "Confirmada" })}
                          onFacturar={async () => await handleGuardarCita({ ...c, estadoPago: "Facturado" })}
                          onExpediente={() => {}}
                        />
                      );
                    })}
              </div>
              )}
            </div>

            <div className="space-y-3">
              <Card className="border-[#E5E5E7] bg-white">
                <CardHeader>
                  <CardTitle>Citas del día</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {citasDiaSeleccionado.length === 0 && <p className="text-sm text-slate-500">Sin citas</p>}
                  {citasDiaSeleccionado.map((c) => {
                    const paciente = pacientes.find((p) => p.id === c.pacienteId);
                    const medico = medicosMock.find((m) => m.id === c.medicoId);
                    const tipo = tiposCitaMock.find((t) => t.id === c.tipoCitaId);
                    return (
                      <AppointmentCard
                        key={c.id}
                        cita={c}
                        paciente={paciente}
                        medico={medico}
                        tipo={tipo}
                        onEdit={() => setShowDetalle(c)}
                        onReagendar={() => { setPrefillMedico(c.medicoId); setShowNueva(true); }}
                        onConfirmar={async () => await handleGuardarCita({ ...c, estado: "Confirmada" })}
                        onFacturar={async () => await handleGuardarCita({ ...c, estadoPago: "Facturado" })}
                      />
                    );
                  })}
                </CardContent>
              </Card>
              <DoctorSelector
                doctores={doctoresApple}
                value={selectedMedico}
                onChange={(id) => { setSelectedMedico(id); setFilters({ ...filters, medico: id }); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <NuevaCitaModal
        open={showNueva}
        onClose={() => setShowNueva(false)}
        onSave={(cita) => {
          handleGuardarCita(cita);
          setShowNueva(false);
        }}
        onCreatePaciente={handleCreatePaciente}
        pacientes={pacientes}
        medicos={medicosMock}
        sucursales={sucursalesMock}
        tipos={tiposCitaMock}
        salas={salasMock}
        empresas={empresasMock}
        citasExistentes={citas}
        currentUserId={currentUserId}
        defaultFecha={selectedDate}
        defaultMedicoId={prefillMedico || selectedMedico}
      />

      {showDetalle && (
        <DetalleCitaModal
          cita={showDetalle}
          onClose={() => setShowDetalle(null)}
          onUpdate={(cita) => {
            handleGuardarCita(cita);
            setShowDetalle(null);
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

function horaToFloat(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h + m / 60;
}

function parseDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isInSameWeek(fecha: string, referencia: string) {
  const target = parseDate(fecha);
  const start = startOfWeek(parseDate(referencia));
  const end = addDays(start, 7);
  return target >= start && target < end;
}

function isSameMonth(fecha: string, referencia: string) {
  const d1 = parseDate(fecha);
  const d2 = parseDate(referencia);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function getWeekDays(fecha: string) {
  const start = startOfWeek(parseDate(fecha));
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
}

function getMonthGrid(fecha: string) {
  const ref = parseDate(fecha);
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const start = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.getMonth() === ref.getMonth() };
  });
}

function getMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function getMinutesFromHH(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function addMinutesToHH(hhmm: string, minutes: number) {
  const total = getMinutesFromHH(hhmm) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function availabilityBlocks(fecha: string) {
  const weekday = parseDate(fecha).toLocaleDateString("es-GT", { weekday: "long" });
  const dayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const blocks = horariosMock
    .filter((h) => h.diasSemana.includes(dayCapitalized))
    .flatMap((h) => h.bloques);
  return blocks;
}

function getRangeForView(vista: Vista, fecha: string) {
  if (vista === "dia") return { date: fecha };
  if (vista === "semana") {
    const start = startOfWeek(parseDate(fecha));
    const end = addDays(start, 7);
    return { from: start, to: end };
  }
  if (vista === "mes") {
    const ref = parseDate(fecha);
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    return { from: start, to: end };
  }
  return { from: undefined, to: undefined };
}
