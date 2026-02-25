"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveDensityModePreference, type DensityMode } from "@/lib/ui/persistence";

type DensityContextValue = {
  mode: DensityMode;
  setMode: (mode: DensityMode) => void;
};

const STORAGE_KEY = "star-erp-density-mode";

const DensityContext = createContext<DensityContextValue>({
  mode: "normal",
  setMode: () => undefined
});

export function useDensity() {
  return useContext(DensityContext);
}

export default function DensityProvider({
  children,
  className,
  defaultMode = "normal"
}: {
  children: React.ReactNode;
  className?: string;
  defaultMode?: DensityMode;
}) {
  const [mode, setMode] = useState<DensityMode>(defaultMode);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    setMode(
      resolveDensityModePreference({
        storedValue: stored,
        defaultMode
      })
    );
  }, [defaultMode]);

  const contextValue = useMemo<DensityContextValue>(
    () => ({
      mode,
      setMode: (nextMode) => {
        setMode(nextMode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextMode);
        }
      }
    }),
    [mode]
  );

  return (
    <DensityContext.Provider value={contextValue}>
      <div className={cn("erp-density", className)} data-density={mode}>
        {children}
      </div>
    </DensityContext.Provider>
  );
}
