"use client";

import { ToastMessage } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type ToastPlacement = "bottom-right" | "top-right" | "top-left" | "bottom-left";

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  placement?: ToastPlacement;
};

const placementClass: Record<ToastPlacement, string> = {
  "bottom-right": "bottom-4 right-4 md:right-6 md:bottom-6 md:items-end",
  "top-right": "top-4 right-4 md:right-6 md:top-6 md:items-end",
  "top-left": "top-4 left-4 md:left-6 md:top-6",
  "bottom-left": "bottom-4 left-4 md:left-6 md:bottom-6"
};

export function ToastContainer({ toasts, onDismiss, placement = "bottom-right" }: Props) {
  if (!toasts.length) return null;
  return (
    <div className={cn("pointer-events-none fixed z-50 flex flex-col gap-2", placementClass[placement])}>
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
          <div className="flex-1 space-y-1">
            {toast.title ? <p className="text-sm font-semibold leading-tight">{toast.title}</p> : null}
            {toast.message ? <p className="text-xs leading-relaxed">{toast.message}</p> : null}
            {toast.actions?.length ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {toast.actions.map((action, index) =>
                  action.href ? (
                    <a
                      key={`${toast.id}-action-${index}`}
                      href={action.href}
                      className="rounded-md border border-current/20 px-2 py-1 text-[11px] font-semibold hover:bg-white/40"
                    >
                      {action.label}
                    </a>
                  ) : null
                )}
              </div>
            ) : null}
          </div>
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
