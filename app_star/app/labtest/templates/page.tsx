import { listTemplates } from "@/lib/server/labtest.service";
import TemplatesClient from "./TemplatesClient";
import { TemplatesV2Client } from "./TemplatesV2Client";

export const runtime = "nodejs";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <div className="space-y-6">
      <TemplatesV2Client />
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Legacy</p>
        <p className="text-sm text-slate-600">Plantillas HTML simples (compatibilidad).</p>
      </div>
      <TemplatesClient initialData={templates} />
    </div>
  );
}
