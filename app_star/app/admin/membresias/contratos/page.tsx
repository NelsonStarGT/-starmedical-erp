"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Contract = {
  id: string;
  code: string;
  ownerName: string;
  ownerId: string;
  ownerType: "PERSON" | "COMPANY";
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  ownerNit?: string | null;
  planId: string;
  planName: string;
  planType?: string;
  branchName: string | null;
  status: string;
  nextRenewAt: string | null;
  balance: number;
  billingFrequency: string;
  blocked: boolean;
  blockedReason?: string | null;
};

type PlanOption = { id: string; name: string; priceMonthly: number; type: string };
type ClientOption = { id: string; name: string; type: "PERSON" | "COMPANY"; nit?: string | null; email?: string | null; phone?: string | null };

const API_BASE = "/api/memberships";

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}) from ${url}: ${text.slice(0, 120)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Error ${res.status} on ${url}`);
  return json;
}

const statusTone: Record<string, "success" | "info" | "warning" | "neutral"> = {
  ACTIVO: "success",
  PENDIENTE: "info",
  VENCIDO: "warning",
  SUSPENDIDO: "neutral",
  CANCELADO: "neutral"
};

const currency = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 });
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("es-GT", { day: "2-digit", month: "short" }) : "—");

export default function MembresiasContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    q?: string;
    status?: string;
    type?: string;
    segment?: string;
    entity?: string;
    range?: string;
    customRange?: string;
  }>({});
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [contractForm, setContractForm] = useState({
    planId: "",
    billingFrequency: "MONTHLY",
    startAt: new Date().toISOString().slice(0, 10),
    channel: "",
    assignedBranchId: ""
  });
  const [savingContract, setSavingContract] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    try {
      const json = await safeFetchJson(`${API_BASE}/contracts?${params.toString()}`, { cache: "no-store" });
      setContracts(json.data.items || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [filters.q, filters.status]);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status")?.toUpperCase() || undefined;
    const q = params.get("code") || params.get("q") || "";
    const rangeParam = params.get("range") || undefined;
    const isPresetRange = rangeParam && ["7", "15", "30"].includes(rangeParam);
    const range = isPresetRange ? rangeParam : rangeParam ? "custom" : undefined;
    const customRange = !isPresetRange ? rangeParam : undefined;
    setFilters({ status, q, range, customRange });
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    if (clientQuery.length < 2) {
      setClientResults([]);
      return;
    }
    const handle = setTimeout(() => {
      safeFetchJson(`${API_BASE}/clients?q=${encodeURIComponent(clientQuery)}`)
        .then((json) => setClientResults(json.data || []))
        .catch(() => setClientResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [clientQuery]);

  const fetchPlans = async () => {
    try {
      const json = await safeFetchJson(`${API_BASE}/plans`, { cache: "no-store" });
      const options = (json.data.plans || []).map((p: any) => ({ id: p.id, name: p.name, priceMonthly: Number(p.priceMonthly), type: p.type }));
      setPlans(options);
    } catch (err) {
      setPlans([]);
    }
  };

  const filteredContracts = useMemo(() => {
    const search = (filters.q || "").toLowerCase();
    const status = filters.status;
    const type = filters.type;
    const segment = filters.segment;
    const entity = (filters.entity || "").toLowerCase();
    const range = filters.range;
    const customRange = filters.customRange;
    const now = new Date();

    return contracts.filter((c) => {
      const matchesSearch =
        !search ||
        [c.ownerName, c.code, c.planName, c.ownerEmail || "", c.ownerPhone || "", c.ownerNit || ""].some((field) =>
          field.toLowerCase().includes(search)
        );

      const matchesStatus = status ? c.status === status : true;
      const matchesType = type ? (c.planType || "").toUpperCase() === type.toUpperCase() : true;
      const seg = c.ownerType === "COMPANY" ? "Empresa" : "Particular";
      const matchesSegment = segment ? seg.toLowerCase() === segment.toLowerCase() : true;
      const matchesEntity = entity ? c.ownerName.toLowerCase().includes(entity) || (c.ownerNit || "").toLowerCase().includes(entity) : true;

      let matchesRange = true;
      const days = range === "custom" ? Number(customRange) : range ? Number(range) : null;
      if (days && c.nextRenewAt) {
        const diff = Math.floor((new Date(c.nextRenewAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (!Number.isNaN(days)) {
          matchesRange = diff >= 0 && diff <= days;
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesSegment && matchesEntity && matchesRange;
    });
  }, [contracts, filters]);

  const selectedContract = useMemo(() => contracts.find((c) => c.id === selectedContractId) || null, [contracts, selectedContractId]);

  const submitContract = async () => {
    if (!selectedClient) {
      setError("Selecciona un cliente para crear el contrato");
      return;
    }
    if (!contractForm.planId) {
      setError("Selecciona un plan");
      return;
    }
    setSavingContract(true);
    setError(null);
    const payload = {
      ownerType: selectedClient.type,
      ownerId: selectedClient.id,
      planId: contractForm.planId,
      billingFrequency: contractForm.billingFrequency,
      startAt: contractForm.startAt,
      channel: contractForm.channel || undefined,
      assignedBranchId: contractForm.assignedBranchId || undefined
    };
    try {
      await safeFetchJson(`${API_BASE}/contracts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setContractForm((prev) => ({ ...prev, planId: "", channel: "" }));
      setSelectedClient(null);
      setClientQuery("");
      await fetchContracts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingContract(false);
    }
  };

  const toggleStatus = async (contract: Contract) => {
    const nextStatus = contract.status === "SUSPENDIDO" ? "ACTIVO" : "SUSPENDIDO";
    setStatusUpdatingId(contract.id);
    setError(null);
    try {
      const json = await safeFetchJson(`${API_BASE}/contracts/${contract.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setContracts((prev) => prev.map((c) => (c.id === contract.id ? { ...c, ...json.data } : c)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const nextActionLabel = (contract: Contract) => {
    if (contract.status === "VENCIDO") return "Cobrar en Caja / Facturación";
    if (contract.status === "PENDIENTE") return "Completar cobro inicial";
    if (contract.status === "SUSPENDIDO") return "Reactivar suscripción";
    return contract.nextRenewAt ? "Preparar renovación" : "Revisar renovación";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestión de membresías</h1>
          <p className="text-sm text-slate-600">Encuentra, filtra y acciona suscripciones sin mezclar finanzas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Todos" active={!filters.status} onClick={() => setFilters((prev) => ({ ...prev, status: undefined }))} />
          {["ACTIVO", "PENDIENTE", "SUSPENDIDO", "VENCIDO"].map((st) => (
            <FilterChip key={st} label={st} active={filters.status === st} onClick={() => setFilters((prev) => ({ ...prev, status: st }))} />
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Filtros operativos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Buscar por nombre, correo, teléfono, código MBR, NIT"
              value={filters.q || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={filters.type || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value || undefined }))}
            >
              <option value="">Tipo de plan</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="DUO">Dúo</option>
              <option value="FAMILIAR">Familiar</option>
              <option value="FAMILIAR_PLUS">Familiar Plus</option>
              <option value="ESCOLAR">Escolar</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={filters.segment || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, segment: e.target.value || undefined }))}
            >
              <option value="">Segmento</option>
              <option value="Particular">Particular</option>
              <option value="Empresa">Empresa</option>
              <option value="Colegio">Colegio</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Entidad (empresa/colegio)"
              value={filters.entity || ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, entity: e.target.value }))}
            />
            <div className="flex gap-2">
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={filters.range || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, range: e.target.value || undefined }))}
              >
                <option value="">Renovación</option>
                <option value="7">≤7 días</option>
                <option value="15">≤15 días</option>
                <option value="30">≤30 días</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
          {filters.range === "custom" && (
            <div className="lg:col-span-3">
              <input
                type="number"
                min="1"
                className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm"
                placeholder="Días para próxima renovación"
                value={filters.customRange || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, customRange: e.target.value }))}
              />
            </div>
          )}
          <div className="lg:col-span-3 flex justify-between items-center">
            <span className="text-xs text-slate-500">Resultados: {filteredContracts.length}</span>
            <div className="flex gap-2 text-xs">
              <button className="text-slate-600 underline" onClick={() => setFilters({})}>
                Limpiar filtros
              </button>
              <Link href="/admin/membresias/impresion" className="text-brand-navy underline">
                Impresión
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado operativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-slate-500">Cargando contratos…</p>}
          {!loading && filteredContracts.length === 0 && <p className="text-sm text-slate-500">No hay contratos con los filtros actuales.</p>}
          {!loading && filteredContracts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-3">Titular / Entidad</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Próxima renovación</th>
                    <th className="py-2 pr-3">Saldo</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => {
                    const segment = contract.ownerType === "COMPANY" ? "Empresa" : "Particular";
                    const diffDays = contract.nextRenewAt
                      ? Math.floor((new Date(contract.nextRenewAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    const renewLabel = diffDays !== null ? `${diffDays >= 0 ? "En" : "Hace"} ${Math.abs(diffDays)} días` : "—";
                    return (
                      <tr key={contract.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">{contract.ownerName}</div>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                            <span>MBR: {contract.code}</span>
                            {contract.ownerNit && <span>NIT: {contract.ownerNit}</span>}
                            <span>{segment}</span>
                          </div>
                          {(contract.ownerEmail || contract.ownerPhone) && (
                            <div className="text-xs text-slate-500 flex gap-2">
                              {contract.ownerEmail && <span>{contract.ownerEmail}</span>}
                              {contract.ownerPhone && <span>{contract.ownerPhone}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="text-slate-900 font-semibold">{contract.planName}</div>
                          <div className="text-xs text-slate-500">
                            {contract.planType || "Plan"} · {contract.billingFrequency === "ANNUAL" ? "12m" : "1m"} · {contract.branchName || "Sin sucursal"}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={statusTone[contract.status] || "neutral"}>{contract.status}</Badge>
                          {contract.blocked && (
                            <div className="text-[11px] text-amber-700 mt-1">{contract.blockedReason || "Bloqueado por saldo/fecha"}</div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-1">{nextActionLabel(contract)}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">{formatDate(contract.nextRenewAt)}</div>
                          {contract.nextRenewAt && <div className="text-[11px] text-slate-500">{renewLabel}</div>}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-slate-900">{currency.format(contract.balance)}</div>
                          <div className="text-[11px] text-slate-500">Solo informativo</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-col gap-2">
                            <button
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-brand-navy hover:bg-slate-50 text-left"
                              onClick={() => setSelectedContractId(contract.id)}
                            >
                              Ver detalle
                            </button>
                            <Link
                              href={`/admin/membresias/impresion?code=${contract.code}`}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left"
                            >
                              Imprimir
                            </Link>
                            <Link
                              href={`/admin/finanzas?from=membresias&contract=${contract.id}`}
                              className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-primary/15 text-left"
                            >
                              Renovar (Facturación)
                            </Link>
                            <button
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left disabled:opacity-50"
                              onClick={() => toggleStatus(contract)}
                              disabled={statusUpdatingId === contract.id}
                            >
                              {statusUpdatingId === contract.id ? "Guardando…" : contract.status === "SUSPENDIDO" ? "Reactivar" : "Suspender"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedContract && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Detalle rápido</CardTitle>
              <p className="text-xs text-slate-500">{selectedContract.ownerName} · {selectedContract.planName}</p>
            </div>
            <button className="text-xs text-slate-600 underline" onClick={() => setSelectedContractId(null)}>
              Cerrar
            </button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Estado</p>
              <Badge variant={statusTone[selectedContract.status] || "neutral"}>{selectedContract.status}</Badge>
              {selectedContract.blocked && <p className="text-xs text-amber-700">{selectedContract.blockedReason || "Bloqueado"}</p>}
              <p className="text-xs text-slate-500 mt-2">Próxima acción</p>
              <p className="text-sm font-semibold text-slate-900">{nextActionLabel(selectedContract)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Renovación</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(selectedContract.nextRenewAt)}</p>
              <p className="text-xs text-slate-500">Saldo informativo</p>
              <p className="text-sm font-semibold text-slate-900">{currency.format(selectedContract.balance)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Acciones</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/membresias/impresion?code=${selectedContract.code}`}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Imprimir
                </Link>
                <Link
                  href={`/admin/finanzas?from=membresias&contract=${selectedContract.id}`}
                  className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-primary/15"
                >
                  Cobrar en Caja
                </Link>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => toggleStatus(selectedContract)}
                  disabled={statusUpdatingId === selectedContract.id}
                >
                  {selectedContract.status === "SUSPENDIDO" ? "Reactivar" : "Suspender"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alta rápida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-slate-600 mb-1">Cliente / titular</p>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Buscar cliente (mín. 2 letras)"
              value={clientQuery}
              onChange={(e) => {
                setClientQuery(e.target.value);
                setSelectedClient(null);
              }}
            />
            {clientResults.length > 0 && !selectedClient && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-soft max-h-48 overflow-y-auto">
                {clientResults.map((client) => (
                  <button
                    key={client.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between"
                    onClick={() => {
                      setSelectedClient(client);
                      setClientQuery(client.name);
                    }}
                  >
                    <span>{client.name}</span>
                    <span className="text-xs text-slate-500">{client.type}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedClient && (
              <p className="text-xs text-green-700 mt-1">
                Seleccionado: {selectedClient.name} ({selectedClient.type})
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label className="text-xs text-slate-600">Plan</label>
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={contractForm.planId}
              onChange={(e) => setContractForm((prev) => ({ ...prev, planId: e.target.value }))}
            >
              <option value="">Seleccionar plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {currency.format(plan.priceMonthly)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600">Frecuencia</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={contractForm.billingFrequency}
                onChange={(e) => setContractForm((prev) => ({ ...prev, billingFrequency: e.target.value }))}
              >
                <option value="MONTHLY">Mensual</option>
                <option value="ANNUAL">Anual</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="SEMIANNUAL">Semestral</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Inicio</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={contractForm.startAt}
                onChange={(e) => setContractForm((prev) => ({ ...prev, startAt: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600">Canal</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Web, sucursal, alianza..."
                value={contractForm.channel}
                onChange={(e) => setContractForm((prev) => ({ ...prev, channel: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Sucursal asignada</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="ID de sucursal (opcional)"
                value={contractForm.assignedBranchId}
                onChange={(e) => setContractForm((prev) => ({ ...prev, assignedBranchId: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSelectedClient(null);
                setClientQuery("");
                setContractForm((prev) => ({ ...prev, planId: "" }));
              }}
            >
              Limpiar
            </button>
            <button
              className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-primary/15"
              onClick={submitContract}
              disabled={savingContract}
            >
              {savingContract ? "Guardando..." : "Crear contrato"}
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Alta completa (dependientes, excepciones) se gestiona desde el detalle del contrato. Los cobros viven en Facturación/Caja.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold border transition",
        active ? "border-brand-primary bg-brand-primary/10 text-brand-navy" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}
