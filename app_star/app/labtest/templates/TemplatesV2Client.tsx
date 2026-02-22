"use client";

import { useEffect, useState } from "react";
import { LabArea, LabTemplateFieldDataType } from "@prisma/client";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type TemplateV2 = any;

const card = "rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm";

export function TemplatesV2Client() {
  const [templates, setTemplates] = useState<TemplateV2[]>([]);
  const [draft, setDraft] = useState<TemplateV2>({
    title: "",
    area: "HEMATOLOGY" as LabArea,
    headerHtml: "",
    footerHtml: "",
    isDefault: false,
    fields: []
  });
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await safeFetchJson<{ ok: boolean; data: TemplateV2[] }>("/api/labtest/templates/v2");
    setTemplates(res.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const selectTemplate = (tpl: TemplateV2) => {
    setDraft({ ...tpl, fields: tpl.fields || [] });
  };

  const addField = () => {
    setDraft((d: any) => ({
      ...d,
      fields: [
        ...(d.fields || []),
        {
          key: "",
          label: "Nuevo campo",
          dataType: "TEXT",
          order: (d.fields?.length || 0) + 1,
          isActive: true
        }
      ]
    }));
  };

  const updateField = (idx: number, patch: any) => {
    setDraft((d: any) => {
      const fields = [...(d.fields || [])];
      fields[idx] = { ...fields[idx], ...patch };
      return { ...d, fields };
    });
  };

  const moveField = (idx: number, direction: -1 | 1) => {
    setDraft((d: any) => {
      const fields = [...(d.fields || [])];
      const target = idx + direction;
      if (target < 0 || target >= fields.length) return d;
      [fields[idx], fields[target]] = [fields[target], fields[idx]];
      return { ...d, fields };
    });
  };

  const saveTemplate = async () => {
    const res = await safeFetchJson<{ ok: boolean; data: TemplateV2 }>("/api/labtest/templates/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    setDraft(res.data);
    load();
    setMessage("Plantilla v2 guardada");
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Plantillas v2</p>
            <h2 className="text-2xl font-semibold text-[#163d66]">Header/Footer + Campos</h2>
            <p className="text-sm text-slate-600">Diseña plantillas HTML y define campos estructurados.</p>
          </div>
          <button
            onClick={() =>
              setDraft({
                title: "",
                area: "HEMATOLOGY",
                headerHtml: "",
                footerHtml: "",
                isDefault: false,
                fields: []
              })
            }
            className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba]"
          >
            Nueva
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className={`${card} lg:col-span-1`}>
          <p className="text-xs uppercase text-[#2e75ba] font-semibold mb-2">Plantillas</p>
          <div className="space-y-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                className={`w-full rounded-xl border px-3 py-2 text-left ${
                  draft.id === tpl.id ? "border-[#2e75ba] bg-[#e8f1ff]" : "border-[#e5edf8] bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{tpl.area}</p>
                    <p className="text-sm font-semibold text-[#163d66]">{tpl.title}</p>
                  </div>
                  {tpl.isDefault && <span className="rounded-full bg-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-white">Default</span>}
                </div>
              </button>
            ))}
            {templates.length === 0 && <p className="text-sm text-slate-500">Sin plantillas v2 aún.</p>}
          </div>
        </div>

        <div className={`${card} lg:col-span-2`}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Título</span>
              <input
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draft.title || ""}
                onChange={(e) => setDraft((d: any) => ({ ...d, title: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Área</span>
              <select
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={draft.area}
                onChange={(e) => setDraft((d: any) => ({ ...d, area: e.target.value }))}
              >
                {Object.values(LabArea).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span>Header HTML</span>
              <textarea
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                rows={4}
                value={draft.headerHtml || ""}
                onChange={(e) => setDraft((d: any) => ({ ...d, headerHtml: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Footer HTML</span>
              <textarea
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                rows={4}
                value={draft.footerHtml || ""}
                onChange={(e) => setDraft((d: any) => ({ ...d, footerHtml: e.target.value }))}
              />
            </label>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#dce7f5]"
              checked={draft.isDefault || false}
              onChange={(e) => setDraft((d: any) => ({ ...d, isDefault: e.target.checked }))}
            />
            Marcar como default para el área
          </label>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#163d66]">Campos</p>
            <button
              onClick={addField}
              className="rounded-full border border-[#dce7f5] px-3 py-1.5 text-sm font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
            >
              Añadir campo
            </button>
          </div>
          <div className="mt-2 divide-y divide-[#eef3fb] rounded-xl border border-[#e5edf8]">
            {(draft.fields || []).map((field: any, idx: number) => (
              <div key={idx} className="grid items-center gap-2 p-3 md:grid-cols-6">
                <input
                  className="rounded-lg border border-[#dce7f5] px-2 py-1 text-sm md:col-span-2"
                  placeholder="Llave"
                  value={field.key || ""}
                  onChange={(e) => updateField(idx, { key: e.target.value })}
                />
                <input
                  className="rounded-lg border border-[#dce7f5] px-2 py-1 text-sm md:col-span-2"
                  placeholder="Etiqueta"
                  value={field.label || ""}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                />
                <select
                  className="rounded-lg border border-[#dce7f5] px-2 py-1 text-sm"
                  value={field.dataType}
                  onChange={(e) => updateField(idx, { dataType: e.target.value as LabTemplateFieldDataType })}
                >
                  {Object.values(LabTemplateFieldDataType).map((dt) => (
                    <option key={dt}>{dt}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-[#dce7f5] px-2 py-1 text-xs text-[#2e75ba]"
                    onClick={() => moveField(idx, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="rounded-full border border-[#dce7f5] px-2 py-1 text-xs text-[#2e75ba]"
                    onClick={() => moveField(idx, 1)}
                  >
                    ↓
                  </button>
                </div>
                <div className="md:col-span-6 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <input
                    className="rounded-lg border border-[#dce7f5] px-2 py-1"
                    placeholder="Unidad"
                    value={field.unitDefault || ""}
                    onChange={(e) => updateField(idx, { unitDefault: e.target.value })}
                  />
                  <input
                    className="rounded-lg border border-[#dce7f5] px-2 py-1"
                    placeholder="Ref baja"
                    value={field.refLowDefault ?? ""}
                    onChange={(e) => updateField(idx, { refLowDefault: Number(e.target.value) || null })}
                  />
                  <input
                    className="rounded-lg border border-[#dce7f5] px-2 py-1"
                    placeholder="Ref alta"
                    value={field.refHighDefault ?? ""}
                    onChange={(e) => updateField(idx, { refHighDefault: Number(e.target.value) || null })}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#dce7f5]"
                      checked={field.isActive !== false}
                      onChange={(e) => updateField(idx, { isActive: e.target.checked })}
                    />
                    Activo
                  </label>
                </div>
              </div>
            ))}
            {(draft.fields || []).length === 0 && <div className="p-3 text-sm text-slate-500">Agrega campos para estructurar resultados.</div>}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={saveTemplate}
              className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
            >
              Guardar plantilla v2
            </button>
          </div>
          {message && <div className="mt-2 rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f6f68]">{message}</div>}
        </div>
      </div>
    </div>
  );
}
