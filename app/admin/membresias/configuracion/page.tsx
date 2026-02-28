"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";

type MembershipConfig = {
  reminderDays: number;
  graceDays: number;
  inactiveAfterDays: number;
  autoRenewWithPayment: boolean;
  prorateOnMidmonth: boolean;
  blockIfBalanceDue: boolean;
  hidePricesForOperators: boolean;
  requireInitialPayment: boolean;
  cashTransferMinMonths: number;
  priceChangeNoticeDays: number;
};

type Category = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  isActive: boolean;
  sortOrder: number;
};

type DurationPreset = {
  id: string;
  name: string;
  days: number;
  isActive: boolean;
  sortOrder: number;
  branchId?: string | null;
};

type BenefitCatalog = {
  id: string;
  title: string;
  serviceType: string;
  imageUrl?: string | null;
  iconKey?: string | null;
  isActive: boolean;
  sortOrder: number;
  branchId?: string | null;
};

type ConfigResponse = {
  data: MembershipConfig;
  meta?: {
    canAdmin?: boolean;
    canViewPricing?: boolean;
  };
};

type GatewayConfig = {
  provider: "RECURRENT" | "MANUAL";
  mode: "test" | "live";
  isEnabled: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  apiKeyMasked?: string | null;
  webhookSecretMasked?: string | null;
  lastWebhookAt?: string | null;
};

const DEFAULT_CONFIG: MembershipConfig = {
  reminderDays: 30,
  graceDays: 7,
  inactiveAfterDays: 90,
  autoRenewWithPayment: true,
  prorateOnMidmonth: true,
  blockIfBalanceDue: true,
  hidePricesForOperators: true,
  requireInitialPayment: true,
  cashTransferMinMonths: 2,
  priceChangeNoticeDays: 30
};

const DEFAULT_GATEWAY: GatewayConfig = {
  provider: "RECURRENT",
  mode: "test",
  isEnabled: false,
  hasApiKey: false,
  hasWebhookSecret: false,
  apiKeyMasked: null,
  webhookSecretMasked: null,
  lastWebhookAt: null
};

const TABS = [
  { id: "catalogos", label: "Catálogos" },
  { id: "duraciones", label: "Duraciones" },
  { id: "beneficios", label: "Servicios incluidos" },
  { id: "pasarela", label: "Pasarela de pagos" },
  { id: "permisos", label: "Permisos / Visibilidad" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MembershipConfigPage() {
  const [activeTab, setActiveTab] = useState<TabId>("catalogos");
  const [config, setConfig] = useState<MembershipConfig>(DEFAULT_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<DurationPreset[]>([]);
  const [benefits, setBenefits] = useState<BenefitCatalog[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2C" | "B2B">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [gateway, setGateway] = useState<GatewayConfig>(DEFAULT_GATEWAY);
  const [gatewayApiKey, setGatewayApiKey] = useState("");
  const [gatewayWebhookSecret, setGatewayWebhookSecret] = useState("");
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayTestMessage, setGatewayTestMessage] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    segment: "B2C",
    sortOrder: "0"
  });

  const [newPreset, setNewPreset] = useState({
    name: "",
    days: "30",
    sortOrder: "0"
  });

  const [newBenefit, setNewBenefit] = useState({
    title: "",
    serviceType: "CONSULTA",
    iconKey: "",
    imageUrl: "",
    sortOrder: "0"
  });

  const [editingCategory, setEditingCategory] = useState<Record<string, { name: string; sortOrder: string }>>({});

  const filteredCategories = useMemo(() => {
    if (segmentFilter === "ALL") return categories;
    return categories.filter((category) => category.segment === segmentFilter);
  }, [categories, segmentFilter]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [configRes, categoriesRes, presetsRes, benefitsRes] = await Promise.all([
        fetch("/api/memberships/config", { cache: "no-store" }),
        fetch("/api/memberships/plan-categories?includeInactive=true", { cache: "no-store" }),
        fetch("/api/memberships/config/duration-presets?includeInactive=true", { cache: "no-store" }),
        fetch("/api/memberships/config/benefits?includeInactive=true", { cache: "no-store" })
      ]);

      const configJson: ConfigResponse = await configRes.json();
      const categoriesJson = await categoriesRes.json();
      const presetsJson = await presetsRes.json();
      const benefitsJson = await benefitsRes.json();

      if (!configRes.ok) throw new Error((configJson as any)?.error || "No se pudo cargar configuración");
      if (!categoriesRes.ok) throw new Error(categoriesJson?.error || "No se pudo cargar categorías");
      if (!presetsRes.ok) throw new Error(presetsJson?.error || "No se pudo cargar presets");
      if (!benefitsRes.ok) throw new Error(benefitsJson?.error || "No se pudo cargar servicios incluidos");

      setConfig(configJson.data || DEFAULT_CONFIG);
      const adminAccess = Boolean(configJson.meta?.canAdmin);
      setCanAdmin(adminAccess);

      if (adminAccess) {
        const gatewayRes = await fetch("/api/memberships/config/gateway", { cache: "no-store" });
        const gatewayJson = await gatewayRes.json();
        if (!gatewayRes.ok) throw new Error(gatewayJson?.error || "No se pudo cargar pasarela");
        setGateway(gatewayJson?.data || DEFAULT_GATEWAY);
      } else {
        setGateway(DEFAULT_GATEWAY);
      }

      const categoryRows = Array.isArray(categoriesJson.data) ? categoriesJson.data : [];
      const presetRows = Array.isArray(presetsJson.data) ? presetsJson.data : [];
      const benefitRows = Array.isArray(benefitsJson.data) ? benefitsJson.data : [];

      setCategories(categoryRows);
      setPresets(presetRows);
      setBenefits(benefitRows);
      setEditingCategory(
        categoryRows.reduce((acc: Record<string, { name: string; sortOrder: string }>, row: Category) => {
          acc[row.id] = { name: row.name, sortOrder: String(row.sortOrder) };
          return acc;
        }, {})
      );
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar configuración");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      setSavingConfig(true);
      const res = await fetch("/api/memberships/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar configuración");
      setMessage("Configuración guardada");
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar configuración");
    } finally {
      setSavingConfig(false);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setSavingId("new-category");
      const res = await fetch("/api/memberships/plan-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategory.name,
          segment: newCategory.segment,
          sortOrder: Number(newCategory.sortOrder || 0),
          isActive: true
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear categoría");
      setNewCategory({ name: "", segment: "B2C", sortOrder: "0" });
      setMessage("Categoría creada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear categoría");
    } finally {
      setSavingId(null);
    }
  }

  async function saveCategory(category: Category) {
    const edit = editingCategory[category.id];
    if (!edit) return;

    try {
      setSavingId(category.id);
      const res = await fetch(`/api/memberships/plan-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name,
          sortOrder: Number(edit.sortOrder || 0)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar categoría");
      setMessage("Categoría actualizada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar categoría");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleCategory(category: Category) {
    try {
      setSavingId(category.id);
      const res = await fetch(`/api/memberships/plan-categories/${category.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !category.isActive })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setSavingId(null);
    }
  }

  async function createPreset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setSavingId("new-preset");
      const res = await fetch("/api/memberships/config/duration-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPreset.name,
          days: Number(newPreset.days || 0),
          sortOrder: Number(newPreset.sortOrder || 0),
          isActive: true
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear preset");
      setNewPreset({ name: "", days: "30", sortOrder: "0" });
      setMessage("Preset creado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear preset");
    } finally {
      setSavingId(null);
    }
  }

  async function togglePreset(preset: DurationPreset) {
    try {
      setSavingId(preset.id);
      const res = await fetch(`/api/memberships/config/duration-presets/${preset.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !preset.isActive })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setSavingId(null);
    }
  }

  async function createBenefit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setSavingId("new-benefit");
      const res = await fetch("/api/memberships/config/benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newBenefit.title,
          serviceType: newBenefit.serviceType,
          iconKey: newBenefit.iconKey || null,
          imageUrl: newBenefit.imageUrl || null,
          sortOrder: Number(newBenefit.sortOrder || 0),
          isActive: true
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear servicio incluido");
      setNewBenefit({ title: "", serviceType: "CONSULTA", iconKey: "", imageUrl: "", sortOrder: "0" });
      setMessage("Servicio incluido creado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear servicio incluido");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleBenefit(benefit: BenefitCatalog) {
    try {
      setSavingId(benefit.id);
      const res = await fetch(`/api/memberships/config/benefits/${benefit.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !benefit.isActive })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setSavingId(null);
    }
  }

  async function saveGatewayConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setGatewayTestMessage(null);

    try {
      setSavingId("gateway");
      const payload: Record<string, unknown> = {
        provider: gateway.provider,
        mode: gateway.mode,
        isEnabled: gateway.isEnabled
      };
      if (gatewayApiKey.trim()) payload.apiKey = gatewayApiKey.trim();
      if (gatewayWebhookSecret.trim()) payload.webhookSecret = gatewayWebhookSecret.trim();

      const res = await fetch("/api/memberships/config/gateway", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar configuración de pasarela");

      setGateway(json?.data || DEFAULT_GATEWAY);
      setGatewayApiKey("");
      setGatewayWebhookSecret("");
      setMessage("Pasarela actualizada");
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar configuración de pasarela");
    } finally {
      setSavingId(null);
    }
  }

  async function testGatewayConnection() {
    setError(null);
    setGatewayTestMessage(null);
    try {
      setTestingGateway(true);
      const res = await fetch("/api/memberships/config/gateway/test", {
        method: "POST"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo probar conexión");
      setGatewayTestMessage(json?.data?.message || "Prueba completada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo probar conexión");
    } finally {
      setTestingGateway(false);
    }
  }

  return (
    <MembershipsShell title="Configuración · Membresías" description="Fuente de verdad para catálogos, duración, visibilidad y preparación de pagos recurrentes.">
      {loading ? <p className="text-xs text-slate-500">Cargando configuración...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-[#4aadf5]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "catalogos" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Catálogo de categorías</h2>
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value as "ALL" | "B2C" | "B2B")}
            >
              <option value="ALL">Todos</option>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>

          <form onSubmit={createCategory} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-4">
            <input
              value={newCategory.name}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre categoría"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              required
            />
            <select
              value={newCategory.segment}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, segment: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            >
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
            <input
              type="number"
              min="0"
              value={newCategory.sortOrder}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={savingId === "new-category"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              Crear categoría
            </button>
          </form>

          <CompactTable columns={["Nombre", "Segmento", "Orden", "Estado", "Acciones"]}>
            {filteredCategories.map((category) => (
              <tr key={category.id}>
                <td className="px-3 py-2">
                  <input
                    value={editingCategory[category.id]?.name ?? category.name}
                    onChange={(event) =>
                      setEditingCategory((prev) => ({
                        ...prev,
                        [category.id]: {
                          name: event.target.value,
                          sortOrder: prev[category.id]?.sortOrder ?? String(category.sortOrder)
                        }
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-slate-700">{category.segment}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={editingCategory[category.id]?.sortOrder ?? String(category.sortOrder)}
                    onChange={(event) =>
                      setEditingCategory((prev) => ({
                        ...prev,
                        [category.id]: {
                          name: prev[category.id]?.name ?? category.name,
                          sortOrder: event.target.value
                        }
                      }))
                    }
                    className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {category.isActive ? "ACTIVA" : "INACTIVA"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => saveCategory(category)}
                      disabled={savingId === category.id}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      disabled={savingId === category.id}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                    >
                      {category.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </CompactTable>
        </section>
      ) : null}

      {activeTab === "duraciones" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Presets de duración</h2>
          <form onSubmit={createPreset} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-4">
            <input
              value={newPreset.name}
              onChange={(event) => setNewPreset((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ej. 12 meses"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              required
            />
            <input
              type="number"
              min="1"
              value={newPreset.days}
              onChange={(event) => setNewPreset((prev) => ({ ...prev, days: event.target.value }))}
              placeholder="Días"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              required
            />
            <input
              type="number"
              min="0"
              value={newPreset.sortOrder}
              onChange={(event) => setNewPreset((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={savingId === "new-preset"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              Crear preset
            </button>
          </form>

          <CompactTable columns={["Preset", "Días", "Ámbito", "Estado", "Acciones"]}>
            {presets.map((preset) => (
              <tr key={preset.id}>
                <td className="px-3 py-2 text-xs text-slate-800">{preset.name}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{preset.days}</td>
                <td className="px-3 py-2 text-xs text-slate-700">{preset.branchId ? "Sucursal" : "Global"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${preset.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {preset.isActive ? "ACTIVO" : "INACTIVO"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => togglePreset(preset)}
                    disabled={savingId === preset.id}
                    className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                  >
                    {preset.isActive ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </CompactTable>
        </section>
      ) : null}

      {activeTab === "beneficios" ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Catálogo de servicios incluidos</h2>
          <form onSubmit={createBenefit} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-6">
            <input
              value={newBenefit.title}
              onChange={(event) => setNewBenefit((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Título del servicio"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs md:col-span-2"
              required
            />
            <select
              value={newBenefit.serviceType}
              onChange={(event) => setNewBenefit((prev) => ({ ...prev, serviceType: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            >
              <option value="CONSULTA">Consulta</option>
              <option value="LAB">Lab</option>
              <option value="RX">Rx</option>
              <option value="IMAGEN">Imagen</option>
              <option value="FARMACIA">Farmacia</option>
              <option value="AUDIOLOGIA">Audiología</option>
              <option value="OTRO">Otro</option>
            </select>
            <input
              value={newBenefit.iconKey}
              onChange={(event) => setNewBenefit((prev) => ({ ...prev, iconKey: event.target.value }))}
              placeholder="iconKey"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            />
            <input
              value={newBenefit.imageUrl}
              onChange={(event) => setNewBenefit((prev) => ({ ...prev, imageUrl: event.target.value }))}
              placeholder="imageUrl (opcional)"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={savingId === "new-benefit"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              Crear
            </button>
          </form>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {benefit.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={benefit.imageUrl} alt={benefit.title} className="h-12 w-12 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-500">
                      {benefit.iconKey || "ICON"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{benefit.title}</p>
                    <p className="text-[11px] text-slate-500">{benefit.serviceType}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${benefit.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {benefit.isActive ? "ACTIVO" : "INACTIVO"}
                  </span>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleBenefit(benefit)}
                    disabled={savingId === benefit.id}
                    className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                  >
                    {benefit.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "pasarela" ? (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Pasarela de pagos recurrentes</h2>
          {!canAdmin ? <p className="text-xs text-slate-600">Solo perfiles admin pueden gestionar llaves de pasarela.</p> : null}

          {canAdmin ? (
            <form onSubmit={saveGatewayConfig} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-slate-700">
                  <span className="font-semibold">Provider</span>
                  <select
                    value={gateway.provider}
                    onChange={(event) =>
                      setGateway((prev) => ({
                        ...prev,
                        provider: event.target.value as GatewayConfig["provider"]
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  >
                    <option value="RECURRENT">RECURRENT</option>
                    <option value="MANUAL">MANUAL</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs text-slate-700">
                  <span className="font-semibold">Mode</span>
                  <select
                    value={gateway.mode}
                    onChange={(event) =>
                      setGateway((prev) => ({
                        ...prev,
                        mode: event.target.value as GatewayConfig["mode"]
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  >
                    <option value="test">test</option>
                    <option value="live">live</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs text-slate-700 md:col-span-2">
                  <span className="font-semibold">API key</span>
                  <input
                    type="password"
                    value={gatewayApiKey}
                    onChange={(event) => setGatewayApiKey(event.target.value)}
                    placeholder={gateway.apiKeyMasked || "Ingresar nueva API key"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-500">
                    {gateway.hasApiKey ? `Actual: ${gateway.apiKeyMasked}` : "Sin API key configurada"}
                  </p>
                </label>

                <label className="space-y-1 text-xs text-slate-700 md:col-span-2">
                  <span className="font-semibold">Webhook secret</span>
                  <input
                    type="password"
                    value={gatewayWebhookSecret}
                    onChange={(event) => setGatewayWebhookSecret(event.target.value)}
                    placeholder={gateway.webhookSecretMasked || "Ingresar nuevo webhook secret"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-500">
                    {gateway.hasWebhookSecret ? `Actual: ${gateway.webhookSecretMasked}` : "Sin webhook secret configurado"}
                  </p>
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={gateway.isEnabled}
                  onChange={(event) => setGateway((prev) => ({ ...prev, isEnabled: event.target.checked }))}
                />
                Habilitar pasarela recurrente
              </label>

              <div className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
                Webhook status:{" "}
                <span className="font-semibold text-slate-800">
                  {gateway.lastWebhookAt ? new Date(gateway.lastWebhookAt).toLocaleString() : "sin eventos recibidos"}
                </span>
              </div>

              {gatewayTestMessage ? <p className="text-xs font-medium text-emerald-700">{gatewayTestMessage}</p> : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => testGatewayConnection()}
                  disabled={testingGateway}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                >
                  {testingGateway ? "Probando..." : "Probar conexión"}
                </button>
                <button
                  type="submit"
                  disabled={savingId === "gateway"}
                  className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
                >
                  {savingId === "gateway" ? "Guardando..." : "Guardar pasarela"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {activeTab === "permisos" ? (
        <form onSubmit={saveConfig} className="space-y-3">
          <section className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Visibilidad de precios</h2>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={config.hidePricesForOperators}
                onChange={(event) => setConfig((prev) => ({ ...prev, hidePricesForOperators: event.target.checked }))}
              />
              Ocultar precios a operadores sin permiso de pricing.
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Parámetros globales</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Aviso renovación (días)</span>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  value={config.reminderDays}
                  onChange={(event) => setConfig((prev) => ({ ...prev, reminderDays: Number(event.target.value || 0) }))}
                />
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Período de gracia (días)</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  value={config.graceDays}
                  onChange={(event) => setConfig((prev) => ({ ...prev, graceDays: Number(event.target.value || 0) }))}
                />
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Inactivar después de (días)</span>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  value={config.inactiveAfterDays}
                  onChange={(event) => setConfig((prev) => ({ ...prev, inactiveAfterDays: Number(event.target.value || 0) }))}
                />
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Meses mínimos traslado contado</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  value={config.cashTransferMinMonths}
                  onChange={(event) => setConfig((prev) => ({ ...prev, cashTransferMinMonths: Number(event.target.value || 0) }))}
                />
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Aviso cambio precio (días)</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                  value={config.priceChangeNoticeDays}
                  onChange={(event) => setConfig((prev) => ({ ...prev, priceChangeNoticeDays: Number(event.target.value || 0) }))}
                />
              </label>

              <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={config.blockIfBalanceDue}
                  onChange={(event) => setConfig((prev) => ({ ...prev, blockIfBalanceDue: event.target.checked }))}
                />
                Bloquear beneficios con saldo pendiente
              </label>

              <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={config.autoRenewWithPayment}
                  onChange={(event) => setConfig((prev) => ({ ...prev, autoRenewWithPayment: event.target.checked }))}
                />
                Auto-renovar al pagar
              </label>

              <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={config.prorateOnMidmonth}
                  onChange={(event) => setConfig((prev) => ({ ...prev, prorateOnMidmonth: event.target.checked }))}
                />
                Prorratear altas/upgrade
              </label>

              <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={config.requireInitialPayment}
                  onChange={(event) => setConfig((prev) => ({ ...prev, requireInitialPayment: event.target.checked }))}
                />
                Requiere pago inicial
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingConfig ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </form>
      ) : null}
    </MembershipsShell>
  );
}
