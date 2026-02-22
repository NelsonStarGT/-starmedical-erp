'use client';

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  label: string;
  value: string;
  placeholder?: string;
  submitLabel?: string;
  clearLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onChange: (next: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onClear?: () => void;
};

export default function UrlInputModal({
  open,
  title,
  label,
  value,
  placeholder,
  submitLabel = "Guardar",
  clearLabel = "Limpiar",
  cancelLabel = "Cancelar",
  busy = false,
  error,
  onChange,
  onClose,
  onSubmit,
  onClear
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter") onSubmit();
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, onClose, onSubmit]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]" onClick={onClose} aria-label="Cerrar modal" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#d6e7f5] bg-white shadow-xl">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">StarMedical</p>
          <h3 className="text-sm font-semibold text-[#0f2943]">{title}</h3>
        </div>

        <div className="space-y-2 px-4 py-4">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</span>
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-[#0f2943] outline-none ring-0 transition focus:border-[#4aa59c] focus:shadow-[0_0_0_3px_rgba(74,165,156,0.18)]"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-lg border border-[#2e75ba] bg-[#2e75ba] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

