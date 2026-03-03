"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";
import { normalizeSubscriptionsErrorMessage } from "@/lib/subscriptions/uiErrors";

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

type PlanModality = {
  id: string;
  code: "INDIVIDUAL" | "DUO" | "FAMILIAR" | "FAMILIAR_PLUS" | "EMPRESARIAL";
  name: string;
  segment: "B2C" | "B2B";
  mappedPlanType: "INDIVIDUAL" | "FAMILIAR" | "EMPRESARIAL";
  maxDependentsDefault: number;
  allowDependents: boolean;
  isActive: boolean;
  sortOrder: number;
};

type CatalogDefaults = {
  currencyDefault: string;
  benefitWindowDefault: "MENSUAL" | "ANUAL" | "CUSTOM";
  accumulableDefault: boolean;
  defaultModalityCode?: PlanModality["code"] | null;
};

type MembershipCurrency = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type MembershipProductType = {
  id: string;
  code: "RECURRENTE" | "PREPAGO" | "GIFT_CARD";
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type ConfigResponse = {
  data: MembershipConfig;
  meta?: {
    canAdmin?: boolean;
  };
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

const DEFAULT_MODALITIES: PlanModality[] = [
  {
    id: "mod-individual",
    code: "INDIVIDUAL",
    name: "Individual",
    segment: "B2C",
    mappedPlanType: "INDIVIDUAL",
    maxDependentsDefault: 0,
    allowDependents: false,
    isActive: true,
    sortOrder: 10
  },
  {
    id: "mod-duo",
    code: "DUO",
    name: "Dúo",
    segment: "B2C",
    mappedPlanType: "FAMILIAR",
    maxDependentsDefault: 1,
    allowDependents: true,
    isActive: true,
    sortOrder: 20
  },
  {
    id: "mod-familiar",
    code: "FAMILIAR",
    name: "Familiar",
    segment: "B2C",
    mappedPlanType: "FAMILIAR",
    maxDependentsDefault: 4,
    allowDependents: true,
    isActive: true,
    sortOrder: 30
  },
  {
    id: "mod-familiar-plus",
    code: "FAMILIAR_PLUS",
    name: "Familiar Plus",
    segment: "B2C",
    mappedPlanType: "FAMILIAR",
    maxDependentsDefault: 6,
    allowDependents: true,
    isActive: true,
    sortOrder: 40
  },
  {
    id: "mod-empresarial",
    code: "EMPRESARIAL",
    name: "Empresarial",
    segment: "B2B",
    mappedPlanType: "EMPRESARIAL",
    maxDependentsDefault: 50,
    allowDependents: true,
    isActive: true,
    sortOrder: 50
  }
];

const DEFAULT_CATALOG_DEFAULTS: CatalogDefaults = {
  currencyDefault: "GTQ",
  benefitWindowDefault: "MENSUAL",
  accumulableDefault: false,
  defaultModalityCode: "INDIVIDUAL"
};

const DEFAULT_CURRENCIES: MembershipCurrency[] = [
  { id: "cur-gtq", code: "GTQ", name: "Quetzal", isActive: true, sortOrder: 10 },
  { id: "cur-usd", code: "USD", name: "US Dollar", isActive: true, sortOrder: 20 }
];

const DEFAULT_PRODUCT_TYPES: MembershipProductType[] = [
  { id: "ptype-recurrente", code: "RECURRENTE", name: "Recurrente (Membresía)", isActive: true, sortOrder: 10 },
  { id: "ptype-prepago", code: "PREPAGO", name: "Prepago (Plan)", isActive: true, sortOrder: 20 },
  { id: "ptype-gift-card", code: "GIFT_CARD", name: "Gift card", isActive: true, sortOrder: 30 }
];

const CATALOG_OPTIONS = [
  {
    id: "categories",
    label: "Categorías de plan",
    description: "Tipo de servicio del producto: Salud, Lab, Imagen, Educación, SSO, Farmacia."
  },
  {
    id: "modalities",
    label: "Modalidades",
    description: "Estructura comercial del producto: Individual, Dúo, Familiar, Familiar Plus y Empresarial."
  },
  {
    id: "currencies",
    label: "Monedas permitidas",
    description: "Monedas autorizadas para la venta de planes. Planes solo podrán usar monedas activas."
  },
  {
    id: "productTypes",
    label: "Tipos de producto",
    description: "Tipos comerciales disponibles para el editor: Recurrente, Prepago y Gift card."
  },
  {
    id: "defaults",
    label: "Defaults",
    description: "Valores base para crear planes cuando el catálogo aún está en configuración inicial."
  },
  {
    id: "policies",
    label: "Políticas operativas",
    description: "Reglas de operación del módulo: cobro inicial, bloqueo por saldo, visibilidad y ventanas de aviso."
  }
] as const;

type CatalogId = (typeof CATALOG_OPTIONS)[number]["id"];

async function readJson<T>(url: string, fallbackError: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((json as { error?: string })?.error || fallbackError);
  }
  return json as T;
}

export default function MembershipConfigPage() {
  const [activeCatalog, setActiveCatalog] = useState<CatalogId>("categories");
  const [config, setConfig] = useState<MembershipConfig>(DEFAULT_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalities, setModalities] = useState<PlanModality[]>(DEFAULT_MODALITIES);
  const [currencies, setCurrencies] = useState<MembershipCurrency[]>(DEFAULT_CURRENCIES);
  const [productTypes, setProductTypes] = useState<MembershipProductType[]>(DEFAULT_PRODUCT_TYPES);
  const [catalogDefaults, setCatalogDefaults] = useState<CatalogDefaults>(DEFAULT_CATALOG_DEFAULTS);
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2C" | "B2B">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [canAdmin, setCanAdmin] = useState(false);

  const [newCategory, setNewCategory] = useState({ name: "", segment: "B2C", sortOrder: "0" });
  const [editingCategory, setEditingCategory] = useState<Record<string, { name: string; sortOrder: string }>>({});

  const [newModality, setNewModality] = useState({
    code: "INDIVIDUAL" as PlanModality["code"],
    name: "",
    segment: "B2C" as PlanModality["segment"],
    mappedPlanType: "INDIVIDUAL" as PlanModality["mappedPlanType"],
    maxDependentsDefault: "0",
    allowDependents: false,
    sortOrder: "0"
  });

  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    sortOrder: "0"
  });

  const [newProductType, setNewProductType] = useState({
    code: "RECURRENTE" as MembershipProductType["code"],
    name: "",
    sortOrder: "0"
  });

  const filteredCategories = useMemo(() => {
    if (segmentFilter === "ALL") return categories;
    return categories.filter((row) => row.segment === segmentFilter);
  }, [categories, segmentFilter]);

  const filteredModalities = useMemo(() => {
    if (segmentFilter === "ALL") return modalities;
    return modalities.filter((row) => row.segment === segmentFilter);
  }, [modalities, segmentFilter]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    const nextWarnings: string[] = [];

    try {
      const configPromise = readJson<ConfigResponse>("/api/subscriptions/memberships/config", "No se pudo cargar configuración");
      const categoriesPromise = readJson<{ data?: Category[] }>(
        "/api/subscriptions/memberships/plan-categories?includeInactive=true",
        "No se pudo cargar categorías"
      );
      const modalitiesPromise = readJson<{ data?: PlanModality[] }>(
        "/api/subscriptions/memberships/config/modalities",
        "No se pudo cargar modalidades"
      );
      const defaultsPromise = readJson<{ data?: CatalogDefaults }>(
        "/api/subscriptions/memberships/config/defaults",
        "No se pudo cargar defaults"
      );
      const currenciesPromise = readJson<{ data?: MembershipCurrency[] }>(
        "/api/subscriptions/memberships/config/currencies",
        "No se pudieron cargar monedas"
      );
      const productTypesPromise = readJson<{ data?: MembershipProductType[] }>(
        "/api/subscriptions/memberships/config/product-types",
        "No se pudieron cargar tipos de producto"
      );

      const [configResult, categoriesResult, modalitiesResult, defaultsResult, currenciesResult, productTypesResult] = await Promise.allSettled([
        configPromise,
        categoriesPromise,
        modalitiesPromise,
        defaultsPromise,
        currenciesPromise,
        productTypesPromise
      ]);

      if (configResult.status === "fulfilled") {
        setConfig(configResult.value.data || DEFAULT_CONFIG);
        setCanAdmin(Boolean(configResult.value.meta?.canAdmin));
      } else {
        setCanAdmin(false);
        setError(normalizeSubscriptionsErrorMessage(configResult.reason?.message, "No se pudo cargar configuración"));
      }

      if (categoriesResult.status === "fulfilled") {
        const rows = Array.isArray(categoriesResult.value.data) ? categoriesResult.value.data : [];
        setCategories(rows);
        setEditingCategory(
          rows.reduce((acc: Record<string, { name: string; sortOrder: string }>, row) => {
            acc[row.id] = { name: row.name, sortOrder: String(row.sortOrder) };
            return acc;
          }, {})
        );
      } else {
        setCategories([]);
        nextWarnings.push("No se pudieron cargar categorías. Puedes guardar planes con categoría vacía y completar luego.");
      }

      if (modalitiesResult.status === "fulfilled") {
        const rows = Array.isArray(modalitiesResult.value.data) && modalitiesResult.value.data.length > 0 ? modalitiesResult.value.data : DEFAULT_MODALITIES;
        setModalities(rows);
      } else {
        setModalities(DEFAULT_MODALITIES);
        nextWarnings.push("Modalidades no disponibles desde API. Se usan defaults temporales del módulo.");
      }

      if (defaultsResult.status === "fulfilled") {
        setCatalogDefaults(defaultsResult.value.data || DEFAULT_CATALOG_DEFAULTS);
      } else {
        setCatalogDefaults(DEFAULT_CATALOG_DEFAULTS);
        nextWarnings.push("No se pudieron cargar defaults; se aplican valores base (GTQ, ventana mensual, no acumulable).");
      }

      if (currenciesResult.status === "fulfilled") {
        const rows = Array.isArray(currenciesResult.value.data) && currenciesResult.value.data.length > 0 ? currenciesResult.value.data : DEFAULT_CURRENCIES;
        setCurrencies(rows);
      } else {
        setCurrencies(DEFAULT_CURRENCIES);
        nextWarnings.push("No se pudieron cargar monedas permitidas. Se usan GTQ/USD por default.");
      }

      if (productTypesResult.status === "fulfilled") {
        const rows = Array.isArray(productTypesResult.value.data) && productTypesResult.value.data.length > 0 ? productTypesResult.value.data : DEFAULT_PRODUCT_TYPES;
        setProductTypes(rows);
      } else {
        setProductTypes(DEFAULT_PRODUCT_TYPES);
        nextWarnings.push("No se pudieron cargar tipos de producto. Se usan Recurrente/Prepago/Gift card por default.");
      }

      setWarnings(nextWarnings);
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo cargar configuración"));
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
      const response = await fetch("/api/subscriptions/memberships/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo guardar configuración");
      setMessage("Políticas operativas guardadas.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo guardar configuración"));
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
      const response = await fetch("/api/subscriptions/memberships/plan-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategory.name,
          segment: newCategory.segment,
          sortOrder: Number(newCategory.sortOrder || 0),
          isActive: true
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo crear categoría");
      setNewCategory({ name: "", segment: "B2C", sortOrder: "0" });
      setMessage("Categoría creada.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo crear categoría"));
    } finally {
      setSavingId(null);
    }
  }

  async function saveCategory(category: Category) {
    const edit = editingCategory[category.id];
    if (!edit) return;

    try {
      setSavingId(category.id);
      const response = await fetch(`/api/subscriptions/memberships/plan-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name,
          sortOrder: Number(edit.sortOrder || 0)
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo actualizar categoría");
      setMessage("Categoría actualizada.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo actualizar categoría"));
    } finally {
      setSavingId(null);
    }
  }

  async function toggleCategory(category: Category) {
    try {
      setSavingId(category.id);
      const response = await fetch(`/api/subscriptions/memberships/plan-categories/${category.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !category.isActive })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo actualizar estado");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo actualizar estado"));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Eliminar categoría "${category.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      setSavingId(`delete-${category.id}`);
      const response = await fetch(`/api/subscriptions/memberships/plan-categories/${category.id}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo eliminar categoría");
      setMessage("Categoría eliminada.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo eliminar categoría"));
    } finally {
      setSavingId(null);
    }
  }

  function addModality(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newModality.name.trim()) {
      setError("El nombre de modalidad es requerido.");
      return;
    }

    const nowId = `mod-${newModality.code.toLowerCase()}-${Date.now()}`;
    setModalities((prev) => [
      ...prev,
      {
        id: nowId,
        code: newModality.code,
        name: newModality.name.trim(),
        segment: newModality.segment,
        mappedPlanType: newModality.mappedPlanType,
        maxDependentsDefault: Number(newModality.maxDependentsDefault || 0),
        allowDependents: newModality.allowDependents,
        isActive: true,
        sortOrder: Number(newModality.sortOrder || 0)
      }
    ]);

    setNewModality({
      code: "INDIVIDUAL",
      name: "",
      segment: "B2C",
      mappedPlanType: "INDIVIDUAL",
      maxDependentsDefault: "0",
      allowDependents: false,
      sortOrder: "0"
    });
    setMessage("Modalidad agregada localmente. Guarda cambios para persistir.");
  }

  function patchModality(id: string, patch: Partial<PlanModality>) {
    setModalities((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function archiveModality(modality: PlanModality) {
    if (!window.confirm(`Archivar modalidad "${modality.name}"?`)) return;
    const next = modalities.map((item) => (item.id === modality.id ? { ...item, isActive: false } : item));
    try {
      setSavingId(`archive-${modality.id}`);
      const response = await fetch("/api/subscriptions/memberships/config/modalities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo archivar modalidad");
      setMessage("Modalidad archivada.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo archivar modalidad"));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteModality(modality: PlanModality) {
    if (!window.confirm(`Eliminar modalidad "${modality.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      setSavingId(`delete-${modality.id}`);
      const response = await fetch(`/api/subscriptions/memberships/config/modalities/${modality.id}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudo eliminar modalidad");
      setMessage("Modalidad eliminada.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo eliminar modalidad"));
    } finally {
      setSavingId(null);
    }
  }

  async function saveModalities() {
    setError(null);
    setMessage(null);
    try {
      setSavingId("modalities");
      const response = await fetch("/api/subscriptions/memberships/config/modalities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: modalities })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudieron guardar modalidades");
      setMessage("Modalidades guardadas.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudieron guardar modalidades"));
    } finally {
      setSavingId(null);
    }
  }

  async function saveDefaults(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setSavingId("defaults");
      const response = await fetch("/api/subscriptions/memberships/config/defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalogDefaults)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudieron guardar defaults");
      setMessage("Defaults guardados.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudieron guardar defaults"));
    } finally {
      setSavingId(null);
    }
  }

  function addCurrency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = newCurrency.code.trim().toUpperCase();
    const name = newCurrency.name.trim();
    if (!code || !name) {
      setError("Código y nombre de moneda son requeridos.");
      return;
    }
    if (currencies.some((item) => item.code === code)) {
      setError(`La moneda ${code} ya existe.`);
      return;
    }

    setCurrencies((prev) => [
      ...prev,
      {
        id: `cur-${code.toLowerCase()}-${Date.now()}`,
        code,
        name,
        isActive: true,
        sortOrder: Number(newCurrency.sortOrder || 0)
      }
    ]);
    setNewCurrency({ code: "", name: "", sortOrder: "0" });
    setMessage("Moneda agregada localmente. Guarda cambios para persistir.");
  }

  function patchCurrency(id: string, patch: Partial<MembershipCurrency>) {
    setCurrencies((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeCurrency(id: string) {
    setCurrencies((prev) => prev.filter((item) => item.id !== id));
  }

  async function saveCurrencies() {
    setError(null);
    setMessage(null);
    try {
      setSavingId("currencies");
      const response = await fetch("/api/subscriptions/memberships/config/currencies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currencies })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudieron guardar monedas");
      setMessage("Monedas guardadas.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudieron guardar monedas"));
    } finally {
      setSavingId(null);
    }
  }

  function addProductType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newProductType.name.trim();
    if (!name) {
      setError("El nombre del tipo de producto es requerido.");
      return;
    }
    if (productTypes.some((item) => item.code === newProductType.code)) {
      setError(`El tipo ${newProductType.code} ya existe.`);
      return;
    }

    setProductTypes((prev) => [
      ...prev,
      {
        id: `ptype-${newProductType.code.toLowerCase()}-${Date.now()}`,
        code: newProductType.code,
        name,
        isActive: true,
        sortOrder: Number(newProductType.sortOrder || 0)
      }
    ]);
    setNewProductType({ code: "RECURRENTE", name: "", sortOrder: "0" });
    setMessage("Tipo de producto agregado localmente. Guarda cambios para persistir.");
  }

  function patchProductType(id: string, patch: Partial<MembershipProductType>) {
    setProductTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeProductType(id: string) {
    setProductTypes((prev) => prev.filter((item) => item.id !== id));
  }

  async function saveProductTypes() {
    setError(null);
    setMessage(null);
    try {
      setSavingId("productTypes");
      const response = await fetch("/api/subscriptions/memberships/config/product-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: productTypes })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((json as { error?: string })?.error || "No se pudieron guardar tipos de producto");
      setMessage("Tipos de producto guardados.");
      await loadAll();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudieron guardar tipos de producto"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <MembershipsShell
      title="Configuración · Membresías"
      description="Administrador de catálogos para crear productos sin bloqueos y escalar de setup básico a avanzado."
    >
      {loading ? <p className="text-xs text-slate-500">Cargando configuración...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}
      {warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Configuración parcial</p>
          <ul className="mt-1 list-disc pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Catálogo manager</p>
            <p className="text-xs text-slate-600">La Pasarela de pagos se administra en el módulo Suscripciones para evitar mezcla de responsabilidades.</p>
          </div>
          <Link
            href="/admin/suscripciones/pasarela"
            className="rounded-lg border border-[#4aa59c] bg-white px-3 py-2 text-xs font-semibold text-[#4aa59c] hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Ir a Pasarela
          </Link>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[280px_1fr]">
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Catálogo activo</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={activeCatalog}
              onChange={(event) => setActiveCatalog(event.target.value as CatalogId)}
            >
              {CATALOG_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-600">
            {CATALOG_OPTIONS.find((option) => option.id === activeCatalog)?.description}
          </div>
        </div>
      </section>

      {activeCatalog === "categories" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Categorías de plan (tipo de servicio)</h2>
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
              disabled={!canAdmin}
            />
            <select
              value={newCategory.segment}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, segment: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
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
              disabled={!canAdmin}
            />
            <button
              type="submit"
              disabled={savingId === "new-category" || !canAdmin}
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
                    disabled={!canAdmin}
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
                    disabled={!canAdmin}
                  />
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {category.isActive ? "ACTIVA" : "INACTIVA"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => saveCategory(category)}
                      disabled={savingId === category.id || !canAdmin}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      disabled={savingId === category.id || !canAdmin}
                      className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c] disabled:opacity-60"
                    >
                      {category.isActive ? "Archivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      disabled={savingId === `delete-${category.id}` || !canAdmin}
                      className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </CompactTable>
        </section>
      ) : null}

      {activeCatalog === "modalities" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Modalidades de producto</h2>
            <button
              type="button"
              onClick={saveModalities}
              disabled={savingId === "modalities" || !canAdmin}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingId === "modalities" ? "Guardando..." : "Guardar modalidades"}
            </button>
          </div>

          <form onSubmit={addModality} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-8">
            <input
              value={newModality.name}
              onChange={(event) => setNewModality((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs md:col-span-2"
              required
              disabled={!canAdmin}
            />
            <select
              value={newModality.code}
              onChange={(event) => setNewModality((prev) => ({ ...prev, code: event.target.value as PlanModality["code"] }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            >
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="DUO">DUO</option>
              <option value="FAMILIAR">FAMILIAR</option>
              <option value="FAMILIAR_PLUS">FAMILIAR_PLUS</option>
              <option value="EMPRESARIAL">EMPRESARIAL</option>
            </select>
            <select
              value={newModality.segment}
              onChange={(event) => setNewModality((prev) => ({ ...prev, segment: event.target.value as PlanModality["segment"] }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            >
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
            <select
              value={newModality.mappedPlanType}
              onChange={(event) =>
                setNewModality((prev) => ({
                  ...prev,
                  mappedPlanType: event.target.value as PlanModality["mappedPlanType"]
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            >
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="FAMILIAR">FAMILIAR</option>
              <option value="EMPRESARIAL">EMPRESARIAL</option>
            </select>
            <input
              type="number"
              min="0"
              value={newModality.maxDependentsDefault}
              onChange={(event) => setNewModality((prev) => ({ ...prev, maxDependentsDefault: event.target.value }))}
              placeholder="Máx dep."
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            />
            <input
              type="number"
              min="0"
              value={newModality.sortOrder}
              onChange={(event) => setNewModality((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            />
            <button
              type="submit"
              className="rounded-lg border border-[#4aa59c] bg-white px-3 py-2 text-xs font-semibold text-[#4aa59c] hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:opacity-60"
              disabled={!canAdmin}
            >
              Agregar
            </button>
            <label className="md:col-span-8 inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={newModality.allowDependents}
                onChange={(event) => setNewModality((prev) => ({ ...prev, allowDependents: event.target.checked }))}
                disabled={!canAdmin}
              />
              Permite dependientes
            </label>
          </form>

          <CompactTable columns={["Modalidad", "Segmento", "Tipo persistido", "Dep. por defecto", "Estado", "Acciones"]}>
            {filteredModalities
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((modality) => (
                <tr key={modality.id}>
                  <td className="px-3 py-2">
                    <div className="grid gap-1">
                      <input
                        value={modality.name}
                        onChange={(event) => patchModality(modality.id, { name: event.target.value })}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        disabled={!canAdmin}
                      />
                      <p className="text-[11px] text-slate-500">{modality.code}</p>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={modality.segment}
                      onChange={(event) => patchModality(modality.id, { segment: event.target.value as PlanModality["segment"] })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    >
                      <option value="B2C">B2C</option>
                      <option value="B2B">B2B</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={modality.mappedPlanType}
                      onChange={(event) =>
                        patchModality(modality.id, {
                          mappedPlanType: event.target.value as PlanModality["mappedPlanType"]
                        })
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    >
                      <option value="INDIVIDUAL">INDIVIDUAL</option>
                      <option value="FAMILIAR">FAMILIAR</option>
                      <option value="EMPRESARIAL">EMPRESARIAL</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="grid gap-1">
                      <input
                        type="number"
                        min="0"
                        value={modality.maxDependentsDefault}
                        onChange={(event) =>
                          patchModality(modality.id, {
                            maxDependentsDefault: Number(event.target.value || 0)
                          })
                        }
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        disabled={!canAdmin}
                      />
                      <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                        <input
                          type="checkbox"
                          checked={modality.allowDependents}
                          onChange={(event) => patchModality(modality.id, { allowDependents: event.target.checked })}
                          disabled={!canAdmin}
                        />
                        Permite dep.
                      </label>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={modality.isActive}
                        onChange={(event) => patchModality(modality.id, { isActive: event.target.checked })}
                        disabled={!canAdmin}
                      />
                      Activa
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={modality.sortOrder}
                        onChange={(event) => patchModality(modality.id, { sortOrder: Number(event.target.value || 0) })}
                        className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        disabled={!canAdmin}
                      />
                      <button
                        type="button"
                        onClick={() => archiveModality(modality)}
                        className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c] disabled:opacity-60"
                        disabled={savingId === `archive-${modality.id}` || !canAdmin || !modality.isActive}
                      >
                        Archivar
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteModality(modality)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                        disabled={savingId === `delete-${modality.id}` || !canAdmin}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </CompactTable>
        </section>
      ) : null}

      {activeCatalog === "currencies" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Monedas permitidas</h2>
            <button
              type="button"
              onClick={saveCurrencies}
              disabled={savingId === "currencies" || !canAdmin}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingId === "currencies" ? "Guardando..." : "Guardar monedas"}
            </button>
          </div>

          <form onSubmit={addCurrency} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-4">
            <input
              value={newCurrency.code}
              onChange={(event) => setNewCurrency((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              placeholder="Código (GTQ)"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
              required
            />
            <input
              value={newCurrency.name}
              onChange={(event) => setNewCurrency((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
              required
            />
            <input
              type="number"
              min="0"
              value={newCurrency.sortOrder}
              onChange={(event) => setNewCurrency((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            />
            <button
              type="submit"
              className="rounded-lg border border-[#4aa59c] bg-white px-3 py-2 text-xs font-semibold text-[#4aa59c] hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:opacity-60"
              disabled={!canAdmin}
            >
              Agregar
            </button>
          </form>

          <CompactTable columns={["Código", "Nombre", "Orden", "Estado", "Acciones"]}>
            {currencies
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((currency) => (
                <tr key={currency.id}>
                  <td className="px-3 py-2">
                    <input
                      value={currency.code}
                      onChange={(event) => patchCurrency(currency.id, { code: event.target.value.toUpperCase().trim() })}
                      className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={currency.name}
                      onChange={(event) => patchCurrency(currency.id, { name: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={currency.sortOrder}
                      onChange={(event) => patchCurrency(currency.id, { sortOrder: Number(event.target.value || 0) })}
                      className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={currency.isActive}
                        onChange={(event) => patchCurrency(currency.id, { isActive: event.target.checked })}
                        disabled={!canAdmin}
                      />
                      Activa
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeCurrency(currency.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                      disabled={!canAdmin}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </CompactTable>
        </section>
      ) : null}

      {activeCatalog === "productTypes" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Tipos de producto</h2>
            <button
              type="button"
              onClick={saveProductTypes}
              disabled={savingId === "productTypes" || !canAdmin}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingId === "productTypes" ? "Guardando..." : "Guardar tipos"}
            </button>
          </div>

          <form onSubmit={addProductType} className="grid gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 md:grid-cols-4">
            <select
              value={newProductType.code}
              onChange={(event) => setNewProductType((prev) => ({ ...prev, code: event.target.value as MembershipProductType["code"] }))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            >
              <option value="RECURRENTE">RECURRENTE</option>
              <option value="PREPAGO">PREPAGO</option>
              <option value="GIFT_CARD">GIFT_CARD</option>
            </select>
            <input
              value={newProductType.name}
              onChange={(event) => setNewProductType((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre comercial"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
              required
            />
            <input
              type="number"
              min="0"
              value={newProductType.sortOrder}
              onChange={(event) => setNewProductType((prev) => ({ ...prev, sortOrder: event.target.value }))}
              placeholder="Orden"
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
              disabled={!canAdmin}
            />
            <button
              type="submit"
              className="rounded-lg border border-[#4aa59c] bg-white px-3 py-2 text-xs font-semibold text-[#4aa59c] hover:border-[#4aadf5] hover:text-[#2e75ba] disabled:opacity-60"
              disabled={!canAdmin}
            >
              Agregar
            </button>
          </form>

          <CompactTable columns={["Código", "Nombre", "Orden", "Estado", "Acciones"]}>
            {productTypes
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((productType) => (
                <tr key={productType.id}>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">{productType.code}</td>
                  <td className="px-3 py-2">
                    <input
                      value={productType.name}
                      onChange={(event) => patchProductType(productType.id, { name: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={productType.sortOrder}
                      onChange={(event) => patchProductType(productType.id, { sortOrder: Number(event.target.value || 0) })}
                      className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      disabled={!canAdmin}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={productType.isActive}
                        onChange={(event) => patchProductType(productType.id, { isActive: event.target.checked })}
                        disabled={!canAdmin}
                      />
                      Activo
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeProductType(productType.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                      disabled={!canAdmin}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </CompactTable>
        </section>
      ) : null}

      {activeCatalog === "defaults" ? (
        <form onSubmit={saveDefaults} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Defaults del módulo</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Moneda default</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                value={catalogDefaults.currencyDefault}
                onChange={(event) => setCatalogDefaults((prev) => ({ ...prev, currencyDefault: event.target.value.toUpperCase() }))}
                disabled={!canAdmin}
              >
                {currencies
                  .filter((item) => item.isActive)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <option key={`currency-default-${item.id}`} value={item.code}>
                      {item.code} · {item.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Ventana de beneficios</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                value={catalogDefaults.benefitWindowDefault}
                onChange={(event) =>
                  setCatalogDefaults((prev) => ({
                    ...prev,
                    benefitWindowDefault: event.target.value as CatalogDefaults["benefitWindowDefault"]
                  }))
                }
                disabled={!canAdmin}
              >
                <option value="MENSUAL">Mensual</option>
                <option value="ANUAL">Anual</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </label>

            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Modalidad sugerida</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                value={catalogDefaults.defaultModalityCode || ""}
                onChange={(event) =>
                  setCatalogDefaults((prev) => ({
                    ...prev,
                    defaultModalityCode: event.target.value ? (event.target.value as PlanModality["code"]) : null
                  }))
                }
                disabled={!canAdmin}
              >
                <option value="">Sin default</option>
                {modalities
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <option key={`default-modality-${item.id}`} value={item.code}>
                      {item.name} ({item.segment})
                    </option>
                  ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={catalogDefaults.accumulableDefault}
                onChange={(event) => setCatalogDefaults((prev) => ({ ...prev, accumulableDefault: event.target.checked }))}
                disabled={!canAdmin}
              />
              Beneficios acumulables por default
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 text-xs text-slate-600">
            Si un catálogo está incompleto, el editor de planes usará estos defaults y permitirá guardar sin bloquear operación.
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingId === "defaults" || !canAdmin}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingId === "defaults" ? "Guardando..." : "Guardar defaults"}
            </button>
          </div>
        </form>
      ) : null}

      {activeCatalog === "policies" ? (
        <form onSubmit={saveConfig} className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#2e75ba]">Políticas operativas</h2>
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

              <label className="inline-flex items-center gap-2 pt-6 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={config.hidePricesForOperators}
                  onChange={(event) => setConfig((prev) => ({ ...prev, hidePricesForOperators: event.target.checked }))}
                />
                Ocultar precios a operadores
              </label>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingConfig || !canAdmin}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingConfig ? "Guardando..." : "Guardar políticas"}
            </button>
          </div>
        </form>
      ) : null}
    </MembershipsShell>
  );
}
