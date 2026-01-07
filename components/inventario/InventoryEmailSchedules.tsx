// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { sucursalesInvMock } from "@/lib/mock/inventario-catalogos";
import {
  InventoryBiweeklyMode,
  InventoryEmailSchedule,
  InventoryReportType,
  InventoryScheduleType
} from "@/lib/types/inventario";

type FormState = Partial<InventoryEmailSchedule> & { id?: string };

const reportOptions: Array<{ value: InventoryReportType; label: string }> = [
  { value: "KARDEX", label: "Kárdex" },
  { value: "MOVIMIENTOS", label: "Movimientos" },
  { value: "CIERRE_SAT", label: "Cierre SAT" }
];

const scheduleOptions: Array<{ value: InventoryScheduleType; label: string }> = [
  { value: "ONE_TIME", label: "Fecha única" },
  { value: "BIWEEKLY", label: "Quincenal (15 días)" },
  { value: "MONTHLY", label: "Mensual" }
];

const timezoneOptions = [
  { value: "America/Guatemala", label: "America/Guatemala" },
  { value: "America/Mexico_City", label: "America/Mexico_City" },
  { value: "America/Bogota", label: "America/Bogota" }
];

const DEFAULT_FORM: FormState = {
  email: "",
  reportType: "KARDEX",
  branchId: "",
  scheduleType: "ONE_TIME",
  sendTime: "23:30",
  timezone: "America/Guatemala",
  oneTimeDate: null,
  biweeklyMode: "FIXED_DAYS",
  fixedDays: "15,LAST",
  startDate: null,
  monthlyDay: null,
  useLastDay: true,
  isEnabled: true
};

export function InventoryEmailSchedules({ token }: { token?: string }) {
  const [schedules, setSchedules] = useState<InventoryEmailSchedule[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventario/email-schedules", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar las reglas");
      setSchedules(data.data || []);
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

  const resetForm = () => {
    setForm({ ...DEFAULT_FORM });
  };

  const save = async () => {
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
      setError("Correo inválido");
      return;
    }
    if (form.scheduleType === "ONE_TIME" && !form.oneTimeDate) {
      setError("Define fecha y hora para el envío único");
      return;
    }
    if (form.scheduleType === "MONTHLY" && form.useLastDay === false) {
      if (!form.monthlyDay || form.monthlyDay < 1 || form.monthlyDay > 28) {
        setError("El día mensual debe estar entre 1 y 28");
        return;
      }
    }
    if (form.scheduleType === "BIWEEKLY" && form.biweeklyMode === "EVERY_15_DAYS" && !form.startDate) {
      setError("Indica fecha de inicio para cada 15 días");
      return;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        ...form,
        branchId: form.branchId || null,
        monthlyDay: form.useLastDay === false ? form.monthlyDay || null : null,
        useLastDay: form.scheduleType === "MONTHLY" ? form.useLastDay !== false : null,
        startDate: form.scheduleType === "BIWEEKLY" && form.biweeklyMode === "EVERY_15_DAYS" ? form.startDate : null,
        oneTimeDate: form.scheduleType === "ONE_TIME" ? form.oneTimeDate : null
      };
      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/api/inventario/email-schedules/${form.id}` : "/api/inventario/email-schedules";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la regla");
      setMessage("Regla guardada");
      resetForm();
      load();
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (rule: InventoryEmailSchedule, enabled: boolean) => {
    try {
      const res = await fetch(`/api/inventario/email-schedules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify({ ...rule, isEnabled: enabled })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar");
      setSchedules((prev) => prev.map((r) => (r.id === rule.id ? data.data : r)));
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar");
    }
  };

  const remove = async (rule: InventoryEmailSchedule) => {
    try {
      const res = await fetch(`/api/inventario/email-schedules/${rule.id}`, {
        method: "DELETE",
        headers: { ...(headers || {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo eliminar");
      setSchedules((prev) => prev.filter((r) => r.id !== rule.id));
      if (form.id === rule.id) resetForm();
    } catch (err: any) {
      setError(err?.message || "No se pudo eliminar");
    }
  };

  const sendTest = async () => {
    if (!form.id) {
      setError("Guarda la regla antes de enviar prueba");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/inventario/reports/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify({ scheduleId: form.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar la prueba");
      setMessage(`Prueba enviada a ${data.recipients || data.recipientsCount || 1} destinatario(s)`);
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar la prueba");
    }
  };

  const runNow = async () => {
    if (!form.id) {
      setError("Guarda la regla antes de ejecutar");
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/inventario/email-schedules/${form.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ejecutar");
      setMessage(`Enviado a ${data.recipients || 1} destinatario(s)`);
      load();
    } catch (err: any) {
      setError(err?.message || "No se pudo ejecutar");
    }
  };

  const runSpecific = async (id: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/inventario/email-schedules/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo ejecutar");
      setMessage(`Enviado a ${data.recipients || 1} destinatario(s)`);
      load();
    } catch (err: any) {
      setError(err?.message || "No se pudo ejecutar");
    }
  };

  const editRule = (rule: InventoryEmailSchedule) => {
    setForm({
      ...rule,
      branchId: rule.branchId || "",
      oneTimeDate: rule.oneTimeDate ? String(rule.oneTimeDate).slice(0, 10) : null,
      startDate: rule.startDate ? String(rule.startDate).slice(0, 10) : null,
      monthlyDay: rule.monthlyDay ?? null,
      useLastDay: rule.useLastDay !== false
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Correo electrónico – Reportes de Inventario</p>
          <p className="text-xs text-slate-500">Crea múltiples reglas con su propia frecuencia y correo.</p>
        </div>
        <button
          onClick={resetForm}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
        >
          Nueva regla
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Reporte</th>
              <th className="px-3 py-2">Frecuencia</th>
              <th className="px-3 py-2">Sucursal</th>
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Último envío</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{rule.email}</td>
                <td className="px-3 py-2">{renderReportType(rule.reportType)}</td>
                <td className="px-3 py-2">{renderSchedule(rule)}</td>
                <td className="px-3 py-2">{rule.branchId ? rule.branchId : "Todas"}</td>
                <td className="px-3 py-2">{rule.sendTime}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{rule.lastSentAt ? new Date(rule.lastSentAt).toLocaleString() : "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rule.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {rule.isEnabled ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button className="rounded-lg border border-slate-200 px-2 py-1" onClick={() => editRule(rule)}>Editar</button>
                    <button
                      className="rounded-lg border border-slate-200 px-2 py-1"
                      onClick={() => toggleEnabled(rule, !rule.isEnabled)}
                    >
                      {rule.isEnabled ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 px-2 py-1"
                      onClick={() => {
                        setForm({ ...form, id: rule.id });
                        runSpecific(rule.id);
                      }}
                    >
                      Enviar ahora
                    </button>
                    <button className="rounded-lg border border-rose-200 px-2 py-1 text-rose-600" onClick={() => remove(rule)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-sm text-slate-500" colSpan={7}>
                  No hay reglas configuradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">{form.id ? "Editar regla" : "Nueva regla"}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Correo</label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              placeholder="correo@dominio.com"
            />
          </div>
          <SearchableSelect
            label="Tipo de reporte"
            value={form.reportType || "KARDEX"}
            onChange={(v) => setForm({ ...form, reportType: (v as InventoryReportType) || "KARDEX" })}
            options={reportOptions}
            includeAllOption={false}
          />
          <SearchableSelect
            label="Sucursal"
            value={form.branchId || ""}
            onChange={(v) => setForm({ ...form, branchId: (v as string) || "" })}
            options={[{ value: "", label: "Todas" }, ...sucursalesInvMock.map((s) => ({ value: s.id, label: s.nombre }))]}
            includeAllOption={false}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <SearchableSelect
            label="Frecuencia"
            value={form.scheduleType || "ONE_TIME"}
            onChange={(v) => setForm({ ...form, scheduleType: (v as InventoryScheduleType) || "ONE_TIME" })}
            options={scheduleOptions}
            includeAllOption={false}
          />
          <div>
            <label className="text-xs font-semibold text-slate-600">Hora de envío</label>
            <input
              type="time"
              value={form.sendTime || "23:30"}
              onChange={(e) => setForm({ ...form, sendTime: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          <SearchableSelect
            label="Zona horaria"
            value={form.timezone || "America/Guatemala"}
            onChange={(v) => setForm({ ...form, timezone: (v as string) || "America/Guatemala" })}
            options={timezoneOptions}
            includeAllOption={false}
          />
        </div>

        {form.scheduleType === "ONE_TIME" && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Fecha de envío</label>
              <input
                type="date"
                value={form.oneTimeDate ? String(form.oneTimeDate).slice(0, 10) : ""}
                onChange={(e) => setForm({ ...form, oneTimeDate: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isEnabled !== false}
                  onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/30"
                />
                Regla activa
              </label>
            </div>
          </div>
        )}

        {form.scheduleType === "BIWEEKLY" && (
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Quincenal</p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="biweekly-mode"
                value="FIXED_DAYS"
                checked={(form.biweeklyMode as InventoryBiweeklyMode) !== "EVERY_15_DAYS"}
                onChange={() => setForm({ ...form, biweeklyMode: "FIXED_DAYS" })}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Día 15 y último día del mes
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="biweekly-mode"
                value="EVERY_15_DAYS"
                checked={(form.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS"}
                onChange={() => setForm({ ...form, biweeklyMode: "EVERY_15_DAYS" })}
                className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
              />
              Cada 15 días desde una fecha
            </label>
            {(form.biweeklyMode as InventoryBiweeklyMode) === "EVERY_15_DAYS" && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de inicio</label>
                  <input
                    type="date"
                    value={form.startDate ? String(form.startDate).slice(0, 10) : ""}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {form.scheduleType === "MONTHLY" && (
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Mensual</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="monthly-mode"
                  value="LAST"
                  checked={form.useLastDay !== false}
                  onChange={() => setForm({ ...form, useLastDay: true })}
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
                />
                Último día del mes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="monthly-mode"
                  value="DAY"
                  checked={form.useLastDay === false}
                  onChange={() => setForm({ ...form, useLastDay: false })}
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary/30"
                />
                Día del mes
              </label>
              <input
                type="number"
                min={1}
                max={28}
                disabled={form.useLastDay !== false}
                value={form.monthlyDay || ""}
                onChange={(e) => setForm({ ...form, monthlyDay: Number(e.target.value) || null })}
                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:bg-slate-50"
              />
            </div>
          </div>
        )}

        {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={sendTest}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Enviar prueba
          </button>
          <button
            onClick={runNow}
            disabled={saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Ejecutar ahora
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar regla"}
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando reglas…</p>}
    </div>
  );
}

function renderSchedule(rule: InventoryEmailSchedule) {
  if (rule.scheduleType === "ONE_TIME") {
    const date = rule.oneTimeDate ? String(rule.oneTimeDate).slice(0, 10) : "—";
    return `Única · ${date}`;
  }
  if (rule.scheduleType === "MONTHLY") {
    return rule.useLastDay === false && rule.monthlyDay ? `Mensual · día ${rule.monthlyDay}` : "Mensual · último día";
  }
  if (rule.biweeklyMode === "EVERY_15_DAYS") return "Quincenal · cada 15 días";
  return "Quincenal · 15 y último";
}

function renderReportType(value: InventoryReportType) {
  if (value === "MOVIMIENTOS") return "Movimientos";
  if (value === "CIERRE_SAT") return "Cierre SAT";
  return "Kárdex";
}
