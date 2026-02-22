"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { AdminPatientRow } from "./types";

type ActionItem = {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  onSelect?: () => void;
};

function menuItemClasses(disabled: boolean, tone: ActionItem["tone"]) {
  return cn(
    "w-full text-left rounded-xl px-3 py-2 text-sm font-semibold transition flex items-start gap-3",
    disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
    tone === "danger" ? "text-rose-700" : "text-slate-800"
  );
}

function canMutate(row: AdminPatientRow) {
  return row.status !== "done" && row.status !== "canceled" && row.status !== "no_show";
}

export default function AdminPatientsActionsMenu({
  row,
  onAction
}: {
  row: AdminPatientRow;
  onAction: (actionKey: string, row: AdminPatientRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const items = useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [];
    const mutable = canMutate(row);

    list.push({
      key: "copy_patient_id",
      label: "Copiar ID paciente",
      description: row.patient.id,
      onSelect: () => onAction("copy_patient_id", row)
    });
    list.push({
      key: "call_patient",
      label: "Llamar",
      description: row.patient.phone ? row.patient.phone : "Sin teléfono",
      disabled: !row.patient.phone,
      onSelect: () => onAction("call_patient", row)
    });
    list.push({
      key: "reschedule",
      label: "Reprogramar",
      description: "Mover fecha/hora (administrativo)",
      disabled: !mutable,
      onSelect: () => onAction("reschedule", row)
    });
    list.push({
      key: "no_show",
      label: "No-show",
      description: "Marcar no se presentó",
      tone: "danger",
      disabled: !mutable,
      onSelect: () => onAction("no_show", row)
    });
    list.push({
      key: "cancel",
      label: "Cancelar",
      description: "Cancelar cita",
      tone: "danger",
      disabled: row.status === "canceled" || row.status === "done",
      onSelect: () => onAction("cancel", row)
    });

    return list;
  }, [onAction, row]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
          open && "border-diagnostics-primary"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
        Más
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          role="menu"
        >
          {items.map((item) => {
            const disabled = Boolean(item.disabled);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={menuItemClasses(disabled, item.tone)}
                role="menuitem"
                disabled={disabled}
              >
                <div className="flex-1">
                  <div>{item.label}</div>
                  {item.description && <div className="text-xs font-medium text-slate-500">{item.description}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

