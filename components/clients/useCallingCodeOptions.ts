"use client";

import { useEffect, useMemo, useState } from "react";
import { actionListCallingCodeOptions } from "@/app/admin/clientes/actions";
import { type CallingCodeOption } from "@/lib/clients/callingCodeOptions";

export type CallingCodeOptionItem = CallingCodeOption & {
  label: string;
};

const CALLING_CODE_CACHE_TTL_MS = 5 * 60 * 1000;
const callingCodeCache = new Map<string, { expiresAt: number; items: CallingCodeOptionItem[] }>();
const callingCodeInFlight = new Map<string, Promise<CallingCodeOptionItem[]>>();

function buildCacheKey(input?: { includeInactive?: boolean; limit?: number }) {
  return `${input?.includeInactive ? "1" : "0"}:${input?.limit ?? ""}`;
}

async function fetchCallingCodeOptions(input?: {
  includeInactive?: boolean;
  limit?: number;
}) {
  const result = await actionListCallingCodeOptions({
    includeInactive: input?.includeInactive,
    limit: input?.limit
  });
  return (result.items as CallingCodeOptionItem[]) ?? [];
}

export function useCallingCodeOptions(input?: {
  includeInactive?: boolean;
  limit?: number;
}) {
  const includeInactive = input?.includeInactive;
  const limit = input?.limit;
  const [options, setOptions] = useState<CallingCodeOptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const cacheKey = buildCacheKey({ includeInactive, limit });
    const cached = callingCodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setOptions(cached.items);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        let request = callingCodeInFlight.get(cacheKey);
        if (!request) {
          request = fetchCallingCodeOptions({ includeInactive, limit });
          callingCodeInFlight.set(cacheKey, request);
        }
        const result = await request;
        callingCodeInFlight.delete(cacheKey);
        if (cancelled) return;
        callingCodeCache.set(cacheKey, {
          expiresAt: Date.now() + CALLING_CODE_CACHE_TTL_MS,
          items: result
        });
        setOptions(result);
      } catch (err) {
        callingCodeInFlight.delete(cacheKey);
        if (cancelled) return;
        setOptions([]);
        setError((err as Error)?.message || "No se pudo cargar catálogo de países.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [includeInactive, limit]);

  const byIso2 = useMemo(() => {
    return new Map(options.map((row) => [row.iso2.toUpperCase(), row]));
  }, [options]);

  return {
    options,
    loading,
    error,
    byIso2
  };
}
