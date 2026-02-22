import Link from "next/link";
import AutomationsList from "./automations-list";

export default function OpsWhatsAppAutomationsPage() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#2e75ba]">Automatización Clínica</p>
          <p className="text-xs text-slate-500">Activa plantillas y administra flujos sin canvas.</p>
        </div>
        <Link
          href="/ops/whatsapp/flows"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4aa59c]"
        >
          Ver plantillas
        </Link>
      </div>
      <AutomationsList />
    </div>
  );
}
