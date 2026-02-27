"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import CountryPicker from "@/components/clients/CountryPicker";
import {
  CLIENTS_COUNTRY_FILTER_ALL,
  shouldShowClientsCountryFilterSelector
} from "@/lib/clients/operatingCountryContext";
import { cn } from "@/lib/utils";

type CountryApiItem = {
  id: string;
  code: string;
  iso3?: string | null;
  name: string;
  isActive: boolean;
  isAllOption?: boolean;
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

export default function CbcCountryFilterBar({
  initialCountryId,
  tenantId
}: {
  initialCountryId: string | null;
  tenantId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const showBar = shouldShowClientsCountryFilterSelector(pathname);
  const tenantIdStable = tenantId ?? "";
  const [countries, setCountries] = useState<CountryApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryId, setCountryId] = useState(initialCountryId ?? CLIENTS_COUNTRY_FILTER_ALL);

  useEffect(() => {
    setCountryId(initialCountryId ?? CLIENTS_COUNTRY_FILTER_ALL);
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
        setCountries([
          {
            id: CLIENTS_COUNTRY_FILTER_ALL,
            code: "ALL",
            iso3: null,
            name: "Todos los países",
            isActive: true,
            isAllOption: true
          },
          ...items
        ]);
        if (items.length) {
          setCountryId((previous) => {
            if (previous) return previous;
            const preferred = items.find((item) => item.id === initialCountryId)
              ?? items.find((item) => item.code.toUpperCase() === "GT")
              ?? { id: CLIENTS_COUNTRY_FILTER_ALL };
            return preferred.id;
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
    if (isSaving) return "Aplicando filtro...";
    if (loading) return "Cargando países...";
    if (!countries.length) return "Sin países";
    return null;
  }, [countries.length, error, isSaving, loading]);

  async function persistCountryFilter(nextCountryId: string) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/clientes/operating-country", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryId: nextCountryId })
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse<CountryApiItem>;
      if (!response.ok || payload.ok === false) {
        throw new Error(parseErrorMessage(payload, "No se pudo actualizar el filtro de país."));
      }
      setCountryId(nextCountryId);
      setError(null);
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "No se pudo actualizar el filtro de país.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!showBar) return null;

  return (
    <section className="rounded-xl border border-[#dce7f5] bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
          <span>Filtro por país</span>
          <span
            title="Filtra clientes por país de ubicación principal. Cambiar este selector refresca la vista actual."
            className="inline-flex text-slate-500"
          >
            <CircleHelp size={14} />
          </span>
        </div>
        <CountryPicker
          label="Filtro por país"
          value={countryId}
          options={countries}
          popover
          hideLabel
          className="w-full min-w-[220px] md:w-[320px]"
          disabled={loading || isSaving || !countries.length}
          onChange={(nextCountryId) => {
            const selected = countries.find((item) => item.id === nextCountryId);
            if (!selected) return;
            void persistCountryFilter(selected.id);
          }}
        />
        {helper ? (
          <span className={cn("text-xs", error ? "text-rose-700" : "text-slate-500")}>{helper}</span>
        ) : null}
      </div>
    </section>
  );
}
