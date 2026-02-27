"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import CountryPicker from "@/components/clients/CountryPicker";
import { useClientsCountryContext } from "@/components/clients/useClientsCountryContext";

type CountryApiItem = {
  id: string;
  code: string;
  iso3?: string | null;
  name: string;
  isActive: boolean;
};

type ApiResponse<T> = {
  ok?: boolean;
  items?: T[];
  error?: string;
};

export default function ClientsCountryContextBar() {
  const pathname = usePathname();
  const normalizedPath = pathname ?? "";
  const detailSegment = normalizedPath.split("/").filter(Boolean)[2] ?? "";
  const isClientDetailRoute =
    normalizedPath.startsWith("/admin/clientes/") &&
    !["dashboard", "lista", "personas", "empresas", "instituciones", "aseguradoras", "configuracion", "reportes", "buscar"].includes(detailSegment) &&
    !normalizedPath.endsWith("/nuevo");
  const hideForCreate = Boolean(normalizedPath.includes("/personas/nuevo") || normalizedPath.endsWith("/nuevo"));
  const hideBar = hideForCreate || isClientDetailRoute;
  const [countries, setCountries] = useState<CountryApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { country, setCountry } = useClientsCountryContext();

  useEffect(() => {
    let cancelled = false;
    if (hideBar) return () => undefined;

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

        if (!country?.countryId && items.length) {
          const preferred = items.find((item) => item.code.toUpperCase() === "GT") ?? items[0];
          setCountry({ countryId: preferred.id, code: preferred.code, name: preferred.name });
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
  }, [country?.countryId, hideBar, setCountry]);

  const currentCountryId = country?.countryId || "";
  const helper = useMemo(() => {
    if (error) return error;
    if (loading) return "Cargando países...";
    if (!countries.length) return "No hay países disponibles.";
    return "País operativo del módulo Clientes (afecta prefijo y labels de ubicación por defecto).";
  }, [countries.length, error, loading]);

  // En formularios de alta (".../nuevo") el contexto visual duplica país de identidad/residencia.
  if (hideBar) return null;

  return (
    <section className="rounded-2xl border border-[#dce7f5] bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(240px,320px)_1fr] md:items-end">
        <CountryPicker
          label="País operativo"
          value={currentCountryId}
          options={countries}
          disabled={loading || !countries.length}
          onChange={(countryId) => {
            const selected = countries.find((item) => item.id === countryId);
            if (!selected) return;
            setCountry({ countryId: selected.id, code: selected.code, name: selected.name });
          }}
        />
        <p className="text-xs text-slate-500">{helper}</p>
      </div>
    </section>
  );
}
