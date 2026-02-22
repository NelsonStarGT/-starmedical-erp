"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import {
  actionListGeoAdmin1,
  actionListGeoAdmin2,
  actionListGeoAdmin3,
  actionSearchGeoCountries,
  actionSetGeoNodeActive
} from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

type GeoItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type CountryItem = GeoItem & { iso3?: string | null };

export default function GeoCatalogManager() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [admin1, setAdmin1] = useState<GeoItem[]>([]);
  const [admin2, setAdmin2] = useState<GeoItem[]>([]);
  const [admin3, setAdmin3] = useState<GeoItem[]>([]);

  const [countryFilter, setCountryFilter] = useState("");
  const [admin1Filter, setAdmin1Filter] = useState("");
  const [admin2Filter, setAdmin2Filter] = useState("");
  const [admin3Filter, setAdmin3Filter] = useState("");

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedAdmin1Id, setSelectedAdmin1Id] = useState("");
  const [selectedAdmin2Id, setSelectedAdmin2Id] = useState("");

  const loadCountries = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await actionSearchGeoCountries({ q: "", onlyActive: false, limit: 350 });
        setCountries(result.items);
        if (!selectedCountryId && result.items.length) {
          const gt = result.items.find((item: CountryItem) => item.code === "GT");
          setSelectedCountryId(gt?.id ?? result.items[0].id);
        }
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo cargar países.");
      }
    });
  }, [selectedCountryId]);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  useEffect(() => {
    if (!selectedCountryId) {
      setAdmin1([]);
      setSelectedAdmin1Id("");
      return;
    }
    startTransition(async () => {
      try {
        const result = await actionListGeoAdmin1({ countryId: selectedCountryId, onlyActive: false, limit: 500 });
        setAdmin1(result.items);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo cargar Admin1.");
      }
    });
  }, [selectedCountryId]);

  useEffect(() => {
    if (!selectedAdmin1Id) {
      setAdmin2([]);
      setSelectedAdmin2Id("");
      return;
    }
    startTransition(async () => {
      try {
        const result = await actionListGeoAdmin2({ admin1Id: selectedAdmin1Id, onlyActive: false, limit: 600 });
        setAdmin2(result.items);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo cargar Admin2.");
      }
    });
  }, [selectedAdmin1Id]);

  useEffect(() => {
    if (!selectedAdmin2Id) {
      setAdmin3([]);
      return;
    }
    startTransition(async () => {
      try {
        const result = await actionListGeoAdmin3({ admin2Id: selectedAdmin2Id, onlyActive: false, limit: 500 });
        setAdmin3(result.items);
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo cargar Admin3.");
      }
    });
  }, [selectedAdmin2Id]);

  function toggleNode(level: "country" | "admin1" | "admin2" | "admin3", item: GeoItem) {
    startTransition(async () => {
      try {
        await actionSetGeoNodeActive({ level, id: item.id, isActive: !item.isActive });

        if (level === "country") {
          setCountries((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !item.isActive } : row)));
        }
        if (level === "admin1") {
          setAdmin1((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !item.isActive } : row)));
        }
        if (level === "admin2") {
          setAdmin2((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !item.isActive } : row)));
        }
        if (level === "admin3") {
          setAdmin3((prev) => prev.map((row) => (row.id === item.id ? { ...row, isActive: !item.isActive } : row)));
        }

        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar estado.");
      }
    });
  }

  const filteredCountries = useMemo(() => applyFilter(countries, countryFilter), [countries, countryFilter]);
  const filteredAdmin1 = useMemo(() => applyFilter(admin1, admin1Filter), [admin1, admin1Filter]);
  const filteredAdmin2 = useMemo(() => applyFilter(admin2, admin2Filter), [admin2, admin2Filter]);
  const filteredAdmin3 = useMemo(() => applyFilter(admin3, admin3Filter), [admin3, admin3Filter]);

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Geografía</p>
        <p className="mt-1 text-sm text-slate-600">Administra activación de países y divisiones sin listas hardcodeadas.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <GeoColumn
          title="País"
          search={countryFilter}
          onSearch={setCountryFilter}
          items={filteredCountries}
          selectedId={selectedCountryId}
          onSelect={(id) => {
            setSelectedCountryId(id);
            setSelectedAdmin1Id("");
            setSelectedAdmin2Id("");
          }}
          onToggle={(item) => toggleNode("country", item)}
          disabled={isPending}
        />

        <GeoColumn
          title="Admin1"
          search={admin1Filter}
          onSearch={setAdmin1Filter}
          items={filteredAdmin1}
          selectedId={selectedAdmin1Id}
          onSelect={(id) => {
            setSelectedAdmin1Id(id);
            setSelectedAdmin2Id("");
          }}
          onToggle={(item) => toggleNode("admin1", item)}
          disabled={isPending || !selectedCountryId}
        />

        <GeoColumn
          title="Admin2"
          search={admin2Filter}
          onSearch={setAdmin2Filter}
          items={filteredAdmin2}
          selectedId={selectedAdmin2Id}
          onSelect={setSelectedAdmin2Id}
          onToggle={(item) => toggleNode("admin2", item)}
          disabled={isPending || !selectedAdmin1Id}
        />

        <GeoColumn
          title="Admin3"
          search={admin3Filter}
          onSearch={setAdmin3Filter}
          items={filteredAdmin3}
          selectedId=""
          onSelect={() => undefined}
          onToggle={(item) => toggleNode("admin3", item)}
          disabled={isPending || !selectedAdmin2Id}
          readOnlySelection
        />
      </div>

      {error && <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    </section>
  );
}

function GeoColumn({
  title,
  search,
  onSearch,
  items,
  selectedId,
  onSelect,
  onToggle,
  disabled,
  readOnlySelection
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  items: GeoItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggle: (item: GeoItem) => void;
  disabled?: boolean;
  readOnlySelection?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2 top-2.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Buscar ${title.toLowerCase()}...`}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-2 text-sm text-slate-700",
            disabled && "cursor-not-allowed bg-slate-100 text-slate-400"
          )}
        />
      </div>

      <div className="max-h-72 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-lg border px-2 py-2",
              selectedId === item.id ? "border-[#4aadf5] bg-[#4aadf5]/10" : "border-transparent hover:border-slate-200"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (readOnlySelection) return;
                  onSelect(item.id);
                }}
                disabled={disabled}
                className={cn(
                  "text-left text-sm font-semibold text-slate-700",
                  readOnlySelection && "cursor-default",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                {item.name}
                <span className="ml-1 text-xs text-slate-500">({item.code})</span>
              </button>
              <button
                type="button"
                onClick={() => onToggle(item)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  item.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                {item.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {item.isActive ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="px-2 py-3 text-xs text-slate-500">Sin resultados.</p>}
      </div>
    </div>
  );
}

function applyFilter(items: GeoItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q));
}
