"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTenantDateTimeConfigDefaults,
  normalizeTenantDateTimeConfig,
  type TenantDateTimeConfig,
  type TenantDateTimeConfigSnapshot
} from "@/lib/datetime/types";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
};

const FALLBACK_SNAPSHOT = buildTenantDateTimeConfigDefaults("global");

let cachedSnapshot: TenantDateTimeConfigSnapshot | null = null;
let pendingLoad: Promise<TenantDateTimeConfigSnapshot> | null = null;

function normalizeSnapshot(value: Partial<TenantDateTimeConfigSnapshot> | null | undefined): TenantDateTimeConfigSnapshot {
  const config = normalizeTenantDateTimeConfig(value || undefined);
  return {
    tenantId: String(value?.tenantId || "global"),
    ...config,
    updatedByUserId: value?.updatedByUserId ?? null,
    updatedAt: value?.updatedAt ?? null,
    source: value?.source === "db" ? "db" : "defaults"
  };
}

async function fetchSnapshotFromApi() {
  try {
    const response = await fetch("/api/datetime/config", { cache: "no-store", credentials: "include" });
    if (!response.ok) return FALLBACK_SNAPSHOT;
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<TenantDateTimeConfigSnapshot>;
    if (payload.ok === false || !payload.data) return FALLBACK_SNAPSHOT;
    return normalizeSnapshot(payload.data);
  } catch {
    return FALLBACK_SNAPSHOT;
  }
}

export function clearTenantDateTimeClientCache() {
  cachedSnapshot = null;
  pendingLoad = null;
}

export function useTenantDateTimeConfig() {
  const [snapshot, setSnapshot] = useState<TenantDateTimeConfigSnapshot>(() => cachedSnapshot || FALLBACK_SNAPSHOT);

  useEffect(() => {
    if (cachedSnapshot) {
      setSnapshot(cachedSnapshot);
      return;
    }

    let active = true;
    const load = pendingLoad || fetchSnapshotFromApi();
    pendingLoad = load;

    load
      .then((resolved) => {
        cachedSnapshot = resolved;
        if (active) setSnapshot(resolved);
      })
      .finally(() => {
        if (pendingLoad === load) pendingLoad = null;
      });

    return () => {
      active = false;
    };
  }, []);

  return snapshot;
}

export function useTenantDateTimeConfigValue(): TenantDateTimeConfig {
  const snapshot = useTenantDateTimeConfig();
  return useMemo(
    () => ({
      dateFormat: snapshot.dateFormat,
      timeFormat: snapshot.timeFormat,
      timezone: snapshot.timezone,
      weekStartsOn: snapshot.weekStartsOn
    }),
    [snapshot.dateFormat, snapshot.timeFormat, snapshot.timezone, snapshot.weekStartsOn]
  );
}
