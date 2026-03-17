"use client";

import { useEffect, useMemo, useState } from "react";

type SessionUserSummary = {
  id: string;
  email: string;
  name?: string | null;
  roles: string[];
  permissions: string[];
  deniedPermissions: string[];
};

type SessionPayload = {
  id?: unknown;
  email?: unknown;
  name?: unknown;
  roles?: unknown;
  permissions?: unknown;
  deniedPermissions?: unknown;
};

export function useSessionUser() {
  const [user, setUser] = useState<SessionUserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) {
          setUser(null);
          return;
        }

        const payload = (await response.json().catch(() => null)) as SessionPayload | null;
        if (!payload || typeof payload !== "object") {
          setUser(null);
          return;
        }

        setUser({
          id: String(payload.id || ""),
          email: String(payload.email || ""),
          name: typeof payload.name === "string" ? payload.name : null,
          roles: Array.isArray(payload.roles) ? payload.roles.map((role: unknown) => String(role || "")) : [],
          permissions: Array.isArray(payload.permissions)
            ? payload.permissions.map((permission: unknown) => String(permission || ""))
            : [],
          deniedPermissions: Array.isArray(payload.deniedPermissions)
            ? payload.deniedPermissions.map((permission: unknown) => String(permission || ""))
            : []
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const normalizedRoles = useMemo(
    () => new Set((user?.roles || []).map((role) => role.trim().toUpperCase())),
    [user]
  );

  return {
    user,
    loading,
    isAdmin: normalizedRoles.has("ADMIN") || normalizedRoles.has("SUPER_ADMIN"),
    isSupervisor: normalizedRoles.has("SUPERVISOR")
  };
}
