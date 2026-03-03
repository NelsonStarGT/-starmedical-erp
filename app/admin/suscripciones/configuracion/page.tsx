"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/subscriptions/SectionCard";
import { CompactTable } from "@/components/memberships/CompactTable";
import { normalizeSubscriptionsErrorMessage } from "@/lib/subscriptions/uiErrors";

type CompanyOption = {
  id: string;
  name: string;
};

type CompanyCreditRule = {
  companyId: string;
  companyName: string;
  enabled: boolean;
  creditLimit: number;
};

type TenantPoliciesState = {
  dunning: {
    retryDays: string;
    maxAttempts: number;
    frequencyDaily: number;
  };
  deferredBilling: {
    businessDaysOffset: number;
    businessHourStart: string;
    businessHourEnd: string;
    allowNonBusinessDays: boolean;
  };
  couponBook: {
    applyToServices: boolean;
    pharmacyEnabled: boolean;
    adminApprovalRequired: boolean;
  };
  b2cSurcharge: {
    enabled: boolean;
    type: "PERCENT" | "FIXED";
    amount: number;
  };
  b2bCredits: CompanyCreditRule[];
};

const STORAGE_KEY = "__STAR_SUBSCRIPTIONS_TENANT_POLICIES_V1__";

const DEFAULT_POLICIES: TenantPoliciesState = {
  dunning: {
    retryDays: "3,5,7",
    maxAttempts: 3,
    frequencyDaily: 1
  },
  deferredBilling: {
    businessDaysOffset: 1,
    businessHourStart: "08:00",
    businessHourEnd: "17:00",
    allowNonBusinessDays: false
  },
  couponBook: {
    applyToServices: true,
    pharmacyEnabled: false,
    adminApprovalRequired: true
  },
  b2cSurcharge: {
    enabled: false,
    type: "PERCENT",
    amount: 5
  },
  b2bCredits: []
};

function safeParsePolicies(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TenantPoliciesState;
    return parsed;
  } catch {
    return null;
  }
}

export default function SubscriptionsConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [policies, setPolicies] = useState<TenantPoliciesState>(DEFAULT_POLICIES);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCreditLimit, setSelectedCreditLimit] = useState("5000");

  useEffect(() => {
    const localPolicies = safeParsePolicies(window.localStorage.getItem(STORAGE_KEY));
    if (localPolicies) {
      setPolicies(localPolicies);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/subscriptions/memberships/contracts?ownerType=COMPANY&take=200", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudieron cargar empresas para crédito B2B");

        if (!mounted) return;
        const rows = Array.isArray(json?.data) ? json.data : [];
        const mapped: CompanyOption[] = [];
        const seen = new Set<string>();
        for (const row of rows) {
          const ownerId = String(row?.ownerId || row?.ClientProfile?.id || "");
          const ownerName = String(row?.ClientProfile?.companyName || "").trim();
          if (!ownerId || !ownerName || seen.has(ownerId)) continue;
          seen.add(ownerId);
          mapped.push({ id: ownerId, name: ownerName });
        }
        setCompanyOptions(mapped.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: any) {
        if (mounted) setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo cargar configuración"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase();
    if (!term) return companyOptions;
    return companyOptions.filter((row) => row.name.toLowerCase().includes(term));
  }, [companyOptions, companySearch]);

  function addCompanyCreditRule() {
    const company = companyOptions.find((row) => row.id === selectedCompanyId);
    if (!company) {
      setError("Selecciona una empresa válida para crédito B2B.");
      return;
    }
    const amount = Number(selectedCreditLimit || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un límite de crédito válido.");
      return;
    }
    setPolicies((prev) => {
      const without = prev.b2bCredits.filter((row) => row.companyId !== company.id);
      return {
        ...prev,
        b2bCredits: [
          ...without,
          {
            companyId: company.id,
            companyName: company.name,
            enabled: true,
            creditLimit: amount
          }
        ]
      };
    });
    setError(null);
    setMessage(null);
  }

  function removeCompanyCreditRule(companyId: string) {
    setPolicies((prev) => ({
      ...prev,
      b2bCredits: prev.b2bCredits.filter((row) => row.companyId !== companyId)
    }));
  }

  function savePolicies(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
      setMessage("Cambios guardados localmente (borrador).");
    } catch {
      setError("No se pudo guardar en almacenamiento local.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={savePolicies}>
      <SectionCard
        title="Configuración tenant · Suscripciones"
        subtitle="Políticas operativas por tenant para cobro, dunning y crédito."
        actions={
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
            Borrador (sin persistencia)
          </span>
        }
      >
        {loading ? <p className="text-xs text-slate-500">Cargando configuración...</p> : null}
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}
        <p className="text-xs text-slate-600">Cambios se guardan localmente por ahora.</p>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Dunning" subtitle="Intentos y frecuencia diaria para reintentos de cobro.">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Días de reintento</span>
              <input
                value={policies.dunning.retryDays}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    dunning: { ...prev.dunning, retryDays: event.target.value }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="3,5,7"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Máx. intentos</span>
              <input
                type="number"
                min={1}
                max={10}
                value={policies.dunning.maxAttempts}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    dunning: { ...prev.dunning, maxAttempts: Number(event.target.value || 1) }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Frecuencia diaria</span>
              <input
                type="number"
                min={1}
                max={4}
                value={policies.dunning.frequencyDaily}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    dunning: { ...prev.dunning, frequencyDaily: Number(event.target.value || 1) }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard
          title="Facturación diferida"
          subtitle="Define desplazamiento y horario hábil para emitir facturas post-cobro."
        >
          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Días hábiles de desfase</span>
              <input
                type="number"
                min={0}
                max={15}
                value={policies.deferredBilling.businessDaysOffset}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    deferredBilling: { ...prev.deferredBilling, businessDaysOffset: Number(event.target.value || 0) }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Permitir días inhábiles</span>
              <select
                value={policies.deferredBilling.allowNonBusinessDays ? "YES" : "NO"}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    deferredBilling: {
                      ...prev.deferredBilling,
                      allowNonBusinessDays: event.target.value === "YES"
                    }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="NO">No</option>
                <option value="YES">Sí</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Inicio horario hábil</span>
              <input
                type="time"
                value={policies.deferredBilling.businessHourStart}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    deferredBilling: { ...prev.deferredBilling, businessHourStart: event.target.value }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Fin horario hábil</span>
              <input
                type="time"
                value={policies.deferredBilling.businessHourEnd}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    deferredBilling: { ...prev.deferredBilling, businessHourEnd: event.target.value }
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Cuponera" subtitle="Aplicación por servicios y control de aprobación administrativa.">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={policies.couponBook.applyToServices}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    couponBook: { ...prev.couponBook, applyToServices: event.target.checked }
                  }))
                }
              />
              Aplicar cuponera a servicios clínicos
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={policies.couponBook.pharmacyEnabled}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    couponBook: { ...prev.couponBook, pharmacyEnabled: event.target.checked }
                  }))
                }
              />
              Habilitar cuponera para farmacia
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={policies.couponBook.adminApprovalRequired}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    couponBook: { ...prev.couponBook, adminApprovalRequired: event.target.checked }
                  }))
                }
              />
              Requiere aprobación admin
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Recargo B2C" subtitle="Recargo por cambio manual de fecha de cobro en cuentas individuales.">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={policies.b2cSurcharge.enabled}
                onChange={(event) =>
                  setPolicies((prev) => ({
                    ...prev,
                    b2cSurcharge: { ...prev.b2cSurcharge, enabled: event.target.checked }
                  }))
                }
              />
              Habilitado
            </label>
            <select
              value={policies.b2cSurcharge.type}
              onChange={(event) =>
                setPolicies((prev) => ({
                  ...prev,
                  b2cSurcharge: { ...prev.b2cSurcharge, type: event.target.value as "PERCENT" | "FIXED" }
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="PERCENT">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
            <input
              type="number"
              min={0}
              step="0.01"
              value={policies.b2cSurcharge.amount}
              onChange={(event) =>
                setPolicies((prev) => ({
                  ...prev,
                  b2cSurcharge: { ...prev.b2cSurcharge, amount: Number(event.target.value || 0) }
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Crédito B2B por empresa" subtitle="Reglas de crédito para afiliaciones corporativas por tenant.">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Empresa</label>
            <input
              value={companySearch}
              onChange={(event) => setCompanySearch(event.target.value)}
              placeholder="Buscar empresa"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar empresa</option>
              {filteredCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Límite crédito</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={selectedCreditLimit}
              onChange={(event) => setSelectedCreditLimit(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={addCompanyCreditRule}
              className="rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c]"
            >
              Agregar
            </button>
          </div>
        </div>

        <div className="mt-3">
          <CompactTable columns={["Empresa", "Límite", "Estado", "Acciones"]}>
            {policies.b2bCredits.map((rule) => (
              <tr key={rule.companyId}>
                <td className="px-3 py-2 text-slate-800">{rule.companyName}</td>
                <td className="px-3 py-2 text-slate-700">{rule.creditLimit.toFixed(2)}</td>
                <td className="px-3 py-2 text-slate-700">{rule.enabled ? "Activo" : "Inactivo"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeCompanyCreditRule(rule.companyId)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            {policies.b2bCredits.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-xs text-slate-500">
                  Sin reglas de crédito configuradas.
                </td>
              </tr>
            ) : null}
          </CompactTable>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#4aa59c] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar (Borrador)"}
        </button>
      </div>
    </form>
  );
}
