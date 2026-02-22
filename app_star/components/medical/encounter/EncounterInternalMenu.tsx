"use client";

import { cn } from "@/lib/utils";

export type EncounterMenuKey = "history" | "diagnostics" | "prescription" | "supplies" | "orders" | "results" | "evolution";

const ITEMS: Array<{ key: EncounterMenuKey; label: string; hint: string }> = [
  { key: "history", label: "Historia", hint: "Documento clínico" },
  { key: "diagnostics", label: "Diagnósticos", hint: "CIE-10" },
  { key: "prescription", label: "Recetario", hint: "Medicamentos" },
  { key: "supplies", label: "Insumos", hint: "Consumo clínico" },
  { key: "orders", label: "Órdenes", hint: "LAB · RX · USG" },
  { key: "results", label: "Resultados", hint: "LAB · RX · USG" },
  { key: "evolution", label: "Evolución", hint: "Append-only" }
];

function tabClasses(active: boolean) {
  return cn(
    "min-w-[170px] rounded-xl border px-3 py-2 text-left transition",
    active
      ? "border-[#2e75ba]/30 bg-[#f2f8ff] text-[#2e75ba]"
      : "border-slate-200 bg-white text-slate-700 hover:border-[#2e75ba]/25 hover:bg-[#f8fbff]"
  );
}

export default function EncounterInternalMenu({
  active,
  onChange
}: {
  active: EncounterMenuKey;
  onChange: (next: EncounterMenuKey) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-pressed={isActive}
            className={tabClasses(isActive)}
          >
            <div className="truncate text-sm font-semibold">{item.label}</div>
            <div className={cn("mt-0.5 truncate text-[11px] font-medium", isActive ? "text-[#2e75ba]" : "text-slate-500")}>
              {item.hint}
            </div>
          </button>
        );
      })}
    </div>
  );
}
