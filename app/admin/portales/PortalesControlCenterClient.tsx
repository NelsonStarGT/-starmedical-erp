"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type TabKey = "dashboard" | "configuracion" | "auditoria" | "sesiones" | "solicitudes";

type Capability =
  | "PORTAL_CONFIG_READ"
  | "PORTAL_CONFIG_WRITE"
  | "PORTAL_AUDIT_READ"
  | "PORTAL_SESSION_READ"
  | "PORTAL_SESSION_REVOKE"
  | "PORTAL_REQUESTS_READ";

type PortalRange = "today" | "7d" | "30d";
type PortalChannelFilter = "all" | "patient" | "company";
type PortalBranchScope = "all" | "active";
type PortalConfigSource = "db" | "defaults";

type PortalKpiSnapshot = {
  range: PortalRange;
  channel: PortalChannelFilter;
  branchScope: PortalBranchScope;
  effectiveBranchId: string | null;
  kpis: {
    otpRequested: number;
    otpVerified: number;
    loginFailed: number;
    sessionsActive: number;
    sessionsRevoked: number;
    requestedAppointments: number;
  };
  series: Array<{
    date: string;
    otpRequested: number;
    otpVerified: number;
    loginFailed: number;
    requestedAppointments: number;
  }>;
  criticalEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
    clientName: string | null;
    metadataSummary: string | null;
  }>;
};

type PortalMenuItem = {
  key: string;
  label: string;
  path: string;
  enabled: boolean;
  order: number;
};

type PortalConfigState = {
  version: number;
  source: PortalConfigSource;
  patientPortalMenus: PortalMenuItem[];
  companyPortalMenus: PortalMenuItem[];
  support: {
    phone: string;
    whatsappUrl: string;
    supportText: string;
    hours: string;
    showSupportCard: boolean;
  };
  auth: {
    otpEnabled: boolean;
    magicLinkEnabled: boolean;
    otpLength: number;
    otpTtlMinutes: number;
    sessionAccessTtlMinutes: number;
    sessionRefreshTtlHours: number;
  };
  appointmentsRules: {
    startHour: string;
    endHour: string;
    slotMinutes: number;
    greenThreshold: number;
    yellowThreshold: number;
    requestLimitPerDay: number;
  };
  branding: {
    logoUrl: string | null;
    primary: string;
    secondary: string;
    corporate: string;
  };
};

type PortalAuditItem = {
  id: string;
  createdAt: string;
  action: string;
  clientId: string | null;
  clientName: string | null;
  metadataSummary: string | null;
  metadata: unknown;
};

type PortalAuditResult = {
  items: PortalAuditItem[];
  nextCursor: string | null;
};

type SessionStatus = "active" | "revoked" | "expired";

type PortalSessionItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientType: string;
  clientEmail: string | null;
  clientPhone: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  status: SessionStatus;
  rotationCounter: number;
};

type PortalSessionResult = {
  items: PortalSessionItem[];
  nextCursor: string | null;
};

type PortalSolicitudItem = {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  typeName: string;
  branchId: string;
  branchName: string | null;
  preferredDate: string;
  reason: string;
  requestedAt: string;
  channel: "PATIENT_PORTAL" | "COMPANY_PORTAL" | "INTERNAL" | "UNKNOWN";
  companyId: string | null;
  companyName: string | null;
};

type Props = {
  userName: string;
  capabilities: string[];
  activeBranchId: string | null;
  activeBranchName: string | null;
};

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "configuracion", label: "Configuración" },
  { key: "auditoria", label: "Auditoría" },
  { key: "sesiones", label: "Sesiones" },
  { key: "solicitudes", label: "Solicitudes" }
];

const HOUR_MINUTE_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-GT", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-GT", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function channelLabel(channel: PortalChannelFilter) {
  if (channel === "patient") return "Portal Paciente";
  if (channel === "company") return "Portal Empresa";
  return "Todos";
}

function requestChannelLabel(channel: PortalSolicitudItem["channel"]) {
  if (channel === "PATIENT_PORTAL") return "Portal paciente";
  if (channel === "COMPANY_PORTAL") return "Portal empresa";
  if (channel === "INTERNAL") return "Interno";
  return "Desconocido";
}

function requestChannelBadgeClass(channel: PortalSolicitudItem["channel"]) {
  if (channel === "PATIENT_PORTAL") {
    return "border-[#d2e2f6] bg-[#f0f6ff] text-[#2e75ba]";
  }
  if (channel === "COMPANY_PORTAL") {
    return "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]";
  }
  if (channel === "INTERNAL") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-slate-200 bg-white text-slate-500";
}

function sessionStatusBadgeClass(status: SessionStatus) {
  if (status === "active") return "border-[#cde7e4] bg-[#eff8f7] text-[#1f6f68]";
  if (status === "revoked") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function sessionStatusLabel(status: SessionStatus) {
  if (status === "active") return "Activa";
  if (status === "revoked") return "Revocada";
  return "Expirada";
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function formatApiIssues(issues: unknown): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const parts = issues
    .slice(0, 4)
    .map((issue) => {
      if (!issue || typeof issue !== "object") return null;
      const record = issue as Record<string, unknown>;
      const path = String(record.path || "").trim();
      const message = String(record.message || "").trim();
      if (!message) return null;
      return path ? `${path}: ${message}` : message;
    })
    .filter((value): value is string => Boolean(value));
  if (!parts.length) return null;
  return parts.join(" | ");
}

function stringifyMetadataPreview(metadata: unknown, maxLength = 2000) {
  const serialized = JSON.stringify(metadata, null, 2);
  if (!serialized) return "Sin metadata";
  if (serialized.length <= maxLength) return serialized;
  return `${serialized.slice(0, maxLength)}\n... (truncado)`;
}

function hasCapability(capabilities: Set<string>, capability: Capability) {
  return capabilities.has(capability);
}

function mapConfigResponseToState(input: any): PortalConfigState {
  return {
    version: Number(input?.version || 1),
    source: input?.source === "defaults" ? "defaults" : "db",
    patientPortalMenus: Array.isArray(input?.patientPortalMenus)
      ? input.patientPortalMenus.map((item: any) => ({
          key: String(item?.key || ""),
          label: String(item?.label || ""),
          path: String(item?.path || ""),
          enabled: Boolean(item?.enabled),
          order: Number(item?.order || 0)
        }))
      : [],
    companyPortalMenus: Array.isArray(input?.companyPortalMenus)
      ? input.companyPortalMenus.map((item: any) => ({
          key: String(item?.key || ""),
          label: String(item?.label || ""),
          path: String(item?.path || ""),
          enabled: Boolean(item?.enabled),
          order: Number(item?.order || 0)
        }))
      : [],
    support: {
      phone: String(input?.support?.phone || ""),
      whatsappUrl: String(input?.support?.whatsappUrl || ""),
      supportText: String(input?.support?.supportText || ""),
      hours: String(input?.support?.hours || ""),
      showSupportCard: Boolean(input?.support?.showSupportCard)
    },
    auth: {
      otpEnabled: Boolean(input?.auth?.otpEnabled),
      magicLinkEnabled: Boolean(input?.auth?.magicLinkEnabled),
      otpLength: Number(input?.auth?.otpLength || 6),
      otpTtlMinutes: Number(input?.auth?.otpTtlMinutes || 10),
      sessionAccessTtlMinutes: Number(input?.auth?.sessionAccessTtlMinutes || 15),
      sessionRefreshTtlHours: Number(input?.auth?.sessionRefreshTtlHours || 24)
    },
    appointmentsRules: {
      startHour: String(input?.appointmentsRules?.startHour || "08:00"),
      endHour: String(input?.appointmentsRules?.endHour || "17:00"),
      slotMinutes: Number(input?.appointmentsRules?.slotMinutes || 30),
      greenThreshold: Number(input?.appointmentsRules?.greenThreshold || 0.6),
      yellowThreshold: Number(input?.appointmentsRules?.yellowThreshold || 0.2),
      requestLimitPerDay: Number(input?.appointmentsRules?.requestLimitPerDay || 10)
    },
    branding: {
      logoUrl: input?.branding?.logoUrl ? String(input.branding.logoUrl) : null,
      primary: String(input?.branding?.primary || "#4aa59c"),
      secondary: String(input?.branding?.secondary || "#4aadf5"),
      corporate: String(input?.branding?.corporate || "#2e75ba")
    }
  };
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateConfigBeforeSave(state: PortalConfigState): string[] {
  const issues: string[] = [];

  const allMenus = [...state.patientPortalMenus, ...state.companyPortalMenus];
  const seenKeys = new Set<string>();
  for (const item of allMenus) {
    const key = item.key.trim().toLowerCase();
    if (!key) {
      issues.push(`Menú "${item.label || "sin etiqueta"}": key es requerida.`);
    } else if (seenKeys.has(key)) {
      issues.push(`Menú "${item.label || key}": key duplicada.`);
    } else {
      seenKeys.add(key);
    }

    if (!item.path.trim().startsWith("/")) {
      issues.push(`Menú "${item.label || key || "sin etiqueta"}": path debe iniciar con "/".`);
    }
  }

  if (!state.support.phone.trim()) {
    issues.push("Soporte: teléfono es obligatorio.");
  }
  if (!state.support.whatsappUrl.trim() || !isValidUrl(state.support.whatsappUrl.trim())) {
    issues.push("Soporte: WhatsApp URL debe ser válida (http/https).");
  }
  if (!state.support.supportText.trim()) {
    issues.push("Soporte: texto de soporte es obligatorio.");
  }

  if (!HOUR_MINUTE_REGEX.test(state.appointmentsRules.startHour)) {
    issues.push("Reglas de citas: inicio horario debe tener formato HH:MM.");
  }
  if (!HOUR_MINUTE_REGEX.test(state.appointmentsRules.endHour)) {
    issues.push("Reglas de citas: fin horario debe tener formato HH:MM.");
  }

  const [startHour, startMinute] = state.appointmentsRules.startHour.split(":").map((part) => Number(part));
  const [endHour, endMinute] = state.appointmentsRules.endHour.split(":").map((part) => Number(part));
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  if (Number.isFinite(startTotal) && Number.isFinite(endTotal) && endTotal <= startTotal) {
    issues.push("Reglas de citas: fin horario debe ser mayor a inicio horario.");
  }

  if (state.appointmentsRules.greenThreshold < 0 || state.appointmentsRules.greenThreshold > 1) {
    issues.push("Reglas de citas: umbral verde debe estar entre 0 y 1.");
  }
  if (state.appointmentsRules.yellowThreshold < 0 || state.appointmentsRules.yellowThreshold > 1) {
    issues.push("Reglas de citas: umbral amarillo debe estar entre 0 y 1.");
  }
  if (state.appointmentsRules.yellowThreshold >= state.appointmentsRules.greenThreshold) {
    issues.push("Reglas de citas: umbral verde debe ser mayor que umbral amarillo.");
  }

  if (!HEX_COLOR_REGEX.test(state.branding.primary)) {
    issues.push("Branding: color Primary debe tener formato #RRGGBB.");
  }
  if (!HEX_COLOR_REGEX.test(state.branding.secondary)) {
    issues.push("Branding: color Secondary debe tener formato #RRGGBB.");
  }
  if (!HEX_COLOR_REGEX.test(state.branding.corporate)) {
    issues.push("Branding: color Corporate debe tener formato #RRGGBB.");
  }

  if (state.branding.logoUrl && !isValidUrl(state.branding.logoUrl)) {
    issues.push("Branding: Logo URL debe ser válida (http/https).");
  }

  return issues;
}

export default function PortalesControlCenterClient({ userName, capabilities, activeBranchId, activeBranchName }: Props) {
  const capabilitySet = useMemo(() => new Set(capabilities), [capabilities]);
  const { toasts, showToast, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  const [kpisLoading, setKpisLoading] = useState(false);
  const [kpisData, setKpisData] = useState<PortalKpiSnapshot | null>(null);
  const [kpisRange, setKpisRange] = useState<PortalRange>("today");
  const [kpisChannel, setKpisChannel] = useState<PortalChannelFilter>("all");
  const [kpisBranchScope, setKpisBranchScope] = useState<PortalBranchScope>("all");

  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configState, setConfigState] = useState<PortalConfigState | null>(null);
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<PortalAuditResult>({ items: [], nextCursor: null });
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditChannel, setAuditChannel] = useState<PortalChannelFilter>("all");
  const [selectedAudit, setSelectedAudit] = useState<PortalAuditItem | null>(null);

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsData, setSessionsData] = useState<PortalSessionResult>({ items: [], nextCursor: null });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
  const [sessionChannel, setSessionChannel] = useState<PortalChannelFilter>("all");
  const [sessionQueryClient, setSessionQueryClient] = useState("");

  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [solicitudesRows, setSolicitudesRows] = useState<PortalSolicitudItem[]>([]);
  const [solicitudesChannel, setSolicitudesChannel] = useState<PortalChannelFilter>("all");
  const [solicitudesBranchScope, setSolicitudesBranchScope] = useState<PortalBranchScope>("all");

  const canReadConfig = hasCapability(capabilitySet, "PORTAL_CONFIG_READ");
  const canWriteConfig = hasCapability(capabilitySet, "PORTAL_CONFIG_WRITE");
  const canReadAudit = hasCapability(capabilitySet, "PORTAL_AUDIT_READ");
  const canReadSessions = hasCapability(capabilitySet, "PORTAL_SESSION_READ");
  const canRevokeSessions = hasCapability(capabilitySet, "PORTAL_SESSION_REVOKE");
  const canReadSolicitudes = hasCapability(capabilitySet, "PORTAL_REQUESTS_READ");

  const loadKpis = useCallback(async () => {
    if (!canReadAudit) return;
    if (kpisBranchScope === "active" && !activeBranchId) {
      setKpisData(null);
      return;
    }

    setKpisLoading(true);
    try {
      const params = new URLSearchParams({
        range: kpisRange,
        channel: kpisChannel,
        branchScope: kpisBranchScope
      });

      const res = await fetch(`/api/admin/portales/kpis?${params.toString()}`, { cache: "no-store" });
      const json = await readResponseJson(res);
      if (!res.ok) {
        throw new Error(json?.error || "No se pudo cargar KPIs.");
      }

      setKpisData(json.data as PortalKpiSnapshot);
    } catch (error) {
      showToast({
        tone: "error",
        title: "No se pudo cargar dashboard",
        message: error instanceof Error ? error.message : "Error inesperado."
      });
    } finally {
      setKpisLoading(false);
    }
  }, [canReadAudit, kpisRange, kpisChannel, kpisBranchScope, activeBranchId, showToast]);

  const loadConfig = useCallback(async () => {
    if (!canReadConfig) return;
    setConfigLoading(true);
    setConfigLoadError(null);
    try {
      const res = await fetch("/api/admin/portales/config", { cache: "no-store" });
      const json = await readResponseJson(res);
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(
            json?.error ||
              "Configuración no disponible. Falta aplicar migración PortalConfig o prisma generate."
          );
        }
        if (res.status === 403) {
          throw new Error("No autorizado para leer configuración.");
        }
        throw new Error(json?.error || "No se pudo cargar configuración.");
      }
      setConfigState(mapConfigResponseToState(json.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado.";
      setConfigLoadError(message);
      showToast({
        tone: "error",
        title: "No se pudo cargar configuración",
        message
      });
    } finally {
      setConfigLoading(false);
    }
  }, [canReadConfig, showToast]);

  const loadAudit = useCallback(
    async (options?: { reset?: boolean }) => {
      if (!canReadAudit) return;
      setAuditLoading(true);
      try {
        const cursor = options?.reset ? null : auditData.nextCursor;
        const params = new URLSearchParams({
          limit: "20",
          channel: auditChannel
        });

        if (cursor) params.set("cursor", cursor);
        if (auditAction.trim()) params.set("action", auditAction.trim());
        if (auditFrom) params.set("from", new Date(`${auditFrom}T00:00:00`).toISOString());
        if (auditTo) params.set("to", new Date(`${auditTo}T23:59:59`).toISOString());

        const res = await fetch(`/api/admin/portales/audit?${params.toString()}`, { cache: "no-store" });
        const json = await readResponseJson(res);
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar auditoría.");

        const next = json.data as PortalAuditResult;
        setAuditData((prev) => ({
          items: options?.reset ? next.items : [...prev.items, ...next.items],
          nextCursor: next.nextCursor
        }));
      } catch (error) {
        showToast({
          tone: "error",
          title: "No se pudo cargar auditoría",
          message: error instanceof Error ? error.message : "Error inesperado."
        });
      } finally {
        setAuditLoading(false);
      }
    },
    [canReadAudit, auditData.nextCursor, auditChannel, auditAction, auditFrom, auditTo, showToast]
  );

  const loadSessions = useCallback(
    async (options?: { reset?: boolean }) => {
      if (!canReadSessions) return;
      setSessionsLoading(true);
      try {
        const cursor = options?.reset ? null : sessionsData.nextCursor;
        const params = new URLSearchParams({
          status: sessionStatus,
          channel: sessionChannel,
          limit: "20"
        });
        if (cursor) params.set("cursor", cursor);
        if (sessionQueryClient.trim()) params.set("queryClient", sessionQueryClient.trim());

        const res = await fetch(`/api/admin/portales/sessions?${params.toString()}`, { cache: "no-store" });
        const json = await readResponseJson(res);
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar sesiones.");

        const next = json.data as PortalSessionResult;
        setSessionsData((prev) => ({
          items: options?.reset ? next.items : [...prev.items, ...next.items],
          nextCursor: next.nextCursor
        }));
      } catch (error) {
        showToast({
          tone: "error",
          title: "No se pudo cargar sesiones",
          message: error instanceof Error ? error.message : "Error inesperado."
        });
      } finally {
        setSessionsLoading(false);
      }
    },
    [canReadSessions, sessionsData.nextCursor, sessionStatus, sessionChannel, sessionQueryClient, showToast]
  );

  const loadSolicitudes = useCallback(async () => {
    if (!canReadSolicitudes) return;
    if (solicitudesBranchScope === "active" && !activeBranchId) {
      setSolicitudesRows([]);
      return;
    }

    setSolicitudesLoading(true);
    try {
      const params = new URLSearchParams({
        channel: solicitudesChannel,
        branchScope: solicitudesBranchScope
      });

      const res = await fetch(`/api/admin/portales/solicitudes?${params.toString()}`, { cache: "no-store" });
      const json = await readResponseJson(res);
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar solicitudes.");
      setSolicitudesRows((json.data?.items || []) as PortalSolicitudItem[]);
    } catch (error) {
      showToast({
        tone: "error",
        title: "No se pudo cargar solicitudes",
        message: error instanceof Error ? error.message : "Error inesperado."
      });
    } finally {
      setSolicitudesLoading(false);
    }
  }, [canReadSolicitudes, solicitudesChannel, solicitudesBranchScope, activeBranchId, showToast]);

  useEffect(() => {
    if (activeTab === "dashboard") void loadKpis();
  }, [activeTab, loadKpis]);

  useEffect(() => {
    if (activeTab === "configuracion") void loadConfig();
  }, [activeTab, loadConfig]);

  useEffect(() => {
    if (activeTab === "auditoria") void loadAudit({ reset: true });
  }, [activeTab, auditAction, auditFrom, auditTo, auditChannel, loadAudit]);

  useEffect(() => {
    if (activeTab === "sesiones") void loadSessions({ reset: true });
  }, [activeTab, sessionStatus, sessionQueryClient, sessionChannel, loadSessions]);

  useEffect(() => {
    if (activeTab === "solicitudes") void loadSolicitudes();
  }, [activeTab, loadSolicitudes, solicitudesChannel, solicitudesBranchScope]);

  const handleSaveConfig = async () => {
    if (!canWriteConfig || !configState) return;

    const validationIssues = validateConfigBeforeSave(configState);
    if (validationIssues.length > 0) {
      showToast({
        tone: "error",
        title: "Corrige la configuración antes de guardar",
        message: validationIssues.slice(0, 3).join(" | ")
      });
      return;
    }

    showToast({
      tone: "info",
      title: "Guardando...",
      message: "Aplicando cambios de configuración.",
      durationMs: 1200
    });

    setConfigSaving(true);
    try {
      const payload = {
        expectedVersion: configState.version,
        patch: {
          patientPortalMenus: [...configState.patientPortalMenus]
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              key: item.key,
              label: item.label,
              path: item.path,
              enabled: item.enabled,
              order: Number(item.order)
            })),
          companyPortalMenus: [...configState.companyPortalMenus]
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              key: item.key,
              label: item.label,
              path: item.path,
              enabled: item.enabled,
              order: Number(item.order)
            })),
          support: {
            phone: configState.support.phone,
            whatsappUrl: configState.support.whatsappUrl,
            supportText: configState.support.supportText,
            hours: configState.support.hours,
            showSupportCard: configState.support.showSupportCard
          },
          auth: {
            otpEnabled: configState.auth.otpEnabled,
            magicLinkEnabled: configState.auth.magicLinkEnabled,
            otpLength: Number(configState.auth.otpLength),
            otpTtlMinutes: Number(configState.auth.otpTtlMinutes),
            sessionAccessTtlMinutes: Number(configState.auth.sessionAccessTtlMinutes),
            sessionRefreshTtlHours: Number(configState.auth.sessionRefreshTtlHours)
          },
          appointmentsRules: {
            startHour: configState.appointmentsRules.startHour,
            endHour: configState.appointmentsRules.endHour,
            slotMinutes: Number(configState.appointmentsRules.slotMinutes),
            greenThreshold: Number(configState.appointmentsRules.greenThreshold),
            yellowThreshold: Number(configState.appointmentsRules.yellowThreshold),
            requestLimitPerDay: Number(configState.appointmentsRules.requestLimitPerDay)
          },
          branding: {
            logoUrl: configState.branding.logoUrl || null,
            primary: configState.branding.primary,
            secondary: configState.branding.secondary,
            corporate: configState.branding.corporate
          }
        }
      };

      const res = await fetch("/api/admin/portales/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await readResponseJson(res);
      if (!res.ok) {
        if (res.status === 409) {
          showToast({
            tone: "error",
            title: "Conflicto de versión",
            message: "Alguien guardó antes. Recargando…"
          });
          await loadConfig();
          return;
        }
        if (res.status === 503) {
          throw new Error(
            json?.error ||
              "Falta aplicar migración de PortalConfig. Ejecuta prisma migrate dev/deploy y prisma generate."
          );
        }
        if (res.status === 403) {
          throw new Error("No autorizado para editar configuración.");
        }
        const detailedIssues = formatApiIssues(json?.issues);
        throw new Error(detailedIssues || json?.error || "No se pudo guardar la configuración.");
      }

      setConfigState(mapConfigResponseToState(json.data));
      showToast({
        tone: "success",
        title: "Configuración guardada",
        message: `Versión actual: ${json.data?.version ?? "-"}`,
        durationMs: 2500
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error al guardar",
        message: error instanceof Error ? error.message : "Error inesperado."
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!canRevokeSessions) return;
    const confirm = window.confirm("¿Deseas revocar esta sesión?");
    if (!confirm) return;

    try {
      const res = await fetch(`/api/admin/portales/sessions/${sessionId}/revoke`, {
        method: "POST"
      });
      const json = await readResponseJson(res);
      if (!res.ok) throw new Error(json?.error || "No se pudo revocar sesión.");

      showToast({
        tone: "success",
        title: json?.data?.alreadyRevoked ? "Sesión ya revocada" : "Sesión revocada",
        message: json?.data?.revokedAt ? `Revocada: ${formatDateTime(json.data.revokedAt)}` : undefined,
        durationMs: 2600
      });

      await loadSessions({ reset: true });
      if (activeTab === "dashboard") await loadKpis();
    } catch (error) {
      showToast({
        tone: "error",
        title: "No se pudo revocar",
        message: error instanceof Error ? error.message : "Error inesperado."
      });
    }
  };

  const renderDashboard = () => {
    if (!canReadAudit) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para visualizar métricas del módulo Portales.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Rango</span>
            <select
              value={kpisRange}
              onChange={(event) => setKpisRange(event.target.value as PortalRange)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="today">Hoy</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Canal</span>
            <select
              value={kpisChannel}
              onChange={(event) => setKpisChannel(event.target.value as PortalChannelFilter)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="patient">Portal Paciente</option>
              <option value="company">Portal Empresa</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Sede</span>
            <select
              value={kpisBranchScope}
              onChange={(event) => setKpisBranchScope(event.target.value as PortalBranchScope)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todas las sedes</option>
              <option value="active">Solo sede activa</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadKpis()}
              className="w-full rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#275f96]"
            >
              Actualizar KPIs
            </button>
          </div>
        </div>

        {kpisBranchScope === "active" && !activeBranchId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No hay sede activa seleccionada. Cambia el filtro a &quot;Todas las sedes&quot; o define una sede activa.
          </div>
        ) : null}

        {kpisLoading ? (
          <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-10 text-sm text-slate-500">Cargando dashboard...</div>
        ) : null}

        {!kpisLoading && kpisData ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2e75ba]">OTP solicitados</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpisData.kpis.otpRequested}</p>
              </article>
              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2e75ba]">OTP verificados</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpisData.kpis.otpVerified}</p>
              </article>
              <article className="rounded-2xl border border-[#f5d8d8] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700">Login fallido</p>
                <p className="mt-2 text-2xl font-semibold text-rose-700">{kpisData.kpis.loginFailed}</p>
              </article>
              <article className="rounded-2xl border border-[#cde7e4] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1f6f68]">Sesiones activas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpisData.kpis.sessionsActive}</p>
              </article>
              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2e75ba]">Sesiones revocadas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpisData.kpis.sessionsRevoked}</p>
              </article>
              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2e75ba]">Solicitudes REQUESTED</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpisData.kpis.requestedAppointments}</p>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-[#102a43]">Serie diaria</h3>
                  <span className="text-xs text-slate-500">Canal: {channelLabel(kpisData.channel)}</span>
                </div>
                {kpisData.series.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-3 py-3 text-sm text-slate-500">
                    No hay actividad en el rango seleccionado.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-[#e2ebf8]">
                    <table className="min-w-full divide-y divide-[#e2ebf8]">
                      <thead className="bg-[#f6fbff]">
                        <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">OTP req</th>
                          <th className="px-3 py-2">OTP ok</th>
                          <th className="px-3 py-2">Login fail</th>
                          <th className="px-3 py-2">Requested</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3fb] bg-white text-sm">
                        {kpisData.series.map((row) => (
                          <tr key={row.date}>
                            <td className="px-3 py-2 font-medium text-slate-700">{formatDate(row.date)}</td>
                            <td className="px-3 py-2 text-slate-700">{row.otpRequested}</td>
                            <td className="px-3 py-2 text-slate-700">{row.otpVerified}</td>
                            <td className="px-3 py-2 text-slate-700">{row.loginFailed}</td>
                            <td className="px-3 py-2 text-slate-700">{row.requestedAppointments}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-[#102a43]">Eventos críticos recientes</h3>
                {kpisData.criticalEvents.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-3 py-3 text-sm text-slate-500">
                    Sin eventos críticos para este rango.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {kpisData.criticalEvents.map((row) => (
                      <li key={row.id} className="rounded-xl border border-[#e3ecf9] bg-[#f8fbff] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{row.action}</p>
                          <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600">{row.clientName || "Sin cliente asociado"}</p>
                        {row.metadataSummary ? <p className="mt-1 text-xs text-slate-500">{row.metadataSummary}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("auditoria")}
                    className="rounded-full border border-[#d2e2f6] bg-white px-3 py-1.5 text-xs font-semibold text-[#2e75ba]"
                  >
                    Ir a Auditoría
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sesiones")}
                    className="rounded-full border border-[#cde7e4] bg-[#eff8f7] px-3 py-1.5 text-xs font-semibold text-[#1f6f68]"
                  >
                    Ir a Sesiones
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("solicitudes")}
                    className="rounded-full border border-[#d2e2f6] bg-[#f0f6ff] px-3 py-1.5 text-xs font-semibold text-[#2e75ba]"
                  >
                    Ir a Solicitudes
                  </button>
                </div>
              </article>
            </div>
          </>
        ) : null}

        {!kpisLoading && !kpisData ? (
          <p className="rounded-xl border border-dashed border-[#d2e2f6] bg-[#f8fbff] px-4 py-5 text-sm text-slate-500">
            No hay actividad en el rango seleccionado.
          </p>
        ) : null}
      </div>
    );
  };

  const renderConfig = () => {
    if (!canReadConfig) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para leer la configuración de portales.
        </div>
      );
    }

    if (configLoading) {
      return <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-8 text-sm text-slate-500">Cargando configuración...</div>;
    }

    if (!configState) {
      return (
        <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-8 text-sm text-slate-500">
          <p>{configLoadError || "No hay configuración cargada."}</p>
          <button
            type="button"
            onClick={() => void loadConfig()}
            className="mt-3 rounded-lg border border-[#d2e2f6] bg-white px-3 py-1.5 text-xs font-semibold text-[#2e75ba]"
          >
            Recargar
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {configState.source === "defaults" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Usando defaults (no publicado).
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">PortalConfig</p>
            <p className="mt-1 text-sm text-slate-600">Versión actual: <span className="font-semibold">{configState.version}</span></p>
          </div>
          <button
            type="button"
            disabled={!canWriteConfig || configSaving}
            onClick={() => void handleSaveConfig()}
            className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3f8f87] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {configSaving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>

        <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-[#102a43]">Menús Portal Paciente</h3>
          <p className="mt-1 text-sm text-slate-600">Edita habilitación y orden de cada entrada.</p>

          <div className="mt-3 space-y-2">
            {configState.patientPortalMenus.map((item, index) => (
              <div key={item.key} className="grid gap-2 rounded-xl border border-[#e3ecf9] bg-[#f8fbff] p-3 md:grid-cols-[1fr,220px,90px,90px] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.path}</p>
                </div>
                <input
                  type="text"
                  value={item.path}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            patientPortalMenus: prev.patientPortalMenus.map((menu, menuIdx) =>
                              menuIdx === index ? { ...menu, path: event.target.value } : menu
                            )
                          }
                        : prev
                    )
                  }
                  className="rounded-lg border border-[#d2e2f6] bg-white px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={item.order}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            patientPortalMenus: prev.patientPortalMenus.map((menu, menuIdx) =>
                              menuIdx === index ? { ...menu, order: Number(event.target.value || 0) } : menu
                            )
                          }
                        : prev
                    )
                  }
                  className="rounded-lg border border-[#d2e2f6] bg-white px-3 py-2 text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      setConfigState((prev) =>
                        prev
                          ? {
                              ...prev,
                              patientPortalMenus: prev.patientPortalMenus.map((menu, menuIdx) =>
                                menuIdx === index ? { ...menu, enabled: event.target.checked } : menu
                              )
                            }
                          : prev
                      )
                    }
                    className="h-4 w-4 rounded border-[#b9cde9]"
                  />
                  Habilitado
                </label>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-[#102a43]">Soporte</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Teléfono</span>
              <input
                value={configState.support.phone}
                onChange={(event) =>
                  setConfigState((prev) => (prev ? { ...prev, support: { ...prev.support, phone: event.target.value } } : prev))
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">WhatsApp URL</span>
              <input
                value={configState.support.whatsappUrl}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, support: { ...prev.support, whatsappUrl: event.target.value } } : prev
                  )
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Texto de soporte</span>
              <textarea
                value={configState.support.supportText}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, support: { ...prev.support, supportText: event.target.value } } : prev
                  )
                }
                rows={3}
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Horario</span>
              <input
                value={configState.support.hours}
                onChange={(event) =>
                  setConfigState((prev) => (prev ? { ...prev, support: { ...prev.support, hours: event.target.value } } : prev))
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="inline-flex items-center gap-2 self-end text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={configState.support.showSupportCard}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, support: { ...prev.support, showSupportCard: event.target.checked } } : prev
                  )
                }
                className="h-4 w-4 rounded border-[#b9cde9]"
              />
              Mostrar tarjeta de soporte
            </label>
          </div>
        </article>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-[#102a43]">Auth</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={configState.auth.otpEnabled}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev ? { ...prev, auth: { ...prev.auth, otpEnabled: event.target.checked } } : prev
                    )
                  }
                  className="h-4 w-4 rounded border-[#b9cde9]"
                />
                OTP habilitado
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={configState.auth.magicLinkEnabled}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev ? { ...prev, auth: { ...prev.auth, magicLinkEnabled: event.target.checked } } : prev
                    )
                  }
                  className="h-4 w-4 rounded border-[#b9cde9]"
                />
                Magic link habilitado
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Longitud OTP</span>
                <input
                  type="number"
                  value={configState.auth.otpLength}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev ? { ...prev, auth: { ...prev.auth, otpLength: Number(event.target.value || 0) } } : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">TTL OTP (min)</span>
                <input
                  type="number"
                  value={configState.auth.otpTtlMinutes}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev ? { ...prev, auth: { ...prev.auth, otpTtlMinutes: Number(event.target.value || 0) } } : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Access TTL (min)</span>
                <input
                  type="number"
                  value={configState.auth.sessionAccessTtlMinutes}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            auth: { ...prev.auth, sessionAccessTtlMinutes: Number(event.target.value || 0) }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Refresh TTL (h)</span>
                <input
                  type="number"
                  value={configState.auth.sessionRefreshTtlHours}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            auth: { ...prev.auth, sessionRefreshTtlHours: Number(event.target.value || 0) }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-[#102a43]">Reglas de citas</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Inicio horario</span>
                <input
                  value={configState.appointmentsRules.startHour}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: { ...prev.appointmentsRules, startHour: event.target.value }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Fin horario</span>
                <input
                  value={configState.appointmentsRules.endHour}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: { ...prev.appointmentsRules, endHour: event.target.value }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Slot (min)</span>
                <input
                  type="number"
                  value={configState.appointmentsRules.slotMinutes}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: {
                              ...prev.appointmentsRules,
                              slotMinutes: Number(event.target.value || 0)
                            }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Umbral verde</span>
                <input
                  type="number"
                  step="0.01"
                  value={configState.appointmentsRules.greenThreshold}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: {
                              ...prev.appointmentsRules,
                              greenThreshold: Number(event.target.value || 0)
                            }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Umbral amarillo</span>
                <input
                  type="number"
                  step="0.01"
                  value={configState.appointmentsRules.yellowThreshold}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: {
                              ...prev.appointmentsRules,
                              yellowThreshold: Number(event.target.value || 0)
                            }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Límite solicitudes/día</span>
                <input
                  type="number"
                  value={configState.appointmentsRules.requestLimitPerDay}
                  onChange={(event) =>
                    setConfigState((prev) =>
                      prev
                        ? {
                            ...prev,
                            appointmentsRules: {
                              ...prev.appointmentsRules,
                              requestLimitPerDay: Number(event.target.value || 0)
                            }
                          }
                        : prev
                    )
                  }
                  className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
                />
              </label>
            </div>
          </article>
        </div>

        <article className="rounded-2xl border border-[#d2e2f6] bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-[#102a43]">Branding</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="space-y-1 text-sm md:col-span-4">
              <span className="font-medium text-slate-700">Logo URL</span>
              <input
                value={configState.branding.logoUrl || ""}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev
                      ? {
                          ...prev,
                          branding: { ...prev.branding, logoUrl: event.target.value || null }
                        }
                      : prev
                  )
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Primary</span>
              <input
                value={configState.branding.primary}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, branding: { ...prev.branding, primary: event.target.value } } : prev
                  )
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Secondary</span>
              <input
                value={configState.branding.secondary}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, branding: { ...prev.branding, secondary: event.target.value } } : prev
                  )
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Corporate</span>
              <input
                value={configState.branding.corporate}
                onChange={(event) =>
                  setConfigState((prev) =>
                    prev ? { ...prev, branding: { ...prev.branding, corporate: event.target.value } } : prev
                  )
                }
                className="w-full rounded-lg border border-[#d2e2f6] bg-white px-3 py-2"
              />
            </label>
          </div>
        </article>
      </div>
    );
  };

  const renderAudit = () => {
    if (!canReadAudit) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para consultar auditoría de portales.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Acción</span>
            <input
              placeholder="PORTAL_CONFIG_UPDATED"
              value={auditAction}
              onChange={(event) => setAuditAction(event.target.value)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Canal</span>
            <select
              value={auditChannel}
              onChange={(event) => setAuditChannel(event.target.value as PortalChannelFilter)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="patient">Portal Paciente</option>
              <option value="company">Portal Empresa</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input
              type="date"
              value={auditFrom}
              onChange={(event) => setAuditFrom(event.target.value)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input
              type="date"
              value={auditTo}
              onChange={(event) => setAuditTo(event.target.value)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadAudit({ reset: true })}
              className="w-full rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white"
            >
              Filtrar
            </button>
          </div>
        </div>

        {auditLoading && auditData.items.length === 0 ? (
          <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-5 text-sm text-slate-500">
            Cargando auditoría...
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-[#dce7f5]">
          <table className="min-w-full divide-y divide-[#e2ebf8]">
            <thead className="bg-[#f6fbff]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Resumen</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3fb] bg-white text-sm">
              {auditData.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{item.action}</td>
                  <td className="px-3 py-2 text-slate-700">{item.clientName || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{item.metadataSummary || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAudit(item)}
                      className="rounded-full border border-[#d2e2f6] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
                    >
                      Ver JSON
                    </button>
                  </td>
                </tr>
              ))}
              {auditData.items.length === 0 && !auditLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    No hay eventos con estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Mostrando {auditData.items.length} registros</p>
          <button
            type="button"
            disabled={!auditData.nextCursor || auditLoading}
            onClick={() => void loadAudit()}
            className="rounded-xl border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] disabled:opacity-50"
          >
            {auditLoading ? "Cargando..." : "Cargar más"}
          </button>
        </div>

        {selectedAudit ? (
          <div className="rounded-2xl border border-[#d2e2f6] bg-[#f8fbff] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#102a43]">Detalle auditoría: {selectedAudit.action}</p>
              <button
                type="button"
                className="rounded-full border border-[#d2e2f6] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
                onClick={() => setSelectedAudit(null)}
              >
                Cerrar
              </button>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-[#dbe8f9] bg-white p-3 text-xs text-slate-700">
              {stringifyMetadataPreview(selectedAudit.metadata)}
            </pre>
          </div>
        ) : null}
      </div>
    );
  };

  const renderSessions = () => {
    if (!canReadSessions) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para consultar sesiones del portal.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select
              value={sessionStatus}
              onChange={(event) => setSessionStatus(event.target.value as SessionStatus)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="active">Activa</option>
              <option value="revoked">Revocada</option>
              <option value="expired">Expirada</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Canal</span>
            <select
              value={sessionChannel}
              onChange={(event) => setSessionChannel(event.target.value as PortalChannelFilter)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="patient">Portal Paciente</option>
              <option value="company">Portal Empresa</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Buscar cliente</span>
            <input
              value={sessionQueryClient}
              onChange={(event) => setSessionQueryClient(event.target.value)}
              placeholder="Nombre, email, DPI o ID"
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadSessions({ reset: true })}
              className="w-full rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white"
            >
              Buscar
            </button>
          </div>
        </div>

        {sessionsLoading && sessionsData.items.length === 0 ? (
          <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-5 text-sm text-slate-500">
            Cargando sesiones...
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-[#dce7f5]">
          <table className="min-w-[1100px] w-full divide-y divide-[#e2ebf8]">
            <thead className="bg-[#f6fbff]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Creada</th>
                <th className="px-3 py-2">Expira</th>
                <th className="px-3 py-2">Rotaciones</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3fb] bg-white text-sm">
              {sessionsData.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">{item.clientName}</p>
                    <p className="text-xs text-slate-500">{item.clientEmail || item.clientPhone || item.clientId}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{item.clientType}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${sessionStatusBadgeClass(item.status)}`}>
                      {sessionStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(item.expiresAt)}</td>
                  <td className="px-3 py-2 text-slate-700">{item.rotationCounter}</td>
                  <td className="px-3 py-2">
                    {item.status === "active" && canRevokeSessions ? (
                      <button
                        type="button"
                        onClick={() => void handleRevokeSession(item.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      >
                        Revocar
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {sessionsData.items.length === 0 && !sessionsLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                    No hay sesiones para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Mostrando {sessionsData.items.length} sesiones</p>
          <button
            type="button"
            disabled={!sessionsData.nextCursor || sessionsLoading}
            onClick={() => void loadSessions()}
            className="rounded-xl border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] disabled:opacity-50"
          >
            {sessionsLoading ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      </div>
    );
  };

  const renderSolicitudes = () => {
    if (!canReadSolicitudes) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes permiso para consultar solicitudes del portal.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Canal</span>
            <select
              value={solicitudesChannel}
              onChange={(event) => setSolicitudesChannel(event.target.value as PortalChannelFilter)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="patient">Portal Paciente</option>
              <option value="company">Portal Empresa</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Sede</span>
            <select
              value={solicitudesBranchScope}
              onChange={(event) => setSolicitudesBranchScope(event.target.value as PortalBranchScope)}
              className="w-full rounded-xl border border-[#d2e2f6] bg-white px-3 py-2"
            >
              <option value="all">Todas las sedes</option>
              <option value="active">Solo sede activa</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadSolicitudes()}
              className="w-full rounded-xl bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white"
            >
              Aplicar filtros
            </button>
          </div>
          <div className="flex items-end justify-end">
            <Link
              href="/admin/reception/solicitudes-portal"
              className="inline-flex rounded-xl border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba]"
            >
              Ir a Recepción
            </Link>
          </div>
        </div>

        {solicitudesBranchScope === "active" && !activeBranchId ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No hay sede activa seleccionada para filtrar por sede activa.
          </div>
        ) : null}

        {solicitudesLoading && solicitudesRows.length === 0 ? (
          <div className="rounded-xl border border-[#d2e2f6] bg-[#f8fbff] px-4 py-5 text-sm text-slate-500">
            Cargando solicitudes...
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-[#dce7f5]">
          <table className="min-w-[1200px] w-full divide-y divide-[#e2ebf8]">
            <thead className="bg-[#f6fbff]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Empresa</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Sede</th>
                <th className="px-3 py-2">Preferencia</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3fb] bg-white text-sm">
              {solicitudesRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">{row.patientName}</p>
                    <p className="text-xs text-slate-500">Solicitada: {formatDateTime(row.requestedAt)}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${requestChannelBadgeClass(row.channel)}`}>
                      {requestChannelLabel(row.channel)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.companyName || "—"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.patientPhone || "Sin teléfono"}</td>
                  <td className="px-3 py-2 text-slate-700">{row.typeName}</td>
                  <td className="px-3 py-2 text-slate-700">{row.branchName || row.branchId}</td>
                  <td className="px-3 py-2 text-slate-700">{formatDateTime(row.preferredDate)}</td>
                  <td className="px-3 py-2 text-slate-700">{row.reason}</td>
                  <td className="px-3 py-2">
                    <Link
                      href="/admin/reception/solicitudes-portal"
                      className="rounded-full border border-[#d2e2f6] bg-white px-3 py-1 text-xs font-semibold text-[#2e75ba]"
                    >
                      Abrir en Recepción
                    </Link>
                  </td>
                </tr>
              ))}
              {solicitudesRows.length === 0 && !solicitudesLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                    No hay solicitudes REQUESTED para estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const canSeeAnything =
    canReadAudit || canReadConfig || canReadSessions || canReadSolicitudes || canWriteConfig || canRevokeSessions;

  return (
    <section className="space-y-5">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2e75ba]">/admin/portales</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Portales</h1>
        <p className="mt-1 text-sm text-slate-600">
          Control center de Portal Paciente y preparación para Portal Empresa.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Sede activa: <span className="font-semibold text-slate-800">{activeBranchName || "No definida"}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">Usuario: {userName}</p>
      </div>

      {!canSeeAnything ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No tienes capacidades asignadas para este módulo.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[#d2e2f6] bg-white p-2 shadow-sm">
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={
                    activeTab === tab.key
                      ? "rounded-full bg-[#2e75ba] px-4 py-2 text-sm font-semibold text-white shadow-sm"
                      : "rounded-full border border-[#d2e2f6] bg-white px-4 py-2 text-sm font-semibold text-[#2e75ba] hover:border-[#4aadf5]/80"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#d2e2f6] bg-white p-5 shadow-sm">
            {activeTab === "dashboard" ? renderDashboard() : null}
            {activeTab === "configuracion" ? renderConfig() : null}
            {activeTab === "auditoria" ? renderAudit() : null}
            {activeTab === "sesiones" ? renderSessions() : null}
            {activeTab === "solicitudes" ? renderSolicitudes() : null}
          </div>
        </>
      )}
    </section>
  );
}
