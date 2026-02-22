"use client";

import { useMemo } from "react";
import { MedicoAgenda, TipoCita, EmpresaAgenda } from "@/lib/types/agenda";
import { cn } from "@/lib/utils";

export type AgendaFilters = {
  medico: string;
  especialidad: string;
  tipo: string;
  empresa: string;
  pacienteRecurrente: "nuevo" | "recurrente" | "";
  estado: string;
};

type Props = {
  medicos: MedicoAgenda[];
  tipos: TipoCita[];
  empresas: EmpresaAgenda[];
  filters: AgendaFilters;
  onChange: (next: AgendaFilters) => void;
};

export function FiltrosAgenda({ medicos, tipos, empresas, filters, onChange }: Props) {
  const especialidades = useMemo(
    () => Array.from(new Set(medicos.map((m) => m.especialidad).filter(Boolean))) as string[],
    [medicos]
  );

  const handle = (key: keyof Props["filters"], value: any) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-[#E5E5E7] bg-white p-4 shadow-soft">
      <Select
        label="Doctor"
        value={filters.medico || ""}
        onChange={(v) => handle("medico", v)}
        options={[{ label: "Todos", value: "" }, ...medicos.map((m) => ({ label: m.nombre, value: m.id }))]}
      />
      <Select
        label="Especialidad"
        value={filters.especialidad || ""}
        onChange={(v) => handle("especialidad", v)}
        options={[{ label: "Todas", value: "" }, ...especialidades.map((e) => ({ label: e, value: e }))]}
      />
      <Select
        label="Tipo de cita"
        value={filters.tipo || ""}
        onChange={(v) => handle("tipo", v)}
        options={[{ label: "Todos", value: "" }, ...tipos.map((t) => ({ label: t.nombre, value: t.id }))]}
      />
      <Select
        label="Empresa (SSO)"
        value={filters.empresa || ""}
        onChange={(v) => handle("empresa", v)}
        options={[{ label: "Todas", value: "" }, ...empresas.map((e) => ({ label: e.nombre, value: e.id }))]}
      />
      <Select
        label="Paciente"
        value={filters.pacienteRecurrente || ""}
        onChange={(v) => handle("pacienteRecurrente", v as any)}
        options={[
          { label: "Todos", value: "" },
          { label: "Nuevos", value: "nuevo" },
          { label: "Recurrentes", value: "recurrente" }
        ]}
      />
      <Select
        label="Estado"
        value={filters.estado || ""}
        onChange={(v) => handle("estado", v)}
        options={[
          { label: "Todos", value: "" },
          { label: "Activas", value: "Activa" },
          { label: "Canceladas", value: "Cancelada" },
          { label: "Finalizadas", value: "Atendida" },
          { label: "Sin pago", value: "Pendiente" }
        ]}
      />
    </div>
  );
}

function Select({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-w-[160px] rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
