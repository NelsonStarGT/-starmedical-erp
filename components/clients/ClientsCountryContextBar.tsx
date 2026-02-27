"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CountryPicker from "@/components/clients/CountryPicker";
import { shouldShowClientsOperatingCountrySelector } from "@/lib/clients/operatingCountryContext";

type CountryApiItem = {
  id: string;
  code: string;
  iso3?: string | null;
  name: string;
  isActive: boolean;
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  items?: T[];
  error?: string;
};

function parseErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { error?: unknown }).error;
  if (typeof message === "string" && message.trim().length > 0) return message.trim();
  return fallback;
}

export default function ClientsCountryContextBar({
  initialCountryId,
  tenantId
}: {
  initialCountryId: string | null;
  tenantId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const showBar = shouldShowClientsOperatingCountrySelector(pathname);
  const tenantIdStable = tenantId ?? "";
  const [countries, setCountries] = useState<CountryApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryId, setCountryId] = useState(initialCountryId ?? "");

  useEffect(() => {
    setCountryId(initialCountryId ?? "");
  }, [initialCountryId]);

  useEffect(() => {
    let cancelled = false;
    if (!showBar) return () => undefined;

    async function loadCountries() {
      setLoading(true);
      try {
        const res = await fetch("/api/geo/countries?active=1&limit=350", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiResponse<CountryApiItem>;
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "No se pudo cargar el catálogo de países.");
        }

        if (cancelled) return;
        const items = Array.isArray(json.items) ? json.items : [];
        setCountries(items);
        if (items.length) {
          setCountryId((previous) => {
            if (previous) return previous;
            const preferred = items.find((item) => item.id === initialCountryId)
              ?? items.find((item) => item.code.toUpperCase() === "GT")
              ?? items[0];
            return preferred?.id ?? previous;
          });
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setCountries([]);
        setError((err as Error)?.message || "No se pudo cargar países.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCountries();
    return () => {
      cancelled = true;
    };
  }, [showBar, initialCountryId, tenantIdStable]);

  const helper = useMemo(() => {
    if (error) return error;
    if (isSaving) return "Aplicando país operativo...";
    if (loading) return "Cargando países...";
    if (!countries.length) return "No hay países disponibles.";
    return "País operativo del módulo Clientes (afecta prefijo y labels de ubicación por defecto).";
  }, [countries.length, error, isSaving, loading]);

  async function persistOperatingCountry(nextCountryId: string) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/clientes/operating-country", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryId: nextCountryId })
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<CountryApiItem>;
      if (!response.ok || payload.ok === false) {
        throw new Error(parseErrorMessage(payload, "No se pudo actualizar el país operativo."));
      }
      setCountryId(nextCountryId);
      setError(null);
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar el país operativo.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!showBar) return null;

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(240px,320px)_1fr] md:items-end">
        <CountryPicker
          label="País operativo"
          value={countryId}
          options={countries}
          disabled={loading || isSaving || !countries.length}
          onChange={(countryId) => {
            const selected = countries.find((item) => item.id === countryId);
            if (!selected) return;
            void persistOperatingCountry(selected.id);
          }}
        />
        <p className="text-xs text-slate-500">{helper}</p>
      </div>
    </section>
  );
}
