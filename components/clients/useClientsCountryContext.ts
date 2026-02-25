"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ClientsCountryContextValue = {
  countryId: string;
  code: string;
  name: string;
};

const STORAGE_KEY = "starmedical.clients.country-context.v1";

function readStoredCountry(): ClientsCountryContextValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ClientsCountryContextValue>;
    if (!parsed || typeof parsed !== "object") return null;
    const countryId = typeof parsed.countryId === "string" ? parsed.countryId : "";
    const code = typeof parsed.code === "string" ? parsed.code : "";
    const name = typeof parsed.name === "string" ? parsed.name : "";
    if (!countryId) return null;
    return { countryId, code, name };
  } catch {
    return null;
  }
}

function writeStoredCountry(value: ClientsCountryContextValue | null) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function useClientsCountryContext() {
  const [country, setCountryState] = useState<ClientsCountryContextValue | null>(null);

  useEffect(() => {
    setCountryState(readStoredCountry());

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setCountryState(readStoredCountry());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCountry = useCallback((next: ClientsCountryContextValue | null) => {
    writeStoredCountry(next);
    setCountryState(next);
  }, []);

  const clearCountry = useCallback(() => {
    writeStoredCountry(null);
    setCountryState(null);
  }, []);

  return useMemo(
    () => ({
      country,
      setCountry,
      clearCountry
    }),
    [clearCountry, country, setCountry]
  );
}
