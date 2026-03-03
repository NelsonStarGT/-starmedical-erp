"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { SubscriptionMembershipEnrollDrawer } from "@/components/memberships/SubscriptionMembershipEnrollDrawer";
import { dateLabel, money } from "@/app/admin/suscripciones/membresias/_lib";
import { buildMembershipInvoiceLink } from "@/lib/memberships/links";
import { normalizeSubscriptionsErrorMessage } from "@/lib/subscriptions/uiErrors";
import { cn } from "@/lib/utils";

type OwnerType = "PERSON" | "COMPANY";

type PlanOption = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  active: boolean;
  priceMonthly: number;
  priceAnnual: number;
  currency?: string;
  category?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  durationPreset?: {
    id: string;
    name: string;
    days: number;
  } | null;
  customDurationDays?: number | null;
  benefits?: Array<{
    id: string;
    quantity?: number | null;
    isUnlimited?: boolean;
    benefitCatalog?: {
      id: string;
      title: string;
      serviceType: string;
    } | null;
  }>;
};

type ContractRow = {
  id: string;
  code: string;
  status: string;
  startAt: string;
  nextRenewAt: string | null;
  balance: number;
  ownerType: OwnerType;
  ownerId: string | null;
  paymentMethod?: "MANUAL" | "RECURRENT";
  branchId?: string | null;
  plan?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  owner?: {
    id: string;
    type: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    nit?: string | null;
  } | null;
  MembershipPlan?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  } | null;
  ClientProfile?: {
    id: string;
    type: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    nit?: string | null;
  };
};

type ContractsResponse = {
  data: ContractRow[];
};

type ContractsTableViewProps = {
  ownerType: OwnerType;
  title: string;
  description: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todas" },
  { value: "ACTIVO", label: "Activo" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "PENDIENTE_PAGO", label: "Pendiente pago" },
  { value: "SUSPENDIDO", label: "Suspendido" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "CANCELADO", label: "Cancelado" }
];

function statusBadgeTone(status: string) {
  if (status === "ACTIVO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDIENTE") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "PENDIENTE_PAGO") return "border-amber-300 bg-amber-50 text-amber-800";
  if (status === "SUSPENDIDO") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "VENCIDO") return "border-slate-300 bg-slate-100 text-slate-700";
  if (status === "CANCELADO") return "border-slate-300 bg-slate-200 text-slate-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function ContractsTableView({ ownerType, title, description }: ContractsTableViewProps) {
  const searchParams = useSearchParams();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [renewBusyId, setRenewBusyId] = useState<string | null>(null);
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"" | "MANUAL" | "RECURRENT">("");
  const [renewWindowFilter, setRenewWindowFilter] = useState<"" | "7" | "15" | "30">("");
  const [branchFilter, setBranchFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);
  const [viewerBranchId, setViewerBranchId] = useState<string | null>(null);
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [hidePricesForOperators, setHidePricesForOperators] = useState(true);
  const [createForm, setCreateForm] = useState({
    ownerId: "",
    planId: "",
    startAt: new Date().toISOString().slice(0, 10),
    billingFrequency: "MONTHLY"
  });

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => (ownerType === "PERSON" ? plan.segment === "B2C" : plan.segment === "B2B"));
  }, [plans, ownerType]);

  const totalRows = contracts.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, totalRows);
  const pagedContracts = contracts.slice(pageStartIndex, pageStartIndex + pageSize);
  const showBranchFilter = canAdmin || !viewerBranchId;

  async function loadData(options?: { targetPage?: number; targetPageSize?: number }) {
    const targetPage = options?.targetPage ?? safePage;
    const targetPageSize = options?.targetPageSize ?? pageSize;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("ownerType", ownerType);
    if (query) params.set("q", query);
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("planId", planFilter);
    if (paymentMethodFilter) params.set("paymentMethod", paymentMethodFilter);
    if (renewWindowFilter) params.set("renewWindowDays", renewWindowFilter);
    if (showBranchFilter && branchFilter) params.set("branchId", branchFilter);
    params.set("page", String(targetPage));
    // Fallback sin paginación server-side: cargamos un bloque amplio para paginar en UI.
    params.set("take", String(Math.min(200, Math.max(100, targetPage * targetPageSize))));

    try {
      const [contractsRes, plansRes, configRes] = await Promise.all([
        fetch(`/api/subscriptions/memberships/contracts?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/subscriptions/memberships/plans?active=true", { cache: "no-store" }),
        fetch("/api/subscriptions/memberships/config", { cache: "no-store" })
      ]);

      const contractsJson: ContractsResponse = await contractsRes.json();
      const plansJson = await plansRes.json();
      const configJson = await configRes.json();

      if (!contractsRes.ok) throw new Error((contractsJson as any)?.error || "No se pudo cargar afiliaciones");
      if (!plansRes.ok) throw new Error(plansJson?.error || "No se pudo cargar planes");
      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar configuración");

      setContracts(Array.isArray(contractsJson.data) ? contractsJson.data : []);
      setPlans(Array.isArray(plansJson.data) ? plansJson.data : []);
      setCanAdmin(Boolean(configJson?.meta?.canAdmin));
      setViewerBranchId(typeof configJson?.meta?.branchId === "string" ? configJson.meta.branchId : null);
      setCanViewPricing(Boolean(configJson?.meta?.canViewPricing));
      setHidePricesForOperators(Boolean(configJson?.data?.hidePricesForOperators));
      if (options?.targetPage) setPage(options.targetPage);
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "Error cargando afiliaciones"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData({ targetPage: 1, targetPageSize: pageSize });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const openByQuery = searchParams?.get("enroll");
    if (openByQuery === "1" && ownerType === "PERSON") setEnrollOpen(true);
  }, [ownerType, searchParams]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!showBranchFilter && branchFilter) {
      setBranchFilter("");
    }
  }, [branchFilter, showBranchFilter]);

  useEffect(() => {
    if (!rowMenuOpenId) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-row-actions-menu]")) {
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

  function handleApplyFilters() {
    setPage(1);
    setRowMenuOpenId(null);
    setInfoMessage(null);
    void loadData({ targetPage: 1, targetPageSize: pageSize });
  }

  async function submitCreateCompanyQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!createForm.ownerId || !createForm.planId) {
      setError("ownerId y planId son obligatorios");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch("/api/subscriptions/memberships/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerType,
          ownerId: createForm.ownerId,
          planId: createForm.planId,
          startAt: createForm.startAt,
          billingFrequency: createForm.billingFrequency,
          channel: "ADMIN_MANUAL"
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo afiliar titular");

      setCreateForm((prev) => ({ ...prev, ownerId: "" }));
      setShowCreate(false);
      await loadData({ targetPage: 1, targetPageSize: pageSize });
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo afiliar titular"));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(contractId: string, status: string) {
    try {
      setStatusBusyId(contractId);
      const res = await fetch(`/api/subscriptions/memberships/contracts/${contractId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadData({ targetPage: safePage, targetPageSize: pageSize });
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo actualizar estado"));
    } finally {
      setStatusBusyId(null);
    }
  }

  async function renewMembership(contractId: string) {
    try {
      setRenewBusyId(contractId);
      const res = await fetch(`/api/subscriptions/memberships/contracts/${contractId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAsPaid: false })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo renovar afiliación");
      await loadData({ targetPage: safePage, targetPageSize: pageSize });
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo renovar afiliación"));
    } finally {
      setRenewBusyId(null);
    }
  }

  return (
    <MembershipsShell
      title={title}
      description={description}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-[#F8FAFC] p-1">
            <Link
              href="/admin/suscripciones/membresias/afiliaciones/pacientes"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                ownerType === "PERSON"
                  ? "border border-[#4aa59c]/40 bg-white text-[#2e75ba]"
                  : "text-slate-600 hover:bg-white hover:text-[#2e75ba]"
              )}
            >
              Pacientes
            </Link>
            <Link
              href="/admin/suscripciones/membresias/afiliaciones/empresas"
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                ownerType === "COMPANY"
                  ? "border border-[#4aa59c]/40 bg-white text-[#2e75ba]"
                  : "text-slate-600 hover:bg-white hover:text-[#2e75ba]"
              )}
            >
              Empresas
            </Link>
          </div>

          <button
            type="button"
            onClick={() => (ownerType === "PERSON" ? setEnrollOpen(true) : setShowCreate((prev) => !prev))}
            className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
          >
            {ownerType === "PERSON" ? "Afiliar" : showCreate ? "Cerrar" : "Afiliar"}
          </button>
        </div>
      }
    >
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((chip) => {
              const isActive = statusFilter === chip.value;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setStatusFilter(chip.value)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition",
                    isActive
                      ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:bg-[#F8FAFC] hover:text-[#2e75ba]"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700">
              Total {totalRows}
            </span>
            <label className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700">
              <span>Tamaño</span>
              <select
                className="bg-transparent text-xs font-semibold text-[#2e75ba] focus:outline-none"
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number];
                  setPageSize(nextSize);
                  setPage(1);
                  void loadData({ targetPage: 1, targetPageSize: nextSize });
                }}
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Buscar</span>
            <input
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre, correo, teléfono o código"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Plan</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
            >
              <option value="">Todos</option>
              {filteredPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Pago</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={paymentMethodFilter}
              onChange={(event) => setPaymentMethodFilter(event.target.value as "" | "MANUAL" | "RECURRENT")}
            >
              <option value="">Todos</option>
              <option value="MANUAL">Manual</option>
              <option value="RECURRENT">Recurrente</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Por vencer</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
              value={renewWindowFilter}
              onChange={(event) => setRenewWindowFilter(event.target.value as "" | "7" | "15" | "30")}
            >
              <option value="">No filtrar</option>
              <option value="7">7 días</option>
              <option value="15">15 días</option>
              <option value="30">30 días</option>
            </select>
          </label>

          {showBranchFilter ? (
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Sucursal</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/20"
                value={branchFilter}
                onChange={(event) => setBranchFilter(event.target.value)}
                placeholder="branchId"
              />
            </label>
          ) : (
            <div className="hidden xl:block" />
          )}

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="h-9 w-full rounded-lg border border-[#4aa59c]/40 bg-white px-3 text-xs font-semibold text-[#2e75ba] transition hover:border-[#4aa59c] hover:bg-[#F8FAFC]"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </section>

      {ownerType === "COMPANY" && showCreate ? (
        <form onSubmit={submitCreateCompanyQuick} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Afiliación rápida empresa</h3>
          <p className="mt-1 text-[11px] text-slate-600">
            Flujo rápido para B2B usando <code>ownerId</code> existente en Clientes.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">ownerId titular</span>
              <input
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.ownerId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">Plan</span>
              <select
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.planId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, planId: event.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {filteredPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">Inicio</span>
              <input
                type="date"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.startAt}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">Frecuencia</span>
              <select
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.billingFrequency}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, billingFrequency: event.target.value }))}
              >
                <option value="MONTHLY">MONTHLY</option>
                <option value="QUARTERLY">QUARTERLY</option>
                <option value="SEMIANNUAL">SEMIANNUAL</option>
                <option value="ANNUAL">ANNUAL</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Afiliando..." : "Crear afiliación"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="text-xs text-slate-500">Cargando afiliaciones...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {infoMessage ? <p className="text-xs font-medium text-[#2e75ba]">{infoMessage}</p> : null}

      {!loading && contracts.length === 0 ? (
        <EmptyState
          title="No hay afiliaciones"
          description="Afiliar un titular habilita renovación, estados y seguimiento operativo."
          ctaHref={ownerType === "PERSON" ? "/admin/suscripciones/membresias/afiliaciones/pacientes?enroll=1" : undefined}
          ctaLabel="Afiliar titular"
        />
      ) : null}

      {contracts.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-[#F8FAFC]">
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">NO.</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    Membresía/Plan
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    Titular
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Pago</th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    Próxima renovación
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">Estado</th>
                  <th className="sticky right-0 z-30 border-b border-l border-slate-200 bg-[#F8FAFC] px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2e75ba]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedContracts.map((contract, index) => {
                  const ownerProfile = contract.owner || contract.ClientProfile || null;
                  const plan = contract.plan || contract.MembershipPlan || null;
                  const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/70";
                  const ownerLabel = ownerProfile
                    ? contract.ownerType === "COMPANY"
                      ? ownerProfile.companyName || "Empresa"
                      : `${ownerProfile.firstName || ""} ${ownerProfile.lastName || ""}`.trim() || "Paciente"
                    : "Sin titular";

                  return (
                    <tr key={contract.id} className={cn("border-b border-slate-100", rowBg, "hover:bg-[#f3f8ff]")}>
                      <td className="px-3 py-2 align-top text-slate-700">{pageStartIndex + index + 1}</td>
                      <td className="max-w-[260px] px-3 py-2 align-top">
                        <p className="truncate font-semibold text-slate-900" title={plan?.name || "Plan sin nombre"}>
                          {plan?.name || "Plan sin nombre"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500" title={`${contract.code} · ${(plan?.segment || (ownerType === "PERSON" ? "B2C" : "B2B")).toString()}`}>
                          {contract.code} · {(plan?.segment || (ownerType === "PERSON" ? "B2C" : "B2B")).toString()}
                        </p>
                      </td>
                      <td className="max-w-[240px] px-3 py-2 align-top">
                        <p className="truncate text-slate-800" title={ownerLabel}>
                          {ownerLabel}
                        </p>
                        <p className="truncate text-[11px] text-slate-500" title={ownerProfile?.email || ownerProfile?.phone || "-"}>
                          {ownerProfile?.email || ownerProfile?.phone || "-"}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        <p>{contract.paymentMethod === "RECURRENT" ? "Recurrente" : "Manual"}</p>
                        {canViewPricing || !hidePricesForOperators ? (
                          <p className="text-[11px] text-slate-500">Saldo: {money(contract.balance)}</p>
                        ) : (
                          <p className="text-[11px] text-slate-500">Saldo: —</p>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">{dateLabel(contract.nextRenewAt)}</td>
                      <td className="px-3 py-2 align-top">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusBadgeTone(contract.status))}>
                          {contract.status}
                        </span>
                      </td>
                      <td className={cn("sticky right-0 z-10 border-l border-slate-100 px-2 py-2 align-top", rowBg)}>
                        <div data-row-actions-menu className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRowMenuOpenId((prev) => (prev === contract.id ? null : contract.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-white"
                            aria-label="Acciones de afiliación"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {rowMenuOpenId === contract.id ? (
                            <div className="absolute right-0 top-9 z-30 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
                              <Link
                                href={`/admin/suscripciones/membresias/afiliaciones/${contract.id}`}
                                className="block rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC]"
                                onClick={() => setRowMenuOpenId(null)}
                              >
                                Ver detalle
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuOpenId(null);
                                  void renewMembership(contract.id);
                                }}
                                disabled={renewBusyId === contract.id}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60"
                              >
                                {renewBusyId === contract.id ? "Renovando..." : "Renovar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuOpenId(null);
                                  void changeStatus(contract.id, "SUSPENDIDO");
                                }}
                                disabled={statusBusyId === contract.id}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60"
                              >
                                Suspender
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuOpenId(null);
                                  const confirmed = window.confirm("¿Marcar afiliación como cancelada al corte?");
                                  if (confirmed) void changeStatus(contract.id, "CANCELADO");
                                }}
                                disabled={statusBusyId === contract.id}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC] disabled:opacity-60"
                              >
                                Cancelar
                              </button>
                              <Link
                                href={buildMembershipInvoiceLink({ contractId: contract.id })}
                                className="block rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC]"
                                onClick={() => setRowMenuOpenId(null)}
                              >
                                Gestionar cobro
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuOpenId(null);
                                  setInfoMessage("Cambio de método de pago estará disponible pronto.");
                                }}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC]"
                              >
                                Cambiar método de pago
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowMenuOpenId(null);
                                  setInfoMessage("Impresión de carnet estará disponible pronto.");
                                }}
                                className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F8FAFC]"
                              >
                                Imprimir carnet
                              </button>
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

      {contracts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-600">
            Mostrando <span className="font-semibold text-slate-900">{pageStartIndex + 1}</span>-
            <span className="font-semibold text-slate-900">{pageEndIndex}</span> de <span className="font-semibold text-slate-900">{totalRows}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prevPage = Math.max(1, safePage - 1);
                setPage(prevPage);
                setRowMenuOpenId(null);
                if (prevPage !== safePage) {
                  void loadData({ targetPage: prevPage, targetPageSize: pageSize });
                }
              }}
              disabled={safePage <= 1 || loading}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-600">
              Página <span className="font-semibold text-slate-900">{safePage}</span> de <span className="font-semibold text-slate-900">{totalPages}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                const nextPage = Math.min(totalPages, safePage + 1);
                setPage(nextPage);
                setRowMenuOpenId(null);
                if (nextPage !== safePage) {
                  void loadData({ targetPage: nextPage, targetPageSize: pageSize });
                }
              }}
              disabled={safePage >= totalPages || loading}
              className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {ownerType === "PERSON" ? (
        <SubscriptionMembershipEnrollDrawer
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          plans={filteredPlans}
          canViewPricing={canViewPricing}
          hidePricesForOperators={hidePricesForOperators}
          onCreated={async () => {
            await loadData({ targetPage: 1, targetPageSize: pageSize });
          }}
        />
      ) : null}
    </MembershipsShell>
  );
}
