"use client";

import { useCallback, useState } from "react";

export type ToastVariant = "success" | "error" | "info";
export type ToastAction = { label: string; href?: string; onClick?: () => void };

export type ToastMessage = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  tone: ToastVariant;
  actions?: ToastAction[];
  open: boolean;
};

type ShowToastObjectInput = {
  tone?: ToastVariant;
  variant?: ToastVariant;
  title: string;
  message?: string;
  actions?: ToastAction[];
  durationMs?: number;
};

type ShowToastInput = string | ShowToastObjectInput;

const EXIT_ANIMATION_MS = 220;

export function useToast(timeoutMs = 4200) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    let shouldRemove = false;

    setToasts((prev) =>
      prev.map((toast) => {
        if (toast.id !== id) return toast;
        if (!toast.open) return toast;
        shouldRemove = true;
        return { ...toast, open: false };
      })
    );

    if (shouldRemove) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, EXIT_ANIMATION_MS);
    } else {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }
  }, []);

  const showToast = useCallback(
    (input: ShowToastInput, variantArg: ToastVariant = "info", actionsArg?: ToastAction[], durationArg?: number) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const parsed =
        typeof input === "string"
          ? {
              tone: variantArg,
              title: input,
              message: undefined,
              actions: actionsArg,
              durationMs: durationArg
            }
          : {
              tone: input.tone ?? input.variant ?? variantArg,
              title: input.title,
              message: input.message,
              actions: input.actions ?? actionsArg,
              durationMs: input.durationMs ?? durationArg
            };

      const durationMs = Math.max(600, parsed.durationMs ?? timeoutMs);
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: parsed.title,
          message: parsed.message,
          tone: parsed.tone,
          variant: parsed.tone,
          actions: parsed.actions,
          open: true
        }
      ]);
      window.setTimeout(() => dismiss(id), durationMs);
      return id;
    },
    [dismiss, timeoutMs]
  );

  return { toasts, showToast, dismiss };
}
