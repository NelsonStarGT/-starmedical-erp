"use client";

import { useCallback, useState } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastAction = {
  label: string;
  href?: string;
};

export type ToastMessage = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  actions?: ToastAction[];
};

export type ToastPayload = {
  tone?: ToastVariant;
  title?: string;
  message?: string;
  durationMs?: number;
  actions?: ToastAction[];
};

export function useToast(timeoutMs = 4200) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: string | ToastPayload, variant: ToastVariant = "info", actions?: ToastAction[]) => {
      const payload = typeof input === "string" ? { message: input, tone: variant, actions } : input;
      const tone = payload.tone ?? variant;
      const title = payload.title?.trim() || undefined;
      const message = (payload.message?.trim() || title || "").trim();
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, title, message, variant: tone, actions: payload.actions }]);
      window.setTimeout(() => dismiss(id), payload.durationMs ?? timeoutMs);
      return id;
    },
    [dismiss, timeoutMs]
  );

  return { toasts, showToast, dismiss };
}
