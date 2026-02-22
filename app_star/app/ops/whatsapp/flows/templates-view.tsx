'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Filter, Workflow } from "lucide-react";
import { templates, templateCategories } from "../data";
import type { Template, TemplateCategory } from "../types";
import { useAutomationsMock } from "../_hooks/useAutomationsMock";
import { useWhatsApp } from "../_components/WhatsAppProvider";

export default function TemplatesView() {
  const router = useRouter();
  const { activeWorkspaceId, activeNumberId } = useWhatsApp();
  const { createFromTemplate } = useAutomationsMock();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "Todas">("Todas");
  const [search, setSearch] = useState("");

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      const matchesCategory = activeCategory === "Todas" || tpl.category === activeCategory;
      const matchesText =
        tpl.name.toLowerCase().includes(query) ||
        tpl.description.toLowerCase().includes(query) ||
        tpl.trigger.toLowerCase().includes(query);
      return matchesCategory && matchesText;
    });
  }, [activeCategory, search]);

  const handleUseTemplate = (template: Template) => {
    if (!activeWorkspaceId || !activeNumberId) return;
    const newId = createFromTemplate(template.id, activeWorkspaceId, activeNumberId);
    if (newId) {
      router.push(`/ops/whatsapp/automations/${newId}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#2e75ba]">Chatbots y flujos listos</p>
          <p className="text-xs text-slate-500">Inspírate en los bots/automatizaciones más usados y actívalos sin canvas.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#4aa59c]" />
            <div className="flex gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveCategory("Todas")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                  activeCategory === "Todas"
                    ? "bg-[#4aa59c] text-white border-[#4aa59c]"
                    : "border-slate-200 text-slate-700 bg-[#F8FAFC]"
                }`}
              >
                Todas
              </button>
              {templateCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                    activeCategory === cat
                      ? "bg-[#4aa59c] text-white border-[#4aa59c]"
                      : "border-slate-200 text-slate-700 bg-[#F8FAFC]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar plantilla..."
              className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{tpl.name}</p>
                <p className="text-xs text-[#2e75ba]">{tpl.category} · {tpl.trigger}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#4aa59c]/10 text-[#4aa59c] flex items-center justify-center">
                <Workflow className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{tpl.description}</p>
            <div className="space-y-1">
              {tpl.steps.slice(0, 3).map((step, idx) => (
                <div key={`${tpl.id}-step-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-6 w-6 rounded-lg bg-[#4aadf5]/10 text-[#2e75ba] flex items-center justify-center font-semibold">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
              {tpl.steps.length > 3 && (
                <p className="text-xs text-slate-500">+ {tpl.steps.length - 3} pasos más</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleUseTemplate(tpl)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4aa59c33] hover:scale-[1.01] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
              disabled={!activeWorkspaceId || !activeNumberId}
              title={!activeWorkspaceId || !activeNumberId ? "Selecciona workspace y número" : ""}
            >
              <BookOpen className="h-4 w-4" />
              Usar plantilla
            </button>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#4aa59c40] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#2e75ba]">No hay plantillas para este filtro</p>
          <p className="text-sm text-slate-500">Ajusta la categoría o búsqueda.</p>
        </div>
      )}
    </div>
  );
}
