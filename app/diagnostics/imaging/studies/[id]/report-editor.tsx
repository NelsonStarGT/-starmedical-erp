'use client';

import { useState } from "react";
import { StatusBadge } from "@/components/diagnostics/StatusBadge";
import type { DiagnosticImagingReport, ReportStatus } from "@/lib/diagnostics/types";

type Props = {
  imagingStudyId: string;
  orderItemId: string;
  report: (Omit<DiagnosticImagingReport, "imagingStudyId"> & { imagingStudyId?: string }) | null;
};

const templates = [
  {
    label: "Normal abdomen",
    findings: "Hígado de tamaño y ecogenicidad normal. Vesícula sin litos ni engrosamiento. Páncreas y bazo sin alteraciones.",
    impression: "Ultrasonido abdominal sin hallazgos patológicos aparentes."
  },
  {
    label: "RX Tórax",
    findings: "Campos pulmonares bien expandidos, sin consolidaciones ni derrame pleural. Silueta cardiaca de tamaño normal.",
    impression: "Radiografía de tórax dentro de límites normales."
  },
  {
    label: "Hallazgo leve",
    findings: "Pequeño derrame pleural derecho, sin consolidaciones. No se observan lesiones focales.",
    impression: "Derrame pleural derecho leve. Correlacionar clínicamente."
  }
];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "No se pudo completar la acción");
  }
  return res.json();
}

export default function StudyReportEditor({ imagingStudyId, report }: Props) {
  const [reportId, setReportId] = useState(report?.id || "");
  const [status, setStatus] = useState<ReportStatus>(report?.status || "DRAFT");
  const [findings, setFindings] = useState(report?.findings || "");
  const [impression, setImpression] = useState(report?.impression || "");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<"sign" | "release" | "">("");

  const saveReport = async () => {
    setSaving(true);
    try {
      const payload: any = { imagingStudyId, findings, impression };
      if (reportId) payload.id = reportId;
      const data = await fetchJson<{ data: DiagnosticImagingReport }>("/api/diagnostics/imaging/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (data?.data?.id) {
        setReportId(data.data.id);
        setStatus(data.data.status);
        return data.data.id;
      }
      return reportId;
    } finally {
      setSaving(false);
    }
  };

  const signReport = async () => {
    try {
      setAction("sign");
      let targetId = reportId;
      if (!targetId) {
        targetId = await saveReport();
      }
      if (!targetId) return;
      await fetchJson(`/api/diagnostics/imaging/reports/${targetId}/sign`, { method: "POST" });
      setStatus("SIGNED");
    } catch (err: any) {
      alert(err.message || "No se pudo firmar");
    } finally {
      setAction("");
    }
  };

  const releaseReport = async () => {
    if (!reportId) {
      alert("Guarda y firma el reporte antes de liberar");
      return;
    }
    try {
      setAction("release");
      await fetchJson(`/api/diagnostics/imaging/reports/${reportId}/release`, { method: "POST" });
      setStatus("RELEASED");
    } catch (err: any) {
      alert(err.message || "No se pudo liberar");
    } finally {
      setAction("");
    }
  };

  const applyTemplate = (tpl: typeof templates[number]) => {
    setFindings(tpl.findings);
    setImpression(tpl.impression);
  };

  return (
    <div className="rounded-2xl border border-[#dce7f5] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e5edf8] px-4 py-3">
        <div>
          <h3 className="text-lg font-semibold text-[#163d66] font-[var(--font-dx-heading)]">Reporte radiológico</h3>
          <p className="text-xs text-slate-500">Borrador, firma y liberación.</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-3 border-b border-[#e5edf8] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Plantillas rápidas</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="rounded-full border border-[#d0e2f5] px-3 py-1 text-xs font-semibold text-[#2e75ba] hover:bg-[#e8f1ff]"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <label className="text-sm font-semibold text-[#163d66]">Hallazgos</label>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
          placeholder="Describe hallazgos relevantes"
        />
        <label className="text-sm font-semibold text-[#163d66]">Impresión</label>
        <textarea
          value={impression}
          onChange={(e) => setImpression(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#dce7f5] px-3 py-2 text-sm focus:border-[#4aa59c] focus:outline-none"
          placeholder="Conclusión diagnóstica"
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-[#e5edf8] pt-3">
          <button
            type="button"
      disabled={saving}
            onClick={saveReport}
            className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar borrador"}
          </button>
          <button
            type="button"
          disabled={status !== "DRAFT"}
          onClick={signReport}
          className="rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#245f95] disabled:opacity-60"
        >
          {action === "sign" ? "Firmando..." : "Firmar"}
        </button>
          <button
            type="button"
            disabled={status !== "SIGNED"}
            onClick={releaseReport}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {action === "release" ? "Liberando..." : "Liberar"}
          </button>
        </div>
      </div>
    </div>
  );
}
