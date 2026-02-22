"use client";

import { useEffect, useState } from "react";
import { LabArea, LabSampleType } from "@prisma/client";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type Category = any;
type Subcategory = any;
type LabTestCatalog = any;

const card = "rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm";

export function CatalogClient() {
  const [tab, setTab] = useState<"categories" | "subcategories" | "tests">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [tests, setTests] = useState<LabTestCatalog[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [draftCategory, setDraftCategory] = useState<Partial<Category>>({ name: "" });
  const [draftSubcategory, setDraftSubcategory] = useState<Partial<Subcategory>>({ name: "", categoryId: "" });
  const [draftTest, setDraftTest] = useState<Partial<LabTestCatalog>>({ code: "", name: "", area: "HEMATOLOGY" as LabArea });

  const load = async () => {
    try {
      const [cats, subs, tsts] = await Promise.all([
        safeFetchJson<{ ok: boolean; data: Category[] }>("/api/labtest/catalog/categories"),
        safeFetchJson<{ ok: boolean; data: Subcategory[] }>("/api/labtest/catalog/subcategories"),
        safeFetchJson<{ ok: boolean; data: LabTestCatalog[] }>("/api/labtest/catalog/tests")
      ]);
      setCategories(cats.data || []);
      setSubcategories(subs.data || []);
      setTests(tsts.data || []);
    } catch (err: any) {
      setMessage(err.message || "No se pudo cargar catálogo");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveCategory = async () => {
    await safeFetchJson("/api/labtest/catalog/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftCategory)
    });
    setDraftCategory({ name: "" });
    load();
    setMessage("Categoría guardada");
  };

  const saveSubcategory = async () => {
    await safeFetchJson("/api/labtest/catalog/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftSubcategory)
    });
    setDraftSubcategory({ name: "", categoryId: "" });
    load();
    setMessage("Subcategoría guardada");
  };

  const saveTest = async () => {
    await safeFetchJson("/api/labtest/catalog/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftTest)
    });
    setDraftTest({ code: "", name: "", area: draftTest.area || "HEMATOLOGY" });
    load();
    setMessage("Prueba guardada");
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Catálogo</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Pruebas y plantillas operativas</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {[
            { key: "categories", label: "Categorías" },
            { key: "subcategories", label: "Subcategorías" },
            { key: "tests", label: "Pruebas" }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                tab === t.key ? "bg-[#2e75ba] text-white shadow-sm" : "bg-[#e8f1ff] text-[#2e75ba]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "categories" && (
        <div className={card}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-slate-700">Nombre</label>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftCategory.name || ""}
                onChange={(e) => setDraftCategory((d) => ({ ...d, name: e.target.value }))}
              />
              <label className="text-sm text-slate-700">Orden</label>
              <input
                type="number"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftCategory.order ?? ""}
                onChange={(e) => setDraftCategory((d) => ({ ...d, order: Number(e.target.value) }))}
              />
              <button
                onClick={saveCategory}
                className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar categoría
              </button>
            </div>
            <div className="md:col-span-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 text-left">Nombre</th>
                    <th className="py-2 text-right">Orden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3fb]">
                  {categories.map((cat: any) => (
                    <tr key={cat.id} className="hover:bg-[#f8fafc] cursor-pointer" onClick={() => setDraftCategory(cat)}>
                      <td className="py-2">{cat.name}</td>
                      <td className="py-2 text-right">{cat.order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "subcategories" && (
        <div className={card}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-slate-700">Categoría</label>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftSubcategory.categoryId || ""}
                onChange={(e) => setDraftSubcategory((d) => ({ ...d, categoryId: e.target.value }))}
              >
                <option value="">Seleccione</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <label className="text-sm text-slate-700">Nombre</label>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftSubcategory.name || ""}
                onChange={(e) => setDraftSubcategory((d) => ({ ...d, name: e.target.value }))}
              />
              <button
                onClick={saveSubcategory}
                className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar subcategoría
              </button>
            </div>
            <div className="md:col-span-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 text-left">Nombre</th>
                    <th className="py-2 text-left">Categoría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3fb]">
                  {subcategories.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-[#f8fafc] cursor-pointer" onClick={() => setDraftSubcategory(sub)}>
                      <td className="py-2">{sub.name}</td>
                      <td className="py-2 text-slate-500">{sub.category?.name || sub.categoryId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "tests" && (
        <div className={card}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-slate-700">Código</label>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.code || ""}
                onChange={(e) => setDraftTest((d) => ({ ...d, code: e.target.value }))}
              />
              <label className="text-sm text-slate-700">Nombre</label>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.name || ""}
                onChange={(e) => setDraftTest((d) => ({ ...d, name: e.target.value }))}
              />
              <label className="text-sm text-slate-700">Área</label>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.area}
                onChange={(e) => setDraftTest((d) => ({ ...d, area: e.target.value as LabArea }))}
              >
                {Object.values(LabArea).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <label className="text-sm text-slate-700">Categoría</label>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.categoryId || ""}
                onChange={(e) => setDraftTest((d) => ({ ...d, categoryId: e.target.value }))}
              >
                <option value="">N/A</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <label className="text-sm text-slate-700">Subcategoría</label>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.subcategoryId || ""}
                onChange={(e) => setDraftTest((d) => ({ ...d, subcategoryId: e.target.value }))}
              >
                <option value="">N/A</option>
                {subcategories
                  .filter((s: any) => !draftTest.categoryId || s.categoryId === draftTest.categoryId)
                  .map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
              </select>
              <label className="text-sm text-slate-700">Muestra</label>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draftTest.sampleTypeDefault || ""}
                onChange={(e) => setDraftTest((d) => ({ ...d, sampleTypeDefault: e.target.value as LabSampleType }))}
              >
                <option value="">N/A</option>
                {Object.values(LabSampleType).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                onClick={saveTest}
                className="w-full rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
              >
                Guardar prueba
              </button>
            </div>
            <div className="md:col-span-2">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 text-left">Código</th>
                    <th className="py-2 text-left">Nombre</th>
                    <th className="py-2 text-left">Área</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef3fb]">
                  {tests.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#f8fafc] cursor-pointer" onClick={() => setDraftTest(t)}>
                      <td className="py-2">{t.code}</td>
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-slate-500">{t.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</div>}
    </div>
  );
}
