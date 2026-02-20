"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import OpsOperationsNav from "@/components/configuracion/OpsOperationsNav";
import type { OpsAlertEventRow, OpsMetricsHistoryRow, OpsSchedulerConfigPublic } from "@/lib/ops/types";

type SchedulerConfigResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
  data?: (OpsSchedulerConfigPublic & {
    canEdit?: boolean;
    latestRun?: {
      createdAt: string;
      status: "ok" | "degraded" | "down";
      requestId: string | null;
    } | null;
  });
};

type MetricsHistoryResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
  data?: {
    total: number;
    items: OpsMetricsHistoryRow[];
  };
};

type AlertsResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
  data?: {
    total: number;
    items: OpsAlertEventRow[];
  };
};

type HealthResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
  data?: {
    status: "ok" | "degraded" | "down";
    timestamp: string;
  };
};

type MetricsCurrentResponse = {
  ok: boolean;
  requestId?: string;
  error?: string;
  data?: {
    status: "ok" | "degraded" | "down";
    timestamp: string;
    services: Array<{
      serviceKey: string;
      cpuPercent: number;
      memoryBytes: number;
      networkRxBytesPerSec: number;
      networkTxBytesPerSec: number;
    }>;
  };
};

function toDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-GT");
}

function statusChipClasses(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "ok" || normalized === "up") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "degraded" || normalized === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "info") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function OpsAlertsPanel() {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "down">("down");
  const [metricsStatus, setMetricsStatus] = useState<"ok" | "degraded" | "down">("down");
  const [latestRunAt, setLatestRunAt] = useState<string | null>(null);
  const [latestRunStatus, setLatestRunStatus] = useState<string | null>(null);
  const [currentMetricsServices, setCurrentMetricsServices] = useState<
    Array<{ serviceKey: string; cpuPercent: number; memoryBytes: number; networkRxBytesPerSec: number; networkTxBytesPerSec: number }>
  >([]);

  const [metricsRows, setMetricsRows] = useState<OpsMetricsHistoryRow[]>([]);
  const [alertRows, setAlertRows] = useState<OpsAlertEventRow[]>([]);

  const [metricsRange, setMetricsRange] = useState("24h");
  const [metricsServiceFilter, setMetricsServiceFilter] = useState("");
  const [metricsStatusFilter, setMetricsStatusFilter] = useState("");
  const [metricsSampleFilter, setMetricsSampleFilter] = useState("5m");

  const [alertsRange, setAlertsRange] = useState("7d");
  const [alertsTypeFilter, setAlertsTypeFilter] = useState("");
  const [alertsLevelFilter, setAlertsLevelFilter] = useState("");
  const [alertsServiceFilter, setAlertsServiceFilter] = useState("");

  const [canEditConfig, setCanEditConfig] = useState(false);
  const [configEnabled, setConfigEnabled] = useState(true);
  const [configFrequency, setConfigFrequency] = useState(120);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelWhatsapp, setChannelWhatsapp] = useState(false);
  const [maskedEmails, setMaskedEmails] = useState<string[]>([]);
  const [maskedWhatsapp, setMaskedWhatsapp] = useState<string[]>([]);
  const [recipientsEmailInput, setRecipientsEmailInput] = useState("");
  const [recipientsWhatsappInput, setRecipientsWhatsappInput] = useState("");

  const activeAlerts = useMemo(() => alertRows.slice(0, 10), [alertRows]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);

    try {
      const [healthRes, metricsRes, configRes] = await Promise.all([
        fetch("/api/admin/config/ops/health?persist=0", { cache: "no-store" }),
        fetch("/api/admin/config/ops/metrics?range=5m", { cache: "no-store" }),
        fetch("/api/admin/config/ops/scheduler-config", { cache: "no-store" })
      ]);

      const [healthPayload, metricsPayload, configPayload] = (await Promise.all([
        healthRes.json().catch(() => ({})),
        metricsRes.json().catch(() => ({})),
        configRes.json().catch(() => ({}))
      ])) as [HealthResponse, MetricsCurrentResponse, SchedulerConfigResponse];

      if (!healthRes.ok || !metricsRes.ok || !configRes.ok) {
        throw new Error(healthPayload.error || metricsPayload.error || configPayload.error || "No se pudo cargar resumen OPS");
      }

      if (healthPayload.data) {
        setHealthStatus(healthPayload.data.status);
      }
      if (metricsPayload.data) {
        setMetricsStatus(metricsPayload.data.status);
        setCurrentMetricsServices(metricsPayload.data.services || []);
      }
      if (configPayload.data) {
        setCanEditConfig(Boolean(configPayload.data.canEdit));
        setConfigEnabled(Boolean(configPayload.data.enabled));
        setConfigFrequency(Number(configPayload.data.frequencySeconds || 120));
        setChannelEmail(Boolean(configPayload.data.channels.email));
        setChannelWhatsapp(Boolean(configPayload.data.channels.whatsapp));
        setMaskedEmails(configPayload.data.maskedRecipients?.emails || []);
        setMaskedWhatsapp(configPayload.data.maskedRecipients?.whatsapp || []);
        setLatestRunAt(configPayload.data.latestRun?.createdAt || null);
        setLatestRunStatus(configPayload.data.latestRun?.status || null);
      }

      setRequestId(
        configPayload.requestId ||
          metricsPayload.requestId ||
          healthPayload.requestId ||
          configRes.headers.get("x-request-id") ||
          metricsRes.headers.get("x-request-id") ||
          healthRes.headers.get("x-request-id")
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar resumen OPS");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadMetricsHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("range", metricsRange);
      params.set("source", "scheduler");
      params.set("limit", "240");
      if (metricsServiceFilter) params.set("service", metricsServiceFilter);
      if (metricsStatusFilter) params.set("status", metricsStatusFilter);
      if (metricsSampleFilter) params.set("sample", metricsSampleFilter);

      const res = await fetch(`/api/admin/config/ops/metrics/history?${params.toString()}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as MetricsHistoryResponse;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo cargar historial de métricas");
      }

      setMetricsRows(payload.data?.items || []);
      setRequestId(payload.requestId || res.headers.get("x-request-id"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar historial de métricas");
    } finally {
      setHistoryLoading(false);
    }
  }, [metricsRange, metricsServiceFilter, metricsStatusFilter, metricsSampleFilter]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("range", alertsRange);
      params.set("limit", "240");
      if (alertsTypeFilter) params.set("type", alertsTypeFilter);
      if (alertsLevelFilter) params.set("level", alertsLevelFilter);
      if (alertsServiceFilter) params.set("service", alertsServiceFilter);

      const res = await fetch(`/api/admin/config/ops/alerts?${params.toString()}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as AlertsResponse;
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo cargar alertas OPS");
      }

      setAlertRows(payload.data?.items || []);
      setRequestId(payload.requestId || res.headers.get("x-request-id"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar alertas OPS");
    } finally {
      setAlertsLoading(false);
    }
  }, [alertsRange, alertsTypeFilter, alertsLevelFilter, alertsServiceFilter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadMetricsHistory();
  }, [loadMetricsHistory]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadSummary();
    }, 30_000);
    return () => clearInterval(timer);
  }, [loadSummary]);

  const onSaveConfig = useCallback(async () => {
    if (!canEditConfig) return;
    setSavingConfig(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        enabled: configEnabled,
        frequencySeconds: configFrequency,
        channels: {
          email: channelEmail,
          whatsapp: channelWhatsapp
        }
      };

      const emailList = parseCsv(recipientsEmailInput);
      const whatsappList = parseCsv(recipientsWhatsappInput);
      if (emailList.length > 0 || whatsappList.length > 0) {
        payload.recipients = {
          emails: emailList,
          whatsapp: whatsappList
        };
      }

      const res = await fetch("/api/admin/config/ops/scheduler-config", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const parsed = (await res.json().catch(() => ({}))) as SchedulerConfigResponse;
      if (!res.ok || !parsed.data) {
        throw new Error(parsed.error || "No se pudo guardar configuración del scheduler");
      }

      setConfigEnabled(Boolean(parsed.data.enabled));
      setConfigFrequency(Number(parsed.data.frequencySeconds || 120));
      setChannelEmail(Boolean(parsed.data.channels.email));
      setChannelWhatsapp(Boolean(parsed.data.channels.whatsapp));
      setMaskedEmails(parsed.data.maskedRecipients?.emails || []);
      setMaskedWhatsapp(parsed.data.maskedRecipients?.whatsapp || []);
      setLatestRunAt(parsed.data.latestRun?.createdAt || null);
      setLatestRunStatus(parsed.data.latestRun?.status || null);
      setRecipientsEmailInput("");
      setRecipientsWhatsappInput("");
      setRequestId(parsed.requestId || res.headers.get("x-request-id"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar configuración del scheduler");
    } finally {
      setSavingConfig(false);
    }
  }, [
    canEditConfig,
    channelEmail,
    channelWhatsapp,
    configEnabled,
    configFrequency,
    recipientsEmailInput,
    recipientsWhatsappInput
  ]);

  const onRunNow = useCallback(async () => {
    setRunningNow(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/config/ops/scheduler/run-now", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ force: true })
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        requestId?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || "No se pudo ejecutar scheduler");
      }

      setRequestId(payload.requestId || res.headers.get("x-request-id"));
      await Promise.all([loadSummary(), loadMetricsHistory(), loadAlerts()]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "No se pudo ejecutar scheduler");
    } finally {
      setRunningNow(false);
    }
  }, [loadAlerts, loadMetricsHistory, loadSummary]);

  return (
    <div className="space-y-4 text-[#0f172a]" style={{ fontFamily: '"Inter", "Nunito Sans", var(--font-sans)' }}>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2e75ba]">Configuración · Operaciones</p>
        <h1 className="text-xl font-semibold" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
          Historial & Alertas
        </h1>
        <p className="text-xs text-slate-600">Snapshots automáticos, alertas por transición y control operativo por tenant.</p>
        <p className="mt-1 text-xs text-slate-500">requestId: {requestId || "—"}</p>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>

      <OpsOperationsNav currentPath="/admin/configuracion/operaciones/alertas" />

      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Health actual</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{healthStatus}</p>
          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] ${statusChipClasses(healthStatus)}`}>{healthStatus}</span>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Métricas actuales</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{metricsStatus}</p>
          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] ${statusChipClasses(metricsStatus)}`}>{metricsStatus}</span>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Última ejecución scheduler</p>
          <p className="mt-1 text-xs text-slate-700">{toDateTime(latestRunAt)}</p>
          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] ${statusChipClasses(latestRunStatus || "down")}`}>
            {latestRunStatus || "—"}
          </span>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2e75ba]">Alertas recientes</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{activeAlerts.length}</p>
          <p className="text-xs text-slate-500">críticas: {alertRows.filter((row) => row.level === "critical").length}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#2e75ba]" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
            Configuración del scheduler
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadSummary();
                void loadMetricsHistory();
                void loadAlerts();
              }}
              className="rounded-lg bg-[#4aadf5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d98dc]"
            >
              {summaryLoading || historyLoading || alertsLoading ? "Actualizando..." : "Refrescar"}
            </button>
            <button
              type="button"
              onClick={() => void onRunNow()}
              disabled={runningNow}
              className="rounded-lg bg-[#4aa59c] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:opacity-60"
            >
              {runningNow ? "Ejecutando..." : "Run now"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-slate-700">
            <span className="mb-1 block font-semibold">Habilitado</span>
            <select
              value={configEnabled ? "true" : "false"}
              onChange={(event) => setConfigEnabled(event.target.value === "true")}
              disabled={!canEditConfig}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-60"
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>

          <label className="text-xs text-slate-700">
            <span className="mb-1 block font-semibold">Frecuencia</span>
            <select
              value={String(configFrequency)}
              onChange={(event) => setConfigFrequency(Number(event.target.value))}
              disabled={!canEditConfig}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-60"
            >
              <option value="60">60s</option>
              <option value="120">120s</option>
              <option value="300">300s</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={channelEmail}
              onChange={(event) => setChannelEmail(event.target.checked)}
              disabled={!canEditConfig}
              className="h-4 w-4 rounded border-slate-300 text-[#2e75ba]"
            />
            Canal email
          </label>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={channelWhatsapp}
              onChange={(event) => setChannelWhatsapp(event.target.checked)}
              disabled={!canEditConfig}
              className="h-4 w-4 rounded border-slate-300 text-[#2e75ba]"
            />
            Canal WhatsApp (stub)
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="text-xs text-slate-700">
            <span className="mb-1 block font-semibold">Emails destinatarios (csv, opcional)</span>
            <input
              value={recipientsEmailInput}
              onChange={(event) => setRecipientsEmailInput(event.target.value)}
              placeholder="ops@empresa.com, admin@empresa.com"
              disabled={!canEditConfig}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-60"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Actuales: {maskedEmails.length ? maskedEmails.join(", ") : "sin destinatarios explícitos"}
            </span>
          </label>

          <label className="text-xs text-slate-700">
            <span className="mb-1 block font-semibold">WhatsApp destinatarios (csv, opcional)</span>
            <input
              value={recipientsWhatsappInput}
              onChange={(event) => setRecipientsWhatsappInput(event.target.value)}
              placeholder="+50255551234,+50255559876"
              disabled={!canEditConfig}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs disabled:opacity-60"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Actuales: {maskedWhatsapp.length ? maskedWhatsapp.join(", ") : "sin destinatarios"}
            </span>
          </label>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => void onSaveConfig()}
            disabled={!canEditConfig || savingConfig}
            className="rounded-lg bg-[#2e75ba] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#255f96] disabled:opacity-60"
          >
            {savingConfig ? "Guardando..." : canEditConfig ? "Guardar configuración" : "Solo SUPER_ADMIN puede editar"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-2 text-sm font-semibold text-[#2e75ba]" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
            Historial de métricas
          </h2>
          <select
            value={metricsRange}
            onChange={(event) => setMetricsRange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
          </select>
          <select
            value={metricsSampleFilter}
            onChange={(event) => setMetricsSampleFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="5m">Muestra 5m</option>
            <option value="15m">Muestra 15m</option>
            <option value="1h">Muestra 1h</option>
          </select>
          <input
            value={metricsServiceFilter}
            onChange={(event) => setMetricsServiceFilter(event.target.value)}
            placeholder="servicio"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
          <select
            value={metricsStatusFilter}
            onChange={(event) => setMetricsStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todos</option>
            <option value="up">up</option>
            <option value="down">down</option>
          </select>
          <button
            type="button"
            onClick={() => void loadMetricsHistory()}
            className="rounded-lg bg-[#4aadf5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d98dc]"
          >
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-2 py-2 font-semibold">Fecha</th>
                <th className="px-2 py-2 font-semibold">Servicio</th>
                <th className="px-2 py-2 font-semibold">Estado</th>
                <th className="px-2 py-2 font-semibold">CPU%</th>
                <th className="px-2 py-2 font-semibold">RAM</th>
                <th className="px-2 py-2 font-semibold">RAM%</th>
                <th className="px-2 py-2 font-semibold">RX</th>
                <th className="px-2 py-2 font-semibold">TX</th>
                <th className="px-2 py-2 font-semibold">BW</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={9}>
                    Cargando historial...
                  </td>
                </tr>
              ) : metricsRows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={9}>
                    Sin snapshots de métricas.
                  </td>
                </tr>
              ) : (
                metricsRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-2 py-2">{toDateTime(row.checkedAt)}</td>
                    <td className="px-2 py-2 font-medium text-slate-700">{row.serviceKey}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-lg border px-1.5 py-0.5 ${statusChipClasses(row.serviceStatus)}`}>{row.serviceStatus}</span>
                    </td>
                    <td className="px-2 py-2">{row.cpuPercent.toFixed(2)}%</td>
                    <td className="px-2 py-2">{formatBytes(row.memoryBytes)}</td>
                    <td className="px-2 py-2">{typeof row.memoryPercent === "number" ? `${row.memoryPercent.toFixed(2)}%` : "—"}</td>
                    <td className="px-2 py-2">{formatBytes(row.netRxBps)}/s</td>
                    <td className="px-2 py-2">{formatBytes(row.netTxBps)}/s</td>
                    <td className="px-2 py-2">{formatBytes(row.bandwidthBps)}/s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-2 text-sm font-semibold text-[#2e75ba]" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
            Eventos de alerta
          </h2>
          <select
            value={alertsRange}
            onChange={(event) => setAlertsRange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
          </select>
          <select
            value={alertsTypeFilter}
            onChange={(event) => setAlertsTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todos tipos</option>
            <option value="health_transition">health_transition</option>
            <option value="service_down">service_down</option>
            <option value="metrics_threshold">metrics_threshold</option>
            <option value="recovery">recovery</option>
          </select>
          <select
            value={alertsLevelFilter}
            onChange={(event) => setAlertsLevelFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Todos niveles</option>
            <option value="info">info</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
          </select>
          <input
            value={alertsServiceFilter}
            onChange={(event) => setAlertsServiceFilter(event.target.value)}
            placeholder="servicio"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => void loadAlerts()}
            className="rounded-lg bg-[#4aadf5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d98dc]"
          >
            Filtrar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-2 py-2 font-semibold">Fecha</th>
                <th className="px-2 py-2 font-semibold">Nivel</th>
                <th className="px-2 py-2 font-semibold">Tipo</th>
                <th className="px-2 py-2 font-semibold">Servicio</th>
                <th className="px-2 py-2 font-semibold">Transición</th>
                <th className="px-2 py-2 font-semibold">Resumen</th>
                <th className="px-2 py-2 font-semibold">dedupeKey</th>
                <th className="px-2 py-2 font-semibold">requestId</th>
              </tr>
            </thead>
            <tbody>
              {alertsLoading ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={8}>
                    Cargando alertas...
                  </td>
                </tr>
              ) : alertRows.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={8}>
                    Sin alertas registradas.
                  </td>
                </tr>
              ) : (
                alertRows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-2 py-2">{toDateTime(row.createdAt)}</td>
                    <td className="px-2 py-2">
                      <span className={`rounded-lg border px-1.5 py-0.5 ${statusChipClasses(row.level)}`}>{row.level}</span>
                    </td>
                    <td className="px-2 py-2">{row.type}</td>
                    <td className="px-2 py-2">{row.serviceKey || "global"}</td>
                    <td className="px-2 py-2">
                      {(row.fromStatus || "-")} → {(row.toStatus || "-")}
                    </td>
                    <td className="max-w-[280px] truncate px-2 py-2" title={row.summary}>
                      {row.summary}
                    </td>
                    <td className="max-w-[260px] truncate px-2 py-2 font-mono" title={row.dedupeKey}>
                      {row.dedupeKey}
                    </td>
                    <td className="px-2 py-2 font-mono">{row.requestId || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-[#2e75ba]" style={{ fontFamily: '"Montserrat", "Poppins", var(--font-sans)' }}>
          Consumo actual por servicio
        </h2>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {currentMetricsServices.map((service) => (
            <article key={service.serviceKey} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2e75ba]">{service.serviceKey}</p>
                <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">actual</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">CPU: {service.cpuPercent.toFixed(2)}%</p>
              <p className="text-xs text-slate-600">RAM: {formatBytes(service.memoryBytes)}</p>
              <p className="text-xs text-slate-600">
                Red: ↓{formatBytes(service.networkRxBytesPerSec)}/s · ↑{formatBytes(service.networkTxBytesPerSec)}/s
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
