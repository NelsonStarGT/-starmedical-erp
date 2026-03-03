"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSubscriptionsErrorMessage } from "@/lib/subscriptions/uiErrors";
import { cn } from "@/lib/utils";

type PlanCategory = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
  isActive: boolean;
  sortOrder: number;
};

type BenefitCatalog = {
  id: string;
  title: string;
  serviceType: string;
  imageUrl?: string | null;
  iconKey?: string | null;
  isActive: boolean;
};

type PlanBenefitInput = {
  benefitId: string;
  quantity?: number | null;
  isUnlimited?: boolean;
  notes?: string | null;
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

type PlanEditorFormProps = {
  mode: "create" | "edit";
  planId?: string;
  initialData?: {
    slug?: string;
    name?: string;
    description?: string | null;
    type?: "INDIVIDUAL" | "FAMILIAR" | "EMPRESARIAL";
    segment?: "B2C" | "B2B";
    categoryId?: string | null;
    durationPresetId?: string | null;
    customDurationDays?: number | null;
    imageUrl?: string | null;
    active?: boolean;
    priceMonthly?: number;
    priceAnnual?: number;
    currency?: string;
    maxDependents?: number | null;
    benefits?: PlanBenefitInput[];
  };
};

type ProductModel = "RECURRENTE" | "PREPAGO" | "GIFT_CARD";
type BenefitMode = "CUPO" | "ILIMITADO" | "DESCUENTO";
type BenefitWindow = "MENSUAL" | "ANUAL" | "CUSTOM";
type InventoryKind = "SERVICE" | "PRODUCT" | "COMBO";

type InventoryItem = {
  id: string;
  label: string;
  code?: string;
  kind: InventoryKind;
  categoryId: string;
  categoryLabel: string;
};

type SelectedBenefit = {
  benefitId: string;
  mode: BenefitMode;
  quantity: string;
  discountPercent: string;
  window: BenefitWindow;
  windowCustomDays: string;
  inventoryKind: InventoryKind | "";
  inventoryId: string;
  inventoryLabel: string;
  note: string;
};

const PRODUCT_META_REGEX = /^\[product:(RECURRENTE|PREPAGO|GIFT_CARD)\]\s*/i;
const MODALITY_META_REGEX = /^\[modality:([A-Z_]+)\]\s*/i;
const BENEFIT_META_REGEX = /^\[meta:([^\]]+)\]\s*/i;

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

function parseProductMeta(description: string | null | undefined) {
  const original = String(description || "").trim();
  let cursor = original;
  let productModel: ProductModel = "RECURRENTE";
  let modalityCode: PlanModality["code"] | null = null;

  let keepParsing = true;
  while (keepParsing) {
    keepParsing = false;

    const productMatch = cursor.match(PRODUCT_META_REGEX);
    if (productMatch) {
      const raw = String(productMatch[1] || "").toUpperCase();
      if (raw === "PREPAGO") productModel = "PREPAGO";
      else if (raw === "GIFT_CARD") productModel = "GIFT_CARD";
      else productModel = "RECURRENTE";
      cursor = cursor.slice(productMatch[0].length).trimStart();
      keepParsing = true;
    }

    const modalityMatch = cursor.match(MODALITY_META_REGEX);
    if (modalityMatch) {
      const candidate = String(modalityMatch[1] || "").toUpperCase();
      if (candidate === "INDIVIDUAL" || candidate === "DUO" || candidate === "FAMILIAR" || candidate === "FAMILIAR_PLUS" || candidate === "EMPRESARIAL") {
        modalityCode = candidate;
      }
      cursor = cursor.slice(modalityMatch[0].length).trimStart();
      keepParsing = true;
    }
  }

  return { productModel, modalityCode, cleanDescription: cursor.trim() };
}

function buildProductDescription(productModel: ProductModel, modalityCode: PlanModality["code"], description: string) {
  const clean = description.trim();
  return `[product:${productModel}][modality:${modalityCode}]${clean ? ` ${clean}` : ""}`;
}

function modalityByPlanType(type: "INDIVIDUAL" | "FAMILIAR" | "EMPRESARIAL" | undefined): PlanModality["code"] {
  if (type === "EMPRESARIAL") return "EMPRESARIAL";
  if (type === "FAMILIAR") return "FAMILIAR";
  return "INDIVIDUAL";
}

function parseBenefitMeta(note: string | null | undefined) {
  const raw = String(note || "");
  const match = raw.match(BENEFIT_META_REGEX);

  const defaults = {
    mode: "CUPO" as BenefitMode,
    window: "MENSUAL" as BenefitWindow,
    discountPercent: "",
    windowCustomDays: "",
    inventoryKind: "" as InventoryKind | "",
    inventoryId: "",
    inventoryLabel: "",
    cleanNote: raw.trim()
  };

  if (!match?.[1]) return defaults;

  const tokens = match[1].split(";").map((token) => token.trim()).filter(Boolean);
  const map = new Map<string, string>();
  for (const token of tokens) {
    const [key, ...rest] = token.split("=");
    if (!key || rest.length === 0) continue;
    map.set(key.trim().toLowerCase(), rest.join("=").trim());
  }

  const modeRaw = (map.get("m") || "").toUpperCase();
  const mode: BenefitMode = modeRaw === "ILIMITADO" || modeRaw === "DESCUENTO" ? (modeRaw as BenefitMode) : "CUPO";

  const windowRaw = (map.get("w") || "").toUpperCase();
  const window: BenefitWindow = windowRaw === "ANUAL" || windowRaw === "CUSTOM" ? (windowRaw as BenefitWindow) : "MENSUAL";

  const kindRaw = (map.get("k") || "").toUpperCase();
  const inventoryKind: InventoryKind | "" =
    kindRaw === "SERVICE" || kindRaw === "PRODUCT" || kindRaw === "COMBO" ? (kindRaw as InventoryKind) : "";

  let inventoryLabel = map.get("l") || "";
  try {
    if (inventoryLabel) inventoryLabel = decodeURIComponent(inventoryLabel);
  } catch {
    // ignore malformed label
  }

  return {
    mode,
    window,
    discountPercent: map.get("d") || "",
    windowCustomDays: map.get("wd") || "",
    inventoryKind,
    inventoryId: map.get("i") || "",
    inventoryLabel,
    cleanNote: raw.replace(BENEFIT_META_REGEX, "").trim()
  };
}

function buildBenefitNotes(benefit: SelectedBenefit) {
  const parts = [`m=${benefit.mode}`, `w=${benefit.window}`];

  if (benefit.mode === "DESCUENTO" && benefit.discountPercent) {
    parts.push(`d=${benefit.discountPercent}`);
  }

  if (benefit.window === "CUSTOM" && benefit.windowCustomDays) {
    parts.push(`wd=${benefit.windowCustomDays}`);
  }

  if (benefit.inventoryId) {
    parts.push(`k=${benefit.inventoryKind || "SERVICE"}`);
    parts.push(`i=${benefit.inventoryId}`);
    if (benefit.inventoryLabel) {
      parts.push(`l=${encodeURIComponent(benefit.inventoryLabel.slice(0, 60))}`);
    }
  }

  const meta = `[meta:${parts.join(";")}]`;
  const userNote = benefit.note.trim();
  const persisted = `${meta}${userNote ? ` ${userNote}` : ""}`;
  return persisted.slice(0, 240);
}

function toInventoryItem(raw: unknown, kind: InventoryKind): InventoryItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id || "").trim();
  if (!id) return null;

  const label =
    String(row.nombre || row.name || row.title || row.descripcion || "").trim() ||
    `${kind === "SERVICE" ? "Servicio" : kind === "PRODUCT" ? "Producto" : "Combo"} ${id.slice(0, 8)}`;

  const code = String(row.codigoServicio || row.codigo || row.sku || row.code || "").trim();
  const categoryId =
    String(row.categoriaId || row.categoryId || row.subcategoriaId || row.subcategoryId || (kind === "COMBO" ? "combo" : "")).trim() ||
    (kind === "COMBO" ? "combo" : "sin-categoria");

  const categoryObject = row.categoria as Record<string, unknown> | undefined;
  const categoryLabel =
    String(
      (categoryObject && (categoryObject.nombre || categoryObject.name)) || row.categoriaNombre || row.categoryName || categoryId || "Sin categoría"
    ).trim() || "Sin categoría";

  return {
    id,
    label,
    code,
    kind,
    categoryId,
    categoryLabel
  };
}

function toProductTypeDescription(model: ProductModel) {
  if (model === "PREPAGO") return "Prepago";
  if (model === "GIFT_CARD") return "Gift card";
  return "Recurrente";
}

function mapInventoryKindToServiceType(kind: InventoryKind | "") {
  if (kind === "PRODUCT") return "FARMACIA";
  if (kind === "COMBO") return "OTRO";
  return "CONSULTA";
}

function buildInventoryBenefitKey(item: InventoryItem) {
  return `inv:${item.kind}:${item.id}`;
}

function isTemporaryBenefitId(value: string) {
  return value.startsWith("inv:");
}

export function PlanEditorForm({ mode, planId, initialData }: PlanEditorFormProps) {
  const router = useRouter();
  const parsedDescription = parseProductMeta(initialData?.description ?? null);
  const initialModalityCode = parsedDescription.modalityCode || modalityByPlanType(initialData?.type);

  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [modalities, setModalities] = useState<PlanModality[]>(DEFAULT_MODALITIES);
  const [currencies, setCurrencies] = useState<MembershipCurrency[]>(DEFAULT_CURRENCIES);
  const [productTypes, setProductTypes] = useState<MembershipProductType[]>(DEFAULT_PRODUCT_TYPES);
  const [catalogDefaults, setCatalogDefaults] = useState<CatalogDefaults>(DEFAULT_CATALOG_DEFAULTS);
  const [benefits, setBenefits] = useState<BenefitCatalog[]>([]);
  const [inventoryRows, setInventoryRows] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(true);
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [hidePricesForOperators, setHidePricesForOperators] = useState(true);
  const [selectedModalityCode, setSelectedModalityCode] = useState<PlanModality["code"]>(initialModalityCode);

  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryKindFilter, setInventoryKindFilter] = useState<"" | InventoryKind>("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("");
  const [productModel, setProductModel] = useState<ProductModel>(parsedDescription.productModel);

  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? "",
    description: parsedDescription.cleanDescription,
    segment: initialData?.segment ?? "B2C",
    categoryId: initialData?.categoryId ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    active: initialData?.active ?? true,
    priceMonthly: String(initialData?.priceMonthly ?? ""),
    priceAnnual: String(initialData?.priceAnnual ?? ""),
    currency: initialData?.currency ?? DEFAULT_CATALOG_DEFAULTS.currencyDefault,
    maxDependents:
      initialData?.maxDependents !== null && initialData?.maxDependents !== undefined
        ? String(initialData.maxDependents)
        : ""
  });

  const [selectedBenefits, setSelectedBenefits] = useState<SelectedBenefit[]>(() =>
    (initialData?.benefits || []).map((benefit) => {
      const parsedMeta = parseBenefitMeta(benefit.notes || null);
      const mode: BenefitMode = benefit.isUnlimited ? "ILIMITADO" : parsedMeta.mode;
      return {
        benefitId: benefit.benefitId,
        mode,
        quantity: benefit.quantity ? String(benefit.quantity) : "",
        discountPercent: parsedMeta.discountPercent,
        window: parsedMeta.window,
        windowCustomDays: parsedMeta.windowCustomDays,
        inventoryKind: parsedMeta.inventoryKind,
        inventoryId: parsedMeta.inventoryId,
        inventoryLabel: parsedMeta.inventoryLabel,
        note: parsedMeta.cleanNote
      };
    })
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingCatalogs(true);
        setCatalogWarning(null);

        const requests = await Promise.allSettled([
          fetch("/api/subscriptions/memberships/plan-categories?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/benefits?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/modalities", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/defaults", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/currencies", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/product-types", { cache: "no-store" })
        ]);

        if (!mounted) return;

        const warnings: string[] = [];

        const categoriesResult = requests[0];
        if (categoriesResult.status === "fulfilled") {
          const categoriesJson = await categoriesResult.value.json().catch(() => ({}));
          if (categoriesResult.value.ok) {
            setCategories(Array.isArray((categoriesJson as { data?: PlanCategory[] })?.data) ? (categoriesJson as { data?: PlanCategory[] }).data || [] : []);
          } else {
            setCategories([]);
            warnings.push("No se pudieron cargar categorías. Puedes guardar sin categoría y completar luego.");
          }
        } else {
          setCategories([]);
          warnings.push("No se pudieron cargar categorías. Puedes guardar sin categoría y completar luego.");
        }

        const benefitsResult = requests[1];
        if (benefitsResult.status === "fulfilled") {
          const benefitsJson = await benefitsResult.value.json().catch(() => ({}));
          if (benefitsResult.value.ok) {
            setBenefits(Array.isArray((benefitsJson as { data?: BenefitCatalog[] })?.data) ? (benefitsJson as { data?: BenefitCatalog[] }).data || [] : []);
          } else {
            setBenefits([]);
            warnings.push("No se pudo cargar catálogo de beneficios. Puedes crear el plan y vincular beneficios después.");
          }
        } else {
          setBenefits([]);
          warnings.push("No se pudo cargar catálogo de beneficios. Puedes crear el plan y vincular beneficios después.");
        }

        const configResult = requests[2];
        if (configResult.status === "fulfilled") {
          const configJson = await configResult.value.json().catch(() => ({}));
          if (configResult.value.ok) {
            setCanAdmin(Boolean((configJson as any)?.meta?.canAdmin));
            setCanViewPricing(Boolean((configJson as any)?.meta?.canViewPricing));
            setHidePricesForOperators(Boolean((configJson as any)?.data?.hidePricesForOperators));
          } else {
            warnings.push("No se pudieron validar permisos con Configuración. Se aplican defaults de edición local.");
          }
        } else {
          warnings.push("No se pudieron validar permisos con Configuración. Se aplican defaults de edición local.");
        }

        const modalitiesResult = requests[3];
        if (modalitiesResult.status === "fulfilled") {
          const modalitiesJson = await modalitiesResult.value.json().catch(() => ({}));
          if (modalitiesResult.value.ok && Array.isArray((modalitiesJson as { data?: PlanModality[] })?.data) && (modalitiesJson as { data?: PlanModality[] }).data?.length) {
            setModalities((modalitiesJson as { data?: PlanModality[] }).data || DEFAULT_MODALITIES);
          } else {
            setModalities(DEFAULT_MODALITIES);
            warnings.push("No se pudo cargar catálogo de modalidades. Se usan defaults del módulo.");
          }
        } else {
          setModalities(DEFAULT_MODALITIES);
          warnings.push("No se pudo cargar catálogo de modalidades. Se usan defaults del módulo.");
        }

        const defaultsResult = requests[4];
        if (defaultsResult.status === "fulfilled") {
          const defaultsJson = await defaultsResult.value.json().catch(() => ({}));
          if (defaultsResult.value.ok && (defaultsJson as { data?: CatalogDefaults })?.data) {
            const nextDefaults = (defaultsJson as { data?: CatalogDefaults }).data || DEFAULT_CATALOG_DEFAULTS;
            setCatalogDefaults(nextDefaults);
            setForm((prev) => ({
              ...prev,
              currency: prev.currency || nextDefaults.currencyDefault || DEFAULT_CATALOG_DEFAULTS.currencyDefault
            }));
          } else {
            setCatalogDefaults(DEFAULT_CATALOG_DEFAULTS);
          }
        } else {
          setCatalogDefaults(DEFAULT_CATALOG_DEFAULTS);
        }

        const currenciesResult = requests[5];
        if (currenciesResult.status === "fulfilled") {
          const currenciesJson = await currenciesResult.value.json().catch(() => ({}));
          if (currenciesResult.value.ok && Array.isArray((currenciesJson as { data?: MembershipCurrency[] })?.data)) {
            const rows = (currenciesJson as { data?: MembershipCurrency[] }).data || [];
            setCurrencies(rows.length > 0 ? rows : DEFAULT_CURRENCIES);
          } else {
            setCurrencies(DEFAULT_CURRENCIES);
            warnings.push("No se pudieron cargar monedas configuradas. Se usa GTQ/USD por default.");
          }
        } else {
          setCurrencies(DEFAULT_CURRENCIES);
          warnings.push("No se pudieron cargar monedas configuradas. Se usa GTQ/USD por default.");
        }

        const productTypesResult = requests[6];
        if (productTypesResult.status === "fulfilled") {
          const productTypesJson = await productTypesResult.value.json().catch(() => ({}));
          if (productTypesResult.value.ok && Array.isArray((productTypesJson as { data?: MembershipProductType[] })?.data)) {
            const rows = (productTypesJson as { data?: MembershipProductType[] }).data || [];
            setProductTypes(rows.length > 0 ? rows : DEFAULT_PRODUCT_TYPES);
          } else {
            setProductTypes(DEFAULT_PRODUCT_TYPES);
            warnings.push("No se pudieron cargar tipos de producto. Se usa catálogo base.");
          }
        } else {
          setProductTypes(DEFAULT_PRODUCT_TYPES);
          warnings.push("No se pudieron cargar tipos de producto. Se usa catálogo base.");
        }

        if (warnings.length > 0) {
          setCatalogWarning(warnings.join(" "));
        }
      } catch (err: any) {
        if (mounted) setError(normalizeSubscriptionsErrorMessage(err?.message, "Error cargando catálogos"));
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setInventoryLoading(true);
        const query = inventorySearch.trim();
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (inventoryKindFilter) params.set("type", inventoryKindFilter);
        params.set("limit", "120");

        const response = await fetch(`/api/inventory/search?${params.toString()}`, {
          cache: "no-store",
          headers: { "x-role": "Administrador" },
          signal: controller.signal
        });
        const json = await response.json().catch(() => ({}));
        if (!mounted) return;

        if (!response.ok) {
          setInventoryRows([]);
          setInventoryWarning("No se pudo consultar Inventario en este momento.");
          return;
        }

        const rows = Array.isArray((json as { data?: unknown[] })?.data)
          ? ((json as { data?: unknown[] }).data || [])
              .map((row) => {
                if (!row || typeof row !== "object") return null;
                const item = row as Record<string, unknown>;
                const typeRaw = String(item.type || "").toUpperCase();
                const kind: InventoryKind = typeRaw === "PRODUCT" ? "PRODUCT" : typeRaw === "COMBO" ? "COMBO" : "SERVICE";
                return toInventoryItem(
                  {
                    id: item.id,
                    name: item.name,
                    code: item.code,
                    categoryId: item.categoryId,
                    categoryName: item.categoryName
                  },
                  kind
                );
              })
              .filter(Boolean) as InventoryItem[]
          : [];

        setInventoryRows(rows);
        const warning = String((json as { meta?: { warning?: string } })?.meta?.warning || "").trim();
        setInventoryWarning(warning || null);
      } catch (err: any) {
        if (!mounted) return;
        if (err?.name === "AbortError") return;
        setInventoryRows([]);
        setInventoryWarning("No se pudo consultar Inventario. Puedes guardar y completar beneficios después.");
      } finally {
        if (mounted) setInventoryLoading(false);
      }
    }, 280);

    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [inventorySearch, inventoryKindFilter]);

  const shouldHidePricing = hidePricesForOperators && !canViewPricing;

  const availableCategories = useMemo(
    () => categories.filter((category) => category.segment === form.segment && category.isActive),
    [categories, form.segment]
  );

  const availableModalities = useMemo(() => {
    const scoped = modalities
      .filter((modality) => modality.segment === form.segment && modality.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (scoped.length > 0) return scoped;
    return DEFAULT_MODALITIES.filter((modality) => modality.segment === form.segment);
  }, [modalities, form.segment]);

  const availableCurrencies = useMemo(() => {
    const rows = currencies.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    return rows.length > 0 ? rows : DEFAULT_CURRENCIES;
  }, [currencies]);

  const availableProductTypes = useMemo(() => {
    const rows = productTypes.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    return rows.length > 0 ? rows : DEFAULT_PRODUCT_TYPES;
  }, [productTypes]);

  const selectedModality = useMemo(
    () => availableModalities.find((item) => item.code === selectedModalityCode) || availableModalities[0] || null,
    [availableModalities, selectedModalityCode]
  );

  useEffect(() => {
    if (!selectedModality && availableModalities.length > 0) {
      setSelectedModalityCode(availableModalities[0].code);
      return;
    }
    if (selectedModality && !form.maxDependents) {
      setForm((prev) => ({ ...prev, maxDependents: String(selectedModality.maxDependentsDefault || 0) }));
    }
  }, [availableModalities, selectedModality, form.maxDependents]);

  useEffect(() => {
    if (!availableCurrencies.some((item) => item.code === form.currency)) {
      setForm((prev) => ({ ...prev, currency: availableCurrencies[0]?.code || DEFAULT_CATALOG_DEFAULTS.currencyDefault }));
    }
  }, [availableCurrencies, form.currency]);

  useEffect(() => {
    if (!availableProductTypes.some((item) => item.code === productModel)) {
      setProductModel(availableProductTypes[0]?.code || "RECURRENTE");
    }
  }, [availableProductTypes, productModel]);

  const selectedBenefitByInventoryKey = useMemo(() => {
    const map = new Set<string>();
    for (const benefit of selectedBenefits) {
      if (benefit.inventoryKind && benefit.inventoryId) {
        map.add(`${benefit.inventoryKind}:${benefit.inventoryId}`);
      }
    }
    return map;
  }, [selectedBenefits]);

  const inventoryCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventoryRows) {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, item.categoryLabel);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [inventoryRows]);

  const filteredInventoryItems = useMemo(() => {
    return inventoryRows.filter((item) => {
      if (inventoryCategoryFilter && item.categoryId !== inventoryCategoryFilter) return false;
      return true;
    });
  }, [inventoryRows, inventoryCategoryFilter]);

  function toggleInventoryBenefitSelection(item: InventoryItem) {
    setSelectedBenefits((prev) => {
      const key = `${item.kind}:${item.id}`;
      const exists = prev.some((benefit) => `${benefit.inventoryKind}:${benefit.inventoryId}` === key);
      if (exists) return prev.filter((benefit) => `${benefit.inventoryKind}:${benefit.inventoryId}` !== key);

      const serviceType = mapInventoryKindToServiceType(item.kind);
      const existingCatalog = benefits.find(
        (benefit) => benefit.isActive && benefit.serviceType === serviceType && benefit.title.trim().toLowerCase() === item.label.trim().toLowerCase()
      );

      return [
        ...prev,
        {
          benefitId: existingCatalog?.id || buildInventoryBenefitKey(item),
          mode: "CUPO",
          quantity: "1",
          discountPercent: "",
          window: catalogDefaults.benefitWindowDefault,
          windowCustomDays: "",
          inventoryKind: item.kind,
          inventoryId: item.id,
          inventoryLabel: item.label,
          note: ""
        }
      ];
    });
  }

  function patchBenefit(benefitId: string, patch: Partial<SelectedBenefit>) {
    setSelectedBenefits((prev) => prev.map((item) => (item.benefitId === benefitId ? { ...item, ...patch } : item)));
  }

  function setBenefitMode(benefitId: string, mode: BenefitMode) {
    patchBenefit(benefitId, {
      mode,
      quantity: mode === "CUPO" ? "1" : "",
      discountPercent: mode === "DESCUENTO" ? "10" : ""
    });
  }

  function validateBenefitsBeforeSubmit() {
    for (const benefit of selectedBenefits) {
      if (benefit.mode === "CUPO") {
        const quantity = Number(benefit.quantity || 0);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          setError("Cada beneficio en modo cupo debe tener cantidad mayor a 0.");
          return false;
        }
      }

      if (benefit.mode === "DESCUENTO") {
        const discount = Number(benefit.discountPercent || 0);
        if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
          setError("Cada beneficio en modo descuento debe tener un porcentaje entre 0 y 100.");
          return false;
        }
      }

      if (benefit.window === "CUSTOM") {
        const customDays = Number(benefit.windowCustomDays || 0);
        if (!Number.isFinite(customDays) || customDays <= 0) {
          setError("La ventana personalizada debe tener días válidos.");
          return false;
        }
      }
    }

    return true;
  }

  async function resolveBenefitCatalogId(benefit: SelectedBenefit): Promise<string> {
    if (!isTemporaryBenefitId(benefit.benefitId)) {
      return benefit.benefitId;
    }

    const title =
      benefit.inventoryLabel.trim() ||
      filteredInventoryItems.find((item) => item.id === benefit.inventoryId && item.kind === benefit.inventoryKind)?.label ||
      benefit.benefitId;
    const serviceType = mapInventoryKindToServiceType(benefit.inventoryKind);

    const existing = benefits.find(
      (item) => item.serviceType === serviceType && item.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (existing) return existing.id;

    const response = await fetch("/api/subscriptions/memberships/config/benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.slice(0, 160),
        serviceType,
        iconKey: benefit.inventoryKind || null,
        sortOrder: 0,
        isActive: true
      })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as { error?: string })?.error || `No se pudo registrar beneficio para ${title}`);
    }

    const created = (json as { data?: BenefitCatalog })?.data;
    if (!created?.id) throw new Error(`No se pudo registrar beneficio para ${title}`);

    setBenefits((prev) => {
      if (prev.some((row) => row.id === created.id)) return prev;
      return [...prev, created];
    });

    return created.id;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canAdmin) {
      setError("Solo administradores pueden crear o editar planes.");
      return;
    }

    if (!validateBenefitsBeforeSubmit()) {
      return;
    }

    const persistedType = selectedModality?.mappedPlanType || (form.segment === "B2B" ? "EMPRESARIAL" : "INDIVIDUAL");
    const resolvedMaxDependents =
      form.maxDependents !== ""
        ? Number(form.maxDependents)
        : selectedModality
          ? Number(selectedModality.maxDependentsDefault || 0)
          : null;

    const resolvedBenefits = await Promise.all(
      selectedBenefits.map(async (benefit) => ({
        benefitId: await resolveBenefitCatalogId(benefit),
        quantity: benefit.mode === "CUPO" ? Number(benefit.quantity || 0) : null,
        isUnlimited: benefit.mode === "ILIMITADO",
        notes: buildBenefitNotes(benefit)
      }))
    );

    const payload: Record<string, unknown> = {
      slug: form.slug || undefined,
      name: form.name,
      description: buildProductDescription(productModel, selectedModalityCode, form.description),
      type: persistedType,
      segment: form.segment,
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl || null,
      active: form.active,
      currency: form.currency,
      maxDependents: resolvedMaxDependents,
      benefits: resolvedBenefits
    };

    if (!shouldHidePricing || mode === "create") {
      payload.priceMonthly = Number(form.priceMonthly);
      payload.priceAnnual = Number(form.priceAnnual);
    }

    try {
      setBusy(true);
      const url = mode === "create" ? "/api/subscriptions/memberships/plans" : `/api/subscriptions/memberships/plans/${planId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar plan");
      router.push("/admin/suscripciones/membresias/planes");
      router.refresh();
    } catch (err: any) {
      setError(normalizeSubscriptionsErrorMessage(err?.message, "No se pudo guardar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {loadingCatalogs ? <p className="text-xs text-slate-500">Cargando catálogos...</p> : null}
      {catalogWarning ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{catalogWarning}</div> : null}
      {!canAdmin ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Edición restringida: este formulario es solo para perfiles administradores.
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#2e75ba]">A) Identidad del producto</h3>
          <span className="rounded-full border border-slate-200 bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {toProductTypeDescription(productModel)}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Nombre</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Slug</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              placeholder="se-genera-si-lo-dejas-vacio"
            />
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Segmento</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.segment}
              onChange={(event) => {
                const segment = event.target.value as "B2C" | "B2B";
                const defaultFromConfig = modalities.find(
                  (item) => item.isActive && item.segment === segment && item.code === catalogDefaults.defaultModalityCode
                );
                const fallbackBySegment = modalities.find((item) => item.isActive && item.segment === segment);
                const hardFallback = DEFAULT_MODALITIES.find((item) => item.segment === segment);
                setForm((prev) => ({
                  ...prev,
                  segment,
                  categoryId: ""
                }));
                setSelectedModalityCode((defaultFromConfig || fallbackBySegment || hardFallback || DEFAULT_MODALITIES[0]).code);
              }}
            >
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Tipo de producto</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={productModel}
              onChange={(event) => setProductModel(event.target.value as ProductModel)}
              disabled={!canAdmin}
            >
              {availableProductTypes.map((productType) => (
                <option key={`product-type-${productType.id}`} value={productType.code}>
                  {productType.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Categoría (tipo de servicio)</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              disabled={loadingCatalogs}
            >
              <option value="">Sin categoría</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {availableCategories.length === 0 ? (
              <span className="block text-[11px] text-amber-700">
                No hay categorías activas para {form.segment}. Puedes guardar sin categoría y completarla después desde Configuración.
              </span>
            ) : null}
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Modalidad</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedModalityCode}
              onChange={(event) => setSelectedModalityCode(event.target.value as PlanModality["code"])}
            >
              {availableModalities.map((modality) => (
                <option key={`modality-${modality.id}`} value={modality.code}>
                  {modality.name}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-slate-500">
              Persistencia interna: {selectedModality?.mappedPlanType || "INDIVIDUAL"}.
            </span>
          </label>

          <label className="space-y-1 text-xs text-slate-700 md:col-span-2">
            <span className="font-medium">Descripción comercial</span>
            <textarea
              className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descripción para operadores y catálogo interno"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Imagen del producto (URL)</span>
            <input
              type="url"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.imageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
              placeholder="https://..."
              disabled={!canAdmin}
            />
            <span className="block text-[11px] text-slate-500">MVP: URL directa. El uploader se integra cuando esté habilitada la infraestructura de archivos.</span>
          </label>

          <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Preview</p>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="Vista previa plan" className="h-24 w-full rounded-md object-cover" />
            ) : (
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500">Sin imagen</div>
            )}
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            disabled={!canAdmin}
          />
          Producto activo
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2e75ba]">B) Precios</h3>
        <p className="text-xs text-slate-600">La vigencia de la afiliación se define al pagar/afiliar; el producto define beneficios y precios.</p>

        {shouldHidePricing ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] p-3 text-xs text-slate-600">
            Precio oculto por política de visibilidad. Se requiere permiso <code>MEMBERSHIPS:PRICING:VIEW</code>.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-medium">Precio mensual</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={form.priceMonthly}
                onChange={(event) => setForm((prev) => ({ ...prev, priceMonthly: event.target.value }))}
                required={mode === "create"}
                disabled={!canAdmin}
              />
            </label>

            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-medium">Precio anual</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={form.priceAnnual}
                onChange={(event) => setForm((prev) => ({ ...prev, priceAnnual: event.target.value }))}
                required={mode === "create"}
                disabled={!canAdmin}
              />
            </label>

            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-medium">Moneda</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                disabled={!canAdmin}
              >
                {availableCurrencies.map((currency) => (
                  <option key={`currency-${currency.id}`} value={currency.code}>
                    {currency.code} · {currency.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2e75ba]">C) Beneficios (vinculados a inventario)</h3>
        <p className="text-xs text-slate-600">
          Busca beneficios reales en Inventario (servicios/productos/combos). El sistema crea o reutiliza el catálogo interno automáticamente al guardar.
        </p>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Buscar en inventario</p>
          <div className="grid gap-2 md:grid-cols-[1fr_180px_220px]">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
              placeholder="Nombre o código del servicio/producto/combo"
            />
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={inventoryKindFilter}
              onChange={(event) => setInventoryKindFilter(event.target.value as "" | InventoryKind)}
            >
              <option value="">Todos los tipos</option>
              <option value="SERVICE">Servicios</option>
              <option value="PRODUCT">Productos</option>
              <option value="COMBO">Combos</option>
            </select>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={inventoryCategoryFilter}
              onChange={(event) => setInventoryCategoryFilter(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {inventoryCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            Resultados: {filteredInventoryItems.length} {inventoryLoading ? "· buscando..." : ""}
          </p>
          {inventoryWarning ? <p className="text-[11px] font-medium text-amber-700">{inventoryWarning}</p> : null}

          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
            {filteredInventoryItems.map((item) => {
              const key = `${item.kind}:${item.id}`;
              const checked = selectedBenefitByInventoryKey.has(key);
              return (
                <label key={key} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                  <input type="checkbox" checked={checked} onChange={() => toggleInventoryBenefitSelection(item)} />
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="text-slate-500">{item.kind}</span>
                  {item.code ? <span className="text-slate-500">· {item.code}</span> : null}
                  <span className="ml-auto text-[11px] text-slate-500">{item.categoryLabel}</span>
                </label>
              );
            })}
            {filteredInventoryItems.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">Sin resultados.</p> : null}
          </div>
        </div>

        {selectedBenefits.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            {selectedBenefits.map((benefit) => {
              const detail = benefits.find((item) => item.id === benefit.benefitId);
              const title = benefit.inventoryLabel || detail?.title || benefit.benefitId;
              const typeLabel = benefit.inventoryKind || detail?.serviceType || "OTRO";
              return (
                <div key={benefit.benefitId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="text-[11px] text-slate-500">
                        {typeLabel}
                        {benefit.inventoryId ? ` · ${benefit.inventoryId}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBenefits((prev) =>
                          prev.filter((item) => {
                            if (benefit.inventoryKind && benefit.inventoryId) {
                              return !(item.inventoryKind === benefit.inventoryKind && item.inventoryId === benefit.inventoryId);
                            }
                            return item.benefitId !== benefit.benefitId;
                          })
                        );
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["CUPO", "ILIMITADO", "DESCUENTO"] as BenefitMode[]).map((modeOption) => {
                      const active = benefit.mode === modeOption;
                      return (
                        <button
                          key={modeOption}
                          type="button"
                          onClick={() => setBenefitMode(benefit.benefitId, modeOption)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                            active ? "border-[#4aa59c] bg-[#F8FAFC] text-[#2e75ba]" : "border-slate-200 bg-white text-slate-700"
                          )}
                        >
                          {modeOption === "CUPO" ? "Cupo" : modeOption === "ILIMITADO" ? "Ilimitado" : "Descuento %"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-medium">Cantidad</span>
                      <input
                        type="number"
                        min="1"
                        value={benefit.quantity}
                        disabled={benefit.mode !== "CUPO"}
                        onChange={(event) => patchBenefit(benefit.benefitId, { quantity: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                        placeholder="1"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-medium">Descuento %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={benefit.discountPercent}
                        disabled={benefit.mode !== "DESCUENTO"}
                        onChange={(event) => patchBenefit(benefit.benefitId, { discountPercent: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                        placeholder="10"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-medium">Ventana</span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        value={benefit.window}
                        onChange={(event) => patchBenefit(benefit.benefitId, { window: event.target.value as BenefitWindow })}
                      >
                        <option value="MENSUAL">Mensual</option>
                        <option value="ANUAL">Anual</option>
                        <option value="CUSTOM">Custom días</option>
                      </select>
                    </label>

                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-medium">Ventana custom (días)</span>
                      <input
                        type="number"
                        min="1"
                        value={benefit.windowCustomDays}
                        disabled={benefit.window !== "CUSTOM"}
                        onChange={(event) => patchBenefit(benefit.benefitId, { windowCustomDays: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs disabled:bg-slate-100"
                        placeholder="30"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-xs text-slate-700">
                    <span className="font-medium">Notas</span>
                    <input
                      value={benefit.note}
                      onChange={(event) => patchBenefit(benefit.benefitId, { note: event.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      placeholder="Notas operativas"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-[#F8FAFC] p-3 text-xs text-slate-600">
            Selecciona al menos un beneficio para definir cupo/ilimitado/descuento y su ventana de uso.
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2e75ba]">D) Dependientes</h3>
        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">Máx dependientes</span>
          <input
            type="number"
            min="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-xs"
            value={form.maxDependents}
            onChange={(event) => setForm((prev) => ({ ...prev, maxDependents: event.target.value }))}
            disabled={!canAdmin}
          />
        </label>
      </section>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={() => router.push("/admin/suscripciones/membresias/planes")}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
          disabled={busy || !canAdmin}
        >
          {busy ? "Guardando..." : mode === "create" ? "Crear producto" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
