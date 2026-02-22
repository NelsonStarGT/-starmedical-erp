"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { AgendaRow, MedicalPersona } from "./types";

type ActionItem = {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
};

function menuItemClasses(disabled: boolean, tone: ActionItem["tone"]) {
  return cn(
    "w-full text-left rounded-xl px-3 py-2 text-sm font-semibold transition flex items-start gap-3",
    disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
    tone === "danger" ? "text-rose-700" : "text-slate-800"
  );
}

export default function RowActionsMenu({
  row,
  persona,
  reviewed,
  onAction,
  onQuickHistory,
  onToggleReviewed
}: {
  row: AgendaRow;
  persona: MedicalPersona;
  reviewed: boolean;
  onAction: (actionKey: string, row: AgendaRow) => void;
  onQuickHistory: (row: AgendaRow) => void;
  onToggleReviewed: (row: AgendaRow) => void;
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
    const encounterId = row.encounter.id ?? row.id;

    if (persona === "READ_ONLY") {
      const readOnlyItems: ActionItem[] = [
        {
          key: "quick_sheet",
          label: "Ficha rápida",
          description: "Alergias · DX · resultados · notas",
          onSelect: () => onQuickHistory(row)
        },
        {
          key: "view_triage",
          label: "Ver triage",
          description: "Solo lectura",
          onSelect: () => onAction("view_triage", row)
        }
      ];

      if (row.diagnostic.resultsReady) {
        readOnlyItems.push({
          key: "view_results",
          label: "Ver resultados",
          description: "Abrir resultados del paciente",
          onSelect: () => onAction("view_results", row)
        });
      }

      return readOnlyItems;
    }

    const list: ActionItem[] = [
      {
        key: "enter_consult",
        label: "Entrar a consulta",
        description: "Abrir Encounter",
        href: `/modulo-medico/consultaM/${encodeURIComponent(encounterId)}`
      },
      {
        key: "quick_sheet",
        label: "Ficha rápida",
        description: "Alergias · DX · resultados · notas",
        onSelect: () => onQuickHistory(row)
      }
    ];

    if (row.diagnostic.resultsReady) {
      list.push({
        key: "view_results",
        label: "Ver resultados",
        description: "Abrir resultados del paciente",
        onSelect: () => onAction("view_results", row)
      });
    }

    list.push({
      key: "toggle_reviewed",
      label: reviewed ? "Quitar revisado" : "Marcar revisado",
      description: "Estado local del médico",
      onSelect: () => onToggleReviewed(row)
    });
    list.push({
      key: "copy_patient_id",
      label: "Copiar ID paciente",
      description: row.patient.id,
      onSelect: () => onAction("copy_patient_id", row)
    });

    if (persona === "ADMIN" || persona === "COORDINATION") {
      list.push({
        key: "change_priority",
        label: "Cambiar prioridad",
        description: "Alta · Media · Baja",
        onSelect: () => onAction("change_priority", row)
      });
      list.push({
        key: "reassign_doctor",
        label: "Reasignar",
        description: "Cambiar médico responsable",
        onSelect: () => onAction("reassign_doctor", row)
      });
    }

    return list;
  }, [onAction, onQuickHistory, onToggleReviewed, persona, reviewed, row]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50",
          open && "border-diagnostics-primary"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
        Acciones
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
          role="menu"
        >
          {items.map((item) => {
            const disabled = Boolean(item.disabled);
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={disabled ? "#" : item.href}
                  onClick={(e) => {
                    if (disabled) {
                      e.preventDefault();
                      return;
                    }
                    setOpen(false);
                  }}
                  className={menuItemClasses(disabled, item.tone)}
                  role="menuitem"
                >
                  <div className="flex-1">
                    <div>{item.label}</div>
                    {item.description && <div className="text-xs font-medium text-slate-500">{item.description}</div>}
                  </div>
                </Link>
              );
            }

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
