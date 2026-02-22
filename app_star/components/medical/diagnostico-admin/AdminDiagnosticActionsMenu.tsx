"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { AdminDiagnosticRow } from "./types";

type ActionItem = {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
  href?: string;
  onSelect?: () => void;
};

function menuItemClasses(disabled: boolean, tone: ActionItem["tone"]) {
  return cn(
    "w-full text-left rounded-xl px-3 py-2 text-sm font-semibold transition flex items-start gap-3",
    disabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
    tone === "danger" ? "text-rose-700" : "text-slate-800"
  );
}

export default function AdminDiagnosticActionsMenu({
  row,
  reviewed,
  onToggleReviewed,
  onAction
}: {
  row: AdminDiagnosticRow;
  reviewed: boolean;
  onToggleReviewed: (row: AdminDiagnosticRow) => void;
  onAction: (actionKey: string, row: AdminDiagnosticRow) => void;
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
    return [
      {
        key: "view_results",
        label: "Ver resultados",
        description: "Abrir resultados del paciente",
        href: "#",
        onSelect: () => onAction("view_results", row)
      },
      {
        key: "toggle_reviewed",
        label: reviewed ? "Quitar revisado" : "Marcar revisado",
        description: "Estado local del médico",
        onSelect: () => onToggleReviewed(row)
      },
      {
        key: "copy_order_id",
        label: "Copiar ID orden",
        description: row.orderId,
        onSelect: () => onAction("copy_order_id", row)
      }
    ];
  }, [onAction, onToggleReviewed, reviewed, row]);

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
        Acciones
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl" role="menu">
          {items.map((item) => {
            const disabled = Boolean(item.disabled);
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (disabled) return;
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={menuItemClasses(disabled, item.tone)}
                  role="menuitem"
                >
                  <div className="flex-1">
                    <div>{item.label}</div>
                    {item.description ? <div className="text-xs font-medium text-slate-500">{item.description}</div> : null}
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
                  {item.description ? <div className="text-xs font-medium text-slate-500">{item.description}</div> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
