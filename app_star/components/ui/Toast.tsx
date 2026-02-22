"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ToastMessage } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Props = {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  placement?: "top-right" | "bottom-right" | "adaptive";
};

export type ToastTone = "success" | "error" | "info";

function placementClassName(placement: Props["placement"]) {
  if (placement === "top-right") return "top-5 right-5 items-end";
  if (placement === "bottom-right") return "bottom-4 right-4 items-end md:right-6";
  return "bottom-4 right-4 md:right-6 md:top-6 md:items-end";
}

export function Toast({
  open,
  tone,
  title,
  message,
  onClose,
  actions
}: {
  open: boolean;
  tone: ToastTone;
  title: string;
  message?: string;
  onClose: () => void;
  actions?: ToastMessage["actions"];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setVisible(open));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div
      className={cn(
        "pointer-events-auto w-full min-w-[280px] max-w-sm rounded-xl border px-4 py-3 shadow-md backdrop-blur transition-all duration-200 ease-out",
        tone === "success" && "border-[#4aa59c]/35 bg-[#ecf8f6] text-[#1c5952]",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-900",
        tone === "info" && "border-[#2e75ba]/35 bg-[#eef5ff] text-[#1f4f7d]",
        visible ? "translate-y-0 translate-x-0 opacity-100" : "-translate-y-1 translate-x-3 opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {message ? <p className="mt-1 text-xs font-medium opacity-90">{message}</p> : null}
          {actions && actions.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              {actions.map((action) =>
                action.href ? (
                  <Link key={action.label} href={action.href} className="text-[#2e75ba] hover:underline">
                    {action.label}
                  </Link>
                ) : (
                  <button key={action.label} type="button" className="text-[#2e75ba] hover:underline" onClick={action.onClick}>
                    {action.label}
                  </button>
                )
              )}
            </div>
          ) : null}
        </div>
        <button type="button" className="text-xs font-semibold opacity-70 hover:opacity-100" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss, placement = "adaptive" }: Props) {
  if (!toasts.length) return null;
  return (
    <div className={cn("pointer-events-none fixed z-50 flex flex-col gap-2", placementClassName(placement))}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open={toast.open}
          tone={toast.tone ?? toast.variant}
          title={toast.title}
          message={toast.message}
          actions={toast.actions}
          onClose={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
