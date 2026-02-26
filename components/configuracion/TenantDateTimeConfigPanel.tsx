"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import {
  DATE_FORMAT_VALUES,
  TIME_FORMAT_VALUES,
  WEEK_START_VALUES,
  normalizeDateFormat,
  normalizeTimeFormat,
  normalizeTimezone,
  normalizeWeekStartsOn,
  type DateFormat,
  type TenantDateTimeConfigSnapshot,
  type TimeFormat,
  type WeekStartsOn
} from "@/lib/datetime/config";
import { formatDate, formatTime } from "@/lib/datetime/format";

type ApiEnvelope<T> = {
  ok?: boolean;
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
  data?: T | null;
};

type FormState = {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
  weekStartsOn: WeekStartsOn;
};

const DEFAULT_FORM: FormState = {
  dateFormat: "DMY",
  timeFormat: "H24",
  timezone: "America/Guatemala",
  weekStartsOn: "MON"
};

const DATE_LABELS: Record<DateFormat, string> = {
  DMY: "DD/MM/AAAA",
  MDY: "MM/DD/AAAA",
  YMD: "AAAA-MM-DD"
};

const TIME_LABELS: Record<TimeFormat, string> = {
  H12: "12 horas",
  H24: "24 horas"
};

const WEEK_LABELS: Record<WeekStartsOn, string> = {
  MON: "Lunes",
  SUN: "Domingo"
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function describeError<T>(payload: ApiEnvelope<T> | null, fallback: string) {
  if (!payload) return fallback;
  const code = payload.code ? `[${payload.code}] ` : "";
  const issues = Array.isArray(payload.issues)
    ? payload.issues
        .map((issue) => {
          const path = String(issue?.path || "").trim();
          const message = String(issue?.message || "").trim();
          if (!message) return "";
          return path ? `${path}: ${message}` : message;
        })
        .filter(Boolean)
        .join(" | ")
    : "";

  return `${code}${payload.error || fallback}${issues ? ` (${issues})` : ""}`;
}

export default function TenantDateTimeConfigPanel() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const previewDate = useMemo(() => {
    const sample = new Date(2026, 11, 31, 16, 45, 0, 0);
    const dateText = formatDate(sample, form.dateFormat);
    const timeText = formatTime(sample, form.timeFormat);
    return `${dateText} ${timeText}`;
  }, [form.dateFormat, form.timeFormat]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/config/datetime", { cache: "no-store" });
        const payload = await parseEnvelope<TenantDateTimeConfigSnapshot>(response);
        if (!response.ok || payload.ok === false || !payload.data) {
          throw new Error(describeError(payload, "No se pudo cargar configuración de fecha/hora."));
        }

        if (!active) return;
        setForm({
          dateFormat: normalizeDateFormat(payload.data.dateFormat),
          timeFormat: normalizeTimeFormat(payload.data.timeFormat),
          timezone: normalizeTimezone(payload.data.timezone),
          weekStartsOn: normalizeWeekStartsOn(payload.data.weekStartsOn)
        });
        setUpdatedAt(payload.data.updatedAt || null);
      } catch (error) {
        if (!active) return;
        showToast({ tone: "error", title: "Error cargando configuración", message: (error as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  async function save() {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/config/datetime", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFormat: form.dateFormat,
          timeFormat: form.timeFormat,
          timezone: form.timezone,
          weekStartsOn: form.weekStartsOn
        })
      });
      const payload = await parseEnvelope<TenantDateTimeConfigSnapshot>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar configuración de fecha/hora."));
      }

      setUpdatedAt(payload.data.updatedAt || null);
      showToast({ tone: "success", title: "Formato fecha/hora actualizado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Fecha y hora global (ERP)</CardTitle>
          <p className="text-sm text-slate-600">
            Fuente única por tenant para formularios, filtros y reportes. La base de datos mantiene fechas en ISO.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">Formato de fecha</label>
              <select
                value={form.dateFormat}
                onChange={(event) => setForm((prev) => ({ ...prev, dateFormat: normalizeDateFormat(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                disabled={loading || saving}
              >
                {DATE_FORMAT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {DATE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Formato de hora</label>
              <select
                value={form.timeFormat}
                onChange={(event) => setForm((prev) => ({ ...prev, timeFormat: normalizeTimeFormat(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                disabled={loading || saving}
              >
                {TIME_FORMAT_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {TIME_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Zona horaria (IANA)</label>
              <input
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="America/Guatemala"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Inicio de semana</label>
              <select
                value={form.weekStartsOn}
                onChange={(event) => setForm((prev) => ({ ...prev, weekStartsOn: normalizeWeekStartsOn(event.target.value) }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                disabled={loading || saving}
              >
                {WEEK_START_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {WEEK_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">Vista previa</p>
            <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{previewDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar fecha/hora"}
            </button>
            <span className="text-xs text-slate-500">
              Última actualización: {updatedAt ? new Date(updatedAt).toLocaleString() : "Sin registros"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
