import { sendMail } from "@/lib/email/mailer";
import { resolveOpsAdminRecipient } from "@/lib/ops/adminRecipient";
import type {
  OpsAlertLevel,
  OpsAlertType,
  OpsHealthSnapshot,
  OpsMetricsSnapshot,
  OpsSchedulerChannels,
  OpsSchedulerRecipients
} from "@/lib/ops/types";

type PreviousHealthState = {
  status: "ok" | "degraded" | "down";
  services: Record<string, string>;
};

export type OpsAlertCandidate = {
  level: OpsAlertLevel;
  type: OpsAlertType;
  fromStatus: string | null;
  toStatus: string | null;
  serviceKey: string | null;
  summary: string;
  detailJson: Record<string, unknown>;
  dedupeKey: string;
};

type BuildOpsAlertsInput = {
  tenantId: string;
  previousHealth: PreviousHealthState | null;
  currentHealth: OpsHealthSnapshot;
  currentMetrics: OpsMetricsSnapshot;
  cpuWarnPct?: number;
  cpuCriticalPct?: number;
  memWarnPct?: number;
  memCriticalPct?: number;
  bandwidthWarnBps?: number;
};

function normalizeStatus(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "down") return "down";
  if (normalized === "degraded") return "degraded";
  if (normalized === "optional_down") return "optional_down";
  return "ok";
}

function buildDedupeKey(input: {
  tenantId: string;
  type: OpsAlertType;
  serviceKey?: string | null;
  toStatus?: string | null;
}) {
  return `${input.tenantId}:${input.type}:${input.serviceKey || "global"}:${input.toStatus || "na"}`;
}

function clampThreshold(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, parsed));
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeRecipients(input: OpsSchedulerRecipients) {
  const emails = (input.emails || [])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((value, index, all) => Boolean(value) && value.includes("@") && all.indexOf(value) === index)
    .slice(0, 30);

  const whatsapp = (input.whatsapp || [])
    .map((value) => String(value || "").trim())
    .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index)
    .slice(0, 30);

  return { emails, whatsapp };
}

function createAlert(input: {
  tenantId: string;
  level: OpsAlertLevel;
  type: OpsAlertType;
  fromStatus?: string | null;
  toStatus?: string | null;
  serviceKey?: string | null;
  summary: string;
  detailJson?: Record<string, unknown>;
}): OpsAlertCandidate {
  return {
    level: input.level,
    type: input.type,
    fromStatus: input.fromStatus || null,
    toStatus: input.toStatus || null,
    serviceKey: input.serviceKey || null,
    summary: input.summary,
    detailJson: input.detailJson || {},
    dedupeKey: buildDedupeKey({
      tenantId: input.tenantId,
      type: input.type,
      serviceKey: input.serviceKey,
      toStatus: input.toStatus
    })
  };
}

export function buildOpsAlertCandidates(input: BuildOpsAlertsInput): OpsAlertCandidate[] {
  const tenantId = String(input.tenantId || "local").trim() || "local";
  const candidates: OpsAlertCandidate[] = [];

  const cpuWarnPct = clampThreshold(input.cpuWarnPct, 85);
  const cpuCriticalPct = clampThreshold(input.cpuCriticalPct, 95);
  const memWarnPct = clampThreshold(input.memWarnPct, 85);
  const memCriticalPct = clampThreshold(input.memCriticalPct, 95);
  const bandwidthWarnBps = Math.max(1, Number(input.bandwidthWarnBps || 12 * 1024 * 1024));

  const previousGlobal = normalizeStatus(input.previousHealth?.status);
  const currentGlobal = normalizeStatus(input.currentHealth.status);

  if (input.previousHealth && previousGlobal !== currentGlobal) {
    const recovering = currentGlobal === "ok" && (previousGlobal === "down" || previousGlobal === "degraded");
    candidates.push(
      createAlert({
        tenantId,
        level: recovering ? "info" : currentGlobal === "down" ? "critical" : "warning",
        type: recovering ? "recovery" : "health_transition",
        fromStatus: previousGlobal,
        toStatus: currentGlobal,
        summary: recovering
          ? `Recuperación global: ${previousGlobal} -> ok`
          : `Transición global de health: ${previousGlobal} -> ${currentGlobal}`,
        detailJson: {
          previousStatus: previousGlobal,
          currentStatus: currentGlobal,
          serviceCount: input.currentHealth.services.length
        }
      })
    );
  }

  const previousServices = input.previousHealth?.services || {};
  for (const service of input.currentHealth.services) {
    const previous = normalizeStatus(previousServices[service.serviceKey]);
    const current = normalizeStatus(service.status);
    if (!service.required || !previousServices[service.serviceKey] || previous === current) continue;

    if (current === "down") {
      candidates.push(
        createAlert({
          tenantId,
          level: "critical",
          type: "service_down",
          fromStatus: previous,
          toStatus: "down",
          serviceKey: service.serviceKey,
          summary: `Servicio ${service.serviceKey} cayó a down`,
          detailJson: {
            previousStatus: previous,
            currentStatus: "down",
            detail: service.detail || null
          }
        })
      );
      continue;
    }

    if (previous === "down") {
      candidates.push(
        createAlert({
          tenantId,
          level: "info",
          type: "recovery",
          fromStatus: "down",
          toStatus: current,
          serviceKey: service.serviceKey,
          summary: `Servicio ${service.serviceKey} recuperado (${current})`,
          detailJson: {
            previousStatus: "down",
            currentStatus: current,
            latencyMs: service.latencyMs ?? null
          }
        })
      );
    }
  }

  for (const service of input.currentMetrics.services) {
    if (service.status !== "up") continue;

    if (service.cpuPercent >= cpuWarnPct) {
      const critical = service.cpuPercent >= cpuCriticalPct;
      candidates.push(
        createAlert({
          tenantId,
          level: critical ? "critical" : "warning",
          type: "metrics_threshold",
          fromStatus: null,
          toStatus: critical ? "cpu_critical" : "cpu_high",
          serviceKey: service.serviceKey,
          summary: `CPU alta en ${service.serviceKey}: ${service.cpuPercent.toFixed(2)}%`,
          detailJson: {
            metric: "cpuPercent",
            value: service.cpuPercent,
            warnThreshold: cpuWarnPct,
            criticalThreshold: cpuCriticalPct,
            range: input.currentMetrics.range
          }
        })
      );
    }

    if (typeof service.memoryPercent === "number" && service.memoryPercent >= memWarnPct) {
      const critical = service.memoryPercent >= memCriticalPct;
      candidates.push(
        createAlert({
          tenantId,
          level: critical ? "critical" : "warning",
          type: "metrics_threshold",
          fromStatus: null,
          toStatus: critical ? "mem_critical" : "mem_high",
          serviceKey: service.serviceKey,
          summary: `RAM alta en ${service.serviceKey}: ${service.memoryPercent.toFixed(2)}%`,
          detailJson: {
            metric: "memoryPercent",
            value: service.memoryPercent,
            warnThreshold: memWarnPct,
            criticalThreshold: memCriticalPct,
            memoryBytes: service.memoryBytes,
            range: input.currentMetrics.range
          }
        })
      );
    }

    if (service.bandwidthBytesPerSec >= bandwidthWarnBps) {
      candidates.push(
        createAlert({
          tenantId,
          level: "warning",
          type: "metrics_threshold",
          fromStatus: null,
          toStatus: "bandwidth_high",
          serviceKey: service.serviceKey,
          summary: `Ancho de banda alto en ${service.serviceKey}`,
          detailJson: {
            metric: "bandwidthBytesPerSec",
            value: service.bandwidthBytesPerSec,
            warnThreshold: bandwidthWarnBps,
            netRxBps: service.networkRxBytesPerSec,
            netTxBps: service.networkTxBytesPerSec,
            range: input.currentMetrics.range
          }
        })
      );
    }
  }

  const unique = new Map<string, OpsAlertCandidate>();
  for (const alert of candidates) {
    if (!unique.has(alert.dedupeKey)) {
      unique.set(alert.dedupeKey, alert);
    }
  }

  return Array.from(unique.values());
}

async function sendOpsWhatsAppStub(input: {
  alert: OpsAlertCandidate;
  recipients: string[];
  tenantId: string;
}) {
  if (!input.recipients.length) return false;
  console.info("[ops.alert.whatsapp.stub]", {
    tenantId: input.tenantId,
    recipients: input.recipients.length,
    summary: input.alert.summary,
    level: input.alert.level,
    type: input.alert.type
  });
  return false;
}

export async function notifyOpsAlert(input: {
  tenantId: string;
  alert: OpsAlertCandidate;
  channels: OpsSchedulerChannels;
  recipients: OpsSchedulerRecipients;
}) {
  const tenantId = String(input.tenantId || "local").trim() || "local";
  const recipients = normalizeRecipients(input.recipients);

  if (input.channels.email && recipients.emails.length === 0) {
    const admin = await resolveOpsAdminRecipient({ tenantId });
    if (admin?.email) {
      recipients.emails = [admin.email.toLowerCase()];
    }
  }

  let emailSent = false;
  let whatsappSent = false;

  if (input.channels.email && recipients.emails.length > 0) {
    const levelLabel = input.alert.level.toUpperCase();
    const subject = `[StarMedical OPS][${levelLabel}] ${input.alert.summary}`;
    const text = [
      `Tenant: ${tenantId}`,
      `Nivel: ${input.alert.level}`,
      `Tipo: ${input.alert.type}`,
      `Servicio: ${input.alert.serviceKey || "global"}`,
      `Transición: ${(input.alert.fromStatus || "-")} -> ${(input.alert.toStatus || "-")}`,
      `Resumen: ${input.alert.summary}`
    ].join("\n");

    const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
      <p><strong>Alerta OPS</strong></p>
      <p><strong>Tenant:</strong> ${escapeHtml(tenantId)}</p>
      <p><strong>Nivel:</strong> ${escapeHtml(input.alert.level)}</p>
      <p><strong>Tipo:</strong> ${escapeHtml(input.alert.type)}</p>
      <p><strong>Servicio:</strong> ${escapeHtml(input.alert.serviceKey || "global")}</p>
      <p><strong>Transición:</strong> ${escapeHtml(input.alert.fromStatus || "-")} -> ${escapeHtml(input.alert.toStatus || "-")}</p>
      <p><strong>Resumen:</strong> ${escapeHtml(input.alert.summary)}</p>
    </div>`;

    try {
      await sendMail({
        to: recipients.emails,
        subject,
        text,
        html,
        tenantId,
        emailType: "ops-alert",
        moduleKey: "SOPORTE"
      });
      emailSent = true;
    } catch (error) {
      console.error("[ops.alert.email.failed]", {
        tenantId,
        message: error instanceof Error ? error.message : "email_send_failed"
      });
    }
  }

  if (input.channels.whatsapp) {
    whatsappSent = await sendOpsWhatsAppStub({
      alert: input.alert,
      recipients: recipients.whatsapp,
      tenantId
    });
  }

  return { emailSent, whatsappSent };
}
