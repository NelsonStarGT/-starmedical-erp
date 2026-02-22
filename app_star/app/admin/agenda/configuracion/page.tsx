'use client';

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { tiposCitaMock } from "@/lib/mock/tiposCita";
import { salasMock } from "@/lib/mock/salas";
import { horariosMock } from "@/lib/mock/horarios";
import { medicosMock } from "@/lib/mock/medicos";
import { sucursalesMock } from "@/lib/mock/sucursales";
import { HorarioMedico, RolUsuarioAgenda, SalaAgenda, TipoCita } from "@/lib/types/agenda";
import { cn } from "@/lib/utils";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const rolActual: RolUsuarioAgenda = "Administrador";

export default function AgendaConfigPage() {
  const [tipos, setTipos] = useState<TipoCita[]>(tiposCitaMock);
  const [salas, setSalas] = useState<SalaAgenda[]>(salasMock);
  const [horarios, setHorarios] = useState<HorarioMedico[]>(horariosMock);

  const [tipoForm, setTipoForm] = useState<Partial<TipoCita>>({
    estado: "Activo",
    duracionMinutos: 30,
    disponibilidad: { dias: [], bloques: [] }
  });
  const [salaForm, setSalaForm] = useState<Partial<SalaAgenda>>({ estado: "Activo" });
  const [horarioForm, setHorarioForm] = useState<Partial<HorarioMedico>>({
    diasSemana: [],
    bloques: [{ inicio: "08:00", fin: "12:00" }]
  });

  const esAdmin = rolActual === "Administrador";

  const disponibilidadTipo = tipoForm.disponibilidad || { dias: [], bloques: [] };

  const handleGuardarTipo = () => {
    if (!esAdmin) return;
    if (!tipoForm.nombre) return;
    const nuevo: TipoCita = {
      id: (tipoForm.id as string) || `t-${Date.now()}`,
      nombre: tipoForm.nombre,
      descripcion: tipoForm.descripcion,
      duracionMinutos: tipoForm.duracionMinutos || 30,
      color: tipoForm.color || "#00ADEF",
      estado: (tipoForm.estado as any) || "Activo",
      disponibilidad: {
        dias: disponibilidadTipo.dias || [],
        bloques: disponibilidadTipo.bloques || []
      }
    };
    setTipos((prev) => {
      const existe = prev.some((t) => t.id === nuevo.id);
      if (existe) return prev.map((t) => (t.id === nuevo.id ? nuevo : t));
      return [...prev, nuevo];
    });
    setTipoForm({ estado: "Activo", duracionMinutos: 30, disponibilidad: { dias: [], bloques: [] } });
  };

  const toggleEstadoTipo = (id: string) => {
    if (!esAdmin) return;
    setTipos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: t.estado === "Activo" ? "Inactivo" : "Activo" } : t))
    );
  };

  const handleGuardarSala = () => {
    if (!esAdmin) return;
    if (!salaForm.nombre || !salaForm.sucursalId) return;
    const nueva: SalaAgenda = {
      id: (salaForm.id as string) || `room-${Date.now()}`,
      nombre: salaForm.nombre,
      sucursalId: salaForm.sucursalId,
      tipoRecurso: salaForm.tipoRecurso || "Recurso",
      estado: (salaForm.estado as any) || "Activo"
    };
    setSalas((prev) => {
      const existe = prev.some((s) => s.id === nueva.id);
      if (existe) return prev.map((s) => (s.id === nueva.id ? nueva : s));
      return [...prev, nueva];
    });
    setSalaForm({ estado: "Activo" });
  };

  const toggleEstadoSala = (id: string) => {
    if (!esAdmin) return;
    setSalas((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado: s.estado === "Activo" ? "Inactivo" : "Activo" } : s))
    );
  };

  const handleGuardarHorario = () => {
    if (!esAdmin) return;
    if (!horarioForm.medicoId || !horarioForm.sucursalId || !horarioForm.diasSemana?.length || !horarioForm.bloques?.length) return;
    const nuevo: HorarioMedico = {
      id: horarioForm.id || `h-${Date.now()}`,
      medicoId: horarioForm.medicoId,
      sucursalId: horarioForm.sucursalId,
      diasSemana: horarioForm.diasSemana,
      bloques: horarioForm.bloques
    };
    setHorarios((prev) => {
      const existe = prev.some((h) => h.id === nuevo.id);
      if (existe) return prev.map((h) => (h.id === nuevo.id ? nuevo : h));
      return [...prev, nuevo];
    });
    setHorarioForm({ diasSemana: [], bloques: [{ inicio: "08:00", fin: "12:00" }] });
  };

  const resumenHorarios = useMemo(
    () =>
      horarios.map((h) => {
        const medico = medicosMock.find((m) => m.id === h.medicoId)?.nombre || "Especialista";
        const sucursal = sucursalesMock.find((s) => s.id === h.sucursalId)?.nombre || "Sucursal";
        const bloques = h.bloques.map((b) => `${b.inicio}–${b.fin}`).join(", ");
        return { ...h, label: `${medico} — ${sucursal}: ${h.diasSemana.join(", ")} ${bloques}` };
      }),
    [horarios]
  );

  const updateDisponibilidadBloque = (index: number, field: "inicio" | "fin", value: string) => {
    const bloques = disponibilidadTipo.bloques ? [...disponibilidadTipo.bloques] : [];
    bloques[index] = { ...bloques[index], [field]: value };
    setTipoForm({ ...tipoForm, disponibilidad: { ...disponibilidadTipo, bloques } });
  };

  const updateHorarioBloque = (index: number, field: "inicio" | "fin", value: string) => {
    const bloques = horarioForm.bloques ? [...horarioForm.bloques] : [];
    bloques[index] = { ...bloques[index], [field]: value };
    setHorarioForm({ ...horarioForm, bloques });
  };

  return (
    <div className="space-y-6">
      {!esAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo los usuarios con rol Administrador pueden crear o editar la configuración. Visualización habilitada.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tipos de cita</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Duración</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Color</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Disponibilidad</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">{t.nombre}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{t.duracionMinutos} min</td>
                    <td className="px-3 py-2 text-sm text-slate-700">
                      <span className="mr-2 inline-block h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: t.color }} />
                      {t.color}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-slate-600">
                      <div>{t.disponibilidad?.dias?.join(", ")}</div>
                      <div className="text-slate-500">{t.disponibilidad?.bloques?.map((b) => `${b.inicio}–${b.fin}`).join(", ")}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={t.estado === "Activo" ? "success" : "neutral"}>{t.estado}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {esAdmin ? (
                        <div className="flex gap-2 text-xs font-semibold">
                          <button
                            className="text-brand-primary hover:underline"
                            onClick={() => setTipoForm(t)}
                          >
                            Editar
                          </button>
                          <button
                            className="text-slate-600 hover:underline"
                            onClick={() => toggleEstadoTipo(t.id)}
                          >
                            {t.estado === "Activo" ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={cn("space-y-3", !esAdmin && "pointer-events-none opacity-50")}>
            <input
              placeholder="Nombre"
              value={tipoForm.nombre || ""}
              onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <textarea
              placeholder="Descripción"
              value={tipoForm.descripcion || ""}
              onChange={(e) => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              type="number"
              placeholder="Duración (minutos)"
              value={tipoForm.duracionMinutos || ""}
              onChange={(e) => setTipoForm({ ...tipoForm, duracionMinutos: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              placeholder="Color (hex)"
              value={tipoForm.color || ""}
              onChange={(e) => setTipoForm({ ...tipoForm, color: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <div>
              <p className="text-sm font-semibold text-slate-800">Días disponibles</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {diasSemana.map((dia) => {
                  const activo = disponibilidadTipo.dias?.includes(dia);
                  return (
                    <label key={dia} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs", activo ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-slate-200 text-slate-600")}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={activo}
                        onChange={() => {
                          const dias = new Set(disponibilidadTipo.dias);
                          activo ? dias.delete(dia) : dias.add(dia);
                          setTipoForm({ ...tipoForm, disponibilidad: { ...disponibilidadTipo, dias: Array.from(dias) } });
                        }}
                      />
                      {dia.slice(0, 3)}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Bloques permitidos</p>
              {disponibilidadTipo.bloques?.map((b, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={b.inicio}
                    onChange={(e) => updateDisponibilidadBloque(idx, "inicio", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <input
                    type="time"
                    value={b.fin}
                    onChange={(e) => updateDisponibilidadBloque(idx, "fin", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              ))}
              <button
                onClick={() => setTipoForm({ ...tipoForm, disponibilidad: { ...disponibilidadTipo, bloques: [...(disponibilidadTipo.bloques || []), { inicio: "08:00", fin: "12:00" }] } })}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
            <select
              value={tipoForm.estado || "Activo"}
              onChange={(e) => setTipoForm({ ...tipoForm, estado: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={handleGuardarTipo}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar tipo
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salas / recursos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Nombre</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Sucursal</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tipo recurso</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {salas.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 text-sm font-semibold text-slate-900">{s.nombre}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{sucursalesMock.find((x) => x.id === s.sucursalId)?.nombre}</td>
                    <td className="px-3 py-2 text-sm text-slate-700">{s.tipoRecurso}</td>
                    <td className="px-3 py-2">
                      <Badge variant={s.estado === "Activo" ? "success" : "neutral"}>{s.estado}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {esAdmin ? (
                        <div className="flex gap-2 text-xs font-semibold">
                          <button className="text-brand-primary hover:underline" onClick={() => setSalaForm(s)}>
                            Editar
                          </button>
                          <button className="text-slate-600 hover:underline" onClick={() => toggleEstadoSala(s.id)}>
                            {s.estado === "Activo" ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={cn("space-y-3", !esAdmin && "pointer-events-none opacity-50")}>
            <input
              placeholder="Nombre de sala"
              value={salaForm.nombre || ""}
              onChange={(e) => setSalaForm({ ...salaForm, nombre: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={salaForm.sucursalId || ""}
              onChange={(e) => setSalaForm({ ...salaForm, sucursalId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Sucursal</option>
              {sucursalesMock.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <input
              placeholder="Tipo de recurso"
              value={salaForm.tipoRecurso || ""}
              onChange={(e) => setSalaForm({ ...salaForm, tipoRecurso: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <select
              value={salaForm.estado || "Activo"}
              onChange={(e) => setSalaForm({ ...salaForm, estado: e.target.value as any })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={handleGuardarSala}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar sala
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de trabajo por médico</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {resumenHorarios.map((h) => (
              <div key={h.id} className="rounded-xl border border-slate-200 p-3 bg-white flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{h.label}</p>
                </div>
                {esAdmin && (
                  <button
                    onClick={() => setHorarioForm(h)}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className={cn("space-y-3", !esAdmin && "pointer-events-none opacity-50")}>
            <select
              value={horarioForm.medicoId || ""}
              onChange={(e) => setHorarioForm({ ...horarioForm, medicoId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Especialista</option>
              {medicosMock.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <select
              value={horarioForm.sucursalId || ""}
              onChange={(e) => setHorarioForm({ ...horarioForm, sucursalId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Sucursal</option>
              {sucursalesMock.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <div>
              <p className="text-sm font-semibold text-slate-800">Días de la semana</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {diasSemana.map((dia) => {
                  const activo = horarioForm.diasSemana?.includes(dia);
                  return (
                    <label key={dia} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs", activo ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-slate-200 text-slate-600")}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={activo}
                        onChange={() => {
                          const dias = new Set(horarioForm.diasSemana || []);
                          activo ? dias.delete(dia) : dias.add(dia);
                          setHorarioForm({ ...horarioForm, diasSemana: Array.from(dias) });
                        }}
                      />
                      {dia.slice(0, 3)}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Bloques horarios</p>
              {horarioForm.bloques?.map((b, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={b.inicio}
                    onChange={(e) => updateHorarioBloque(idx, "inicio", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <input
                    type="time"
                    value={b.fin}
                    onChange={(e) => updateHorarioBloque(idx, "fin", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              ))}
              <button
                onClick={() => setHorarioForm({ ...horarioForm, bloques: [...(horarioForm.bloques || []), { inicio: "08:00", fin: "12:00" }] })}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Agregar bloque
              </button>
            </div>
            <button
              onClick={handleGuardarHorario}
              className="w-full rounded-xl bg-brand-primary px-4 py-2 text-white font-semibold shadow-sm hover:shadow-md"
            >
              Guardar horario
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
