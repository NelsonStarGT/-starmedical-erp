import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { type BillingCaseFilters } from "@/lib/billing/types";

type Option = { id: string; label: string };

export default function BillingCaseFiltersForm({
  action,
  filters,
  siteOptions,
  payerOptions,
  areaOptions,
  resultCount,
  trayLabel
}: {
  action: string;
  filters: BillingCaseFilters;
  siteOptions: Option[];
  payerOptions: Option[];
  areaOptions: Option[];
  resultCount?: number;
  trayLabel?: string;
}) {
  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg bg-[#4aadf5]/12 p-2 text-[#2e75ba]">
            <Filter className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#102a43]">Filtros operativos</p>
            <p className="text-xs text-slate-500">Mantén visible solo lo necesario para cobrar rápido.</p>
          </div>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {trayLabel ? `${trayLabel} · ` : ""}{resultCount ?? 0} expedientes
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Buscar
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={filters.query ?? ""}
              placeholder="Paciente, expediente, visita"
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm font-medium text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Sede
          <select
            name="siteId"
            defaultValue={filters.siteId ?? "ALL"}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          >
            {siteOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Pagador
          <select
            name="payerType"
            defaultValue={filters.payerType ?? "ALL"}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          >
            {payerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
          Área origen
          <select
            name="serviceArea"
            defaultValue={filters.serviceArea ?? "ALL"}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
          >
            {areaOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" name="onlyLocked" defaultChecked={Boolean(filters.onlyLocked)} />
          Solo bloqueados
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f968d]"
        >
          Aplicar filtros
        </button>
        <Link
          href={action}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-[#4aadf5]/60"
        >
          Limpiar
        </Link>
      </div>
    </form>
  );
}
