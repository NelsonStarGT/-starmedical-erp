"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MedicoAgenda } from "@/lib/types/agenda";
import { cn } from "@/lib/utils";

type DoctorSelectorProps = {
  doctores: Array<MedicoAgenda & { foto?: string; estado?: "Disponible" | "Ocupado" }>;
  value?: string;
  onChange?: (id: string) => void;
  className?: string;
};

export function DoctorSelector({ doctores, value, onChange, className }: DoctorSelectorProps) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return doctores;
    return doctores.filter(
      (d) =>
        d.nombre.toLowerCase().includes(term) ||
        (d.especialidad || "").toLowerCase().includes(term)
    );
  }, [query, doctores]);

  return (
    <div className={cn("rounded-2xl border border-[#E5E5E7] bg-white p-3 shadow-soft", className)}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar especialista"
        className="w-full rounded-xl border border-[#E5E5E7] bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
      />
      <div className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
        {filtrados.map((doc) => {
          const active = value === doc.id;
          return (
            <button
              key={doc.id}
              onClick={() => onChange?.(doc.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                active ? "border-brand-primary bg-brand-primary/8 shadow-lifted" : "border-transparent hover:border-[#E5E5E7] hover:bg-slate-50"
              )}
            >
              <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-brand-primary/10 to-brand-primary/40">
                {doc.foto ? (
                  <Image src={doc.foto} alt={doc.nombre} fill className="rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-brand-primary">
                    {doc.nombre.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{doc.nombre}</div>
                <div className="text-xs text-slate-500">{doc.especialidad}</div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className={doc.estado === "Disponible" ? "text-green-500" : "text-red-500"}>
                  {doc.estado === "Disponible" ? "🟢" : "🔴"}
                </span>
                <span className="text-slate-500">{doc.estado || "Disponible"}</span>
              </div>
            </button>
          );
        })}
        {filtrados.length === 0 && <p className="text-xs text-slate-500 px-2">Sin resultados</p>}
      </div>
    </div>
  );
}
