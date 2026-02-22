"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  description?: string;
  fields?: ReactNode;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
};

export function ReasonModal({
  open,
  title,
  subtitle,
  description,
  fields,
  placeholder = "Escribe el motivo…",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  required = true,
  isPending,
  onConfirm,
  onClose
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
  }, [open]);

  const trimmed = useMemo(() => reason.trim(), [reason]);
  const canConfirm = required ? Boolean(trimmed) : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      className="max-w-xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending || !canConfirm}
            onClick={() => {
              if (required && !trimmed) {
                setError("Motivo requerido.");
                return;
              }
              onConfirm(trimmed);
            }}
            className={cn(
              "rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f988f] disabled:cursor-not-allowed disabled:opacity-60",
              !canConfirm && "hover:bg-[#4aa59c]"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {description && <p className="text-sm text-slate-600">{description}</p>}

      <div className="mt-3 space-y-3">
        {fields ? <div className="space-y-2">{fields}</div> : null}
        <label className="text-xs font-semibold text-slate-600">
          Motivo {required ? <span className="text-rose-600">*</span> : <span className="text-slate-400">(opcional)</span>}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="min-h-[110px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
        />
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}
