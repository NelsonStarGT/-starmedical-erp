"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useMedicalView } from "./MedicalViewContext";
import { medicosMock } from "@/lib/mock/medicos";

type DoctorOption = {
  id: string;
  label: string;
  meta?: string | null;
};

const DOCTOR_PREFIX = "doctor:";

function toOptionValue(scope: "mine" | "all" | "doctor", doctorId: string | null) {
  if (scope === "mine") return "mine";
  if (scope === "all") return "all";
  return `${DOCTOR_PREFIX}${doctorId || ""}`;
}

function fromOptionValue(value: string): { scope: "mine" | "all" | "doctor"; doctorId: string | null } {
  if (value === "mine") return { scope: "mine", doctorId: null };
  if (value === "all") return { scope: "all", doctorId: null };
  if (value.startsWith(DOCTOR_PREFIX)) return { scope: "doctor", doctorId: value.slice(DOCTOR_PREFIX.length) || null };
  return { scope: "all", doctorId: null };
}

export default function DoctorSelector({
  userId,
  enabled,
  className
}: {
  userId: string;
  enabled: boolean;
  className?: string;
}) {
  const { scope, doctorId, setView } = useMedicalView();
  const [options, setOptions] = useState<DoctorOption[]>(() =>
    medicosMock.map((d) => ({ id: d.id, label: d.nombre, meta: d.especialidad || null }))
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);

        // Best-effort: if USERS:ADMIN is present, we can fetch real doctors later.
        // For this prompt, keep mock as baseline and avoid hard dependency on DB.
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [enabled]);

  const selectValue = useMemo(() => toOptionValue(scope, doctorId), [scope, doctorId]);

  if (!enabled) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Ver como</div>
      <div className="min-w-[220px]">
        <select
          value={selectValue}
          onChange={(e) => {
            const parsed = fromOptionValue(e.target.value);
            if (parsed.scope === "mine") {
              setView({ scope: "mine", doctorId: userId });
              return;
            }
            if (parsed.scope === "all") {
              setView({ scope: "all", doctorId: null });
              return;
            }
            setView({ scope: "doctor", doctorId: parsed.doctorId });
          }}
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-diagnostics-primary focus:ring-2 focus:ring-diagnostics-primary/15",
            loading && "opacity-70"
          )}
          aria-label="Ver como"
        >
          <option value="mine">Mi agenda</option>
          <option value="all">Todos</option>
          {options.map((opt) => (
            <option key={opt.id} value={`${DOCTOR_PREFIX}${opt.id}`}>
              {opt.label}{opt.meta ? ` · ${opt.meta}` : ""}
            </option>
          ))}
        </select>
        <div className="mt-1 text-[11px] text-slate-500">
          Filtro de agenda (sin suplantación de usuario).
        </div>
      </div>
    </div>
  );
}

