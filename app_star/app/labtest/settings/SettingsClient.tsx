"use client";

import { useState } from "react";
import { LabMessageChannel, LabTestSetting } from "@prisma/client";
import { safeFetchJson } from "@/lib/http/safeFetchJson";

type Props = {
  initialData: LabTestSetting | null;
  canEdit: boolean;
};

export default function SettingsClient({ initialData, canEdit }: Props) {
  const [settings, setSettings] = useState<Partial<LabTestSetting>>(initialData || {});
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!canEdit) return;
    const res = await safeFetchJson<{ ok: boolean; data: LabTestSetting }>("/api/labtest/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setSettings(res.data);
    setMessage("Settings guardados");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#dce7f5] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Settings</p>
        <h2 className="text-2xl font-semibold text-[#163d66]">Operación LabTest</h2>
        <p className="text-sm text-slate-600">SLA, bitácoras, workbench, reportes y seguridad.</p>
        {!canEdit && <p className="mt-2 text-xs font-semibold text-amber-700">Solo lectura para técnicos.</p>}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">General</p>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Mensaje por defecto</span>
            <textarea
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              rows={3}
              value={settings.defaultMessage || ""}
              onChange={(e) => setSettings((s) => ({ ...s, defaultMessage: e.target.value }))}
              disabled={!canEdit}
            />
          </label>
          <div className="grid gap-2 md:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-700">
              <span>SLA rutina (min)</span>
              <input
                type="number"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={settings.slaRoutineMin ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, slaRoutineMin: Number(e.target.value) }))}
                disabled={!canEdit}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>SLA urgente (min)</span>
              <input
                type="number"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={settings.slaUrgentMin ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, slaUrgentMin: Number(e.target.value) }))}
                disabled={!canEdit}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>SLA STAT (min)</span>
              <input
                type="number"
                className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
                value={settings.slaStatMin ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, slaStatMin: Number(e.target.value) }))}
                disabled={!canEdit}
              />
            </label>
          </div>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Canal por defecto</span>
            <select
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.defaultChannel || "EMAIL"}
              onChange={(e) => setSettings((s) => ({ ...s, defaultChannel: e.target.value as LabMessageChannel }))}
              disabled={!canEdit}
            >
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Bitácoras</p>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Prefijo secuencia muestra</span>
            <input
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.logsPrefixSpecimen || ""}
              onChange={(e) => setSettings((s) => ({ ...s, logsPrefixSpecimen: e.target.value }))}
              disabled={!canEdit}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Prefijo secuencia reporte</span>
            <input
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.logsPrefixReport || ""}
              onChange={(e) => setSettings((s) => ({ ...s, logsPrefixReport: e.target.value }))}
              disabled={!canEdit}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#dce7f5]"
              checked={settings.logsResetDaily ?? true}
              onChange={(e) => setSettings((s) => ({ ...s, logsResetDaily: e.target.checked }))}
              disabled={!canEdit}
            />
            Reiniciar secuencia diario
          </label>
        </div>

        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Workbench</p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#dce7f5]"
              checked={settings.workbenchAutoInProcess ?? false}
              onChange={(e) => setSettings((s) => ({ ...s, workbenchAutoInProcess: e.target.checked }))}
              disabled={!canEdit}
            />
            Mover a IN_PROCESS automáticamente al abrir
          </label>
          <p className="text-xs text-slate-500">SLA visible en Workbench para priorizar riesgos.</p>
        </div>

        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Plantillas y reportes</p>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Modo preview plantillas</span>
            <select
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.templatesPreviewMode || "HTML"}
              onChange={(e) => setSettings((s) => ({ ...s, templatesPreviewMode: e.target.value }))}
              disabled={!canEdit}
            >
              <option value="HTML">HTML</option>
              <option value="TEXT">Texto</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Días por defecto en reportes</span>
            <input
              type="number"
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.reportsDefaultRangeDays ?? 7}
              onChange={(e) => setSettings((s) => ({ ...s, reportsDefaultRangeDays: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[#dce7f5] bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2e75ba]">Seguridad</p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#dce7f5]"
              checked={settings.requireOtpForLabTest ?? true}
              onChange={(e) => setSettings((s) => ({ ...s, requireOtpForLabTest: e.target.checked }))}
              disabled={!canEdit}
            />
            Requerir OTP para ingresar a LabTest
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>OTP TTL (minutos)</span>
            <input
              type="number"
              min={5}
              max={30}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.otpTtlMinutes ?? 10}
              onChange={(e) => setSettings((s) => ({ ...s, otpTtlMinutes: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Idle timeout (minutos)</span>
            <input
              type="number"
              min={10}
              max={480}
              className="w-full rounded-lg border border-[#dce7f5] px-3 py-2"
              value={settings.idleTimeoutMinutes ?? 120}
              onChange={(e) => setSettings((s) => ({ ...s, idleTimeoutMinutes: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </label>
          <p className="text-xs text-slate-500">El tiempo de inactividad cierra sesión automáticamente.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={!canEdit}
          className="rounded-full bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
      {message && <div className="rounded-xl border border-[#dce7f5] bg-[#f8fafc] px-3 py-2 text-sm text-[#1f6f68]">{message}</div>}
    </div>
  );
}
