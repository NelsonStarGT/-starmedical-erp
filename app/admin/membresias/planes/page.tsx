"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { money } from "@/app/admin/suscripciones/membresias/_lib";
import { normalizeSubscriptionsErrorMessage } from "@/lib/subscriptions/uiErrors";
import { cn } from "@/lib/utils";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  type?: string | null;
  segment: "B2C" | "B2B";
  active: boolean;
  durationPresetId?: string | null;
  customDurationDays?: number | null;
  imageUrl?: string | null;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  benefitsCount?: number;
  maxDependents?: number | null;
  createdAt?: string;
  MembershipDurationPreset?: {
    id: string;
    name: string;
    days: number;
  } | null;
  MembershipPlanCategory?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  category?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  activeContracts: number;
};

type CategoryOption = {
  id: string;
  name: string;
};

type ProductTypeFilter = "" | "RECURRENTE" | "PREPAGO";
type SortMode = "created_desc" | "created_asc" | "name_asc" | "name_desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "created_desc", label: "Creado: más reciente" },
  { value: "created_asc", label: "Creado: más antiguo" },
  { value: "name_asc", label: "Nombre: A-Z" },
  { value: "name_desc", label: "Nombre: Z-A" }
];

function parseProductTypeFromDescription(description: string | null | undefined) {
  const text = String(description || "");
  const prefixed = text.match(/\[product:(RECURRENTE|PREPAGO)\]/i);
  if (prefixed?.[1]) return prefixed[1].toUpperCase() as "RECURRENTE" | "PREPAGO";

  const normalized = text.toLowerCase();
  if (normalized.includes("prepago") || normalized.includes("gift")) return "PREPAGO";
  return "RECURRENTE";
}

function formatProductTypeLabel(value: "RECURRENTE" | "PREPAGO") {
  return value === "PREPAGO" ? "Prepago" : "Recurrente";
}

function parseDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatCreatedLabel(value: string | undefined) {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(date);
}

export default function MembershipPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [hidePricesForOperators, setHidePricesForOperators] = useState(true);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>("");
  const [segmentFilter, setSegmentFilter] = useState<"" | "B2C" | "B2B">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("created_desc");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const shouldHidePricing = hidePricesForOperators && !canViewPricing;

  async function loadPlans() {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, configRes] = await Promise.all([
        fetch("/api/subscriptions/memberships/plans", { cache: "no-store" }),
        fetch("/api/subscriptions/memberships/config", { cache: "no-store" })
      ]);
      const json = await plansRes.json();
      const configJson = await configRes.json();
      if (!plansRes.ok) throw new Error(json?.error || "No se pudo cargar planes");
      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar permisos de pricing");
      setPlans(Array.isArray(json.data) ? json.data : []);
      setCanViewPricing(Boolean(configJson?.meta?.canViewPricing));
      setHidePricesForOperators(Boolean(configJson?.data?.hidePricesForOperators));
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo cargar planes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  useEffect(() => {
    if (!rowMenuOpenId) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-plan-row-actions]")) {
        setRowMenuOpenId(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRowMenuOpenId(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [rowMenuOpenId]);

  useEffect(() => {
    setPage(1);
  }, [query, productTypeFilter, segmentFilter, categoryFilter, statusFilter, createdFrom, createdTo, sortMode, pageSize]);

  async function togglePlanStatus(plan: PlanRow) {
    try {
      setBusyId(plan.id);
      const res = await fetch(`/api/subscriptions/memberships/plans/${plan.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !plan.active })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadPlans();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo actualizar estado"));
    } finally {
      setBusyId(null);
      setRowMenuOpenId(null);
    }
  }

  async function duplicatePlan(plan: PlanRow) {
    try {
      setBusyId(plan.id);
      const res = await fetch("/api/subscriptions/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${plan.name} (copia)`,
          slug: `${plan.slug}-copia-${Date.now()}`,
          description: plan.description ?? null,
          type: plan.type,
          segment: plan.segment,
          categoryId: plan.MembershipPlanCategory?.id ?? plan.category?.id ?? null,
          durationPresetId: plan.durationPresetId ?? null,
          customDurationDays: plan.customDurationDays ?? null,
          imageUrl: plan.imageUrl ?? null,
          active: false,
          priceMonthly: plan.priceMonthly,
          priceAnnual: plan.priceAnnual,
          currency: plan.currency,
          maxDependents: plan.maxDependents ?? null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo duplicar plan");
      await loadPlans();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo duplicar plan"));
    } finally {
      setBusyId(null);
      setRowMenuOpenId(null);
    }
  }

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, string>();
    for (const plan of plans) {
      const category = plan.MembershipPlanCategory || plan.category;
      if (category?.id && category?.name && !map.has(category.id)) {
        map.set(category.id, category.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const term = query.trim().toLowerCase();
    const fromDate = createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
    const toDate = createdTo ? new Date(`${createdTo}T23:59:59.999`) : null;

    return plans
      .filter((plan) => {
        const category = plan.MembershipPlanCategory || plan.category;
        const productType = parseProductTypeFromDescription(plan.description);

        if (productTypeFilter && productType !== productTypeFilter) return false;
        if (segmentFilter && plan.segment !== segmentFilter) return false;
        if (categoryFilter && category?.id !== categoryFilter) return false;
        if (statusFilter === "ACTIVE" && !plan.active) return false;
        if (statusFilter === "INACTIVE" && plan.active) return false;

        const createdAt = parseDate(plan.createdAt);
        if (fromDate && (!createdAt || createdAt < fromDate)) return false;
        if (toDate && (!createdAt || createdAt > toDate)) return false;

        if (!term) return true;
        const haystack = [plan.name, plan.slug, category?.name, plan.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        if (sortMode === "name_asc") return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
        if (sortMode === "name_desc") return b.name.localeCompare(a.name, "es", { sensitivity: "base" });

        const aDate = parseDate(a.createdAt)?.getTime() || 0;
        const bDate = parseDate(b.createdAt)?.getTime() || 0;
        if (sortMode === "created_asc") return aDate - bDate;
        return bDate - aDate;
      });
  }, [plans, query, productTypeFilter, segmentFilter, categoryFilter, statusFilter, createdFrom, createdTo, sortMode]);

  const totalRows = filteredPlans.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalRows);
  const pagedPlans = filteredPlans.slice(pageStartIndex, pageStartIndex + pageSize);

  return (
    <MembershipsShell
      title="Planes · Catálogo"
      description="Gestiona productos de suscripción: identidad comercial, precios, beneficios y estado operativo."
      actions={
        <Link
          href="/admin/suscripciones/membresias/planes/nuevo"
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          Crear producto
        </Link>
      }
    >
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7">
          <label className="space-y-1 xl:col-span-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Buscar</span>
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, slug o categoría"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Tipo producto</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={productTypeFilter}
              onChange={(event) => setProductTypeFilter(event.target.value as ProductTypeFilter)}
            >
              <option value="">Todos</option>
              <option value="RECURRENTE">Recurrente</option>
              <option value="PREPAGO">Prepago</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Segmento</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value as "" | "B2C" | "B2B")}
            >
              <option value="">Todos</option>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Categoría</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Estado</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | "ACTIVE" | "INACTIVE")}
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Orden</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Creado desde</span>
              <input
                type="date"
                value={createdFrom}
                onChange={(event) => setCreatedFrom(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Creado hasta</span>
              <input
                type="date"
                value={createdTo}
                onChange={(event) => setCreatedTo(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
              Total {totalRows}
            </span>
            <label className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700">
              <span>Página</span>
              <select
                className="bg-transparent text-xs font-semibold text-[#2e75ba] focus:outline-none"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {loading ? <p className="text-xs text-slate-500">Cargando planes...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && plans.length === 0 ? (
        <EmptyState
          title="No hay productos cargados"
          description="Crea el primer plan para desbloquear afiliaciones y renovaciones operativas."
          ctaHref="/admin/suscripciones/membresias/planes/nuevo"
          ctaLabel="Crear primer plan"
        />
      ) : null}

      {!loading && plans.length > 0 && filteredPlans.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Ajusta los filtros o limpia el rango de fechas para encontrar productos."
          ctaHref="/admin/suscripciones/membresias/planes"
          ctaLabel="Limpiar filtros"
        />
      ) : null}

      {filteredPlans.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[620px] overflow-auto">
            <table className="min-w-[1320px] w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#F8FAFC]">
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">NO</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Nombre</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Tipo producto</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Segmento</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Categoría</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Precio mensual</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Precio anual</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Máx dependientes</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Estado</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Creado</th>
                  <th className="sticky right-0 z-30 border-b border-l border-slate-200 bg-[#F8FAFC] px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedPlans.map((plan, index) => {
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/70";
                  const category = plan.MembershipPlanCategory || plan.category;
                  const productType = parseProductTypeFromDescription(plan.description);

                  return (
                    <tr key={plan.id} className={cn("border-b border-slate-100", rowBg, "hover:bg-[#f3f8ff]")}>
                      <td className="px-3 py-2 align-top text-slate-700">{pageStartIndex + index + 1}</td>
                      <td className="max-w-[260px] px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          {plan.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={plan.imageUrl} alt={plan.name} className="h-9 w-9 rounded-md object-cover" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-400">IMG</div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900" title={plan.name}>
                              {plan.name}
                            </p>
                            <p className="truncate text-[11px] text-slate-500" title={plan.slug}>
                              {plan.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{formatProductTypeLabel(productType)}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{plan.segment}</td>
                      <td className="max-w-[180px] px-3 py-2 align-top text-slate-700" title={category?.name || "Sin categoría"}>
                        <span className="truncate">{category?.name || "Sin categoría"}</span>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">{shouldHidePricing ? "—" : money(plan.priceMonthly, plan.currency)}</td>
                      <td className="px-3 py-2 align-top text-slate-900">{shouldHidePricing ? "—" : money(plan.priceAnnual, plan.currency)}</td>
                      <td className="px-3 py-2 align-top text-slate-700">{plan.maxDependents ?? "—"}</td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            plan.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-700"
                          )}
                        >
                          {plan.active ? "ACTIVO" : "INACTIVO"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{formatCreatedLabel(plan.createdAt)}</td>
                      <td className={cn("sticky right-0 z-10 border-l border-slate-100 px-2 py-2 align-top", rowBg)}>
                        <div data-plan-row-actions className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRowMenuOpenId((prev) => (prev === plan.id ? null : plan.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-white"
                            aria-label="Acciones del plan"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {rowMenuOpenId === plan.id ? (
                            <div className="absolute right-0 top-9 z-30 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                              <Link
                                href={`/admin/suscripciones/membresias/planes/${plan.id}`}
                                className="block rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC]"
                                onClick={() => setRowMenuOpenId(null)}
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                onClick={() => void duplicatePlan(plan)}
                                disabled={busyId === plan.id}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60"
                              >
                                Duplicar
                              </button>
                              <button
                                type="button"
                                onClick={() => void togglePlanStatus(plan)}
                                disabled={busyId === plan.id}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60"
                              >
                                {plan.active ? "Desactivar" : "Activar"}
                              </button>
                              <Link
                                href={`/admin/suscripciones/membresias?planId=${encodeURIComponent(plan.id)}`}
                                className="block rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC]"
                                onClick={() => setRowMenuOpenId(null)}
                              >
                                Ver en catálogo
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {filteredPlans.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-600">
            Mostrando <span className="font-semibold text-slate-900">{pageStartIndex + 1}</span>-<span className="font-semibold text-slate-900">{pageEndIndex}</span> de <span className="font-semibold text-slate-900">{totalRows}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-600">
              Página <span className="font-semibold text-slate-900">{safePage}</span> de <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </MembershipsShell>
  );
}
