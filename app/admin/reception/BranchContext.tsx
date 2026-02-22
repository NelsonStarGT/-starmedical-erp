"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actionSetReceptionActiveBranch } from "@/app/admin/reception/actions";

const RECEPTION_ACTIVE_BRANCH_SESSION_KEY = "sm_reception_active_branch_tab";

export type ReceptionBranchOption = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

type BranchContextValue = {
  activeBranchId: string | null;
  branches: ReceptionBranchOption[];
  setActiveBranchId: (branchId: string) => void;
  isUpdating: boolean;
  error: string | null;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function useReceptionBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useReceptionBranch debe usarse dentro de <ReceptionBranchProvider />");
  }
  return ctx;
}

export function ReceptionBranchProvider({
  initialActiveBranchId,
  branches,
  children
}: {
  initialActiveBranchId: string | null;
  branches: ReceptionBranchOption[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(initialActiveBranchId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.sessionStorage.getItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY);
      if (!stored) return;
      const isValid = branches.some((branch) => branch.id === stored);
      if (!isValid) {
        window.sessionStorage.removeItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY);
        return;
      }
      setActiveBranchIdState(stored);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (activeBranchId) {
        window.sessionStorage.setItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY, activeBranchId);
      }
    } catch {
      // ignore
    }
  }, [activeBranchId]);

  const setActiveBranchId = useCallback((branchId: string) => {
    const next = branchId?.trim();
    if (!next) {
      setError("Sede requerida.");
      return;
    }
    if (isPending) return;
    if (next === activeBranchId) return;

    const previous = activeBranchId;

    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY, next);
      } catch {
        // ignore
      }
    }

    setActiveBranchIdState(next);
    setError(null);

    startTransition(async () => {
      try {
        await actionSetReceptionActiveBranch(next);
        router.refresh();
      } catch (err) {
        if (typeof window !== "undefined") {
          try {
            if (previous) {
              window.sessionStorage.setItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY, previous);
            } else {
              window.sessionStorage.removeItem(RECEPTION_ACTIVE_BRANCH_SESSION_KEY);
            }
          } catch {
            // ignore
          }
        }
        setActiveBranchIdState(previous ?? null);
        setError((err as Error)?.message || "No se pudo cambiar la sede.");
      }
    });
  }, [activeBranchId, isPending, router]);

  useEffect(() => {
    if (activeBranchId) return;
    if (branches.length !== 1) return;
    const onlyBranchId = branches[0]?.id;
    if (!onlyBranchId) return;
    setActiveBranchId(onlyBranchId);
  }, [activeBranchId, branches, setActiveBranchId]);

  const value = useMemo<BranchContextValue>(
    () => ({
      activeBranchId,
      branches,
      setActiveBranchId,
      isUpdating: isPending,
      error
    }),
    [activeBranchId, branches, error, isPending, setActiveBranchId]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
