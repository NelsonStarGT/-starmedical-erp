"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { EmptyState } from "@/components/memberships/EmptyState";
import { FiltersBar } from "@/components/memberships/FiltersBar";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { contractStatusBadgeClass, dateLabel, money } from "@/app/admin/membresias/_lib";
import { buildMembershipInvoiceLink } from "@/lib/memberships/links";

type OwnerType = "PERSON" | "COMPANY";

type PlanOption = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  active: boolean;
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
  MembershipPlan?: {
    id: string;
    name: string;
    segment: "B2C" | "B2B";
  };
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

const BILLING_FREQUENCIES = ["MONTHLY", "ANNUAL", "SEMIANNUAL", "QUARTERLY"] as const;
const STATUS_OPTIONS = ["ACTIVO", "PENDIENTE", "PENDIENTE_PAGO", "SUSPENDIDO", "VENCIDO", "CANCELADO"] as const;

export function ContractsTableView({ ownerType, title, description }: ContractsTableViewProps) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [renewBusyId, setRenewBusyId] = useState<string | null>(null);
  const [recurrentBusyId, setRecurrentBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"" | "MANUAL" | "RECURRENT">("");
  const [renewWindowFilter, setRenewWindowFilter] = useState<"" | "7" | "15" | "30">("");
  const [branchFilter, setBranchFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [createForm, setCreateForm] = useState({
    ownerId: "",
    planId: "",
    startAt: new Date().toISOString().slice(0, 10),
    billingFrequency: "MONTHLY"
  });

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => (ownerType === "PERSON" ? plan.segment === "B2C" : plan.segment === "B2B"));
  }, [plans, ownerType]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("ownerType", ownerType);
    if (query) params.set("q", query);
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("planId", planFilter);
    if (paymentMethodFilter) params.set("paymentMethod", paymentMethodFilter);
    if (renewWindowFilter) params.set("renewWindowDays", renewWindowFilter);
    if (branchFilter) params.set("branchId", branchFilter);

    try {
      const [contractsRes, plansRes] = await Promise.all([
        fetch(`/api/memberships/contracts?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/memberships/plans?active=true", { cache: "no-store" })
      ]);

      const contractsJson: ContractsResponse = await contractsRes.json();
      const plansJson = await plansRes.json();

      if (!contractsRes.ok) throw new Error((contractsJson as any)?.error || "No se pudo cargar afiliaciones");
      if (!plansRes.ok) throw new Error(plansJson?.error || "No se pudo cargar planes");

      setContracts(Array.isArray(contractsJson.data) ? contractsJson.data : []);
      setPlans(Array.isArray(plansJson.data) ? plansJson.data : []);
    } catch (err: any) {
      setError(err?.message || "Error cargando afiliaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!createForm.ownerId || !createForm.planId) {
      setError("ownerId y planId son obligatorios");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch("/api/memberships/contracts", {
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
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo afiliar titular");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(contractId: string, status: string) {
    try {
      setStatusBusyId(contractId);
      const res = await fetch(`/api/memberships/contracts/${contractId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setStatusBusyId(null);
    }
  }

  async function renewMembership(contractId: string) {
    try {
      setRenewBusyId(contractId);
      const res = await fetch(`/api/memberships/contracts/${contractId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAsPaid: false })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo renovar afiliación");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo renovar afiliación");
    } finally {
      setRenewBusyId(null);
    }
  }

  async function activateRecurrent(contractId: string) {
    try {
      setRecurrentBusyId(contractId);
      const res = await fetch(`/api/memberships/contracts/${contractId}/recurrente/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo iniciar checkout recurrente");

      const checkoutUrl = json?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar checkout recurrente");
    } finally {
      setRecurrentBusyId(null);
    }
  }

  return (
    <MembershipsShell
      title={title}
      description={description}
      actions={
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5]"
        >
          {showCreate ? "Cerrar" : "Afiliar"}
        </button>
      }
    >
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${statusFilter === "" ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"}`}
        >
          Todas
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
              statusFilter === status ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <FiltersBar>
        <label className="space-y-1 text-[11px] text-slate-700">
          <span className="font-semibold">Buscar</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre, correo, teléfono, código"
          />
        </label>

        <label className="space-y-1 text-[11px] text-slate-700">
          <span className="font-semibold">Plan</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
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

        <label className="space-y-1 text-[11px] text-slate-700">
          <span className="font-semibold">Pago</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={paymentMethodFilter}
            onChange={(event) => setPaymentMethodFilter(event.target.value as "" | "MANUAL" | "RECURRENT")}
          >
            <option value="">Todos</option>
            <option value="MANUAL">Manual</option>
            <option value="RECURRENT">Recurrente</option>
          </select>
        </label>

        <label className="space-y-1 text-[11px] text-slate-700">
          <span className="font-semibold">Por vencer</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={renewWindowFilter}
            onChange={(event) => setRenewWindowFilter(event.target.value as "" | "7" | "15" | "30")}
          >
            <option value="">No filtrar</option>
            <option value="7">7 días</option>
            <option value="15">15 días</option>
            <option value="30">30 días</option>
          </select>
        </label>

        <label className="space-y-1 text-[11px] text-slate-700">
          <span className="font-semibold">Sucursal (branchId)</span>
          <input
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            placeholder="Opcional"
          />
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => loadData()}
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700"
          >
            Aplicar filtros
          </button>
        </div>
      </FiltersBar>

      {showCreate ? (
        <form onSubmit={submitCreate} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Afiliación rápida</h3>
          <p className="mt-1 text-[11px] text-slate-600">
            MVP seguro: requiere <code>ownerId</code> existente en Clientes. Próximo paso: wizard con búsqueda avanzada.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">ownerId titular</span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.ownerId}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerId: event.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">Plan</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.startAt}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, startAt: event.target.value }))}
                required
              />
            </label>

            <label className="space-y-1 text-[11px] text-slate-700">
              <span className="font-semibold">Frecuencia</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
                value={createForm.billingFrequency}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, billingFrequency: event.target.value }))}
              >
                {BILLING_FREQUENCIES.map((frequency) => (
                  <option key={frequency} value={frequency}>
                    {frequency}
                  </option>
                ))}
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

      {!loading && contracts.length === 0 ? (
        <EmptyState
          title="No hay afiliaciones"
          description="Afiliar un titular habilita renovación, estados y seguimiento operativo."
          ctaHref="#"
          ctaLabel="Afiliar titular"
        />
      ) : null}

      {contracts.length > 0 ? (
        <CompactTable columns={["Afiliación", "Titular", "Plan", "Próx. renovación", "Método", "Saldo", "Estado", "Acciones"]}>
          {contracts.map((contract) => {
            const ownerLabel = contract.ClientProfile
              ? contract.ownerType === "COMPANY"
                ? contract.ClientProfile.companyName || "Empresa"
                : `${contract.ClientProfile.firstName || ""} ${contract.ClientProfile.lastName || ""}`.trim() || "Paciente"
              : "Sin titular";

            return (
              <tr key={contract.id} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <p className="font-semibold text-slate-900">{contract.code}</p>
                  <p className="text-[11px] text-slate-500">Inicio: {dateLabel(contract.startAt)}</p>
                </td>
                <td className="px-3 py-2 text-slate-800">
                  <p>{ownerLabel}</p>
                  <p className="text-[11px] text-slate-500">{contract.ClientProfile?.email || contract.ClientProfile?.phone || "-"}</p>
                </td>
                <td className="px-3 py-2 text-slate-800">{contract.MembershipPlan?.name || "-"}</td>
                <td className="px-3 py-2 text-slate-700">{dateLabel(contract.nextRenewAt)}</td>
                <td className="px-3 py-2 text-slate-700">{contract.paymentMethod || "MANUAL"}</td>
                <td className="px-3 py-2 text-slate-900">{money(contract.balance)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${contractStatusBadgeClass(contract.status)}`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Link
                      href={`/admin/membresias/contratos/${contract.id}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Ver
                    </Link>
                    <button
                      type="button"
                      onClick={() => renewMembership(contract.id)}
                      disabled={renewBusyId === contract.id}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Renovar
                    </button>
                    <Link
                      href={`/admin/membresias/contratos/${contract.id}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Registrar pago
                    </Link>
                    <Link
                      href={buildMembershipInvoiceLink({ contractId: contract.id })}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                    >
                      Ir a facturación
                    </Link>
                    <button
                      type="button"
                      onClick={() => activateRecurrent(contract.id)}
                      disabled={recurrentBusyId === contract.id}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c] disabled:opacity-60"
                    >
                      {recurrentBusyId === contract.id
                        ? "Iniciando..."
                        : contract.paymentMethod === "RECURRENT"
                          ? "Reconfigurar recurrente"
                          : "Activar recurrente"}
                    </button>
                    <select
                      className="rounded-md border border-slate-300 px-1 py-1 text-[11px]"
                      defaultValue={contract.status}
                      disabled={statusBusyId === contract.id}
                      onChange={(event) => {
                        const status = event.target.value;
                        if (status && status !== contract.status) {
                          void changeStatus(contract.id, status);
                        }
                      }}
                    >
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="PENDIENTE_PAGO">PENDIENTE_PAGO</option>
                      <option value="SUSPENDIDO">SUSPENDIDO</option>
                      <option value="VENCIDO">VENCIDO</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </CompactTable>
      ) : null}
    </MembershipsShell>
  );
}
