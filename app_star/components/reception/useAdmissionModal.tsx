"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AdmissionModalSource = "header" | "worklist" | "appointments" | "unknown";

type AdmissionState = {
  open: boolean;
  initialQuery: string;
  source: AdmissionModalSource;
};

type OpenOptions = {
  query?: string;
  source?: AdmissionModalSource;
};

type AdmissionModalContextValue = {
  state: AdmissionState;
  openAdmission: (options?: OpenOptions) => void;
  closeAdmission: () => void;
};

const AdmissionModalContext = createContext<AdmissionModalContextValue | null>(null);

const DEFAULT_STATE: AdmissionState = {
  open: false,
  initialQuery: "",
  source: "unknown"
};

export function AdmissionModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdmissionState>(DEFAULT_STATE);

  const openAdmission = useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      initialQuery: options?.query?.trim() ?? "",
      source: options?.source ?? "unknown"
    });
  }, []);

  const closeAdmission = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo<AdmissionModalContextValue>(
    () => ({ state, openAdmission, closeAdmission }),
    [closeAdmission, openAdmission, state]
  );

  return <AdmissionModalContext.Provider value={value}>{children}</AdmissionModalContext.Provider>;
}

export function useAdmissionModal() {
  const ctx = useContext(AdmissionModalContext);
  if (!ctx) {
    throw new Error("useAdmissionModal debe usarse dentro de AdmissionModalProvider.");
  }
  return ctx;
}
