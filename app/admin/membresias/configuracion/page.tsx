"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CompactTable } from "@/components/memberships/CompactTable";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";

type MembershipConfig = {
  reminderDays: number;
  graceDays: number;
  inactiveAfterDays: number;
  autoRenewWithPayment: boolean;
  prorateOnMidmonth: boolean;
  blockIfBalanceDue: boolean;
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

const DEFAULT_CONFIG: MembershipConfig = {
  reminderDays: 30,
  graceDays: 7,
  inactiveAfterDays: 90,
  autoRenewWithPayment: true,
  prorateOnMidmonth: true,
  blockIfBalanceDue: true,
  requireInitialPayment: true,
  cashTransferMinMonths: 2,
  priceChangeNoticeDays: 30
};

export default function MembershipConfigPage() {
  const [config, setConfig] = useState<MembershipConfig>(DEFAULT_CONFIG);
  const [categories, setCategories] = useState<Category[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2C" | "B2B">("ALL");
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: "",
    segment: "B2C",
    sortOrder: "0"
  });

  const [editing, setEditing] = useState<Record<string, { name: string; sortOrder: string }>>({});

  const filteredCategories = useMemo(() => {
    if (segmentFilter === "ALL") return categories;
    return categories.filter((category) => category.segment === segmentFilter);
  }, [categories, segmentFilter]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [configRes, categoriesRes] = await Promise.all([
        fetch("/api/memberships/config", { cache: "no-store" }),
        fetch("/api/memberships/plan-categories?includeInactive=true", { cache: "no-store" })
      ]);

      const configJson = await configRes.json();
      const categoriesJson = await categoriesRes.json();
      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar configuración");
      if (!categoriesRes.ok) throw new Error(categoriesJson?.error || "No se pudo cargar categorías");

      setConfig(configJson.data || DEFAULT_CONFIG);
      const rows = Array.isArray(categoriesJson.data) ? categoriesJson.data : [];
      setCategories(rows);
      setEditing(
        rows.reduce((acc: Record<string, { name: string; sortOrder: string }>, row: Category) => {
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
      setSavingCategoryId("new");
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
      setSavingCategoryId(null);
    }
  }

  async function saveCategory(category: Category) {
    const edit = editing[category.id];
    if (!edit) return;

    try {
      setSavingCategoryId(category.id);
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
      setSavingCategoryId(null);
    }
  }

  async function toggleCategory(category: Category) {
    try {
      setSavingCategoryId(category.id);
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
      setSavingCategoryId(null);
    }
  }

  return (
    <MembershipsShell
      title="Configuración · Membresías"
      description="Parámetros globales y catálogo de categorías (tipos de plan) por segmento."
    >
      {loading ? <p className="text-xs text-slate-500">Cargando configuración...</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-700">{message}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
        <h2 className="text-sm font-semibold text-[#2e75ba]">Parámetros globales</h2>
        <form onSubmit={saveConfig} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Aviso renovación (días)</span>
            <input
              type="number"
              min="1"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
              value={config.reminderDays}
              onChange={(event) => setConfig((prev) => ({ ...prev, reminderDays: Number(event.target.value || 0) }))}
            />
            <span className="block text-[11px] text-slate-500">Días previos para notificar al titular.</span>
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
            <span className="block text-[11px] text-slate-500">Días tolerados antes de suspensión.</span>
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
            <span className="block text-[11px] text-slate-500">Tiempo máximo para pasar a vencido/inactivo.</span>
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Meses mínimos (traslado contado)</span>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
              value={config.cashTransferMinMonths}
              onChange={(event) => setConfig((prev) => ({ ...prev, cashTransferMinMonths: Number(event.target.value || 0) }))}
            />
            <span className="block text-[11px] text-slate-500">Control para cambios de forma de pago.</span>
          </label>

          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Aviso cambio de precio (días)</span>
            <input
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
              value={config.priceChangeNoticeDays}
              onChange={(event) => setConfig((prev) => ({ ...prev, priceChangeNoticeDays: Number(event.target.value || 0) }))}
            />
            <span className="block text-[11px] text-slate-500">Notificación anticipada para ajustes comerciales.</span>
          </label>

          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={config.autoRenewWithPayment}
                onChange={(event) => setConfig((prev) => ({ ...prev, autoRenewWithPayment: event.target.checked }))}
              />
              Auto renovar con pago
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={config.prorateOnMidmonth}
                onChange={(event) => setConfig((prev) => ({ ...prev, prorateOnMidmonth: event.target.checked }))}
              />
              Prorratear altas / upgrade
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={config.blockIfBalanceDue}
                onChange={(event) => setConfig((prev) => ({ ...prev, blockIfBalanceDue: event.target.checked }))}
              />
              Bloquear beneficios con saldo
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={config.requireInitialPayment}
                onChange={(event) => setConfig((prev) => ({ ...prev, requireInitialPayment: event.target.checked }))}
              />
              Pago inicial obligatorio (B2C)
            </label>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
            >
              {savingConfig ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#2e75ba]">Catálogo de categorías</h2>
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs"
            value={segmentFilter}
            onChange={(event) => setSegmentFilter(event.target.value as "ALL" | "B2C" | "B2B")}
          >
            <option value="ALL">Todos los segmentos</option>
            <option value="B2C">B2C</option>
            <option value="B2B">B2B</option>
          </select>
        </div>

        <form onSubmit={createCategory} className="mb-3 grid gap-2 rounded-lg bg-[#F8FAFC] p-3 md:grid-cols-4">
          <label className="space-y-1 text-xs text-slate-700 md:col-span-2">
            <span className="font-semibold">Nueva categoría</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
              value={newCategory.name}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Segmento</span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
              value={newCategory.segment}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, segment: event.target.value as "B2C" | "B2B" }))}
            >
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-slate-700">
            <span className="font-semibold">Orden</span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                value={newCategory.sortOrder}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, sortOrder: event.target.value }))}
              />
              <button
                type="submit"
                disabled={savingCategoryId === "new"}
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
              >
                {savingCategoryId === "new" ? "..." : "Crear"}
              </button>
            </div>
          </label>
        </form>

        <CompactTable columns={["Nombre", "Segmento", "Orden", "Estado", "Acciones"]}>
          {filteredCategories.map((category) => (
            <tr key={category.id}>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={editing[category.id]?.name || ""}
                  onChange={(event) =>
                    setEditing((prev) => ({
                      ...prev,
                      [category.id]: {
                        ...prev[category.id],
                        name: event.target.value
                      }
                    }))
                  }
                />
              </td>
              <td className="px-3 py-2 text-slate-700">{category.segment}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-xs"
                  value={editing[category.id]?.sortOrder || "0"}
                  onChange={(event) =>
                    setEditing((prev) => ({
                      ...prev,
                      [category.id]: {
                        ...prev[category.id],
                        sortOrder: event.target.value
                      }
                    }))
                  }
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
                    disabled={savingCategoryId === category.id}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    disabled={savingCategoryId === category.id}
                    className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c] disabled:opacity-60"
                  >
                    {category.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </CompactTable>
      </section>
    </MembershipsShell>
  );
}
