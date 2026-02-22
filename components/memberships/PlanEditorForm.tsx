"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PlanCategory = {
  id: string;
  name: string;
  segment: "B2C" | "B2B";
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
    imageUrl?: string | null;
    active?: boolean;
    priceMonthly?: number;
    priceAnnual?: number;
    currency?: string;
    maxDependents?: number | null;
  };
};

export function PlanEditorForm({ mode, planId, initialData }: PlanEditorFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    type: initialData?.type ?? "INDIVIDUAL",
    segment: initialData?.segment ?? "B2C",
    categoryId: initialData?.categoryId ?? "",
    imageUrl: initialData?.imageUrl ?? "",
    active: initialData?.active ?? true,
    priceMonthly: String(initialData?.priceMonthly ?? ""),
    priceAnnual: String(initialData?.priceAnnual ?? ""),
    currency: initialData?.currency ?? "GTQ",
    maxDependents: initialData?.maxDependents !== null && initialData?.maxDependents !== undefined ? String(initialData.maxDependents) : ""
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingCategories(true);
        const res = await fetch("/api/memberships/plan-categories?includeInactive=true", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar categorías");
        if (mounted) setCategories(Array.isArray(json?.data) ? json.data : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || "Error cargando categorías");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.segment === form.segment && category.isActive),
    [categories, form.segment]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      slug: form.slug || undefined,
      name: form.name,
      description: form.description || null,
      type: form.type,
      segment: form.segment,
      categoryId: form.categoryId || null,
      imageUrl: form.imageUrl || null,
      active: form.active,
      priceMonthly: Number(form.priceMonthly),
      priceAnnual: Number(form.priceAnnual),
      currency: form.currency,
      maxDependents: form.maxDependents ? Number(form.maxDependents) : null
    };

    try {
      setBusy(true);
      const url = mode === "create" ? "/api/memberships/plans" : `/api/memberships/plans/${planId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar plan");
      router.push("/admin/membresias/planes");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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
            disabled={loadingCategories}
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

        <label className="space-y-1 text-xs text-slate-700">
          <span className="font-medium">Precio mensual</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={form.priceMonthly}
            onChange={(event) => setForm((prev) => ({ ...prev, priceMonthly: event.target.value }))}
            required
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
            required
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
          <span className="block text-[11px] text-slate-500">MVP actual: URL directa. TODO: uploader cuando exista infraestructura de archivos para este módulo.</span>
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
          onClick={() => router.push("/admin/membresias/planes")}
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Guardando..." : mode === "create" ? "Crear plan" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
