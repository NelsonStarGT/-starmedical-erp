"use client";

import { useCallback } from "react";
import { getConfigAuthCircuitState } from "@/lib/config-central/clientAuth";
import { useToast, type ToastAction, type ToastPayload, type ToastVariant } from "@/hooks/useToast";

export function useConfigToast(timeoutMs = 4200) {
  const { toasts, dismiss, showToast: showBaseToast } = useToast(timeoutMs);

  const showToast = useCallback(
    (input: string | ToastPayload, variant: ToastVariant = "info", actions?: ToastAction[]) => {
      const authState = getConfigAuthCircuitState();
      if (authState.status !== "ok") {
        const tone = typeof input === "string" ? variant : input.tone ?? variant;
        if (tone === "error") {
          return "";
        }
      }
      return showBaseToast(input, variant, actions);
    },
    [showBaseToast]
  );

  return { toasts, dismiss, showToast };
}
