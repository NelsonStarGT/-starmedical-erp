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

type ProductModel = "RECURRENTE" | "PREPAGO";
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

const PRODUCT_META_REGEX = /^\[product:(RECURRENTE|PREPAGO)\]\s*/i;
const BENEFIT_META_REGEX = /^\[meta:([^\]]+)\]\s*/i;

function parseProductMeta(description: string | null | undefined) {
  const raw = String(description || "");
  const match = raw.match(PRODUCT_META_REGEX);
  const productModel: ProductModel = match?.[1]?.toUpperCase() === "PREPAGO" ? "PREPAGO" : "RECURRENTE";
  const cleanDescription = raw.replace(PRODUCT_META_REGEX, "").trim();
  return { productModel, cleanDescription };
}

function buildProductDescription(productModel: ProductModel, description: string) {
  const clean = description.trim();
  return `[product:${productModel}]${clean ? ` ${clean}` : ""}`;
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
  return model === "PREPAGO" ? "Prepago" : "Recurrente";
}

export function PlanEditorForm({ mode, planId, initialData }: PlanEditorFormProps) {
  const router = useRouter();
  const parsedDescription = parseProductMeta(initialData?.description ?? null);

  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [benefits, setBenefits] = useState<BenefitCatalog[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [hidePricesForOperators, setHidePricesForOperators] = useState(true);

  const [benefitSearch, setBenefitSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryKindFilter, setInventoryKindFilter] = useState<"" | InventoryKind>("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("");
  const [productModel, setProductModel] = useState<ProductModel>(parsedDescription.productModel);

  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? "",
    description: parsedDescription.cleanDescription,
    type: initialData?.type ?? "INDIVIDUAL",
    segment: initialData?.segment ?? "B2C",
    categoryId: initialData?.categoryId ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    active: initialData?.active ?? true,
    priceMonthly: String(initialData?.priceMonthly ?? ""),
    priceAnnual: String(initialData?.priceAnnual ?? ""),
    currency: initialData?.currency ?? "GTQ",
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
        const [categoriesRes, benefitsRes, configRes] = await Promise.all([
          fetch("/api/subscriptions/memberships/plan-categories?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/benefits?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config", { cache: "no-store" })
        ]);

        const categoriesJson = await categoriesRes.json();
        const benefitsJson = await benefitsRes.json();
        const configJson = await configRes.json();

        if (!categoriesRes.ok) throw new Error(categoriesJson?.error || "No se pudo cargar categorías");
        if (!benefitsRes.ok) throw new Error(benefitsJson?.error || "No se pudo cargar beneficios");
        if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar permisos de pricing");

        if (!mounted) return;
        setCategories(Array.isArray(categoriesJson?.data) ? categoriesJson.data : []);
        setBenefits(Array.isArray(benefitsJson?.data) ? benefitsJson.data : []);
        setCanAdmin(Boolean(configJson?.meta?.canAdmin));
        setCanViewPricing(Boolean(configJson?.meta?.canViewPricing));
        setHidePricesForOperators(Boolean(configJson?.data?.hidePricesForOperators));
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

    (async () => {
      const headers = { "x-role": "Administrador" };
      const requests: Array<{ kind: InventoryKind; url: string }> = [
        { kind: "SERVICE", url: "/api/inventario/servicios" },
        { kind: "PRODUCT", url: "/api/inventario/productos" },
        { kind: "COMBO", url: "/api/inventario/combos" }
      ];

      const results = await Promise.allSettled(
        requests.map(async ({ kind, url }) => {
          const response = await fetch(url, { cache: "no-store", headers });
          const json = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { kind, ok: false as const, rows: [] as InventoryItem[] };
          }
          const rows = Array.isArray((json as { data?: unknown[] })?.data)
            ? ((json as { data?: unknown[] }).data || []).map((row) => toInventoryItem(row, kind)).filter(Boolean) as InventoryItem[]
            : [];

          return { kind, ok: true as const, rows };
        })
      );

      if (!mounted) return;

      const items: InventoryItem[] = [];
      let successCount = 0;
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        if (result.value.ok) {
          successCount += 1;
          items.push(...result.value.rows);
        }
      }

      setInventoryItems(items);
      setInventoryWarning(successCount === 0 ? "No se pudo conectar con Inventario. Puedes continuar con beneficios del catálogo." : null);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const shouldHidePricing = hidePricesForOperators && !canViewPricing;

  const availableCategories = useMemo(
    () => categories.filter((category) => category.segment === form.segment && category.isActive),
    [categories, form.segment]
  );

  const filteredBenefits = useMemo(() => {
    const term = benefitSearch.trim().toLowerCase();
    return benefits.filter((benefit) => {
      if (!benefit.isActive) return false;
      if (!term) return true;
      return (
        benefit.title.toLowerCase().includes(term) ||
        benefit.serviceType.toLowerCase().includes(term) ||
        (benefit.iconKey || "").toLowerCase().includes(term)
      );
    });
  }, [benefits, benefitSearch]);

  const selectedBenefitIds = useMemo(() => new Set(selectedBenefits.map((benefit) => benefit.benefitId)), [selectedBenefits]);

  const inventoryCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventoryItems) {
      if (!map.has(item.categoryId)) {
        map.set(item.categoryId, item.categoryLabel);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [inventoryItems]);

  const filteredInventoryItems = useMemo(() => {
    const term = inventorySearch.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      if (inventoryKindFilter && item.kind !== inventoryKindFilter) return false;
      if (inventoryCategoryFilter && item.categoryId !== inventoryCategoryFilter) return false;
      if (!term) return true;
      return (
        item.label.toLowerCase().includes(term) ||
        String(item.code || "").toLowerCase().includes(term) ||
        item.categoryLabel.toLowerCase().includes(term)
      );
    });
  }, [inventoryItems, inventorySearch, inventoryKindFilter, inventoryCategoryFilter]);

  function addBenefit(benefitId: string) {
    setSelectedBenefits((prev) => {
      if (prev.some((item) => item.benefitId === benefitId)) return prev;
      return [
        ...prev,
        {
          benefitId,
          mode: "CUPO",
          quantity: "1",
          discountPercent: "",
          window: "MENSUAL",
          windowCustomDays: "",
          inventoryKind: "",
          inventoryId: "",
          inventoryLabel: "",
          note: ""
        }
      ];
    });
  }

  function toggleBenefitSelection(benefitId: string) {
    setSelectedBenefits((prev) => {
      const exists = prev.some((item) => item.benefitId === benefitId);
      if (exists) return prev.filter((item) => item.benefitId !== benefitId);
      return [
        ...prev,
        {
          benefitId,
          mode: "CUPO",
          quantity: "1",
          discountPercent: "",
          window: "MENSUAL",
          windowCustomDays: "",
          inventoryKind: "",
          inventoryId: "",
          inventoryLabel: "",
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

  function parseInventorySelection(value: string) {
    const [kind, id] = value.split(":");
    if (!kind || !id) return { kind: "" as InventoryKind | "", id: "" };
    if (kind !== "SERVICE" && kind !== "PRODUCT" && kind !== "COMBO") return { kind: "" as InventoryKind | "", id: "" };
    return { kind, id } as { kind: InventoryKind; id: string };
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

    const payload: Record<string, unknown> = {
      slug: form.slug || undefined,
      name: form.name,
      description: buildProductDescription(productModel, form.description),
      type: form.type,
      segment: form.segment,
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl || null,
      active: form.active,
      currency: form.currency,
      maxDependents: form.maxDependents ? Number(form.maxDependents) : null,
      benefits: selectedBenefits.map((benefit) => ({
        benefitId: benefit.benefitId,
        quantity: benefit.mode === "CUPO" ? Number(benefit.quantity || 0) : null,
        isUnlimited: benefit.mode === "ILIMITADO",
        notes: buildBenefitNotes(benefit)
      }))
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
                setForm((prev) => ({
                  ...prev,
                  segment,
                  type: segment === "B2C" ? "INDIVIDUAL" : "EMPRESARIAL",
                  categoryId: ""
                }));
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
              <option value="RECURRENTE">Recurrente (Membresía)</option>
              <option value="PREPAGO">Prepago (Plan/Gift)</option>
            </select>
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Categoría</span>
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
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Tipo comercial</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as "INDIVIDUAL" | "FAMILIAR" | "EMPRESARIAL"
                }))
              }
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="FAMILIAR">Familiar</option>
              <option value="EMPRESARIAL">Empresarial</option>
            </select>
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
                <option value="GTQ">GTQ</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2e75ba]">C) Beneficios (vinculados a inventario)</h3>
        <p className="text-xs text-slate-600">
          Selecciona beneficios del catálogo y vincula un ítem de Inventario (servicios/productos/combos) para operación y control.
        </p>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Beneficios disponibles</p>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={benefitSearch}
              onChange={(event) => setBenefitSearch(event.target.value)}
              placeholder="Buscar por título o tipo"
            />
            <div className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white">
              {filteredBenefits.map((benefit) => {
                const checked = selectedBenefitIds.has(benefit.id);
                return (
                  <label key={benefit.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                    <input type="checkbox" checked={checked} onChange={() => toggleBenefitSelection(benefit.id)} />
                    <span className="font-medium text-slate-800">{benefit.title}</span>
                    <span className="text-slate-500">{benefit.serviceType}</span>
                  </label>
                );
              })}
              {filteredBenefits.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">Sin resultados.</p> : null}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Inventario</p>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
              placeholder="Buscar por nombre o código"
            />
            <div className="grid grid-cols-2 gap-2">
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
            <p className="text-[11px] text-slate-500">Items cargados: {filteredInventoryItems.length} (se usan para vinculación operativa por beneficio).</p>
            {inventoryWarning ? <p className="text-[11px] font-medium text-amber-700">{inventoryWarning}</p> : null}
          </div>
        </div>

        {selectedBenefits.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            {selectedBenefits.map((benefit) => {
              const detail = benefits.find((item) => item.id === benefit.benefitId);
              const linkedInventoryValue = benefit.inventoryKind && benefit.inventoryId ? `${benefit.inventoryKind}:${benefit.inventoryId}` : "";
              return (
                <div key={benefit.benefitId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{detail?.title || benefit.benefitId}</p>
                      <p className="text-[11px] text-slate-500">{detail?.serviceType || "OTRO"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBenefits((prev) => prev.filter((item) => item.benefitId !== benefit.benefitId))}
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

                  <div className="grid gap-2 md:grid-cols-[1.2fr_1fr]">
                    <label className="space-y-1 text-xs text-slate-700">
                      <span className="font-medium">Vincular ítem de Inventario</span>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        value={linkedInventoryValue}
                        onChange={(event) => {
                          const parsed = parseInventorySelection(event.target.value);
                          const selectedItem = filteredInventoryItems.find(
                            (item) => item.id === parsed.id && item.kind === parsed.kind
                          );
                          patchBenefit(benefit.benefitId, {
                            inventoryKind: parsed.kind,
                            inventoryId: parsed.id,
                            inventoryLabel: selectedItem?.label || ""
                          });
                        }}
                      >
                        <option value="">Sin vínculo</option>
                        {filteredInventoryItems.slice(0, 250).map((item) => (
                          <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                            {item.kind} · {item.label} {item.code ? `(${item.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

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
