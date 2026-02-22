"use client";

import { useState } from "react";
import { LabArea, LabTemplate } from "@prisma/client";
import { safeFetchJson } from "@/lib/http/safeFetchJson";
import { EmptyState } from "@/components/ui/EmptyState";

type Props = {
  initialData: LabTemplate[];
};

export default function TemplatesClient({ initialData }: Props) {
  const [templates, setTemplates] = useState<LabTemplate[]>(initialData);
  const [draft, setDraft] = useState<Partial<LabTemplate>>({
    title: "",
    area: "HEMATOLOGY" as LabArea,
    html: "<p>Resultado</p>",
    isDefault: false
  });
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    const res = await safeFetchJson<{ ok: boolean; data: LabTemplate }>("/api/labtest/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    setTemplates((prev) => {
      const without = prev.filter((t) => t.id !== res.data.id);
      return [res.data, ...without];
    });
    setMessage("Plantilla guardada");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Editor</p>
        <div className="space-y-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span>Título</span>
            <input
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={draft.title || ""}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Área</span>
            <select
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={draft.area}
              onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value as LabArea }))}
            >
              {Object.values(LabArea).map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>HTML</span>
            <textarea
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              rows={8}
              value={draft.html || ""}
              onChange={(e) => setDraft((d) => ({ ...d, html: e.target.value }))}
            />
            <p className="text-xs text-slate-500">
              Variables soportadas: {"{{patient.name}}"}, {"{{order.code}}"}, {"{{results.table}}"}.
            </p>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#dce7f5]"
              checked={draft.isDefault || false}
              onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
            />
            Marcar como default
          </label>
          <div className="flex justify-end">
            <button
              onClick={save}
              className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87]"
            >
              Guardar plantilla
            </button>
          </div>
          {message && <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f6f68]">{message}</div>}
        </div>
      </div>
      <div className="space-y-3">
        {templates.length === 0 && <EmptyState title="Sin plantillas" description="Crea la primera plantilla." />}
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm hover:shadow-md cursor-pointer"
            onClick={() => setDraft(tpl)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{tpl.area}</p>
                <h3 className="text-lg font-semibold text-[#163d66]">{tpl.title}</h3>
              </div>
              {tpl.isDefault && <span className="rounded-full bg-[#4aadf5] px-3 py-1 text-xs font-semibold text-white">Default</span>}
            </div>
            <div
              className="mt-2 rounded-xl border border-[#e5edf8] bg-[#f8fafc] p-3 text-sm text-slate-700"
              dangerouslySetInnerHTML={{ __html: tpl.html.slice(0, 300) + "..." }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
