'use client';

import { useRouter } from "next/navigation";
import { Play, Pause, Copy, Pencil, Workflow } from "lucide-react";
import { useAutomationsMock } from "../_hooks/useAutomationsMock";
import { useWhatsApp } from "../_components/WhatsAppProvider";
import { numbers } from "../data";

export default function AutomationsList() {
  const router = useRouter();
  const { activeWorkspaceId, activeNumberId } = useWhatsApp();
  const { automations, ready, toggleStatus, duplicate } = useAutomationsMock();

  const filtered = automations.filter((auto) => {
    if (activeWorkspaceId && auto.workspaceId !== activeWorkspaceId) return false;
    if (activeNumberId && auto.numberId !== activeNumberId) return false;
    return true;
  });

  if (!ready) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <div className="h-4 w-48 bg-slate-100 rounded-full animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`auto-skeleton-${idx}`} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#4aa59c40] bg-white p-6 text-center space-y-2">
        <p className="text-base font-semibold text-[#2e75ba]">Aún no tienes automatizaciones</p>
        <p className="text-sm text-slate-500">Crea una desde una plantilla en la pestaña Flujos.</p>
      </div>
    );
  }

  const numberLabel = (id: string) => numbers.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="space-y-4">
      {filtered.map((auto) => (
        <div
          key={auto.id}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{auto.name}</p>
              <p className="text-xs text-slate-500">
                {auto.trigger} → {auto.action}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                auto.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {auto.status === "active" ? "Activa" : "Pausada"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#F8FAFC] border border-slate-200 px-2 py-1">
              <Workflow className="h-4 w-4 text-[#4aa59c]" />
              {auto.steps.slice(0, 2).join(" → ")}
              {auto.steps.length > 2 ? " → ..." : ""}
            </span>
            <span className="inline-flex items-center rounded-xl bg-[#4aadf5]/10 text-[#2e75ba] border border-[#4aadf5]/30 px-2 py-1">
              {numberLabel(auto.numberId)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleStatus(auto.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
            >
              {auto.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {auto.status === "active" ? "Pausar" : "Activar"}
            </button>
            <button
              type="button"
              onClick={() => {
                const id = duplicate(auto.id);
                if (id) router.push(`/ops/whatsapp/automations/${id}`);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </button>
            <button
              type="button"
              onClick={() => router.push(`/ops/whatsapp/automations/${auto.id}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4aa59c] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#4aa59c33] hover:scale-[1.01] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
