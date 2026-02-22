import Link from "next/link";
import { Cog8ToothIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export const runtime = "nodejs";

function envValue(key: string) {
  const value = process.env[key];
  if (!value) return { label: "No configurado", tone: "text-rose-700" };
  const masked = key.toLowerCase().includes("token") ? "••••" : value;
  return { label: masked, tone: "text-[#163d66]" };
}

export default function DiagnosticsIntegrationsPage() {
  const orthancBase = envValue("ORTHANC_BASE_URL");
  const orthancViewer = envValue("ORTHANC_VIEWER_URL");
  const hl7Endpoint = "/api/integrations/hl7/oru";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-6 shadow-md shadow-[#d7e6f8]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Integraciones</p>
            <h2 className="text-2xl font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Orthanc + HL7 (Mirth)</h2>
            <p className="text-sm text-slate-600">Para equipos reales: Orthanc (DICOM) + Mirth (HL7). Endpoints listos.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e5f5f2] px-4 py-2 text-sm font-semibold text-[#1f6f68]">
            <ShieldCheckIcon className="h-5 w-5" />
            Health checks manuales
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e5edf8] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">PACS externo</p>
              <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Orthanc</h3>
            </div>
            <Cog8ToothIcon className="h-6 w-6 text-[#2e75ba]" />
          </div>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-slate-500">ORTHANC_BASE_URL</dt>
              <dd className={`font-semibold ${orthancBase.tone}`}>{orthancBase.label}</dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-slate-500">ORTHANC_VIEWER_URL</dt>
              <dd className={`font-semibold ${orthancViewer.tone}`}>{orthancViewer.label}</dd>
            </div>
            <p className="pt-2 text-xs text-slate-500">Usa ORTHANC_VIEWER_URL + orthancStudyId para el iframe en los estudios.</p>
          </dl>
        </div>

        <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e5edf8] pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">HL7 ORU</p>
              <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Endpoint JSON</h3>
            </div>
            <Link href="/api/integrations/hl7/oru" className="text-sm font-semibold text-[#2e75ba] hover:underline">
              Ver endpoint
            </Link>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <div className="rounded-lg border border-[#e5edf8] bg-[#f8fafc] px-3 py-2">
              <p className="text-xs text-slate-500">POST</p>
              <p className="font-semibold text-[#163d66]">{hl7Endpoint}</p>
            </div>
            <p className="text-xs text-slate-500">
              {"Recibe JSON parseado por Mirth: { orderExternalId, patientExternalId, results: [{ testCode, value, unit, refLow, refHigh, observedAt }] }"}
            </p>
            <p className="text-xs text-slate-500">Recomendado: header x-integration-token o bearer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
