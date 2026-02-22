"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type MedicalViewScope = "mine" | "all" | "doctor";

export type MedicalViewState = {
  scope: MedicalViewScope;
  doctorId: string | null;
};

type MedicalViewContextValue = MedicalViewState & {
  setView: (next: MedicalViewState) => void;
};

const MedicalViewContext = createContext<MedicalViewContextValue | null>(null);

export function MedicalViewProvider({
  initial,
  children
}: {
  initial: MedicalViewState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MedicalViewState>(initial);

  const value = useMemo<MedicalViewContextValue>(
    () => ({
      ...state,
      setView: setState
    }),
    [state]
  );

  return <MedicalViewContext.Provider value={value}>{children}</MedicalViewContext.Provider>;
}

export function useMedicalView() {
  const ctx = useContext(MedicalViewContext);
  if (!ctx) throw new Error("useMedicalView must be used within <MedicalViewProvider />");
  return ctx;
}

