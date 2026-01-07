"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import {
  InventoryBiweeklyMode,
  InventoryEmailSetting,
  InventoryReportType,
  InventoryScheduleType
} from "@/lib/types/inventario";

const scheduleOptions: Array<{ value: InventoryScheduleType; label: string }> = [
  { value: "BIWEEKLY", label: "Quincenal (15 días)" },
  { value: "MONTHLY", label: "Mensual" },
  { value: "ONE_TIME", label: "Fecha única" }
];

const typeOptions: Array<{ value: InventoryReportType; label: string }> = [
  { value: "KARDEX", label: "Kárdex" },
  { value: "MOVIMIENTOS", label: "Movimientos" }
];

const timezoneOptions = [
  { value: "America/Guatemala", label: "America/Guatemala" },
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Bogota", label: "America/Bogota" }
];

const DEFAULT_TIME = "23:30";
const DEFAULT_TIMEZONE = "America/Guatemala";

type Props = {
  token?: string;
};

export function InventoryEmailSettings({ token }: Props) {
  const [setting, setSetting] = useState<InventoryEmailSetting | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventario/reports/settings", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar configuración");
      const first = (data.data || [])[0] || null;
      if (first) {
        const normalized: InventoryEmailSetting = {
          ...first,
          reportType: (first as any).reportType || "KARDEX",
          scheduleType: (first as any).scheduleType || ((first as any).frequency === "MONTHLY" ? "MONTHLY" : "BIWEEKLY"),
          sendTime: (first as any).sendTime || DEFAULT_TIME,
          timezone: (first as any).timezone || DEFAULT_TIMEZONE,
          biweeklyMode: (first as any).biweeklyMode || "FIXED_DAYS",
          fixedDays: (first as any).fixedDays || "15,LAST",
          useLastDay: (first as any).useLastDay ?? true,
          oneTimeDate: (first as any).oneTimeDate || null,
          oneTimeTime: (first as any).oneTimeTime || (first as any).sendTime || DEFAULT_TIME,
          sentAt: (first as any).sentAt || null
        };
        setSetting(normalized);
        setRecipients(parseRecipientsFromApi(first));
      } else {
        const now = new Date().toISOString();
        setSetting({
          id: "",
          isEnabled: true,
          frequency: "BIWEEKLY",
          reportType: "KARDEX",
          branchId: "",
          recipients: "[]",
          recipientsJson: "[]",
          includeAllProducts: true,
          scheduleType: "BIWEEKLY",
          sendTime: DEFAULT_TIME,
          timezone: DEFAULT_TIMEZONE,
          biweeklyMode: "FIXED_DAYS",
          fixedDays: "15,LAST",
          startDate: null,
          monthlyDay: null,
          useLastDay: true,
          oneTimeDate: null,
          oneTimeTime: DEFAULT_TIME,
          sentAt: null,
          lastSentAt: null,
          createdAt: now,
          updatedAt: now
        });
        setRecipients([]);
      }
    } catch (err: any) {
      setError(err?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addRecipient = (email: string) => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setError("Correo inválido");
      return;
    }
    setRecipients((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const validate = () => {
    if (!setting) return "Configuración no cargada";
    if (!recipients.length) return "Ingresa al menos un correo";
    const scheduleType = setting.scheduleType || "BIWEEKLY";
    if (scheduleType !== "ONE_TIME" && !setting.sendTime) return "Define la hora de envío";
    if (scheduleType === "BIWEEKLY" && (setting.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS" && !setting.startDate) {
      return "Indica fecha de inicio para el envío cada 15 días";
    }
    if (scheduleType === "MONTHLY" && setting.useLastDay === false) {
      if (!setting.monthlyDay || setting.monthlyDay < 1 || setting.monthlyDay > 28) return "El día mensual debe estar entre 1 y 28";
    }
    if (scheduleType === "ONE_TIME") {
      if (!setting.oneTimeDate) return "Selecciona la fecha de envío";
      if (!setting.oneTimeTime) return "Selecciona la hora de envío";
    }
    return null;
  };

  const handleSave = async () => {
    if (!setting) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        id: setting.id,
        isEnabled: setting.isEnabled,
        reportType: setting.reportType || "KARDEX",
        branchId: setting.branchId || null,
        recipients,
        scheduleType: setting.scheduleType || "BIWEEKLY",
        sendTime: setting.sendTime || DEFAULT_TIME,
        timezone: setting.timezone || DEFAULT_TIMEZONE,
        biweeklyMode: setting.biweeklyMode || "FIXED_DAYS",
        fixedDays: setting.biweeklyMode === "FIXED_DAYS" ? setting.fixedDays || "15,LAST" : null,
        startDate: setting.biweeklyMode === "EVERY_15_DAYS" ? setting.startDate || null : null,
        monthlyDay: setting.scheduleType === "MONTHLY" && setting.useLastDay === false ? setting.monthlyDay || null : null,
        useLastDay: setting.scheduleType === "MONTHLY" ? setting.useLastDay !== false : null,
        oneTimeDate: setting.scheduleType === "ONE_TIME" ? setting.oneTimeDate || null : null,
        oneTimeTime: setting.scheduleType === "ONE_TIME" ? setting.oneTimeTime || setting.sendTime || DEFAULT_TIME : null,
        includeAllProducts: setting.includeAllProducts ?? true
      };
      const res = await fetch("/api/inventario/reports/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setSetting({
        ...data.data,
        scheduleType: (data.data as any).scheduleType || payload.scheduleType,
        sendTime: (data.data as any).sendTime || payload.sendTime,
        timezone: (data.data as any).timezone || payload.timezone,
        biweeklyMode: (data.data as any).biweeklyMode || payload.biweeklyMode,
        fixedDays: (data.data as any).fixedDays || payload.fixedDays,
        useLastDay: (data.data as any).useLastDay ?? payload.useLastDay,
        oneTimeDate: (data.data as any).oneTimeDate || payload.oneTimeDate,
        oneTimeTime: (data.data as any).oneTimeTime || payload.oneTimeTime,
        sentAt: (data.data as any).sentAt || null
      });
      setRecipients(parseRecipientsFromApi(data.data));
      setMessage("Guardado correctamente");
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!setting) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/inventario/reports/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify({
          branchId: setting.branchId || null,
          reportType: setting.reportType || "KARDEX"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la prueba");
      const count = data.recipients || data.recipientsCount || recipients.length;
      setMessage(`Prueba enviada a ${count} destinatarios`);
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar la prueba");
    } finally {
      setTesting(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/inventario/reports/run", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ejecutar");
      setMessage(`Ejecución completada. Enviados ${data.sent || 0} / procesados ${data.processed || 0}`);
    } catch (err: any) {
      setError(err?.message || "No se pudo ejecutar");
    } finally {
      setRunning(false);
    }
  };

  if (loading && !setting) {
    return <p className="text-sm text-slate-500">Cargando configuración…</p>;
  }

  if (!setting) {
    return <p className="text-sm text-slate-500">No hay configuración creada. Guarda para inicializar.</p>;
  }

  const scheduleType = (setting.scheduleType as InventoryScheduleType) || "BIWEEKLY";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Reportes automáticos por correo</p>
          <p className="text-xs text-slate-500">Envía el Kárdex o movimientos según la frecuencia configurada.</p>
        </div>
        <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={setting.isEnabled}
              onChange={(e) => setSetting((s) => (s ? { ...s, isEnabled: e.target.checked } : s))}
              className="h-5 w-5 rounded-full border-slate-300 text-brand-primary focus:ring-brand-primary/30"
            />
            <span className="text-sm text-slate-700">{setting.isEnabled ? "Habilitado" : "Deshabilitado"}</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={setting.includeAllProducts}
              onChange={(e) => setSetting((s) => (s ? { ...s, includeAllProducts: e.target.checked } : s))}
              className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/30"
            />
            Incluir todos los productos
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SearchableSelect
          label="Período"
          value={scheduleType}
          onChange={(v) =>
            setSetting((s) =>
              s
                ? {
                    ...s,
                    scheduleType: (v as InventoryScheduleType) || "BIWEEKLY",
                    biweeklyMode:
                      (v as InventoryScheduleType) === "BIWEEKLY" ? s.biweeklyMode || "FIXED_DAYS" : s.biweeklyMode,
                    useLastDay: (v as InventoryScheduleType) === "MONTHLY" ? s.useLastDay ?? true : s.useLastDay,
                    oneTimeDate: (v as InventoryScheduleType) === "ONE_TIME" ? s.oneTimeDate || null : s.oneTimeDate,
                    oneTimeTime: (v as InventoryScheduleType) === "ONE_TIME" ? s.oneTimeTime || s.sendTime || DEFAULT_TIME : s.oneTimeTime
                  }
                : s
            )
          }
          options={scheduleOptions}
          includeAllOption={false}
        />
        <div>
          <label className="text-xs font-semibold text-slate-600">Hora de envío</label>
          <input
            type="time"
            value={setting.sendTime || DEFAULT_TIME}
            onChange={(e) => setSetting((s) => (s ? { ...s, sendTime: e.target.value } : s))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
          />
          <p className="mt-1 text-[11px] text-slate-500">Formato 24h. Hora local según zona horaria.</p>
        </div>
        <SearchableSelect
          label="Zona horaria"
          value={setting.timezone || DEFAULT_TIMEZONE}
          onChange={(v) => setSetting((s) => (s ? { ...s, timezone: (v as string) || DEFAULT_TIMEZONE } : s))}
          options={timezoneOptions}
          includeAllOption={false}
        />
      </div>

      {scheduleType === "BIWEEKLY" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700">Envío quincenal</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="biweekly-mode"
                value="FIXED_DAYS"
                checked={(setting.biweeklyMode as InventoryBiweeklyMode) !== "EVERY_15_DAYS"}
                onChange={() => setSetting((s) => (s ? { ...s, biweeklyMode: "FIXED_DAYS" } : s))}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Día 15 y último día del mes
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="biweekly-mode"
                value="EVERY_15_DAYS"
                checked={(setting.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS"}
                onChange={() => setSetting((s) => (s ? { ...s, biweeklyMode: "EVERY_15_DAYS" } : s))}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Cada 15 días desde una fecha
            </label>
          </div>
          {(setting.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS" && (
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Fecha de inicio</label>
                <input
                  type="date"
                  value={setting.startDate ? String(setting.startDate).slice(0, 10) : ""}
                  onChange={(e) => setSetting((s) => (s ? { ...s, startDate: e.target.value || null } : s))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                />
              </div>
              <p className="text-xs text-slate-500">
                Se enviará cada 15 días a partir de la fecha seleccionada (respeta la hora configurada).
              </p>
            </div>
          )}
        </div>
      )}

      {scheduleType === "MONTHLY" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700">Envío mensual</p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="monthly-mode"
                value="LAST"
                checked={setting.useLastDay !== false}
                onChange={() => setSetting((s) => (s ? { ...s, useLastDay: true } : s))}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Último día del mes
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="monthly-mode"
                value="DAY"
                checked={setting.useLastDay === false}
                onChange={() => setSetting((s) => (s ? { ...s, useLastDay: false } : s))}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Día del mes
            </label>
            <input
              type="number"
              min={1}
              max={28}
              disabled={setting.useLastDay !== false}
              value={setting.monthlyDay || ""}
              onChange={(e) => setSetting((s) => (s ? { ...s, monthlyDay: Number(e.target.value) || null } : s))}
              className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:bg-slate-50"
            />
          </div>
          <p className="text-xs text-slate-500">El rango usará el mes en curso y se ejecuta a la hora indicada.</p>
        </div>
      )}

      {scheduleType === "ONE_TIME" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold text-slate-700">Envío por fecha única</p>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Fecha de envío</label>
              <input
                type="date"
                value={setting.oneTimeDate ? String(setting.oneTimeDate).slice(0, 10) : ""}
                onChange={(e) => setSetting((s) => (s ? { ...s, oneTimeDate: e.target.value || null } : s))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Hora de envío</label>
              <input
                type="time"
                value={setting.oneTimeTime || setting.sendTime || DEFAULT_TIME}
                onChange={(e) => setSetting((s) => (s ? { ...s, oneTimeTime: e.target.value } : s))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
            </div>
          </div>
          {setting.oneTimeDate && (
            <p className="mt-2 text-xs text-emerald-700">
              Programado para: {formatDateForDisplay(setting.oneTimeDate)} {setting.oneTimeTime || setting.sendTime || DEFAULT_TIME}{" "}
              {setting.sentAt ? "(ya enviado)" : ""}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SearchableSelect
          label="Tipo de reporte"
          value={setting.reportType || "KARDEX"}
          onChange={(v) => setSetting((s) => (s ? { ...s, reportType: (v as InventoryReportType) || "KARDEX" } : s))}
          options={typeOptions}
          includeAllOption={false}
        />
        <SearchableSelect
          label="Sucursal"
          value={setting.branchId || ""}
          onChange={(v) => setSetting((s) => (s ? { ...s, branchId: (v as string) || "" } : s))}
          options={[{ value: "", label: "Todas" }, ...sucursalesInvMock.map((s) => ({ value: s.id, label: s.nombre }))]}
          includeAllOption={false}
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600">Destinatarios ({recipients.length})</p>
        <div className="mt-1 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
          {recipients.map((r) => (
            <span key={r} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {r}
              <button onClick={() => removeRecipient(r)} className="text-slate-500 hover:text-rose-500">
                ×
              </button>
            </span>
          ))}
          <input
            placeholder="correo@dominio.com"
            className="min-w-[160px] flex-1 border-none text-sm text-slate-700 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === ";") {
                e.preventDefault();
                addRecipient((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
            onBlur={(e) => {
              if (e.target.value) {
                addRecipient(e.target.value);
                e.target.value = "";
              }
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Presiona Enter para agregar cada correo. Validamos duplicados y formato.</p>
      </div>

      {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={handleTest}
          disabled={testing || saving}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {testing ? "Enviando…" : "Enviar prueba"}
        </button>
        <button
          onClick={handleRunNow}
          disabled={running || saving}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {running ? "Ejecutando…" : "Ejecutar ahora"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}

function parseRecipientsFromApi(raw: any) {
  if (!raw) return [];
  if (raw.recipientsJson) {
    try {
      const parsed = JSON.parse(raw.recipientsJson);
      if (Array.isArray(parsed)) return parsed.map((r) => String(r).trim()).filter(Boolean);
    } catch {
      // ignore
    }
  }
  if (raw.recipients) {
    try {
      const parsed = JSON.parse(raw.recipients);
      if (Array.isArray(parsed)) return parsed.map((r: any) => String(r).trim()).filter(Boolean);
    } catch {
      return String(raw.recipients)
        .split(/[;,]/)
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function formatDateForDisplay(dateLike: string) {
  const d = new Date(dateLike);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
