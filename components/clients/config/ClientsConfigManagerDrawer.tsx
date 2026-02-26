"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function ClientsConfigManagerDrawer({
  open,
  title,
  subtitle,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-900/45" aria-label="Cerrar panel" />

      <aside
        className={cn(
          "absolute inset-x-0 bottom-0 max-h-[92vh] rounded-t-xl border border-slate-200 bg-white shadow-md",
          "md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[min(96vw,1120px)] md:max-h-none md:rounded-none md:border-y-0 md:border-r-0 md:border-l"
        )}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">Configuración</p>
              <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
              {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              Cerrar
            </button>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4">{children}</div>
        </div>
      </aside>
    </div>
  );
}
