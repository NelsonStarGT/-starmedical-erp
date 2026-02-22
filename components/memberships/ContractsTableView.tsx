"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
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

export function ContractsTableView({ ownerType, title, description }: ContractsTableViewProps) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
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

    try {
      const [contractsRes, plansRes] = await Promise.all([
        fetch(
          `/api/memberships/contracts?ownerType=${ownerType}${
            query ? `&q=${encodeURIComponent(query)}` : ""
          }${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""}${planFilter ? `&planId=${encodeURIComponent(planFilter)}` : ""}`,
          { cache: "no-store" }
        ),
        fetch("/api/memberships/plans?active=true", { cache: "no-store" })
      ]);

      const contractsJson: ContractsResponse = await contractsRes.json();
      const plansJson = await plansRes.json();

      if (!contractsRes.ok) throw new Error((contractsJson as any)?.error || "No se pudo cargar contratos");
      if (!plansRes.ok) throw new Error(plansJson?.error || "No se pudo cargar planes");

      setContracts(Array.isArray(contractsJson.data) ? contractsJson.data : []);
      setPlans(Array.isArray(plansJson.data) ? plansJson.data : []);
    } catch (err: any) {
      setError(err?.message || "Error cargando contratos");
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
          channel: "ADMIN"
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear contrato");

      setCreateForm((prev) => ({ ...prev, ownerId: "" }));
      setShowCreate(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear contrato");
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
          {showCreate ? "Cerrar" : "Crear contrato"}
        </button>
      }
    >
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
          <span className="font-semibold">Estado</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="SUSPENDIDO">SUSPENDIDO</option>
            <option value="VENCIDO">VENCIDO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Alta rápida de contrato</h3>
          <p className="mt-1 text-[11px] text-slate-600">
            MVP seguro: requiere `ownerId` existente en Clientes. Próximo paso: wizard con búsqueda avanzada.
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
              {busy ? "Creando..." : "Crear contrato"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="text-xs text-slate-500">Cargando contratos...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      {!loading && contracts.length === 0 ? (
        <EmptyState
          title="No hay contratos"
          description="Crea el primer contrato para iniciar la operación del segmento seleccionado."
          ctaHref="#"
          ctaLabel="Crear contrato"
        />
      ) : null}

      {contracts.length > 0 ? (
        <CompactTable columns={["Contrato", "Titular", "Plan", "Próx. renovación", "Saldo", "Estado", "Acciones"]}>
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
                    <Link
                      href={buildMembershipInvoiceLink({ contractId: contract.id })}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                    >
                      Generar factura
                    </Link>
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
