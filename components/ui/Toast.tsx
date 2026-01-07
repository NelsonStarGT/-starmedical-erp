"use client";

import { ToastMessage } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2 md:right-6 md:top-6 md:items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex w-full min-w-[260px] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-soft backdrop-blur",
            toast.variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
            toast.variant === "error" && "border-rose-200 bg-rose-50 text-rose-900",
            toast.variant === "info" && "border-slate-200 bg-white/90 text-slate-900"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex-1 text-sm font-semibold">{toast.message}</div>
          <button
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
