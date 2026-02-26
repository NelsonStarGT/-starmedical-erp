"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, PlusCircle, UploadCloud, XCircle } from "lucide-react";
import {
  actionCreateGeoDivision,
  actionImportGeoDivisions,
  actionListGeoDivisions,
  actionListGeoExplorerCountries,
  actionSetGeoDivisionActive
} from "@/app/admin/clientes/actions";
import CountryPicker from "@/components/clients/CountryPicker";
import { cn } from "@/lib/utils";

type GeoDivisionItem = {
  id: string;
  countryId: string;
  level: number;
  code: string;
  name: string;
  parentId: string | null;
  dataSource: "official" | "operational";
  isActive: boolean;
};

type CountryItem = {
  id: string;
  code: string;
  iso3?: string | null;
  name: string;
  callingCode?: string | null;
  admin1Label?: string | null;
  admin2Label?: string | null;
  admin3Label?: string | null;
  adminMaxLevel?: number | null;
  isActive: boolean;
  level1Count: number;
  officialCount: number;
  operationalCount: number;
  isEmpty: boolean;
};

type FilterStatus = "all" | "active" | "inactive";
type FilterCoverage = "all" | "empty" | "with";
type FilterSource = "all" | "official" | "operational";

type ImportRow = {
  level?: number;
  code?: string;
  name?: string;
  parentId?: string;
  parentCode?: string;
  parentName?: string;
  postalCode?: string;
  dataSource?: "official" | "operational";
  isActive?: boolean;
};

type ImportSummary = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
};

const COUNTRY_PAGE_SIZE = 14;
const DIVISION_PAGE_SIZE = 20;

export default function GeoCatalogManager({
  countryFirstMode = false
}: {
  countryFirstMode?: boolean;
} = {}) {
  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [coverageFilter, setCoverageFilter] = useState<FilterCoverage>("all");
  const [sourceFilter, setSourceFilter] = useState<FilterSource>("all");

  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState("");

  const [levelFilter, setLevelFilter] = useState<1 | 2 | 3>(1);
  const [parentFilterId, setParentFilterId] = useState("");
  const [divisionQuery, setDivisionQuery] = useState("");

  const [divisions, setDivisions] = useState<GeoDivisionItem[]>([]);
  const [parentOptions, setParentOptions] = useState<GeoDivisionItem[]>([]);

  const [countryPage, setCountryPage] = useState(1);
  const [divisionPage, setDivisionPage] = useState(1);

  const [newLevel, setNewLevel] = useState<1 | 2 | 3>(1);
  const [newParentId, setNewParentId] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSource, setNewSource] = useState<"official" | "operational">("operational");

  const [importFile, setImportFile] = useState<File | null>(null);
  const [auditWorldMode, setAuditWorldMode] = useState(!countryFirstMode);

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await actionListGeoExplorerCountries({
          q: countryQuery,
          status: statusFilter,
          coverage: coverageFilter,
          source: sourceFilter,
          limit: 500
        });
        const items = result.items as CountryItem[];
        setCountries(items);

        if (!selectedCountryId || !items.some((item) => item.id === selectedCountryId)) {
          const preferred = items.find((item) => item.code === "GT") ?? items[0];
          setSelectedCountryId(preferred?.id ?? "");
          setParentFilterId("");
          setNewParentId("");
        }

        setCountryPage(1);
        setError(null);
      } catch (err) {
        setCountries([]);
        setError((err as Error)?.message || "No se pudo cargar países.");
      }
    });
  }, [countryQuery, coverageFilter, selectedCountryId, sourceFilter, statusFilter]);

  useEffect(() => {
    if (!selectedCountryId) {
      setDivisions([]);
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionListGeoDivisions({
          countryId: selectedCountryId,
          level: levelFilter,
          parentId: levelFilter === 1 ? undefined : parentFilterId || undefined,
          q: divisionQuery,
          onlyActive: false,
          source: sourceFilter,
          limit: 2000
        });
        setDivisions(result.items as GeoDivisionItem[]);
        setDivisionPage(1);
        setError(null);
      } catch (err) {
        setDivisions([]);
        setError((err as Error)?.message || "No se pudo cargar divisiones.");
      }
    });
  }, [divisionQuery, levelFilter, parentFilterId, selectedCountryId, sourceFilter]);

  useEffect(() => {
    if (!selectedCountryId || levelFilter <= 1) {
      setParentOptions([]);
      setParentFilterId("");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionListGeoDivisions({
          countryId: selectedCountryId,
          level: levelFilter - 1,
          onlyActive: false,
          source: sourceFilter,
          limit: 2500
        });
        const items = result.items as GeoDivisionItem[];
        setParentOptions(items);
        if (!items.some((item) => item.id === parentFilterId)) {
          setParentFilterId("");
        }
      } catch (err) {
        setParentOptions([]);
        setError((err as Error)?.message || "No se pudieron cargar divisiones padre.");
      }
    });
  }, [levelFilter, parentFilterId, selectedCountryId, sourceFilter]);

  useEffect(() => {
    if (!selectedCountryId || newLevel <= 1) {
      setNewParentId("");
      return;
    }

    startTransition(async () => {
      try {
        const result = await actionListGeoDivisions({
          countryId: selectedCountryId,
          level: newLevel - 1,
          onlyActive: false,
          source: "all",
          limit: 2500
        });
        const items = result.items as GeoDivisionItem[];
        if (!items.some((item) => item.id === newParentId)) {
          setNewParentId("");
        }
      } catch {
        setNewParentId("");
      }
    });
  }, [newLevel, newParentId, selectedCountryId]);

  const selectedCountry = useMemo(
    () => countries.find((item) => item.id === selectedCountryId) ?? null,
    [countries, selectedCountryId]
  );

  const visibleCountries = useMemo(() => {
    const start = (countryPage - 1) * COUNTRY_PAGE_SIZE;
    return countries.slice(start, start + COUNTRY_PAGE_SIZE);
  }, [countries, countryPage]);
  const countryPageCount = Math.max(1, Math.ceil(countries.length / COUNTRY_PAGE_SIZE));

  const parentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of parentOptions) {
      map.set(item.id, `${item.name} (${item.code})`);
    }
    return map;
  }, [parentOptions]);

  const visibleDivisions = useMemo(() => {
    const start = (divisionPage - 1) * DIVISION_PAGE_SIZE;
    return divisions.slice(start, start + DIVISION_PAGE_SIZE);
  }, [divisionPage, divisions]);
  const divisionPageCount = Math.max(1, Math.ceil(divisions.length / DIVISION_PAGE_SIZE));

  const canCreateDivision = useMemo(() => {
    if (!selectedCountryId) return false;
    if (!newCode.trim() || !newName.trim()) return false;
    if (newLevel > 1 && !newParentId) return false;
    return true;
  }, [newCode, newLevel, newName, newParentId, selectedCountryId]);

  const importCountryCode = selectedCountry?.code ?? "";

  async function refreshCountryAndDivision() {
    const [countriesRes, divisionsRes] = await Promise.all([
      actionListGeoExplorerCountries({
        q: countryQuery,
        status: statusFilter,
        coverage: coverageFilter,
        source: sourceFilter,
        limit: 500
      }),
      selectedCountryId
        ? actionListGeoDivisions({
            countryId: selectedCountryId,
            level: levelFilter,
            parentId: levelFilter === 1 ? undefined : parentFilterId || undefined,
            q: divisionQuery,
            onlyActive: false,
            source: sourceFilter,
            limit: 2000
          })
        : Promise.resolve({ items: [] as GeoDivisionItem[] })
    ]);

    const countryItems = countriesRes.items as CountryItem[];
    setCountries(countryItems);
    setDivisions(divisionsRes.items as GeoDivisionItem[]);
  }

  function toggleDivisionStatus(item: GeoDivisionItem) {
    startTransition(async () => {
      try {
        await actionSetGeoDivisionActive({
          id: item.id,
          isActive: !item.isActive,
          includeSubtree: false
        });
        await refreshCountryAndDivision();
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo actualizar el estado.");
      }
    });
  }

  function createDivision() {
    if (!canCreateDivision) return;

    startTransition(async () => {
      try {
        await actionCreateGeoDivision({
          countryId: selectedCountryId,
          level: newLevel,
          parentId: newLevel === 1 ? null : newParentId,
          code: newCode.trim().toUpperCase(),
          name: newName.trim(),
          dataSource: newSource
        });
        setNewCode("");
        setNewName("");
        await refreshCountryAndDivision();
        setError(null);
      } catch (err) {
        setError((err as Error)?.message || "No se pudo crear división.");
      }
    });
  }

  async function importDivisionsFile() {
    if (!selectedCountryId || !importFile) return;

    startTransition(async () => {
      try {
        const text = await importFile.text();
        const rows = parseImportRows(text, importFile.name, importCountryCode);
        const summary = await actionImportGeoDivisions({
          countryId: selectedCountryId,
          rows,
          defaultLevel: 2
        });
        setImportSummary(summary);
        setImportFile(null);
        await refreshCountryAndDivision();
        setError(null);
      } catch (err) {
        setImportSummary(null);
        setError((err as Error)?.message || "No se pudo importar el archivo.");
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Geografía</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-clients-heading)" }}>
          Data Console · Países y divisiones
        </h3>
        <p className="mt-1 text-sm text-slate-600">Consola table-first para administrar cobertura geográfica e importaciones por país.</p>
      </div>

      {countryFirstMode ? (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-[#f8fafc] p-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <CountryPicker
            label="País para administrar"
            value={selectedCountryId}
            onChange={(nextCountryId) => {
              setSelectedCountryId(nextCountryId);
              setParentFilterId("");
              setDivisionPage(1);
            }}
            options={countries.map((item) => ({
              id: item.id,
              code: item.code,
              iso3: item.iso3 ?? null,
              name: item.name,
              callingCode: item.callingCode ?? null,
              isActive: item.isActive
            }))}
            disabled={isPending || countries.length === 0}
            className="min-w-0"
          />
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={auditWorldMode}
              onChange={(event) => setAuditWorldMode(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#4aa59c] focus:ring-[#4aa59c]"
            />
            Auditoría mundial
          </label>
        </div>
      ) : null}

      {countryFirstMode ? (
        <details className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-semibold text-[#2e75ba]">Glosario Admin levels</summary>
          <p className="mt-2">
            <span className="font-semibold text-slate-700">Admin1:</span> división principal (departamentos, estados o provincias).
          </p>
          <p>
            <span className="font-semibold text-slate-700">Admin2:</span> división secundaria (municipios, condados o cantones).
          </p>
          <p>
            <span className="font-semibold text-slate-700">Admin3:</span> división terciaria opcional para cobertura más granular.
          </p>
        </details>
      ) : null}

      {!countryFirstMode || auditWorldMode ? (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <FilterSelect
              label="Estado"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as FilterStatus)}
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Solo activos" },
                { value: "inactive", label: "Solo inactivos" }
              ]}
            />
            <FilterSelect
              label="Cobertura"
              value={coverageFilter}
              onChange={(value) => setCoverageFilter(value as FilterCoverage)}
              options={[
                { value: "all", label: "Todos" },
                { value: "empty", label: "Sin Admin1" },
                { value: "with", label: "Con Admin1" }
              ]}
            />
            <FilterSelect
              label="Origen"
              value={sourceFilter}
              onChange={(value) => setSourceFilter(value as FilterSource)}
              options={[
                { value: "all", label: "Official + Operational" },
                { value: "official", label: "Solo official" },
                { value: "operational", label: "Solo operational" }
              ]}
            />
            <div className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Buscar país</span>
              <input
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder="Nombre o ISO"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8fafc] text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">País</th>
                  <th className="px-3 py-2 text-left font-semibold">ISO</th>
                  <th className="px-3 py-2 text-left font-semibold">Prefijo</th>
                  <th className="px-3 py-2 text-left font-semibold">Labels</th>
                  <th className="px-3 py-2 text-left font-semibold">Estado</th>
                  <th className="px-3 py-2 text-left font-semibold">Admin1</th>
                  <th className="px-3 py-2 text-left font-semibold">Official</th>
                  <th className="px-3 py-2 text-left font-semibold">Operational</th>
                  <th className="px-3 py-2 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibleCountries.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(index % 2 ? "bg-slate-50/60" : "bg-white", selectedCountryId === item.id && "bg-[#4aadf5]/10")}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-3 py-2 text-slate-600">{item.code}</td>
                    <td className="px-3 py-2 text-slate-600">{item.callingCode || "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {(item.admin1Label || "Admin1") + " / " + (item.admin2Label || "Admin2")}
                      {item.adminMaxLevel && item.adminMaxLevel >= 3 ? ` / ${item.admin3Label || "Admin3"}` : ""}
                    </td>
                    <td className="px-3 py-2">{item.isActive ? "Activo" : "Inactivo"}</td>
                    <td className="px-3 py-2">{item.level1Count}</td>
                    <td className="px-3 py-2">{item.officialCount}</td>
                    <td className="px-3 py-2">{item.operationalCount}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCountryId(item.id);
                          setParentFilterId("");
                          setDivisionPage(1);
                        }}
                        disabled={isPending}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {selectedCountryId === item.id ? "Seleccionado" : "Seleccionar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!visibleCountries.length ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-center text-xs text-slate-500">
                      Sin países para los filtros actuales.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Pagination
            page={countryPage}
            pageCount={countryPageCount}
            onPrev={() => setCountryPage((prev) => Math.max(1, prev - 1))}
            onNext={() => setCountryPage((prev) => Math.min(countryPageCount, prev + 1))}
          />
        </>
      ) : null}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <FilterSelect
            label="Nivel"
            value={String(levelFilter)}
            onChange={(value) => {
              setLevelFilter(Number(value) as 1 | 2 | 3);
              setParentFilterId("");
            }}
            options={[
              { value: "1", label: "Admin1" },
              { value: "2", label: "Admin2" },
              { value: "3", label: "Admin3" }
            ]}
          />
          <FilterSelect
            label="División padre"
            value={parentFilterId}
            onChange={setParentFilterId}
            options={[
              { value: "", label: levelFilter === 1 ? "No aplica" : "Todas" },
              ...parentOptions.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))
            ]}
            disabled={levelFilter === 1}
          />
          <div className="md:col-span-2 space-y-1">
            <span className="text-xs font-semibold text-slate-500">Buscar división</span>
            <input
              value={divisionQuery}
              onChange={(event) => setDivisionQuery(event.target.value)}
              placeholder="Nombre o código"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f8fafc] text-[#2e75ba]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                <th className="px-3 py-2 text-left font-semibold">Código</th>
                <th className="px-3 py-2 text-left font-semibold">Nivel</th>
                <th className="px-3 py-2 text-left font-semibold">Padre</th>
                <th className="px-3 py-2 text-left font-semibold">Origen</th>
                <th className="px-3 py-2 text-left font-semibold">Estado</th>
                <th className="px-3 py-2 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleDivisions.map((item, index) => (
                <tr key={item.id} className={index % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-3 py-2 text-slate-600">{item.code}</td>
                  <td className="px-3 py-2">Admin{item.level}</td>
                  <td className="px-3 py-2 text-slate-600">{item.parentId ? parentLabelById.get(item.parentId) ?? "—" : "—"}</td>
                  <td className="px-3 py-2 uppercase text-xs text-slate-500">{item.dataSource}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        item.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      )}
                    >
                      {item.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {item.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => toggleDivisionStatus(item)}
                      disabled={isPending}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {item.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {!visibleDivisions.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-500">
                    Sin divisiones para los filtros actuales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Pagination
          page={divisionPage}
          pageCount={divisionPageCount}
          onPrev={() => setDivisionPage((prev) => Math.max(1, prev - 1))}
          onNext={() => setDivisionPage((prev) => Math.min(divisionPageCount, prev + 1))}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Agregar división</p>
        <div className="grid gap-3 md:grid-cols-6">
          <FilterSelect
            label="Nivel"
            value={String(newLevel)}
            onChange={(value) => {
              setNewLevel(Number(value) as 1 | 2 | 3);
              setNewParentId("");
            }}
            options={[
              { value: "1", label: "Admin1" },
              { value: "2", label: "Admin2" },
              { value: "3", label: "Admin3" }
            ]}
          />
          <FilterSelect
            label="Padre"
            value={newParentId}
            onChange={setNewParentId}
            disabled={newLevel === 1}
            options={[
              { value: "", label: newLevel === 1 ? "No aplica" : "Selecciona" },
              ...parentOptions.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))
            ]}
          />
          <FilterSelect
            label="Origen"
            value={newSource}
            onChange={(value) => setNewSource(value as "official" | "operational")}
            options={[
              { value: "operational", label: "Operational" },
              { value: "official", label: "Official" }
            ]}
          />
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Código</span>
            <input
              value={newCode}
              onChange={(event) => setNewCode(event.target.value.toUpperCase())}
              placeholder="Ej. GT-01"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold text-slate-500">Nombre</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Nombre división"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={createDivision}
            disabled={!canCreateDivision || isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusCircle size={16} />
            Crear división
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Importar divisiones (JSON/CSV)</p>
        <p className="text-xs text-slate-500">
          Recomendado para Guatemala nivel 2 (departamento/municipio). Se hace upsert por país+nivel+padre+nombre/código.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Archivo</span>
            <input
              type="file"
              accept=".json,.csv,.txt"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              disabled={isPending || !selectedCountryId}
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
            />
          </div>
          <button
            type="button"
            onClick={importDivisionsFile}
            disabled={isPending || !selectedCountryId || !importFile}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#4aa59c]/30 bg-[#4aa59c]/10 px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:border-[#4aa59c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud size={16} />
            Importar
          </button>
        </div>

        {importSummary ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">
              Resultado: total {importSummary.total} · insertados {importSummary.inserted} · actualizados {importSummary.updated} · omitidos {importSummary.skipped}
            </p>
            {importSummary.errors.length ? (
              <ul className="mt-2 space-y-1 text-rose-700">
                {importSummary.errors.slice(0, 8).map((entry) => (
                  <li key={`${entry.row}-${entry.reason}`}>Fila {entry.row}: {entry.reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
    </section>
  );
}

export function parseImportRows(raw: string, filename: string, countryCode: string): ImportRow[] {
  if (!raw.trim()) throw new Error("Archivo vacío.");
  const lower = filename.toLowerCase();

  if (lower.endsWith(".json")) {
    return parseJsonRows(raw, countryCode);
  }
  return parseDelimitedRows(raw);
}

function parseJsonRows(raw: string, countryCode: string): ImportRow[] {
  const parsed = JSON.parse(raw) as any;

  const countriesArray = Array.isArray(parsed?.countries) ? parsed.countries : null;
  if (countriesArray) {
    const current =
      countriesArray.find((item: any) => String(item?.countryIso2 || "").toUpperCase() === countryCode.toUpperCase()) ??
      countriesArray[0];
    if (current) {
      return flattenDepartments(current?.departments);
    }
  }

  if (Array.isArray(parsed?.departments)) {
    return flattenDepartments(parsed.departments);
  }

  if (Array.isArray(parsed)) {
    return parsed
      .map((row) => ({
        level: Number(row.level || 2),
        code: normalizeCode(row.code, row.name),
        name: toText(row.name),
        parentId: toText(row.parentId),
        parentCode: toText(row.parentCode),
        parentName: toText(row.parentName),
        postalCode: toText(row.postalCode),
        dataSource: row.dataSource === "official" ? ("official" as const) : ("operational" as const)
      }))
      .filter((row) => Boolean(row.name));
  }

  throw new Error("JSON no reconocido. Usa arreglo de filas o estructura departments/municipalities.");
}

function flattenDepartments(input: any[]): ImportRow[] {
  if (!Array.isArray(input)) return [];

  const rows: ImportRow[] = [];
  for (let depIndex = 0; depIndex < input.length; depIndex += 1) {
    const dep = input[depIndex];
    const depName = toText(dep?.name);
    const depCode = normalizeCode(dep?.code, depName || `DEP${depIndex + 1}`);
    const municipalities = Array.isArray(dep?.municipalities) ? dep.municipalities : [];

    if (!municipalities.length) {
      if (!depName) continue;
      rows.push({
        level: 1,
        code: depCode,
        name: depName,
        dataSource: "operational"
      });
      continue;
    }

    for (let muniIndex = 0; muniIndex < municipalities.length; muniIndex += 1) {
      const muni = municipalities[muniIndex];
      const muniName = toText(muni?.name);
      if (!muniName) continue;
      rows.push({
        level: 2,
        code: normalizeCode(muni?.code, `${depCode}-${muniName}`),
        name: muniName,
        parentCode: depCode,
        parentName: depName,
        dataSource: "operational"
      });
    }
  }

  return rows;
}

function parseDelimitedRows(raw: string): ImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("CSV inválido: requiere encabezados y filas.");

  const separator = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = lines[0].split(separator).map((item) => normalizeHeader(item));

  const rows: ImportRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const parts = splitCsvLine(lines[index], separator);
    const rowMap = new Map<string, string>();
    headers.forEach((header, idx) => {
      rowMap.set(header, (parts[idx] || "").trim());
    });

    const name = rowMap.get("name") || rowMap.get("nombre") || "";
    if (!name.trim()) continue;

    const levelValue = Number(rowMap.get("level") || rowMap.get("nivel") || 2);
    rows.push({
      level: Number.isFinite(levelValue) ? levelValue : 2,
      code: normalizeCode(rowMap.get("code") || rowMap.get("codigo"), name),
      name,
      parentId: rowMap.get("parentid") || rowMap.get("padreid") || undefined,
      parentCode: rowMap.get("parentcode") || rowMap.get("padrecodigo") || undefined,
      parentName: rowMap.get("parentname") || rowMap.get("padrenombre") || undefined,
      postalCode: rowMap.get("postalcode") || rowMap.get("codigopostal") || undefined,
      dataSource: (rowMap.get("datasource") || "").toLowerCase() === "official" ? "official" : "operational",
      isActive: ["1", "true", "si", "sí", "activo"].includes((rowMap.get("isactive") || "1").toLowerCase())
    });
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function splitCsvLine(line: string, separator: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === separator) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

function toText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeCode(raw: unknown, fallback: unknown) {
  const value = toText(raw);
  if (value) return value.toUpperCase();
  const fallbackValue = toText(fallback);
  return fallbackValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/25 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  page,
  pageCount,
  onPrev,
  onNext
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        Anterior
      </button>
      <span>
        Página {page} de {pageCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pageCount}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        Siguiente
      </button>
    </div>
  );
}
