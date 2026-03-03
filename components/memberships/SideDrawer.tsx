"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type SideDrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function SideDrawer({ open, title, subtitle, onClose, children }: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Cerrar detalle" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 h-full w-full max-w-[520px] min-w-[360px] border-l border-slate-200 bg-white shadow-md"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#2e75ba]">{title}</h2>
              {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-[#4aadf5] hover:text-[#2e75ba]"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4">{children}</div>
        </div>
      </aside>
    </div>
  );
}
