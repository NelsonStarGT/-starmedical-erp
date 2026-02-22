"use client";

import { useMemo, useState } from "react";
import type { DiagnosticCatalogItem } from "@/lib/diagnostics/types";

type Props = { initialItems: DiagnosticCatalogItem[] };

async function saveItem(payload: any) {
  const res = await fetch("/api/diagnostics/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo guardar");
  return data.data as DiagnosticCatalogItem;
}

async function updateItem(id: string, payload: any) {
  const res = await fetch("/api/diagnostics/catalog", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, ...payload })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
  return data.data as DiagnosticCatalogItem;
}

export default function CatalogClient({ initialItems }: Props) {
  const [items, setItems] = useState<DiagnosticCatalogItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiagnosticCatalogItem | null>(null);
  const [activeTab, setActiveTab] = useState<"LAB" | "XR" | "US">("LAB");
  const [form, setForm] = useState({
    code: "",
    name: "",
    kind: "LAB" as DiagnosticCatalogItem["kind"],
    modality: null as DiagnosticCatalogItem["modality"],
    unit: "",
    price: "",
    isActive: true
  });

  const labCount = useMemo(() => items.filter((i) => i.kind === "LAB").length, [items]);
  const xrCount = useMemo(() => items.filter((i) => i.kind === "IMAGING" && i.modality === "XR").length, [items]);
  const usCount = useMemo(() => items.filter((i) => i.kind === "IMAGING" && i.modality === "US").length, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", kind: "LAB", modality: null, unit: "", price: "", isActive: true });
    setShowForm(true);
  };

  const openEdit = (item: DiagnosticCatalogItem) => {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      kind: item.kind,
      modality: item.modality,
      unit: item.unit || "",
      price: item.price?.toString() || "",
      isActive: item.isActive ?? true
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code,
        name: form.name,
        kind: form.kind,
        modality: form.kind === "IMAGING" ? form.modality : null,
        unit: form.kind === "LAB" ? form.unit : null,
        price: Number(form.price || 0),
        isActive: form.isActive
      };
      const saved = editing ? await updateItem(editing.id, payload) : await saveItem(payload);
      setItems((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        if (exists) return prev.map((p) => (p.id === saved.id ? saved : p));
        return [saved, ...prev];
      });
      setShowForm(false);
    } catch (err: any) {
      alert(err.message || "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Catálogo</p>
          <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">
            Catálogo completo (LAB + XR + US)
          </h2>
          <p className="text-sm text-slate-600">Catálogo administrativo por área clínica.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-[#dce7f5] bg-[#e5f5f2] px-4 py-3 text-sm font-semibold text-[#1f6f68]">
            Lab: {labCount}
          </div>
          <div className="rounded-2xl border border-[#dce7f5] bg-[#e8f1ff] px-4 py-3 text-sm font-semibold text-[#2e75ba]">
            XR: {xrCount}
          </div>
          <div className="rounded-2xl border border-[#dce7f5] bg-[#e8f1ff] px-4 py-3 text-sm font-semibold text-[#2e75ba]">
            US: {usCount}
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
          >
            Nuevo examen
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "LAB" as const, label: "LAB", count: labCount },
          { key: "XR" as const, label: "XR", count: xrCount },
          { key: "US" as const, label: "US", count: usCount }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeTab === tab.key ? "bg-[#2e75ba] text-white shadow-sm" : "bg-[#eef3fb] text-[#2e75ba] hover:bg-[#d8e6fb]"
            }`}
          >
            {tab.label} · {tab.count}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#dce7f5] bg-white shadow-md shadow-[#d7e6f8]">
        <table className="min-w-full divide-y divide-[#e5edf8]">
          <thead className="bg-[#2e75ba] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Código</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Modalidad / Unidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Precio</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3fb]">
            {items.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}>
                <td className="px-4 py-3 text-sm font-semibold text-[#163d66]">{item.code}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{item.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.kind === "LAB" ? "bg-[#e5f5f2] text-[#1f6f68]" : "bg-[#e8f1ff] text-[#2e75ba]"
                    }`}
                  >
                    {item.kind}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {item.kind === "IMAGING" ? item.modality || "IMG" : item.unit || "N/A"}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-[#163d66]">Q {item.price ? item.price.toFixed(2) : "0.00"}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs font-semibold text-[#2e75ba] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const updated = await updateItem(item.id, { isActive: !item.isActive });
                          setItems((prev) => prev.map((p) => (p.id === item.id ? updated : p)));
                        } catch (err: any) {
                          alert(err.message || "No se pudo actualizar");
                        }
                      }}
                      className="text-xs font-semibold text-[#4aa59c] hover:underline"
                    >
                      {item.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                  Catálogo vacío
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#d0e2f5] bg-white p-6 shadow-xl shadow-[#d7e6f8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">
                  {editing ? "Editar examen" : "Nuevo examen"}
                </p>
                <h3 className="text-xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">
                  Datos del catálogo
                </h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:underline">
                Cerrar
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Código"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
                required
              />
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
                required
              />
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as any }))}
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              >
                <option value="LAB">LAB</option>
                <option value="IMAGING">IMAGING</option>
              </select>
              {form.kind === "IMAGING" ? (
                <select
                  value={form.modality || ""}
                  onChange={(e) => setForm((f) => ({ ...f, modality: (e.target.value || null) as any }))}
                  className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
                >
                  <option value="">Modalidad</option>
                  <option value="XR">Rayos X (XR)</option>
                  <option value="US">Ultrasonido (US)</option>
                </select>
              ) : (
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="Unidad (mg/dL, panel, etc.)"
                  className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
                />
              )}
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Precio"
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-[#163d66]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Activo
              </label>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#4aa59c] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
