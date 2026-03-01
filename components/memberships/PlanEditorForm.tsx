"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PlanCategory = {
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

type SelectedBenefit = {
  benefitId: string;
  quantity: string;
  isUnlimited: boolean;
  notes: string;
};

export function PlanEditorForm({ mode, planId, initialData }: PlanEditorFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [durationPresets, setDurationPresets] = useState<DurationPreset[]>([]);
  const [benefits, setBenefits] = useState<BenefitCatalog[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canViewPricing, setCanViewPricing] = useState(false);
  const [hidePricesForOperators, setHidePricesForOperators] = useState(true);
  const [benefitSearch, setBenefitSearch] = useState("");

  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    type: initialData?.type ?? "INDIVIDUAL",
    segment: initialData?.segment ?? "B2C",
    categoryId: initialData?.categoryId ?? "",
    durationPresetId: initialData?.durationPresetId ?? "",
    customDurationDays:
      initialData?.customDurationDays !== null && initialData?.customDurationDays !== undefined
        ? String(initialData.customDurationDays)
        : "",
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

  const [durationMode, setDurationMode] = useState<"preset" | "custom">(
    initialData?.customDurationDays ? "custom" : "preset"
  );

  const [selectedBenefits, setSelectedBenefits] = useState<SelectedBenefit[]>(() =>
    (initialData?.benefits || []).map((benefit) => ({
      benefitId: benefit.benefitId,
      quantity: benefit.quantity ? String(benefit.quantity) : "",
      isUnlimited: Boolean(benefit.isUnlimited),
      notes: benefit.notes || ""
    }))
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingCatalogs(true);
        const [categoriesRes, presetsRes, benefitsRes, configRes] = await Promise.all([
          fetch("/api/subscriptions/memberships/plan-categories?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/duration-presets?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config/benefits?includeInactive=true", { cache: "no-store" }),
          fetch("/api/subscriptions/memberships/config", { cache: "no-store" })
        ]);

        const categoriesJson = await categoriesRes.json();
        const presetsJson = await presetsRes.json();
        const benefitsJson = await benefitsRes.json();
        const configJson = await configRes.json();

        if (!categoriesRes.ok) throw new Error(categoriesJson?.error || "No se pudo cargar categorías");
        if (!presetsRes.ok) throw new Error(presetsJson?.error || "No se pudo cargar duraciones");
        if (!benefitsRes.ok) throw new Error(benefitsJson?.error || "No se pudo cargar beneficios");
        if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar permisos de pricing");

        if (!mounted) return;
        setCategories(Array.isArray(categoriesJson?.data) ? categoriesJson.data : []);
        setDurationPresets(Array.isArray(presetsJson?.data) ? presetsJson.data : []);
        setBenefits(Array.isArray(benefitsJson?.data) ? benefitsJson.data : []);
        setCanViewPricing(Boolean(configJson?.meta?.canViewPricing));
        setHidePricesForOperators(Boolean(configJson?.data?.hidePricesForOperators));
      } catch (err: any) {
        if (mounted) setError(err?.message || "Error cargando catálogos");
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
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

  const availableDurationPresets = useMemo(
    () => durationPresets.filter((preset) => preset.isActive),
    [durationPresets]
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

  function toggleBenefitSelection(benefitId: string) {
    setSelectedBenefits((prev) => {
      const exists = prev.some((item) => item.benefitId === benefitId);
      if (exists) return prev.filter((item) => item.benefitId !== benefitId);
      return [...prev, { benefitId, quantity: "", isUnlimited: false, notes: "" }];
    });
  }

  function patchBenefit(benefitId: string, patch: Partial<SelectedBenefit>) {
    setSelectedBenefits((prev) => prev.map((item) => (item.benefitId === benefitId ? { ...item, ...patch } : item)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "create" && shouldHidePricing) {
      setError("No tienes permiso para crear planes con precio visible. Solicita MEMBERSHIPS:PRICING:VIEW.");
      return;
    }

    const payload: Record<string, unknown> = {
      slug: form.slug || undefined,
      name: form.name,
      description: form.description || null,
      type: form.type,
      segment: form.segment,
      categoryId: form.categoryId || null,
      durationPresetId: durationMode === "preset" ? form.durationPresetId || null : null,
      customDurationDays: durationMode === "custom" ? Number(form.customDurationDays || 0) : null,
      imageUrl: form.imageUrl || null,
      active: form.active,
      currency: form.currency,
      maxDependents: form.maxDependents ? Number(form.maxDependents) : null,
      benefits: selectedBenefits.map((benefit) => ({
        benefitId: benefit.benefitId,
        quantity: benefit.quantity ? Number(benefit.quantity) : null,
        isUnlimited: benefit.isUnlimited,
        notes: benefit.notes || null
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
      setError(err?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {loadingCatalogs ? <p className="text-xs text-slate-500">Cargando catálogos...</p> : null}

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
          <span className="font-medium">Tipo</span>
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

        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">Moneda</span>
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.currency}
            onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
          >
            <option value="GTQ">GTQ</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </div>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Duración</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDurationMode("preset")}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${durationMode === "preset" ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          >
            Preset
          </button>
          <button
            type="button"
            onClick={() => setDurationMode("custom")}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${durationMode === "custom" ? "bg-[#4aa59c] text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          >
            Custom (días)
          </button>
        </div>

        {durationMode === "preset" ? (
          <select
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.durationPresetId}
            onChange={(event) => setForm((prev) => ({ ...prev, durationPresetId: event.target.value, customDurationDays: "" }))}
          >
            <option value="">Selecciona un preset</option>
            {availableDurationPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.days} días)
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            min="1"
            max="3650"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.customDurationDays}
            onChange={(event) => setForm((prev) => ({ ...prev, customDurationDays: event.target.value, durationPresetId: "" }))}
            placeholder="Días personalizados"
          />
        )}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">Beneficios incluidos</h3>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={benefitSearch}
          onChange={(event) => setBenefitSearch(event.target.value)}
          placeholder="Buscar beneficio por título/tipo"
        />

        <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
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

        {selectedBenefits.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
            {selectedBenefits.map((benefit) => {
              const detail = benefits.find((item) => item.id === benefit.benefitId);
              return (
                <div key={benefit.benefitId} className="grid gap-2 rounded-lg border border-slate-200 p-2 md:grid-cols-4">
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">{detail?.title || benefit.benefitId}</p>
                    <p className="text-[11px] text-slate-500">{detail?.serviceType || "OTRO"}</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Cantidad"
                    value={benefit.quantity}
                    disabled={benefit.isUnlimited}
                    onChange={(event) => patchBenefit(benefit.benefitId, { quantity: event.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  />
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={benefit.isUnlimited}
                      onChange={(event) =>
                        patchBenefit(benefit.benefitId, {
                          isUnlimited: event.target.checked,
                          quantity: event.target.checked ? "" : benefit.quantity
                        })
                      }
                    />
                    Ilimitado
                  </label>
                  <input
                    placeholder="Notas"
                    value={benefit.notes}
                    onChange={(event) => patchBenefit(benefit.benefitId, { notes: event.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <label className="space-y-1 text-xs text-slate-700">
        <span className="font-medium">Descripción</span>
        <textarea
          className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">Foto del plan (URL)</span>
          <input
            type="url"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
            placeholder="https://..."
          />
          <span className="block text-[11px] text-slate-500">
            MVP actual: URL directa. TODO: uploader cuando exista infraestructura de archivos para este módulo.
          </span>
        </label>

        <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Preview</p>
          {form.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="Vista previa plan" className="h-24 w-full rounded-md object-cover" />
          ) : (
            <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500">
              Sin imagen
            </div>
          )}
        </div>
      </div>

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
            />
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-medium">Máx. dependientes</span>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={form.maxDependents}
              onChange={(event) => setForm((prev) => ({ ...prev, maxDependents: event.target.value }))}
            />
          </label>
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
        />
        Plan activo
      </label>

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
          disabled={busy || (mode === "create" && shouldHidePricing)}
        >
          {busy ? "Guardando..." : mode === "create" ? "Crear plan" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
