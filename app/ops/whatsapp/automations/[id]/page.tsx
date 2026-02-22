'use client';

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Pause, Play, Workflow } from "lucide-react";
import { useAutomationsMock } from "../../_hooks/useAutomationsMock";
import { templates } from "../../data";

export default function AutomationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const { getAutomationById, ready, toggleStatus, duplicate, updateAutomation } = useAutomationsMock();
  const automation = getAutomationById(id);

  const [message, setMessage] = useState(automation?.message ?? "");
  const [schedule, setSchedule] = useState(automation?.schedule ?? "");
  const [tags, setTags] = useState((automation?.tags ?? []).join(", "));
  const [assignment, setAssignment] = useState(automation?.assignment ?? "");

  const template = useMemo(
    () => templates.find((tpl) => tpl.id === automation?.templateId),
    [automation?.templateId]
  );

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-full" />
        <div className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="rounded-2xl border border-dashed border-[#4aa59c40] bg-white p-6 space-y-2">
        <p className="text-base font-semibold text-[#2e75ba]">Automatización no encontrada</p>
        <p className="text-sm text-slate-500">Vuelve a la lista y crea una nueva desde plantillas.</p>
        <button
          type="button"
          onClick={() => router.push("/ops/whatsapp/automations")}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4aa59c33]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a automatizaciones
        </button>
      </div>
    );
  }

  const handleSave = () => {
    updateAutomation(automation.id, {
      message,
      schedule,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      assignment
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/ops/whatsapp/automations")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-[#F8FAFC]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900">{automation.name}</p>
            <p className="text-xs text-slate-500">{automation.trigger} → {automation.action}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleStatus(automation.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
          >
            {automation.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {automation.status === "active" ? "Pausar" : "Activar"}
          </button>
          <button
            type="button"
            onClick={() => {
              const newId = duplicate(automation.id);
              if (newId) router.push(`/ops/whatsapp/automations/${newId}`);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-[#2e75ba]">Configuración</p>
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Mensaje</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Horario</span>
              <input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Etiquetas (separadas por coma)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Asignación</span>
              <input
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-sm text-slate-800 focus:border-[#4aa59c] focus:outline-none focus:ring-2 focus:ring-[#4aa59c]/30"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4aa59c33] hover:scale-[1.01] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
            >
              <Check className="h-4 w-4" />
              Guardar cambios
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-[#2e75ba]">Resumen</p>
          <div className="space-y-2">
            {(automation.steps || []).map((step, idx) => (
              <div key={`${automation.id}-step-${idx}`} className="flex items-start gap-2">
                <span className="mt-0.5 h-6 w-6 rounded-xl bg-[#4aadf5]/10 text-[#2e75ba] flex items-center justify-center text-xs font-semibold">
                  {idx + 1}
                </span>
                <p className="text-sm text-slate-700">{step}</p>
              </div>
            ))}
            {template && (
              <p className="text-xs text-slate-500">Basado en plantilla: {template.name}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
