"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterX } from "lucide-react";
import ClientsReportsExportModal from "@/components/clients/reports/ClientsReportsExportModal";
import { DateField } from "@/components/ui/DateField";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { ClientsReportPanelKey } from "@/lib/clients/reports/panels";
import {
  CLIENTS_REPORTS_DEFAULT_RANGE_PRESET,
  CLIENTS_REPORTS_RANGE_DROPDOWN_KEYS,
  CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS,
  resolveClientsReportsDatePresetFromRange,
  resolveClientsReportsDatePresetRange,
  resolveClientsReportsRangePresetToggle,
  type ClientsReportsDatePresetKey
} from "@/lib/clients/reports/datePresets";

type TypeOption = {
  value: string;
  label: string;
};

type SourceOption = {
  id: string;
  name: string;
};

type SourceDetailOption = {
  id: string;
  name: string;
  sourceId: string;
};

type FiltersState = {
  q: string;
  type: string;
  from: string;
  to: string;
  sourceId: string;
  detailId: string;
  referred: boolean;
  pageSize: string;
};

const CUSTOM_RANGE_KEY = "CUSTOM";
type RangeSelectionKey = ClientsReportsDatePresetKey | typeof CUSTOM_RANGE_KEY;

const RANGE_DROPDOWN_OPTIONS = [
  ...CLIENTS_REPORTS_RANGE_DROPDOWN_OPTIONS.map((option) => ({
    value: option.key,
    label: option.label
  })),
  { value: CUSTOM_RANGE_KEY, label: "Personalizado..." }
] as const;

function resolveRangeSelection(filters: FiltersState): RangeSelectionKey {
  const preset = resolveClientsReportsDatePresetFromRange(filters, new Date(), CLIENTS_REPORTS_RANGE_DROPDOWN_KEYS);
  if (preset) return preset;
  if (filters.from || filters.to) return CUSTOM_RANGE_KEY;
  return CLIENTS_REPORTS_DEFAULT_RANGE_PRESET;
}

function buildQuery(next: FiltersState, extraQuery: Record<string, string>) {
  const params = new URLSearchParams();

  const q = next.q.trim();
  if (q) params.set("q", q);
  if (next.type && next.type !== "ALL") params.set("type", next.type);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.sourceId) params.set("sourceId", next.sourceId);
  if (next.detailId) params.set("detailId", next.detailId);
  if (next.referred) params.set("referred", "1");
  if (next.pageSize) params.set("pageSize", next.pageSize);

  for (const [key, value] of Object.entries(extraQuery)) {
    if (!value) continue;
    params.set(key, value);
  }

  return params.toString();
}

function buildExportBaseFilters(applied: FiltersState) {
  const record: Record<string, string> = {};
  const q = applied.q.trim();
  if (q) record.q = q;
  if (applied.type && applied.type !== "ALL") record.type = applied.type;
  if (applied.from) record.from = applied.from;
  if (applied.to) record.to = applied.to;
  if (applied.sourceId) record.sourceId = applied.sourceId;
  if (applied.detailId) record.detailId = applied.detailId;
  if (applied.referred) record.referred = "1";
  return record;
}

export default function ClientsReportsFiltersForm({
  initialFilters,
  extraQuery,
  typeOptions,
  sources,
  sourceDetails,
  canExportFull,
  canExportMasked,
  sectionCounts
}: {
  initialFilters: FiltersState;
  extraQuery: Record<string, string>;
  typeOptions: TypeOption[];
  sources: SourceOption[];
  sourceDetails: SourceDetailOption[];
  canExportFull: boolean;
  canExportMasked: boolean;
  sectionCounts?: Partial<Record<ClientsReportPanelKey, number>>;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [selectedRange, setSelectedRange] = useState<RangeSelectionKey>(() => resolveRangeSelection(initialFilters));
  const [fromAutoFocusNonce, setFromAutoFocusNonce] = useState(0);

  useEffect(() => {
    setFilters(initialFilters);
    setSelectedRange(resolveRangeSelection(initialFilters));
  }, [initialFilters]);

  const availableDetails = useMemo(() => {
    if (!filters.sourceId) return sourceDetails;
    return sourceDetails.filter((detail) => detail.sourceId === filters.sourceId);
  }, [filters.sourceId, sourceDetails]);

  const exportBaseFilters = useMemo(
    () => buildExportBaseFilters(initialFilters),
    [initialFilters]
  );

  function apply(next: FiltersState) {
    const query = buildQuery(next, extraQuery);
    const href = query ? `/admin/clientes/reportes?${query}` : "/admin/clientes/reportes";
    router.push(href);
  }

  function applyPreset(presetKey: ClientsReportsDatePresetKey) {
    const range = resolveClientsReportsDatePresetRange(presetKey);
    const next = {
      ...filters,
      from: range.from,
      to: range.to
    };
    setSelectedRange(presetKey);
    setFilters(next);
    apply(next);
  }

  function handleRangeSelection(value: string) {
    if (value === CUSTOM_RANGE_KEY) {
      setSelectedRange(CUSTOM_RANGE_KEY);
      setFromAutoFocusNonce((current) => current + 1);
      return;
    }

    const presetKey = value as ClientsReportsDatePresetKey;
    const currentPreset = selectedRange === CUSTOM_RANGE_KEY ? null : selectedRange;
    const nextPreset = resolveClientsReportsRangePresetToggle(currentPreset, presetKey);
    applyPreset(nextPreset);
  }

  return (
    <form
      className="grid gap-2 md:grid-cols-4 lg:grid-cols-7"
      onSubmit={(event) => {
        event.preventDefault();
        apply(filters);
      }}
    >
      <input
        name="q"
        value={filters.q}
        onChange={(event) => {
          setFilters((current) => ({ ...current, q: event.target.value }));
        }}
        placeholder="Buscar por nombre, documento, teléfono o email"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
      />

      <select
        name="type"
        value={filters.type}
        onChange={(event) => {
          setFilters((current) => ({ ...current, type: event.target.value }));
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        name="sourceId"
        value={filters.sourceId}
        onChange={(event) => {
          const sourceId = event.target.value;
          setFilters((current) => ({
            ...current,
            sourceId,
            detailId: sourceId ? current.detailId : ""
          }));
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">Canal (todos)</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>

      <select
        name="detailId"
        value={filters.detailId}
        onChange={(event) => {
          setFilters((current) => ({ ...current, detailId: event.target.value }));
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">Detalle canal (todos)</option>
        {availableDetails.map((detail) => (
          <option key={detail.id} value={detail.id}>
            {detail.name}
          </option>
        ))}
      </select>

      <SearchableSelect
        label="Rango"
        placeholder="Selecciona un rango"
        options={RANGE_DROPDOWN_OPTIONS}
        value={selectedRange}
        onChange={handleRangeSelection}
        className="md:col-span-2 lg:col-span-2"
        maxHeight={320}
      />

      <DateField
        key={`from-${fromAutoFocusNonce}`}
        value={filters.from}
        autoFocus={selectedRange === CUSTOM_RANGE_KEY}
        disabled={selectedRange !== CUSTOM_RANGE_KEY}
        onChange={(from) => {
          setSelectedRange(CUSTOM_RANGE_KEY);
          setFilters((current) => ({ ...current, from }));
        }}
        placeholder="Desde"
        className="space-y-0"
        inputClassName="py-2"
      />
      <DateField
        value={filters.to}
        disabled={selectedRange !== CUSTOM_RANGE_KEY}
        onChange={(to) => {
          setSelectedRange(CUSTOM_RANGE_KEY);
          setFilters((current) => ({ ...current, to }));
        }}
        placeholder="Hasta"
        className="space-y-0"
        inputClassName="py-2"
      />

      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={filters.referred}
          onChange={(event) => {
            setFilters((current) => ({ ...current, referred: event.target.checked }));
          }}
          className="h-4 w-4 rounded border-slate-300 text-[#4aa59c]"
        />
        Solo referidos
      </label>

      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <div className="md:col-span-4 lg:col-span-7 flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4aadf5]"
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/admin/clientes/reportes");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
        >
          <FilterX size={15} />
          Limpiar
        </button>
        <ClientsReportsExportModal
          baseFilters={exportBaseFilters}
          canExportFull={canExportFull}
          canExportMasked={canExportMasked}
          sectionCounts={sectionCounts}
        />
      </div>
    </form>
  );
}
