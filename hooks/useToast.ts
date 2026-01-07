"use client";

import { useCallback, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  message: string;
  variant: ToastVariant;
};

export function useToast(timeoutMs = 4200) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), timeoutMs);
    },
    [dismiss, timeoutMs]
  );

  return { toasts, showToast, dismiss };
}
