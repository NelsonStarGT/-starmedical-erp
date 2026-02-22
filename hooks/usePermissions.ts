'use client';

import { useCallback, useEffect, useState } from "react";

type PermissionState = {
  permissions: string[];
  loading: boolean;
};

export function usePermissions() {
  const [{ permissions, loading }, setState] = useState<PermissionState>({ permissions: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const payload = res.ok ? await res.json() : { permissions: [] };
        if (!cancelled) {
          setState({ permissions: (payload.permissions || []).map((p: string) => p.toUpperCase()), loading: false });
        }
      } catch {
        if (!cancelled) setState({ permissions: [], loading: false });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPermission = useCallback((key: string) => permissions.includes(key.toUpperCase()), [permissions]);

  return { permissions, hasPermission, loading };
}
