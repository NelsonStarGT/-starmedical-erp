"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type DensityMode = "auto" | "compact" | "comfortable";
type DensityResolved = "compact" | "comfortable";

type DensityContextValue = {
  mode: DensityMode;
  resolved: DensityResolved;
  setMode: (mode: DensityMode) => void;
};

const STORAGE_KEY = "star-erp-density-mode";
const MOBILE_BREAKPOINT = 1100;

const DensityContext = createContext<DensityContextValue>({
  mode: "auto",
  resolved: "comfortable",
  setMode: () => undefined
});

function toResolved(mode: DensityMode, viewportWidth: number): DensityResolved {
  if (mode === "compact") return "compact";
  if (mode === "comfortable") return "comfortable";
  return viewportWidth <= MOBILE_BREAKPOINT ? "compact" : "comfortable";
}

export function useDensity() {
  return useContext(DensityContext);
}

export default function DensityProvider({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [mode, setMode] = useState<DensityMode>("auto");
  const [viewportWidth, setViewportWidth] = useState(1280);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "compact" || stored === "comfortable" || stored === "auto") {
      setMode(stored);
    }

    const applyViewport = () => {
      setViewportWidth(window.innerWidth);
    };

    applyViewport();
    window.addEventListener("resize", applyViewport);
    return () => window.removeEventListener("resize", applyViewport);
  }, []);

  const resolved = useMemo(() => toResolved(mode, viewportWidth), [mode, viewportWidth]);

  const contextValue = useMemo<DensityContextValue>(
    () => ({
      mode,
      resolved,
      setMode: (nextMode) => {
        setMode(nextMode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextMode);
        }
      }
    }),
    [mode, resolved]
  );

  return (
    <DensityContext.Provider value={contextValue}>
      <div className={cn("erp-density", className)} data-density={resolved}>
        {children}
      </div>
    </DensityContext.Provider>
  );
}
