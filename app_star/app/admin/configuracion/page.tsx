"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import UploadField from "@/components/ui/UploadField";
import {
  DEFAULT_HOME_DASHBOARD_SETTINGS,
  HOME_KPI_CATALOG,
  HOME_QUICK_ACTION_CATALOG,
  normalizeHomeDashboardSettings,
  type HomeDashboardSettings,
  type HomeKpiKey,
  type HomeQuickActionKey
} from "@/lib/home-dashboard/config";
import { cn } from "@/lib/utils";
import CentralBranchesConfigPanel from "@/components/configuracion/CentralBranchesConfigPanel";
import CentralConfigSmokePanel from "@/components/configuracion/CentralConfigSmokePanel";
import CentralThemeBrandingPanel from "@/components/configuracion/CentralThemeBrandingPanel";
import CentralSystemFlagsPanel from "@/components/configuracion/CentralSystemFlagsPanel";
import CentralConfigSetupWizardPanel, {
  type ConfiguracionAdvancedTabTarget
} from "@/components/configuracion/CentralConfigSetupWizardPanel";
import CentralConfigOperationPanel from "@/components/configuracion/CentralConfigOperationPanel";
import CentralFiscalSatPanel from "@/components/configuracion/CentralFiscalSatPanel";
import CentralEmailSandboxPanel from "@/components/configuracion/CentralEmailSandboxPanel";

const adminHeaders = { "x-role": "Administrador" };

const moduleOptions = [
  { key: "INVENTARIO", label: "Inventario" },
  { key: "AGENDA", label: "Agenda" },
  { key: "FACTURACION", label: "Facturación" },
  { key: "CONTABILIDAD", label: "Contabilidad" },
  { key: "COMPRAS", label: "Compras" },
  { key: "ADMIN", label: "Administración" },
  { key: "SOPORTE", label: "Soporte" }
] as const;

const apiIntegrationOptions: Array<{ key: ApiIntegrationKey; label: string; hint?: string }> = [
  { key: "WHATSAPP", label: "WhatsApp (notificaciones)" },
  { key: "SMS", label: "SMS" },
  { key: "LABORATORIO", label: "Laboratorio clínico (LIS)" },
  { key: "ASISTENCIA", label: "Reloj de asistencia" },
  { key: "SAT_FACTURACION", label: "Facturación SAT" },
  { key: "GOOGLE_DRIVE", label: "Google Drive" },
  { key: "OPENAI", label: "OpenAI (GPT)" },
  { key: "WEBHOOKS", label: "Webhooks internos" },
  { key: "OTRO", label: "Otra API / Inventario externo" }
] as const;

type ModuleKey = (typeof moduleOptions)[number]["key"];
type TabKey =
  | "empresa"
  | "inicio"
  | "facturacion"
  | "correo"
  | "permisos"
  | "integraciones"
  | "apis"
  | "sucursales"
  | "tema"
  | "comportamiento"
  | "exportaciones";

type CentralMainTabKey = "inicio_setup" | "operacion" | "avanzado";

type AppForm = {
  companyLegalName: string;
  companyBrandName: string;
  companyNit?: string;
  companyPhone?: string;
  companyAddress?: string;
  logoUrl?: string;
  timezone: string;
};

type GlobalForm = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  updatePassword: boolean;
  smtpPassword: string;
};

type AccountRecord = {
  id: string;
  moduleKey: ModuleKey;
  email: string;
  username: string;
  fromName?: string | null;
  fromEmail?: string | null;
  isEnabled: boolean;
  lastTestAt?: string | null;
  lastTestError?: string | null;
  passwordSet: boolean;
};

type AccountForm = {
  moduleKey: ModuleKey;
  email: string;
  username: string;
  password: string;
  fromName?: string;
  fromEmail?: string;
  isEnabled: boolean;
};

type InvoiceSeriesForm = {
  id?: string;
  code: string;
  initialNumber: number;
  currentNumber: number;
  branchId?: string;
  isActive: boolean;
};

type InvoiceForm = {
  legalName: string;
  nit: string;
  fiscalAddress?: string;
  defaultTaxRate: number;
  invoiceFooterText?: string;
  pdfTemplateConfig: string;
  series: InvoiceSeriesForm[];
};

type PermissionForm = { id?: string; key: string; description?: string; custom?: boolean };
type RoleForm = { id?: string; name: string; description?: string; permissions: string[]; userCount?: number; isSystem?: boolean };

type RbacUserRecord = {
  id: string;
  name?: string | null;
  email: string;
  isActive: boolean;
  roleNames: string[];
  effectivePermissions: string[];
  customPermissions: string[];
};

type IntegrationForm = {
  provider: string;
  apiUrl?: string;
  apiKey?: string;
  enabled: boolean;
  apiKeySet?: boolean;
  lastTestAt?: string;
  lastTestError?: string;
};

type ApiIntegrationKey =
  | "WHATSAPP"
  | "SMS"
  | "LABORATORIO"
  | "ASISTENCIA"
  | "SAT_FACTURACION"
  | "GOOGLE_DRIVE"
  | "OPENAI"
  | "WEBHOOKS"
  | "OTRO";

type ApiIntegrationRecord = {
  id?: string;
  key: ApiIntegrationKey;
  name: string;
  isEnabled: boolean;
  baseUrl?: string | null;
  extraJson?: string | null;
  hasApiKey: boolean;
  hasSecret: boolean;
  hasToken: boolean;
  lastTestAt?: string | null;
  lastTestError?: string | null;
};

type ApiIntegrationForm = ApiIntegrationRecord & {
  apiKey: string;
  apiSecret: string;
  token: string;
};

type AdminApiKeyRecord = {
  id: string;
  name: string;
  scopes: string[];
  last4: string;
  createdByUserId?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  status: "active" | "revoked";
};

type AdminConnectorRecord = {
  id: string;
  key: ApiIntegrationKey;
  name: string;
  enabled: boolean;
  baseUrl?: string | null;
  hasSecret: boolean;
  config?: Record<string, unknown> | null;
  lastCheckAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackupPolicyRecord = {
  id: string;
  version: number;
  retentionDays: number;
  manualExportEnabled: boolean;
  updatedByUserId?: string | null;
  updatedAt: string;
};

type BackupRunRecord = {
  id: string;
  triggerMode: string;
  status: string;
  requestedByUserId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type HomeDashboardScope = "GLOBAL" | "ROLE";

const TIMEZONE_OPTIONS = [
  "America/Guatemala",
  "America/Mexico_City",
  "America/New_York",
  "Europe/Lisbon",
  "UTC"
] as const;

function normalizeRoleName(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function formatClock(timestamp: number, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("es-GT", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "medium"
    }).format(new Date(timestamp));
  } catch {
    return new Intl.DateTimeFormat("es-GT", {
      dateStyle: "medium",
      timeStyle: "medium"
    }).format(new Date(timestamp));
  }
}

function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isDbNotReadyResponse(payload: unknown, status?: number) {
  const value = (payload && typeof payload === "object" ? payload : {}) as {
    code?: unknown;
    error?: unknown;
  };
  const code = typeof value.code === "string" ? value.code.trim().toUpperCase() : "";
  const error = typeof value.error === "string" ? value.error.trim().toLowerCase() : "";
  return status === 503 || code === "DB_NOT_READY" || error.includes("delegate missing");
}

function resolvePendingMessage(payload: unknown, fallback: string) {
  const value = (payload && typeof payload === "object" ? payload : {}) as {
    error?: unknown;
  };
  const message = typeof value.error === "string" ? value.error.trim() : "";
  return message || fallback;
}

function recordToApiForm(record: ApiIntegrationRecord): ApiIntegrationForm {
  return {
    ...record,
    baseUrl: record.baseUrl || "",
    extraJson: record.extraJson || "",
    apiKey: "",
    apiSecret: "",
    token: ""
  };
}

export default function ConfiguracionPage() {
  const [mainTab, setMainTab] = useState<CentralMainTabKey>("inicio_setup");
  const [tab, setTab] = useState<TabKey>("empresa");

  const [appForm, setAppForm] = useState<AppForm>({
    companyLegalName: "",
    companyBrandName: "",
    companyNit: "",
    companyPhone: "",
    companyAddress: "",
    logoUrl: "",
    timezone: "America/Guatemala"
  });
  const [homeDashboardForm, setHomeDashboardForm] = useState<HomeDashboardSettings>({
    ...DEFAULT_HOME_DASHBOARD_SETTINGS
  });
  const [homeDashboardScope, setHomeDashboardScope] = useState<HomeDashboardScope>("GLOBAL");
  const [homeDashboardRoleName, setHomeDashboardRoleName] = useState("");
  const [homeDashboardGlobal, setHomeDashboardGlobal] = useState<HomeDashboardSettings>({
    ...DEFAULT_HOME_DASHBOARD_SETTINGS
  });
  const [homeDashboardByRole, setHomeDashboardByRole] = useState<Record<string, HomeDashboardSettings>>({});
  const [logoGuidanceWarning, setLogoGuidanceWarning] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    legalName: "",
    nit: "",
    fiscalAddress: "",
    defaultTaxRate: 12,
    invoiceFooterText: "",
    pdfTemplateConfig: "",
    series: []
  });

  const [globalForm, setGlobalForm] = useState<GlobalForm>({
    smtpHost: "smtp.dreamhost.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: "",
    fromName: "StarMedical",
    fromEmail: "",
    updatePassword: false,
    smtpPassword: ""
  });
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [accountForm, setAccountForm] = useState<AccountForm>({
    moduleKey: "INVENTARIO",
    email: "",
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
    isEnabled: true
  });
  const [testEmail, setTestEmail] = useState("");

  const [permissions, setPermissions] = useState<PermissionForm[]>([]);
  const [roles, setRoles] = useState<RoleForm[]>([]);
  const [rbacUsers, setRbacUsers] = useState<RbacUserRecord[]>([]);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [attendance, setAttendance] = useState<IntegrationForm>({ provider: "", apiUrl: "", apiKey: "", enabled: true });
  const [lab, setLab] = useState<IntegrationForm>({ provider: "", apiUrl: "", apiKey: "", enabled: true });
  const [apiIntegrations, setApiIntegrations] = useState<ApiIntegrationRecord[]>(
    apiIntegrationOptions.map((option) => ({
      key: option.key,
      name: option.label,
      isEnabled: false,
      baseUrl: "",
      extraJson: "",
      hasApiKey: false,
      hasSecret: false,
      hasToken: false,
      lastTestAt: null,
      lastTestError: null
    }))
  );
  const [selectedApiKey, setSelectedApiKey] = useState<ApiIntegrationKey>(apiIntegrationOptions[0].key);
  const selectedApiRef = useRef<ApiIntegrationKey>(apiIntegrationOptions[0].key);
  const [apiForm, setApiForm] = useState<ApiIntegrationForm>(
    recordToApiForm({
      key: apiIntegrationOptions[0].key,
      name: apiIntegrationOptions[0].label,
      isEnabled: false,
      baseUrl: "",
      extraJson: "",
      hasApiKey: false,
      hasSecret: false,
      hasToken: false,
      lastTestAt: null,
      lastTestError: null
    })
  );
  const [adminApiKeys, setAdminApiKeys] = useState<AdminApiKeyRecord[]>([]);
  const [apiKeyName, setApiKeyName] = useState("Config Central");
  const [apiKeyScopesText, setApiKeyScopesText] = useState("CONFIG_API_READ,CONFIG_API_WRITE");
  const [latestApiKeySecret, setLatestApiKeySecret] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<AdminConnectorRecord[]>([]);
  const [selectedConnectorKey, setSelectedConnectorKey] = useState<ApiIntegrationKey>(apiIntegrationOptions[0].key);
  const [connectorBaseUrl, setConnectorBaseUrl] = useState("");
  const [connectorSecret, setConnectorSecret] = useState("");
  const [connectorConfigText, setConnectorConfigText] = useState("{}");
  const [backupPolicy, setBackupPolicy] = useState<BackupPolicyRecord | null>(null);
  const [backupRuns, setBackupRuns] = useState<BackupRunRecord[]>([]);
  const [backupRetentionDays, setBackupRetentionDays] = useState("30");
  const [backupManualEnabled, setBackupManualEnabled] = useState(true);
  const [backupTriggerReason, setBackupTriggerReason] = useState("");
  const [pendingModules, setPendingModules] = useState<{ apiKeys: boolean; backups: boolean }>({
    apiKeys: false,
    backups: false
  });
  const [pendingModuleMessages, setPendingModuleMessages] = useState<{ apiKeys: string; backups: string }>({
    apiKeys: "Aún no disponible en este entorno. Falta migración y prisma generate.",
    backups: "Aún no disponible en este entorno. Falta migración y prisma generate."
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string | undefined>>({});

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.moduleKey === accountForm.moduleKey),
    [accountForm.moduleKey, accounts]
  );
  const selectedConnector = useMemo(
    () => connectors.find((row) => row.key === selectedConnectorKey) || null,
    [connectors, selectedConnectorKey]
  );
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );
  const roleScopeOptions = useMemo(() => {
    const seen = new Set<string>();
    return roles.flatMap((role) => {
      const normalized = normalizeRoleName(role.name || "");
      if (!normalized || seen.has(normalized)) return [];
      seen.add(normalized);
      return [
        {
          label: role.name,
          value: normalized
        }
      ];
    });
  }, [roles]);
  const selectedRole = roles[selectedRoleIndex] || null;
  const selectedRoleNormalized = selectedRole ? normalizeRoleName(selectedRole.name) : "";
  const usersAffectedBySelectedRole = useMemo(() => {
    if (!selectedRoleNormalized) return [];
    return rbacUsers.filter((user) =>
      user.roleNames.some((roleName) => normalizeRoleName(roleName) === selectedRoleNormalized)
    );
  }, [rbacUsers, selectedRoleNormalized]);

  useEffect(() => {
    selectedApiRef.current = selectedApiKey;
  }, [selectedApiKey]);

  const setLoading = (key: string, value: boolean) =>
    setLoadingStates((prev) => ({
      ...prev,
      [key]: value
    }));

  const resetMessages = () => setMessages({});

  useEffect(() => {
    const found = apiIntegrations.find((i) => i.key === selectedApiKey);
    if (found) {
      setApiForm(recordToApiForm(found));
    }
  }, [apiIntegrations, selectedApiKey]);

  useEffect(() => {
    if (!selectedConnector) {
      setConnectorBaseUrl("");
      setConnectorConfigText("{}");
      return;
    }

    setConnectorBaseUrl(selectedConnector.baseUrl || "");
    setConnectorConfigText(JSON.stringify(selectedConnector.config || {}, null, 2));
    setConnectorSecret("");
  }, [selectedConnector]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (roles.length === 0) {
      setSelectedRoleIndex(0);
      return;
    }
    if (selectedRoleIndex >= roles.length) {
      setSelectedRoleIndex(0);
    }
  }, [roles, selectedRoleIndex]);

  useEffect(() => {
    if (homeDashboardScope === "ROLE" && homeDashboardRoleName) {
      const scoped = homeDashboardByRole[homeDashboardRoleName];
      setHomeDashboardForm(scoped || homeDashboardGlobal);
      return;
    }
    setHomeDashboardForm(homeDashboardGlobal);
  }, [homeDashboardByRole, homeDashboardGlobal, homeDashboardRoleName, homeDashboardScope]);

  useEffect(() => {
    if (homeDashboardScope !== "ROLE") return;
    if (homeDashboardRoleName) return;
    if (roleScopeOptions.length === 0) return;
    setHomeDashboardRoleName(roleScopeOptions[0].value);
  }, [homeDashboardRoleName, homeDashboardScope, roleScopeOptions]);

  const loadAppConfig = useCallback(async () => {
    setLoading("app", true);
    resetMessages();
    try {
      const res = await fetch("/api/admin/config/app", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.ok !== false && json.data) {
        const companyLegalName = json.data.companyLegalName || json.data.companyName || "";
        const companyBrandName = json.data.companyBrandName || companyLegalName;
        setAppForm({
          companyLegalName,
          companyBrandName,
          companyNit: json.data.companyNit || "",
          companyPhone: json.data.companyPhone || "",
          companyAddress: json.data.companyAddress || "",
          logoUrl: json.data.logoUrl || "",
          timezone: json.data.timezone || "America/Guatemala"
        });
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar configuración de empresa" });
    } finally {
      setLoading("app", false);
    }
  }, []);

  const loadHomeDashboard = useCallback(async () => {
    setLoading("homeDashboard", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/home-dashboard", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok) {
        const globalSettings = normalizeHomeDashboardSettings(json.global || json.data || DEFAULT_HOME_DASHBOARD_SETTINGS);
        const byRoleRaw = json.byRole && typeof json.byRole === "object" ? json.byRole : {};
        const normalizedByRole = Object.fromEntries(
          Object.entries(byRoleRaw).map(([key, value]) => [normalizeRoleName(key), normalizeHomeDashboardSettings(value)])
        ) as Record<string, HomeDashboardSettings>;
        setHomeDashboardGlobal(globalSettings);
        setHomeDashboardByRole(normalizedByRole);
      } else {
        setHomeDashboardGlobal({ ...DEFAULT_HOME_DASHBOARD_SETTINGS });
        setHomeDashboardByRole({});
        setHomeDashboardScope("GLOBAL");
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar configuración de inicio" });
    } finally {
      setLoading("homeDashboard", false);
    }
  }, []);

  const loadInvoiceConfig = useCallback(async () => {
    setLoading("invoice", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/invoice", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setInvoiceForm({
          legalName: json.data.legalName || "",
          nit: json.data.nit || "",
          fiscalAddress: json.data.fiscalAddress || "",
          defaultTaxRate: json.data.defaultTaxRate || 12,
          invoiceFooterText: json.data.invoiceFooterText || "",
          pdfTemplateConfig: json.data.pdfTemplateConfig ? JSON.stringify(json.data.pdfTemplateConfig, null, 2) : "",
          series: (json.data.series || []).map((s: any) => ({
            id: s.id,
            code: s.code,
            initialNumber: s.initialNumber,
            currentNumber: s.currentNumber,
            branchId: s.branchId || "",
            isActive: s.isActive
          }))
        });
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar facturación" });
    } finally {
      setLoading("invoice", false);
    }
  }, []);

  const loadMailGlobal = useCallback(async () => {
    setLoading("mailGlobal", true);
    resetMessages();
    try {
      const res = await fetch("/api/admin/config/email/global", { headers: adminHeaders });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (res.ok && json.ok !== false && json.data) {
        setGlobalForm({
          smtpHost: json.data.smtpHost || "smtp.dreamhost.com",
          smtpPort: json.data.smtpPort || 465,
          smtpSecure: json.data.smtpSecure !== false,
          smtpUser: json.data.smtpUser || "",
          fromName: json.data.fromName || "StarMedical",
          fromEmail: json.data.fromEmail || "",
          updatePassword: false,
          smtpPassword: ""
        });
      } else if (res.ok && json.ok !== false && !json.data) {
        // sin config, mantener defaults y avisar
        setMessages({ global: "Correo global no configurado aún" });
        setGlobalForm({
          smtpHost: "smtp.dreamhost.com",
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: "",
          fromName: "StarMedical",
          fromEmail: "",
          updatePassword: false,
          smtpPassword: ""
        });
      } else {
        throw new Error(json.error || "No se pudo cargar configuración de correo");
      }
    } catch (err: any) {
      console.error(err);
      setMessages({ error: err?.message || "No se pudo cargar configuración de correo" });
    } finally {
      setLoading("mailGlobal", false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading("accounts", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/mail/modules", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setAccounts(json.data);
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudieron cargar las cuentas" });
    } finally {
      setLoading("accounts", false);
    }
  }, []);

  const loadRbac = useCallback(async () => {
    setLoading("rbac", true);
    resetMessages();
    try {
      const res = await fetch("/api/admin/config/rbac", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.ok !== false && json.data) {
        setPermissions(
          (json.data.permissions || []).map((permission: any) => ({
            id: permission.id,
            key: permission.key,
            description: permission.description || "",
            custom: Boolean(permission.custom)
          }))
        );
        setRoles(
          (json.data.roles || []).map((role: any) => ({
            id: role.id,
            name: role.name,
            description: role.description || "",
            userCount: role.userCount || 0,
            isSystem: Boolean(role.isSystem),
            permissions: Array.isArray(role.permissions)
              ? role.permissions.map((perm: any) => (typeof perm === "string" ? perm : perm?.key || "")).filter(Boolean)
              : []
          }))
        );
        setRbacUsers(Array.isArray(json.data.users) ? (json.data.users as RbacUserRecord[]) : []);
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar permisos/roles" });
    } finally {
      setLoading("rbac", false);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    setLoading("attendance", true);
    try {
      const res = await fetch("/api/config/integrations/attendance", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setAttendance({
          provider: json.data.provider || "",
          apiUrl: json.data.apiUrl || "",
          apiKey: "",
          enabled: json.data.enabled !== false,
          apiKeySet: json.data.apiKeySet,
          lastTestAt: json.data.lastTestAt,
          lastTestError: json.data.lastTestError
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading("attendance", false);
    }
  }, []);

  const loadLab = useCallback(async () => {
    setLoading("lab", true);
    try {
      const res = await fetch("/api/config/integrations/lab", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setLab({
          provider: json.data.provider || "",
          apiUrl: json.data.apiUrl || "",
          apiKey: "",
          enabled: json.data.enabled !== false,
          apiKeySet: json.data.apiKeySet,
          lastTestAt: json.data.lastTestAt,
          lastTestError: json.data.lastTestError
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading("lab", false);
    }
  }, []);

  const loadApis = useCallback(async () => {
    setLoading("apis", true);
    try {
      const res = await fetch("/api/config/apis", { headers: adminHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudieron cargar las APIs");
      if (!Array.isArray(json.data)) throw new Error("Respuesta inesperada de APIs");

      const merged = apiIntegrationOptions.map((option) => {
        const existing = json.data.find((item: any) => item.key === option.key);
        return {
          id: existing?.id,
          key: option.key,
          name: existing?.name || option.label,
          isEnabled: existing?.isEnabled ?? false,
          baseUrl: existing?.baseUrl || "",
          extraJson: existing?.extraJson || "",
          hasApiKey: Boolean(existing?.hasApiKey),
          hasSecret: Boolean(existing?.hasSecret),
          hasToken: Boolean(existing?.hasToken),
          lastTestAt: existing?.lastTestAt || null,
          lastTestError: existing?.lastTestError || null
        } as ApiIntegrationRecord;
      });
      setApiIntegrations(merged);
      const targetKey =
        merged.find((item) => item.key === selectedApiRef.current)?.key ||
        merged[0]?.key ||
        apiIntegrationOptions[0].key;
      const target = merged.find((item) => item.key === targetKey);
      if (target) {
        setSelectedApiKey(target.key);
        setApiForm(recordToApiForm(target));
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudieron cargar las APIs" });
    } finally {
      setLoading("apis", false);
    }
  }, []);

  const loadAdminApiKeys = useCallback(async () => {
    setLoading("apiKeys", true);
    try {
      const res = await fetch("/api/admin/config/api-keys", { headers: adminHeaders, cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (isDbNotReadyResponse(json, res.status)) {
        setAdminApiKeys([]);
        setPendingModules((prev) => ({ ...prev, apiKeys: true }));
        setPendingModuleMessages((prev) => ({
          ...prev,
          apiKeys: resolvePendingMessage(
            json,
            "Aún no disponible en este entorno. Falta migración y prisma generate."
          )
        }));
        return;
      }
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudieron cargar API keys");
      setAdminApiKeys(Array.isArray(json.data?.items) ? json.data.items : []);
      setPendingModules((prev) => ({ ...prev, apiKeys: false }));
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudieron cargar API keys" });
    } finally {
      setLoading("apiKeys", false);
    }
  }, []);

  const loadConnectors = useCallback(async () => {
    setLoading("connectors", true);
    try {
      const res = await fetch("/api/admin/config/integrations", { headers: adminHeaders, cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudieron cargar conectores");
      const rows = Array.isArray(json.data?.items) ? (json.data.items as AdminConnectorRecord[]) : [];
      setConnectors(rows);
      if (!rows.some((row) => row.key === selectedConnectorKey) && rows.length > 0) {
        setSelectedConnectorKey(rows[0].key);
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudieron cargar conectores" });
    } finally {
      setLoading("connectors", false);
    }
  }, [selectedConnectorKey]);

  const loadBackups = useCallback(async () => {
    setLoading("backups", true);
    try {
      const res = await fetch("/api/admin/config/backups", { headers: adminHeaders, cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (isDbNotReadyResponse(json, res.status)) {
        setBackupPolicy(null);
        setBackupRuns([]);
        setPendingModules((prev) => ({ ...prev, backups: true }));
        setPendingModuleMessages((prev) => ({
          ...prev,
          backups: resolvePendingMessage(
            json,
            "Aún no disponible en este entorno. Falta migración y prisma generate."
          )
        }));
        return;
      }
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo cargar configuración de backups");
      const policy = json.data?.policy as BackupPolicyRecord | undefined;
      const runs = (Array.isArray(json.data?.runs) ? json.data.runs : []) as BackupRunRecord[];
      if (policy) {
        setBackupPolicy(policy);
        setBackupRetentionDays(String(policy.retentionDays));
        setBackupManualEnabled(Boolean(policy.manualExportEnabled));
      }
      setBackupRuns(runs);
      setPendingModules((prev) => ({ ...prev, backups: false }));
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo cargar backups" });
    } finally {
      setLoading("backups", false);
    }
  }, []);

  useEffect(() => {
    loadAppConfig();
    loadHomeDashboard();
    loadInvoiceConfig();
    loadMailGlobal();
    loadAccounts();
    loadRbac();
    loadAttendance();
    loadLab();
    loadApis();
    loadAdminApiKeys();
    loadConnectors();
    loadBackups();
  }, [
    loadAppConfig,
    loadHomeDashboard,
    loadInvoiceConfig,
    loadMailGlobal,
    loadAccounts,
    loadRbac,
    loadAttendance,
    loadLab,
    loadApis,
    loadAdminApiKeys,
    loadConnectors,
    loadBackups
  ]);

  async function handleSaveApp() {
    setLoading("savingApp", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/app", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          companyLegalName: appForm.companyLegalName.trim(),
          companyBrandName: appForm.companyBrandName.trim(),
          companyNit: appForm.companyNit || null,
          companyPhone: appForm.companyPhone || null,
          companyAddress: appForm.companyAddress || null,
          logoUrl: appForm.logoUrl || null,
          timezone: TIMEZONE_OPTIONS.includes(appForm.timezone as (typeof TIMEZONE_OPTIONS)[number])
            ? appForm.timezone
            : "America/Guatemala"
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setMessages({ app: "Configuración de empresa guardada" });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando empresa" });
    } finally {
      setLoading("savingApp", false);
    }
  }

  async function handleCompanyLogoChange(
    url: string,
    info?: { name?: string; mime?: string; size?: number; fileKey?: string; assetId?: string }
  ) {
    setAppForm((prev) => ({ ...prev, logoUrl: url || "" }));
    setLogoGuidanceWarning(null);

    if (!url) return;

    const warnings: string[] = [];
    if (typeof info?.size === "number" && info.size > 1024 * 1024) {
      warnings.push("El archivo supera 1MB. Recomendado para logo institucional: < 1MB.");
    }

    if ((info?.mime || "").startsWith("image/")) {
      try {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error("No se pudo validar dimensiones de la imagen."));
          img.src = url;
        });
        if (dimensions.width < 512 || dimensions.height < 512) {
          warnings.push(
            `Resolución detectada ${dimensions.width}x${dimensions.height}. Recomendado mínimo 512x512 (ideal 1024x1024).`
          );
        }
      } catch {
        // soft validation only
      }
    }

    if (warnings.length > 0) {
      setLogoGuidanceWarning(warnings.join(" "));
    }
  }

  function toggleHomeQuickAction(key: HomeQuickActionKey) {
    setHomeDashboardForm((prev) => {
      const has = prev.quickActionKeys.includes(key);
      return {
        ...prev,
        quickActionKeys: has ? prev.quickActionKeys.filter((item) => item !== key) : [...prev.quickActionKeys, key]
      };
    });
  }

  function toggleHomeKpi(key: HomeKpiKey) {
    setHomeDashboardForm((prev) => {
      const has = prev.kpiKeys.includes(key);
      return {
        ...prev,
        kpiKeys: has ? prev.kpiKeys.filter((item) => item !== key) : [...prev.kpiKeys, key]
      };
    });
  }

  function resetHomeDashboard() {
    if (homeDashboardScope === "ROLE" && homeDashboardRoleName) {
      setHomeDashboardForm(homeDashboardByRole[homeDashboardRoleName] || homeDashboardGlobal);
      return;
    }
    setHomeDashboardForm(homeDashboardGlobal);
  }

  async function handleSaveHomeDashboard() {
    setLoading("savingHomeDashboard", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/home-dashboard", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: homeDashboardScope,
          roleName: homeDashboardScope === "ROLE" ? homeDashboardRoleName : null,
          settings: homeDashboardForm
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar configuración de inicio");
      if (json.global) {
        setHomeDashboardGlobal(normalizeHomeDashboardSettings(json.global));
      }
      if (json.byRole && typeof json.byRole === "object") {
        const byRole = Object.fromEntries(
          Object.entries(json.byRole).map(([key, value]) => [normalizeRoleName(key), normalizeHomeDashboardSettings(value)])
        ) as Record<string, HomeDashboardSettings>;
        setHomeDashboardByRole(byRole);
      }
      if (json.data) {
        setHomeDashboardForm(normalizeHomeDashboardSettings(json.data));
      }
      setMessages({
        homeDashboard:
          homeDashboardScope === "ROLE" && homeDashboardRoleName
            ? `Configuración de inicio guardada para rol ${homeDashboardRoleName}`
            : "Configuración de inicio global guardada"
      });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando configuración de inicio" });
    } finally {
      setLoading("savingHomeDashboard", false);
    }
  }

  async function handleSaveInvoice() {
    setLoading("savingInvoice", true);
    resetMessages();
    try {
      let pdfTemplateConfig: any = null;
      if (invoiceForm.pdfTemplateConfig.trim()) {
        pdfTemplateConfig = JSON.parse(invoiceForm.pdfTemplateConfig);
      }
      const res = await fetch("/api/config/invoice", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ...invoiceForm, pdfTemplateConfig })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar facturación");
      setMessages({ invoice: "Facturación guardada" });
      await loadInvoiceConfig();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando facturación" });
    } finally {
      setLoading("savingInvoice", false);
    }
  }

  async function handleInvoiceTest() {
    resetMessages();
    try {
      const res = await fetch("/api/config/invoice/test", { method: "POST", headers: adminHeaders });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "No se pudo generar PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "factura-test.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setMessages({ invoice: "PDF de prueba generado" });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error generando PDF" });
    }
  }

  async function handleSaveGlobal() {
    setLoading("savingGlobal", true);
    resetMessages();
    try {
      const payload = {
        smtpHost: globalForm.smtpHost.trim(),
        smtpPort: Number(globalForm.smtpPort),
        smtpSecure: globalForm.smtpSecure,
        smtpUser: globalForm.smtpUser.trim(),
        fromName: globalForm.fromName.trim(),
        fromEmail: globalForm.fromEmail.trim(),
        includePassword: globalForm.updatePassword,
        smtpPassword: globalForm.updatePassword ? globalForm.smtpPassword : undefined
      };
      const res = await fetch("/api/admin/config/email/global", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar");
      setMessages({ global: "Correo global guardado" });
      setGlobalForm((prev) => ({ ...prev, smtpPassword: "", updatePassword: false }));
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando correo global" });
    } finally {
      setLoading("savingGlobal", false);
    }
  }

  async function handleSaveAccount() {
    setLoading("savingAccount", true);
    resetMessages();
    try {
      if (!accountForm.email.trim()) throw new Error("Email requerido");
      const payload: any = {
        moduleKey: accountForm.moduleKey,
        email: accountForm.email.trim(),
        username: accountForm.username.trim() || accountForm.email.trim(),
        fromName: accountForm.fromName || undefined,
        fromEmail: accountForm.fromEmail || undefined,
        isEnabled: accountForm.isEnabled
      };
      if (accountForm.password.trim()) {
        payload.password = accountForm.password.trim();
      }
      const res = await fetch("/api/config/mail/modules", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar la cuenta");
      setMessages({ account: "Cuenta guardada" });
      setAccountForm((prev) => ({ ...prev, password: "" }));
      await loadAccounts();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando cuenta" });
    } finally {
      setLoading("savingAccount", false);
    }
  }

  async function handleTestSend() {
    setLoading("testingMail", true);
    resetMessages();
    try {
      if (!testEmail.trim()) throw new Error("Correo de prueba requerido");
      const res = await fetch("/api/admin/config/email/test", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: testEmail.trim() })
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok) throw new Error(json?.error || "No se pudo enviar la prueba");
      setMessages({ test: "Correo de prueba enviado" });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error enviando prueba" });
    } finally {
      setLoading("testingMail", false);
    }
  }

  function addSeriesRow() {
    setInvoiceForm((prev) => ({
      ...prev,
      series: [
        ...prev.series,
        { code: "", initialNumber: 1, currentNumber: 1, branchId: "", isActive: true }
      ]
    }));
  }

  function updateSeriesRow(idx: number, patch: Partial<InvoiceSeriesForm>) {
    setInvoiceForm((prev) => {
      const next = [...prev.series];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, series: next };
    });
  }

  function removeSeriesRow(idx: number) {
    setInvoiceForm((prev) => ({
      ...prev,
      series: prev.series.filter((_, i) => i !== idx)
    }));
  }

  function addPermission() {
    setPermissions((prev) => [...prev, { key: "", description: "", custom: false }]);
  }

  function addRole() {
    setRoles((prev) => [...prev, { name: "", description: "", permissions: [], userCount: 0, isSystem: false }]);
    setSelectedRoleIndex(roles.length);
  }

  function toggleRolePermission(roleIdx: number, permKey: string) {
    setRoles((prev) => {
      const next = [...prev];
      const role = next[roleIdx];
      const has = role.permissions.includes(permKey);
      role.permissions = has ? role.permissions.filter((p) => p !== permKey) : [...role.permissions, permKey];
      next[roleIdx] = { ...role };
      return next;
    });
  }

  async function handleSaveRbac() {
    setLoading("savingRbac", true);
    resetMessages();
    try {
      const cleanPermissions = permissions
        .filter((p) => p.key.trim())
        .map((p) => ({ key: p.key.trim(), description: p.description || "" }));
      const cleanRoles = roles
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          description: r.description || "",
          permissions: r.permissions
        }));
      const res = await fetch("/api/admin/config/rbac", {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: cleanPermissions, roles: cleanRoles })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar permisos/roles");
      setMessages({ rbac: "Permisos y roles guardados" });
      if (json.data) {
        setPermissions(
          (json.data.permissions || []).map((permission: any) => ({
            id: permission.id,
            key: permission.key,
            description: permission.description || "",
            custom: Boolean(permission.custom)
          }))
        );
        setRoles(
          (json.data.roles || []).map((role: any) => ({
            id: role.id,
            name: role.name,
            description: role.description || "",
            userCount: role.userCount || 0,
            isSystem: Boolean(role.isSystem),
            permissions: Array.isArray(role.permissions)
              ? role.permissions.map((perm: any) => (typeof perm === "string" ? perm : perm?.key || "")).filter(Boolean)
              : []
          }))
        );
        setRbacUsers(Array.isArray(json.data.users) ? (json.data.users as RbacUserRecord[]) : []);
      } else {
        await loadRbac();
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando permisos/roles" });
    } finally {
      setLoading("savingRbac", false);
    }
  }

  async function handleDeleteRole(role: RoleForm, index: number) {
    resetMessages();
    if (role.userCount && role.userCount > 0) {
      setMessages({ error: `No se puede eliminar el rol ${role.name} porque está asignado a usuarios.` });
      return;
    }

    const confirmed = window.confirm(`¿Eliminar rol "${role.name}"?`);
    if (!confirmed) return;

    if (!role.id) {
      setRoles((prev) => prev.filter((_, idx) => idx !== index));
      setMessages({ rbac: `Rol ${role.name} removido localmente. Guarda cambios para aplicar.` });
      return;
    }

    setLoading(`deleting-role-${role.id}`, true);
    try {
      const res = await fetch(`/api/admin/config/rbac?roleId=${encodeURIComponent(role.id)}`, {
        method: "DELETE",
        headers: adminHeaders
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "No se pudo eliminar el rol.");
      }
      setMessages({ rbac: `Rol ${role.name} eliminado.` });
      await loadRbac();
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo eliminar el rol." });
    } finally {
      setLoading(`deleting-role-${role.id}`, false);
    }
  }

  async function handleSaveIntegration(kind: "attendance" | "lab") {
    setLoading(`saving-${kind}`, true);
    resetMessages();
    try {
      const form = kind === "attendance" ? attendance : lab;
      const payload = {
        provider: form.provider,
        apiUrl: form.apiUrl,
        apiKey: form.apiKey,
        enabled: form.enabled
      };
      const res = await fetch(`/api/config/integrations/${kind === "attendance" ? "attendance" : "lab"}`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar integración");
      setMessages({ [`integration-${kind}`]: "Integración guardada" });
      if (kind === "attendance") {
        await loadAttendance();
      } else {
        await loadLab();
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando integración" });
    } finally {
      setLoading(`saving-${kind}`, false);
    }
  }

  async function handleTestIntegration(kind: "attendance" | "lab") {
    setLoading(`testing-${kind}`, true);
    resetMessages();
    try {
      const res = await fetch(`/api/config/integrations/${kind === "attendance" ? "attendance" : "lab"}/test`, {
        method: "POST",
        headers: adminHeaders
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo probar integración");
      setMessages({ [`integration-${kind}`]: "Prueba exitosa" });
      if (kind === "attendance") await loadAttendance();
      else await loadLab();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error en prueba de integración" });
    } finally {
      setLoading(`testing-${kind}`, false);
    }
  }

  function validateApiForm() {
    if (!apiForm.name.trim()) throw new Error("Nombre requerido");
    if (apiForm.baseUrl && apiForm.baseUrl.trim()) {
      try {
        new URL(apiForm.baseUrl.trim());
      } catch {
        throw new Error("URL inválida");
      }
    }
    if (apiForm.extraJson && apiForm.extraJson.trim()) {
      JSON.parse(apiForm.extraJson);
    }
  }

  async function handleSaveApi() {
    setLoading("savingApi", true);
    resetMessages();
    try {
      validateApiForm();
      const payload: any = {
        key: apiForm.key,
        name: apiForm.name.trim(),
        isEnabled: apiForm.isEnabled,
        baseUrl: apiForm.baseUrl?.trim() || null,
        extraJson: apiForm.extraJson?.trim() || null
      };
      if (apiForm.apiKey.trim()) payload.apiKey = apiForm.apiKey.trim();
      if (apiForm.apiSecret.trim()) payload.apiSecret = apiForm.apiSecret.trim();
      if (apiForm.token.trim()) payload.token = apiForm.token.trim();

      const res = await fetch("/api/config/apis", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar API");

      const saved: ApiIntegrationRecord = {
        key: json.data?.key || apiForm.key,
        name: json.data?.name || apiForm.name,
        isEnabled: json.data?.isEnabled ?? apiForm.isEnabled,
        baseUrl: json.data?.baseUrl || "",
        extraJson: json.data?.extraJson || "",
        hasApiKey: Boolean(json.data?.hasApiKey),
        hasSecret: Boolean(json.data?.hasSecret),
        hasToken: Boolean(json.data?.hasToken),
        lastTestAt: json.data?.lastTestAt || null,
        lastTestError: json.data?.lastTestError || null,
        id: json.data?.id
      };

      setApiIntegrations((prev) => {
        const exists = prev.some((item) => item.key === saved.key);
        if (exists) return prev.map((item) => (item.key === saved.key ? saved : item));
        return [...prev, saved];
      });
      setSelectedApiKey(saved.key);
      setApiForm(recordToApiForm(saved));
      setMessages({ [`api-${saved.key}`]: "Integración guardada" });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando API" });
    } finally {
      setLoading("savingApi", false);
    }
  }

  async function handleTestApi(key?: ApiIntegrationKey) {
    const targetKey = key || selectedApiKey;
    const target = apiIntegrations.find((item) => item.key === targetKey);
    if (!target) return;
    const loadingKey = key ? `testing-api-${targetKey}` : "testingApi";
    setLoading(loadingKey, true);
    resetMessages();
    try {
      if (targetKey === "OPENAI") {
        const res = await fetch("/api/integrations/openai/test", { method: "POST", headers: adminHeaders });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.error || "No se pudo probar OpenAI");
        setMessages({ [`api-${targetKey}`]: json?.data?.message || "Prueba exitosa" });
        return;
      }
      if (target.baseUrl && String(target.baseUrl).trim()) {
        new URL(String(target.baseUrl));
      }
      const res = await fetch(`/api/config/apis/${targetKey}/test`, {
        method: "POST",
        headers: adminHeaders
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo probar la API");
      const updated: ApiIntegrationRecord = {
        ...target,
        ...json.data,
        baseUrl: json.data?.baseUrl || "",
        extraJson: json.data?.extraJson || "",
        hasApiKey: Boolean(json.data?.hasApiKey),
        hasSecret: Boolean(json.data?.hasSecret),
        hasToken: Boolean(json.data?.hasToken),
        lastTestAt: json.data?.lastTestAt || null,
        lastTestError: json.data?.lastTestError || null
      };
      setApiIntegrations((prev) => prev.map((item) => (item.key === targetKey ? updated : item)));
      if (selectedApiRef.current === targetKey) {
        setApiForm(recordToApiForm(updated));
      }
      setMessages({
        [`api-${targetKey}`]: json.ok ? "Prueba exitosa" : updated.lastTestError || "Revisar configuración"
      });
    } catch (err: any) {
      setMessages({ error: err?.message || "Error al probar API" });
    } finally {
      setLoading(loadingKey, false);
    }
  }

  async function handleCreateApiKey() {
    setLoading("creatingApiKey", true);
    resetMessages();
    try {
      const scopes = apiKeyScopesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/config/api-keys", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: apiKeyName.trim(),
          scopes
        })
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo crear API key");
      setLatestApiKeySecret(json.data?.secret || null);
      setMessages({ apiKeys: "API key creada. Copia el secreto ahora; no volverá a mostrarse." });
      await loadAdminApiKeys();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error creando API key" });
    } finally {
      setLoading("creatingApiKey", false);
    }
  }

  async function handleRotateApiKey(id: string) {
    setLoading(`rotatingApiKey-${id}`, true);
    resetMessages();
    try {
      const res = await fetch(`/api/admin/config/api-keys/${id}/rotate`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" }
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo rotar API key");
      setLatestApiKeySecret(json.data?.secret || null);
      setMessages({ apiKeys: "API key rotada. Copia el nuevo secreto ahora." });
      await loadAdminApiKeys();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error rotando API key" });
    } finally {
      setLoading(`rotatingApiKey-${id}`, false);
    }
  }

  async function handleRevokeApiKey(id: string) {
    setLoading(`revokingApiKey-${id}`, true);
    resetMessages();
    try {
      const res = await fetch(`/api/admin/config/api-keys/${id}/revoke`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" }
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo revocar API key");
      setMessages({ apiKeys: json.data?.alreadyRevoked ? "API key ya estaba revocada" : "API key revocada" });
      await loadAdminApiKeys();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error revocando API key" });
    } finally {
      setLoading(`revokingApiKey-${id}`, false);
    }
  }

  async function handleCopyLatestApiSecret() {
    if (!latestApiKeySecret) return;
    try {
      await navigator.clipboard.writeText(latestApiKeySecret);
      setMessages({ apiKeys: "Secreto copiado al portapapeles" });
    } catch {
      setMessages({ error: "No se pudo copiar. Copia manualmente el secreto." });
    }
  }

  async function handleSaveConnectorFramework() {
    if (!selectedConnectorKey) return;
    setLoading("savingConnector", true);
    resetMessages();
    try {
      let config: Record<string, unknown> = {};
      if (connectorConfigText.trim()) {
        const parsed = JSON.parse(connectorConfigText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Config del conector debe ser un objeto JSON");
        }
        config = parsed as Record<string, unknown>;
      }

      const res = await fetch("/api/admin/config/integrations", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedConnectorKey,
          name: selectedConnector?.name || selectedConnectorKey,
          enabled: selectedConnector?.enabled ?? false,
          baseUrl: connectorBaseUrl.trim() || null,
          secret: connectorSecret.trim() || undefined,
          config
        })
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo guardar conector");
      setMessages({ connectors: "Conector actualizado" });
      setConnectorSecret("");
      await loadConnectors();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando conector" });
    } finally {
      setLoading("savingConnector", false);
    }
  }

  async function handleToggleConnectorFramework(key: ApiIntegrationKey, enabled: boolean) {
    setLoading(`toggleConnector-${key}`, true);
    resetMessages();
    try {
      const res = await fetch("/api/admin/config/integrations", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          enabled
        })
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo actualizar conector");
      await loadConnectors();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error actualizando conector" });
    } finally {
      setLoading(`toggleConnector-${key}`, false);
    }
  }

  async function handleSaveBackupPolicy() {
    if (!backupPolicy) return;
    setLoading("savingBackupPolicy", true);
    resetMessages();
    try {
      const retentionDays = Number(backupRetentionDays);
      const res = await fetch("/api/admin/config/backups", {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: backupPolicy.version,
          patch: {
            retentionDays,
            manualExportEnabled: backupManualEnabled
          }
        })
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo actualizar política");
      setMessages({ backups: `Política actualizada (v${json.data?.policy?.version ?? "?"})` });
      await loadBackups();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando política de backups" });
    } finally {
      setLoading("savingBackupPolicy", false);
    }
  }

  async function handleTriggerBackupExport() {
    setLoading("triggeringBackupExport", true);
    resetMessages();
    try {
      const res = await fetch("/api/admin/config/backups/export", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: backupTriggerReason.trim() || undefined })
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo disparar exportación");
      setMessages({ backups: "Exportación manual disparada" });
      setBackupTriggerReason("");
      await loadBackups();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error disparando exportación" });
    } finally {
      setLoading("triggeringBackupExport", false);
    }
  }

  const rows = moduleOptions.map((opt) => ({
    ...opt,
    account: accounts.find((a) => a.moduleKey === opt.key)
  }));

  const openAdvancedTab = useCallback((targetTab: ConfiguracionAdvancedTabTarget) => {
    setMainTab("avanzado");
    setTab(targetTab);
    requestAnimationFrame(() => {
      document.getElementById("config-advanced-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Configuración central</h1>
        <p className="text-sm text-slate-600">
          Centro de control para arranque, operación y gobierno de la configuración global del ERP.
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {[
            { key: "inicio_setup" as const, label: "Inicio (Setup)" },
            { key: "operacion" as const, label: "Operación" },
            { key: "avanzado" as const, label: "Avanzado" }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setMainTab(item.key)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                mainTab === item.key
                  ? "border-[#2e75ba] bg-[#2e75ba] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {messages.error && <p className="text-sm text-rose-600">{messages.error}</p>}

      {mainTab === "inicio_setup" && (
        <CentralConfigSetupWizardPanel
          onOpenAdvanced={openAdvancedTab}
          onOpenOperation={() => setMainTab("operacion")}
        />
      )}

      {mainTab === "operacion" && (
        <div className="space-y-4">
          <CentralConfigOperationPanel onOpenAdvanced={openAdvancedTab} />
          <CentralConfigSmokePanel />
        </div>
      )}

      {mainTab === "avanzado" && (
        <div id="config-advanced-tabs" className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {[
              { key: "empresa", label: "Empresa" },
              { key: "inicio", label: "Dashboard inicio" },
              { key: "facturacion", label: "Facturación (SAT)" },
              { key: "correo", label: "Correo" },
              { key: "permisos", label: "Permisos / Roles" },
              { key: "integraciones", label: "Conectores" },
              { key: "apis", label: "APIs" },
              { key: "sucursales", label: "Sucursales y horarios" },
              { key: "tema", label: "Tema / Branding" },
              { key: "comportamiento", label: "Feature Flags (comportamiento)" },
              { key: "exportaciones", label: "Exportaciones / respaldo" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as TabKey)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  tab === item.key
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mainTab === "avanzado" && tab === "empresa" && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Empresa</CardTitle>
              <p className="text-sm text-slate-500">Datos generales del ERP.</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Nombre legal / Razón social</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyLegalName}
                    onChange={(e) => setAppForm({ ...appForm, companyLegalName: e.target.value })}
                    placeholder="StarMedical S.A."
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Nombre de marca (UI / PDF)</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyBrandName}
                    onChange={(e) => setAppForm({ ...appForm, companyBrandName: e.target.value })}
                    placeholder="StarMedical"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">NIT</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyNit || ""}
                    onChange={(e) => setAppForm({ ...appForm, companyNit: e.target.value })}
                    placeholder="1234567-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Teléfono</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyPhone || ""}
                    onChange={(e) => setAppForm({ ...appForm, companyPhone: e.target.value })}
                    placeholder="+502 5555 5555"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Zona horaria</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.timezone}
                    onChange={(e) => setAppForm({ ...appForm, timezone: e.target.value })}
                  >
                    {TIMEZONE_OPTIONS.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="text-xs text-slate-600">Dirección</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyAddress || ""}
                    onChange={(e) => setAppForm({ ...appForm, companyAddress: e.target.value })}
                    placeholder="Dirección fiscal"
                    rows={3}
                  />
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openAdvancedTab("sucursales")}
                  className="rounded-xl border border-[#4aadf5] bg-[#eff8ff] px-3 py-2 text-xs font-semibold text-[#2e75ba] hover:bg-[#e5f3ff]"
                >
                  Configurar horarios por sucursal
                </button>
              </div>
              <div>
                <label className="text-xs text-slate-600">Logo</label>
                <UploadField
                  value={appForm.logoUrl || ""}
                  onChange={(url, info) => {
                    void handleCompanyLogoChange(url, info);
                  }}
                  accept="image/*"
                  helperText="Recomendado: SVG o PNG 1024x1024, fondo transparente, < 1MB. Se usa en header y PDFs."
                  onUploadError={(message) => setMessages({ error: message || "Error al subir la imagen" })}
                  onUploadSuccess={() => setMessages({ app: "Logo cargado" })}
                />
                {logoGuidanceWarning && <p className="mt-1 text-xs text-amber-700">{logoGuidanceWarning}</p>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveApp}
                  disabled={loadingStates.savingApp || loadingStates.app}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.savingApp ? "Guardando..." : "Guardar"}
                </button>
                {messages.app && <span className="text-xs text-green-700">{messages.app}</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Reloj del sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-slate-600">
              <p>
                Navegador ({browserTimezone}):{" "}
                <span className="font-semibold text-slate-800">{formatClock(clockNow, browserTimezone)}</span>
              </p>
              <p>
                Sistema ({appForm.timezone}):{" "}
                <span className="font-semibold text-slate-800">{formatClock(clockNow, appForm.timezone)}</span>
              </p>
              <p className="text-xs text-slate-500">Hora servidor: pendiente de endpoint server-time.</p>
              <p className="pt-2">
                Estos datos se usan en reportes, correo y UI. Solo ADMIN/SYSTEM:ADMIN deben editarlos.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "avanzado" && tab === "inicio" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Inicio (dashboard)</CardTitle>
              <p className="text-sm text-slate-500">
                Configura layout global o por rol. El dashboard usa configuración por rol y fallback global.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Ámbito</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={homeDashboardScope}
                    onChange={(event) => {
                      const nextScope = event.target.value === "ROLE" ? "ROLE" : "GLOBAL";
                      setHomeDashboardScope(nextScope);
                      if (nextScope === "ROLE") {
                        const fallbackRole = homeDashboardRoleName || roleScopeOptions[0]?.value || "";
                        setHomeDashboardRoleName(fallbackRole);
                      } else {
                        setHomeDashboardRoleName("");
                      }
                    }}
                  >
                    <option value="GLOBAL">Global</option>
                    <option value="ROLE">Por rol</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Rol objetivo</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    value={homeDashboardRoleName}
                    onChange={(event) => setHomeDashboardRoleName(normalizeRoleName(event.target.value))}
                    disabled={homeDashboardScope !== "ROLE"}
                  >
                    <option value="">Selecciona rol</option>
                    {roleScopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-slate-600">
                    {homeDashboardScope === "ROLE"
                      ? "Si el rol no tiene layout propio, se aplica automáticamente el global."
                      : "El layout global se usa como fallback para todos los roles."}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Botones rápidos</p>
                    <p className="text-xs text-slate-500">{homeDashboardForm.quickActionKeys.length} seleccionados</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setHomeDashboardForm((prev) => ({
                        ...prev,
                        quickActionKeys: HOME_QUICK_ACTION_CATALOG.map((item) => item.key)
                      }))
                    }
                    className="text-xs font-semibold text-brand-primary underline"
                  >
                    Seleccionar todos
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {HOME_QUICK_ACTION_CATALOG.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={homeDashboardForm.quickActionKeys.includes(item.key)}
                        onChange={() => toggleHomeQuickAction(item.key)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-semibold text-slate-900">{item.label}</span>
                        <span className="ml-2 text-xs text-slate-500">({item.module})</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">KPIs</p>
                    <p className="text-xs text-slate-500">{homeDashboardForm.kpiKeys.length} seleccionados</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setHomeDashboardForm((prev) => ({
                        ...prev,
                        kpiKeys: HOME_KPI_CATALOG.map((item) => item.key)
                      }))
                    }
                    className="text-xs font-semibold text-brand-primary underline"
                  >
                    Seleccionar todos
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {HOME_KPI_CATALOG.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={homeDashboardForm.kpiKeys.includes(item.key)}
                        onChange={() => toggleHomeKpi(item.key)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-semibold text-slate-900">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{item.helperGlobal}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveHomeDashboard}
                  disabled={loadingStates.savingHomeDashboard || loadingStates.homeDashboard}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.savingHomeDashboard ? "Guardando..." : "Guardar inicio"}
                </button>
                <button
                  type="button"
                  onClick={resetHomeDashboard}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Restaurar predeterminado
                </button>
                {messages.homeDashboard && <span className="text-xs text-green-700">{messages.homeDashboard}</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>
                Modo {homeDashboardScope === "ROLE" ? "Por rol" : "Global"}{" "}
                {homeDashboardScope === "ROLE" && homeDashboardRoleName ? `(${homeDashboardRoleName})` : ""}.
              </p>
              <p>Si un botón requiere acceso especial (ej. Recepción), solo lo verá quien tenga permisos.</p>
              <p>El orden de selección determina el orden visual en Inicio.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "avanzado" && tab === "facturacion" && (
        <div className="space-y-4">
          <CentralFiscalSatPanel />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Facturación (SAT)</CardTitle>
              <p className="text-sm text-slate-500">Datos fiscales y series de facturación.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Razón social</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={invoiceForm.legalName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, legalName: e.target.value })}
                    placeholder="StarMedical S.A."
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">NIT</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={invoiceForm.nit}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, nit: e.target.value })}
                    placeholder="1234567-8"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Dirección fiscal</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={invoiceForm.fiscalAddress || ""}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, fiscalAddress: e.target.value })}
                    placeholder="Ciudad de Guatemala"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">IVA % predeterminado</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={invoiceForm.defaultTaxRate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, defaultTaxRate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">Pie de factura</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={invoiceForm.invoiceFooterText || ""}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceFooterText: e.target.value })}
                  placeholder="Gracias por su compra."
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Config plantilla PDF (JSON)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  rows={4}
                  value={invoiceForm.pdfTemplateConfig}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, pdfTemplateConfig: e.target.value })}
                  placeholder='{"color":"#0F172A"}'
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Series</p>
                  <button
                    onClick={addSeriesRow}
                    className="text-xs font-semibold text-brand-primary underline"
                    type="button"
                  >
                    + Agregar serie
                  </button>
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">Serie</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">Inicial</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">Actual</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">Sucursal</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {invoiceForm.series.map((s, idx) => (
                        <tr key={s.id || idx}>
                          <td className="px-2 py-2">
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={s.code}
                              onChange={(e) => updateSeriesRow(idx, { code: e.target.value })}
                              placeholder="A"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={s.initialNumber}
                              onChange={(e) => updateSeriesRow(idx, { initialNumber: Number(e.target.value) })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={s.currentNumber}
                              onChange={(e) => updateSeriesRow(idx, { currentNumber: Number(e.target.value) })}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              value={s.branchId || ""}
                              onChange={(e) => updateSeriesRow(idx, { branchId: e.target.value })}
                              placeholder="Sucursal opcional"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={s.isActive}
                                onChange={(e) => updateSeriesRow(idx, { isActive: e.target.checked })}
                              />
                              Activa
                            </label>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => removeSeriesRow(idx)}
                              className="text-xs text-rose-600 underline"
                              type="button"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invoiceForm.series.length === 0 && (
                        <tr>
                          <td className="px-2 py-3 text-sm text-slate-500" colSpan={6}>
                            Sin series configuradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveInvoice}
                  disabled={loadingStates.savingInvoice}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.savingInvoice ? "Guardando..." : "Guardar facturación"}
                </button>
                <button
                  onClick={handleInvoiceTest}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft"
                  type="button"
                >
                  Probar PDF factura
                </button>
                {messages.invoice && <span className="text-xs text-green-700">{messages.invoice}</span>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Define las series y correlativos. El PDF de prueba valida la plantilla y colores.</p>
              <p>Las series se guardan junto con la configuración fiscal.</p>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {mainTab === "avanzado" && tab === "correo" && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Correo global (SMTP)</CardTitle>
                <p className="text-sm text-slate-500">Usado para OTP, creación de usuarios y reset password.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Sugerido DreamHost:</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">smtp.dreamhost.com</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">puerto 465</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">secure: true</span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">SMTP host</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.smtpHost}
                      onChange={(e) => setGlobalForm({ ...globalForm, smtpHost: e.target.value })}
                      placeholder="smtp.dreamhost.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Puerto</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.smtpPort}
                      onChange={(e) => setGlobalForm({ ...globalForm, smtpPort: Number(e.target.value) })}
                      placeholder="465"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={globalForm.smtpSecure}
                      onChange={(e) => setGlobalForm({ ...globalForm, smtpSecure: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700">SSL/TLS (secure)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">Usuario SMTP</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.smtpUser}
                      onChange={(e) => setGlobalForm({ ...globalForm, smtpUser: e.target.value })}
                      placeholder="systems@starmedical.com.gt"
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={globalForm.updatePassword}
                        onChange={(e) => setGlobalForm({ ...globalForm, updatePassword: e.target.checked })}
                      />
                      Actualizar contraseña SMTP
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.smtpPassword}
                      onChange={(e) => setGlobalForm({ ...globalForm, smtpPassword: e.target.value })}
                      placeholder={globalForm.updatePassword ? "Nueva contraseña" : "••••••••"}
                      disabled={!globalForm.updatePassword}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-600">From name</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.fromName}
                      onChange={(e) => setGlobalForm({ ...globalForm, fromName: e.target.value })}
                      placeholder="StarMedical ERP"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">From email</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.fromEmail}
                      onChange={(e) => setGlobalForm({ ...globalForm, fromEmail: e.target.value })}
                      placeholder="systems@starmedical.com.gt"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleSaveGlobal}
                    disabled={loadingStates.savingGlobal || loadingStates.mailGlobal}
                    className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                  >
                    {loadingStates.savingGlobal ? "Guardando..." : "Guardar correo global"}
                  </button>
                  {messages.global && <span className="text-xs text-green-700">{messages.global}</span>}
                  <div className="flex items-center gap-2">
                    <input
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Correo de prueba"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <button
                      onClick={handleTestSend}
                      disabled={loadingStates.testingMail}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {loadingStates.testingMail ? "Probando..." : "Probar envío"}
                    </button>
                  </div>
                  {messages.test && <span className="text-xs text-green-700">{messages.test}</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>La contraseña se cifra con AES-256-GCM usando EMAIL_SECRET_KEY.</p>
                <p>No se registra en logs. Usa el correo global para OTP y notificaciones del sistema.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Cuentas por módulo</CardTitle>
                <p className="text-sm text-slate-500">Cada módulo puede usar un correo distinto.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Módulo</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Estado</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Última prueba</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                          <td className="px-3 py-2 text-slate-700">{row.account?.email || "Sin configurar"}</td>
                          <td className="px-3 py-2">
                            {row.account ? (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-xs font-semibold",
                                  row.account.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                                )}
                              >
                                {row.account.isEnabled ? "Activo" : "Inactivo"}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Pendiente</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {row.account?.lastTestAt
                              ? new Date(row.account.lastTestAt).toLocaleString()
                              : row.account
                                ? "Sin prueba"
                                : "—"}
                            {row.account?.lastTestError && (
                              <p className="text-[11px] text-rose-600">Error: {row.account.lastTestError}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              className="text-xs font-semibold text-brand-primary underline"
                              onClick={() => {
                                setAccountForm({
                                  moduleKey: row.key,
                                  email: row.account?.email || "",
                                  username: row.account?.username || "",
                                  password: "",
                                  fromName: row.account?.fromName || "",
                                  fromEmail: row.account?.fromEmail || "",
                                  isEnabled: row.account?.isEnabled ?? true
                                });
                                setTestEmail(row.account?.email || "");
                              }}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cuenta de módulo</CardTitle>
                <p className="text-sm text-slate-500">Credenciales cifradas con AES-256-GCM.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600">Módulo</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={accountForm.moduleKey}
                    onChange={(e) => {
                      const next = e.target.value as ModuleKey;
                      const acc = accounts.find((a) => a.moduleKey === next);
                      setAccountForm({
                        moduleKey: next,
                        email: acc?.email || "",
                        username: acc?.username || "",
                        password: "",
                        fromName: acc?.fromName || "",
                        fromEmail: acc?.fromEmail || "",
                        isEnabled: acc?.isEnabled ?? true
                      });
                      setTestEmail(acc?.email || "");
                    }}
                  >
                    {moduleOptions.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-slate-600">Email</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      placeholder="correo@dominio.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Usuario SMTP</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={accountForm.username}
                      onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                      placeholder="usuario (usualmente el mismo correo)"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">Contraseña (no se muestra)</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={accountForm.password}
                      onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                      placeholder="********"
                    />
                    <p className="text-[11px] text-slate-500">
                      Contraseña guardada: {selectedAccount?.passwordSet ? "Sí" : "No"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">From name (opcional)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={accountForm.fromName || ""}
                      onChange={(e) => setAccountForm({ ...accountForm, fromName: e.target.value })}
                      placeholder="StarMedical Inventario"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">From email (opcional)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={accountForm.fromEmail || ""}
                      onChange={(e) => setAccountForm({ ...accountForm, fromEmail: e.target.value })}
                      placeholder="noreply@dominio.com"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={accountForm.isEnabled}
                      onChange={(e) => setAccountForm({ ...accountForm, isEnabled: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700">Habilitar cuenta</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAccount}
                      disabled={loadingStates.savingAccount || loadingStates.accounts}
                      className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                    >
                      {loadingStates.savingAccount ? "Guardando..." : "Guardar cuenta"}
                    </button>
                    {messages.account && <span className="text-xs text-green-700">{messages.account}</span>}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-700 font-semibold mb-2">Enviar prueba</p>
                    <div className="flex flex-col gap-2">
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="destinatario@dominio.com"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleTestSend}
                          disabled={loadingStates.testingMail || !testEmail}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
                        >
                          {loadingStates.testingMail ? "Enviando..." : "Enviar prueba"}
                        </button>
                        {messages.test && <span className="text-xs text-green-700">{messages.test}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Usa las credenciales del módulo seleccionado y la configuración SMTP global.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <CentralEmailSandboxPanel />
        </>
      )}

      {mainTab === "avanzado" && tab === "permisos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
                <p className="text-sm text-slate-500">Selecciona un rol para editar sus permisos.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {roles.map((role, idx) => (
                    <button
                      key={role.id || `${role.name}-${idx}`}
                      type="button"
                      onClick={() => setSelectedRoleIndex(idx)}
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-left",
                        selectedRoleIndex === idx
                          ? "border-[#2e75ba] bg-[#eff7ff]"
                          : "border-slate-200 bg-white hover:border-[#4aadf5]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{role.name || "Nuevo rol"}</p>
                        <div className="flex items-center gap-1">
                          {role.isSystem ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              Sistema
                            </span>
                          ) : null}
                          <span className="rounded-full bg-[#ecf8f6] px-2 py-0.5 text-[11px] font-semibold text-[#1c5952]">
                            {role.userCount || 0} usuarios
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{role.description || "Sin descripción"}</p>
                    </button>
                  ))}
                  {roles.length === 0 ? <p className="text-sm text-slate-500">No hay roles configurados.</p> : null}
                </div>
                <button onClick={addRole} className="text-xs font-semibold text-brand-primary underline" type="button">
                  + Agregar rol
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permisos del rol</CardTitle>
                <p className="text-sm text-slate-500">Roles → capabilities activas por módulo.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedRole ? (
                  <>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        value={selectedRole.name}
                        onChange={(e) => {
                          const next = [...roles];
                          next[selectedRoleIndex] = { ...selectedRole, name: e.target.value };
                          setRoles(next);
                        }}
                        placeholder="Nombre del rol"
                      />
                      <input
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        value={selectedRole.description || ""}
                        onChange={(e) => {
                          const next = [...roles];
                          next[selectedRoleIndex] = { ...selectedRole, description: e.target.value };
                          setRoles(next);
                        }}
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {permissions.map((permission) => (
                        <label
                          key={permission.id || permission.key}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs",
                            selectedRole.permissions.includes(permission.key)
                              ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                              : "border-slate-200 bg-white text-slate-700"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRole.permissions.includes(permission.key)}
                            onChange={() => toggleRolePermission(selectedRoleIndex, permission.key)}
                          />
                          <span className="font-mono">{permission.key}</span>
                          {permission.custom ? (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              custom
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(selectedRole, selectedRoleIndex)}
                        disabled={
                          Boolean(selectedRole.isSystem) ||
                          Boolean((selectedRole.userCount || 0) > 0) ||
                          Boolean(selectedRole.id && loadingStates[`deleting-role-${selectedRole.id}`])
                        }
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {selectedRole.id && loadingStates[`deleting-role-${selectedRole.id}`] ? "Eliminando..." : "Eliminar rol"}
                      </button>
                      {(selectedRole.userCount || 0) > 0 ? (
                        <span className="text-[11px] text-slate-500">
                          No se puede eliminar: rol asignado a usuarios.
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Selecciona un rol para editar.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usuarios afectados</CardTitle>
                <p className="text-sm text-slate-500">Usuarios con el rol seleccionado y permisos efectivos.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedRole ? (
                  usersAffectedBySelectedRole.length > 0 ? (
                    <div className="max-h-72 space-y-2 overflow-auto pr-1">
                      {usersAffectedBySelectedRole.map((user) => (
                        <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{user.name || user.email}</p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                user.isActive ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {user.isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Roles: {user.roleNames.join(", ") || "—"}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Permisos efectivos: {user.effectivePermissions.length}
                          </p>
                          {user.customPermissions.length > 0 ? (
                            <p className="text-[11px] text-amber-700">
                              Permisos custom: {user.customPermissions.slice(0, 4).join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No hay usuarios con este rol.</p>
                  )
                ) : (
                  <p className="text-sm text-slate-500">Selecciona un rol para revisar usuarios.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Catálogo de permisos</CardTitle>
              <p className="text-sm text-slate-500">
                Permisos disponibles. Los no catalogados se marcan como custom para revisión.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Permisos</p>
                <button onClick={addPermission} className="text-xs text-brand-primary underline" type="button">
                  + Agregar permiso
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {permissions.map((permission, idx) => (
                  <div key={permission.id || idx} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-600">Permiso #{idx + 1}</p>
                      {permission.custom ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          custom
                        </span>
                      ) : null}
                    </div>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-mono"
                      value={permission.key}
                      onChange={(e) => {
                        const next = [...permissions];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setPermissions(next);
                      }}
                      placeholder="CONFIG_BRANCH_READ"
                    />
                    <textarea
                      className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      rows={2}
                      value={permission.description || ""}
                      onChange={(e) => {
                        const next = [...permissions];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setPermissions(next);
                      }}
                      placeholder="Descripción"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveRbac}
                  disabled={loadingStates.savingRbac}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.savingRbac ? "Guardando..." : "Guardar roles y permisos"}
                </button>
                {messages.rbac && <span className="text-xs text-green-700">{messages.rbac}</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "avanzado" && tab === "integraciones" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
            <CardHeader>
              <CardTitle>Reloj de asistencia</CardTitle>
              <p className="text-sm text-slate-500">Provider, API y prueba de conexión.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Proveedor"
                value={attendance.provider}
                onChange={(e) => setAttendance({ ...attendance, provider: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="API URL"
                value={attendance.apiUrl || ""}
                onChange={(e) => setAttendance({ ...attendance, apiUrl: e.target.value })}
              />
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={attendance.apiKeySet ? "API key (cambiando la sobrescribes)" : "API key"}
                value={attendance.apiKey || ""}
                onChange={(e) => setAttendance({ ...attendance, apiKey: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={attendance.enabled}
                  onChange={(e) => setAttendance({ ...attendance, enabled: e.target.checked })}
                />
                Habilitar integración
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSaveIntegration("attendance")}
                  disabled={loadingStates["saving-attendance"]}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates["saving-attendance"] ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => handleTestIntegration("attendance")}
                  disabled={loadingStates["testing-attendance"]}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates["testing-attendance"] ? "Probando..." : "Probar"}
                </button>
              </div>
              {messages["integration-attendance"] && (
                <p className="text-xs text-green-700">{messages["integration-attendance"]}</p>
              )}
              {attendance.lastTestAt && (
                <p className="text-xs text-slate-500">Última prueba: {new Date(attendance.lastTestAt).toLocaleString()}</p>
              )}
              {attendance.lastTestError && (
                <p className="text-xs text-rose-600">Error: {attendance.lastTestError}</p>
              )}
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <CardTitle>Laboratorio clínico</CardTitle>
              <p className="text-sm text-slate-500">Provider, API y prueba de conexión.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Proveedor"
                value={lab.provider}
                onChange={(e) => setLab({ ...lab, provider: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="API URL"
                value={lab.apiUrl || ""}
                onChange={(e) => setLab({ ...lab, apiUrl: e.target.value })}
              />
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder={lab.apiKeySet ? "API key (cambiando la sobrescribes)" : "API key"}
                value={lab.apiKey || ""}
                onChange={(e) => setLab({ ...lab, apiKey: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={lab.enabled}
                  onChange={(e) => setLab({ ...lab, enabled: e.target.checked })}
                />
                Habilitar integración
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSaveIntegration("lab")}
                  disabled={loadingStates["saving-lab"]}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates["saving-lab"] ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => handleTestIntegration("lab")}
                  disabled={loadingStates["testing-lab"]}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates["testing-lab"] ? "Probando..." : "Probar"}
                </button>
              </div>
              {messages["integration-lab"] && <p className="text-xs text-green-700">{messages["integration-lab"]}</p>}
              {lab.lastTestAt && (
                <p className="text-xs text-slate-500">Última prueba: {new Date(lab.lastTestAt).toLocaleString()}</p>
              )}
              {lab.lastTestError && <p className="text-xs text-rose-600">Error: {lab.lastTestError}</p>}
            </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Framework de conectores</CardTitle>
              <p className="text-sm text-slate-500">
                Catálogo central para activar/desactivar conectores, URL base y credenciales enmascaradas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Conector</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Estado</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Último check</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Secreto</th>
                      <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {connectors.map((row, index) => (
                      <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedConnectorKey(row.key)}
                            className={cn(
                              "rounded-lg px-2 py-1 text-left text-xs font-semibold",
                              selectedConnectorKey === row.key ? "bg-[#e9f4ff] text-[#2e75ba]" : "text-slate-700"
                            )}
                          >
                            {row.name}
                            <span className="ml-2 text-[11px] font-normal text-slate-500">({row.key})</span>
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs font-semibold",
                              row.enabled ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {row.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {row.lastCheckAt ? new Date(row.lastCheckAt).toLocaleString() : "Sin verificación"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{row.hasSecret ? "••••••••" : "—"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleToggleConnectorFramework(row.key, !row.enabled)}
                            disabled={loadingStates[`toggleConnector-${row.key}`]}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] disabled:opacity-60"
                          >
                            {loadingStates[`toggleConnector-${row.key}`]
                              ? "Guardando..."
                              : row.enabled
                                ? "Desactivar"
                                : "Activar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {connectors.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-sm text-slate-500">
                          No hay conectores registrados aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Conector</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={selectedConnectorKey}
                    onChange={(event) => setSelectedConnectorKey(event.target.value as ApiIntegrationKey)}
                  >
                    {connectors.map((row) => (
                      <option key={row.key} value={row.key}>
                        {row.name}
                      </option>
                    ))}
                    {connectors.length === 0 &&
                      apiIntegrationOptions.map((row) => (
                        <option key={row.key} value={row.key}>
                          {row.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Base URL</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={connectorBaseUrl}
                    onChange={(event) => setConnectorBaseUrl(event.target.value)}
                    placeholder="https://api.proveedor.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Rotar secreto</label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={connectorSecret}
                    onChange={(event) => setConnectorSecret(event.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Config JSON</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                    rows={4}
                    value={connectorConfigText}
                    onChange={(event) => setConnectorConfigText(event.target.value)}
                    placeholder='{"timeoutMs":5000}'
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveConnectorFramework}
                  disabled={loadingStates.savingConnector}
                  className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
                >
                  {loadingStates.savingConnector ? "Guardando..." : "Guardar conector"}
                </button>
                {messages.connectors && <span className="text-xs text-green-700">{messages.connectors}</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mainTab === "avanzado" && tab === "apis" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>APIs externas</CardTitle>
              <p className="text-sm text-slate-500">
                Centraliza credenciales y endpoints cifrados (APP_ENCRYPTION_KEY). Solo rol Administrador.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Nombre</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Base URL</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Última prueba</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiIntegrations.map((item) => {
                    const isOk = item.lastTestAt && !item.lastTestError;
                    const hasError = Boolean(item.lastTestError);
                    return (
                      <tr key={item.key} className={selectedApiKey === item.key ? "bg-slate-50" : ""}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                              item.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {item.isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{item.baseUrl || "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {isOk && <span className="text-emerald-700">OK ({new Date(item.lastTestAt!).toLocaleString()})</span>}
                          {hasError && (
                            <span className="text-rose-600">
                              Error{item.lastTestError ? `: ${item.lastTestError}` : ""}{" "}
                              {item.lastTestAt ? `(${new Date(item.lastTestAt).toLocaleString()})` : ""}
                            </span>
                          )}
                          {!item.lastTestAt && !item.lastTestError && <span className="text-slate-500">Sin pruebas</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedApiKey(item.key)}
                              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-primary"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleTestApi(item.key)}
                              disabled={Boolean(loadingStates[`testing-api-${item.key}`])}
                              className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-soft disabled:opacity-70"
                            >
                              {loadingStates[`testing-api-${item.key}`] ? "Probando..." : "Probar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loadingStates.apis && <p className="mt-2 text-xs text-slate-500">Cargando APIs...</p>}
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
              <CardTitle>Editar API</CardTitle>
              <p className="text-sm text-slate-500">
                No se muestran secretos guardados. Usa placeholders “••••••••” y guarda antes de probar.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-600">Integración</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={selectedApiKey}
                  onChange={(e) => setSelectedApiKey(e.target.value as ApiIntegrationKey)}
                >
                  {apiIntegrationOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Nombre visible</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={apiForm.name}
                    onChange={(e) => setApiForm({ ...apiForm, name: e.target.value })}
                    placeholder="Webhook pagos, WhatsApp, etc."
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={apiForm.isEnabled}
                      onChange={(e) => setApiForm({ ...apiForm, isEnabled: e.target.checked })}
                    />
                    Habilitar
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">Base URL</label>
                <input
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={apiForm.baseUrl || ""}
                  onChange={(e) => setApiForm({ ...apiForm, baseUrl: e.target.value })}
                  placeholder="https://api.mi-proveedor.com"
                />
                <p className="text-[11px] text-slate-500">Validamos URL; si se omite, se exige que haya credenciales.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">API Key</label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={apiForm.apiKey}
                    onChange={(e) => setApiForm({ ...apiForm, apiKey: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-[11px] text-slate-500">
                    API Key guardada: {apiForm.hasApiKey ? "Sí" : "No"} (encriptada)
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-600">API Secret</label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={apiForm.apiSecret}
                    onChange={(e) => setApiForm({ ...apiForm, apiSecret: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-[11px] text-slate-500">
                    Secret guardado: {apiForm.hasSecret ? "Sí" : "No"} (encriptado)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Token / Bearer</label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={apiForm.token}
                    onChange={(e) => setApiForm({ ...apiForm, token: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-[11px] text-slate-500">Token guardado: {apiForm.hasToken ? "Sí" : "No"}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Extras (JSON)</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                    rows={3}
                    value={apiForm.extraJson || ""}
                    onChange={(e) => setApiForm({ ...apiForm, extraJson: e.target.value })}
                    placeholder='{"senderId":"123","webhookUrl":"https://..."}'
                  />
                  <p className="text-[11px] text-slate-500">Validamos formato JSON antes de guardar.</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                {apiForm.lastTestAt && (
                  <p>Última prueba: {apiForm.lastTestAt ? new Date(apiForm.lastTestAt).toLocaleString() : "—"}</p>
                )}
                {apiForm.lastTestError && <p className="text-rose-600">Error: {apiForm.lastTestError}</p>}
                {!apiForm.lastTestAt && <p className="text-slate-500">Guarda y prueba para registrar estado.</p>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveApi}
                  disabled={loadingStates.savingApi}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.savingApi ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => handleTestApi()}
                  disabled={loadingStates.testingApi}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.testingApi ? "Probando..." : "Probar conexión"}
                </button>
              </div>
              {messages[`api-${apiForm.key}`] && (
                <p className="text-xs text-green-700">{messages[`api-${apiForm.key}`]}</p>
              )}
            </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API Keys internas</CardTitle>
              <p className="text-sm text-slate-500">
                Crea, rota y revoca llaves de integración. El secreto se muestra solo una vez.
              </p>
            </CardHeader>
            {pendingModules.apiKeys ? (
              <CardContent>
                <div className="rounded-xl border border-[#4aadf5]/35 bg-[#eff8ff] p-4">
                  <p className="text-sm font-semibold text-[#2e75ba]">Pendiente (beta)</p>
                  <p className="mt-1 text-sm text-slate-700">{pendingModuleMessages.apiKeys}</p>
                </div>
              </CardContent>
            ) : (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">Nombre</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={apiKeyName}
                      onChange={(event) => setApiKeyName(event.target.value)}
                      placeholder="Integración interna"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-xs text-slate-600">Scopes (coma separada)</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                      value={apiKeyScopesText}
                      onChange={(event) => setApiKeyScopesText(event.target.value)}
                      placeholder="CONFIG_API_READ,CONFIG_API_WRITE"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCreateApiKey}
                    disabled={loadingStates.creatingApiKey}
                    className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
                  >
                    {loadingStates.creatingApiKey ? "Creando..." : "Crear API key"}
                  </button>
                  {messages.apiKeys && <span className="text-xs text-green-700">{messages.apiKeys}</span>}
                </div>

                {latestApiKeySecret && (
                  <div className="rounded-xl border border-[#4aadf5]/40 bg-[#eff8ff] p-3">
                    <p className="text-xs font-semibold text-[#2e75ba]">Secreto generado (solo esta vez)</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-700">{latestApiKeySecret}</p>
                    <button
                      type="button"
                      onClick={handleCopyLatestApiSecret}
                      className="mt-2 rounded-lg border border-[#4aadf5] px-2 py-1 text-xs font-semibold text-[#2e75ba]"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Nombre</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Scopes</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Últimos 4</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Estado</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Creada</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminApiKeys.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 text-sm font-semibold text-slate-800">{row.name}</td>
                          <td className="px-3 py-2 text-xs text-slate-600">{row.scopes.join(", ")}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-700">{row.last4}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-xs font-semibold",
                                row.status === "active" ? "bg-[#ecf8f6] text-[#1c5952]" : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {row.status === "active" ? "Activa" : "Revocada"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={row.status !== "active" || loadingStates[`rotatingApiKey-${row.id}`]}
                                onClick={() => handleRotateApiKey(row.id)}
                                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] disabled:opacity-60"
                              >
                                {loadingStates[`rotatingApiKey-${row.id}`] ? "Rotando..." : "Rotar"}
                              </button>
                              <button
                                type="button"
                                disabled={loadingStates[`revokingApiKey-${row.id}`]}
                                onClick={() => handleRevokeApiKey(row.id)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                              >
                                {loadingStates[`revokingApiKey-${row.id}`] ? "Revocando..." : "Revocar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {adminApiKeys.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-sm text-slate-500">
                            No hay API keys internas registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {mainTab === "avanzado" && tab === "sucursales" && <CentralBranchesConfigPanel />}

      {mainTab === "avanzado" && tab === "tema" && <CentralThemeBrandingPanel />}

      {mainTab === "avanzado" && tab === "comportamiento" && <CentralSystemFlagsPanel />}

      {mainTab === "avanzado" && tab === "exportaciones" && (
        pendingModules.backups ? (
          <Card>
            <CardHeader>
              <CardTitle>Exportaciones / respaldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-[#4aadf5]/35 bg-[#eff8ff] p-4">
                <p className="text-sm font-semibold text-[#2e75ba]">Pendiente (beta)</p>
                <p className="mt-1 text-sm text-slate-700">{pendingModuleMessages.backups}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Política de backups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>
                  <label className="text-xs text-slate-600">Retención (días)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={backupRetentionDays}
                    onChange={(event) => setBackupRetentionDays(event.target.value)}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={backupManualEnabled}
                    onChange={(event) => setBackupManualEnabled(event.target.checked)}
                  />
                  Habilitar exportación manual
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveBackupPolicy}
                    disabled={loadingStates.savingBackupPolicy || !backupPolicy}
                    className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-70"
                  >
                    {loadingStates.savingBackupPolicy ? "Guardando..." : "Guardar política"}
                  </button>
                  {messages.backups && <span className="text-xs text-green-700">{messages.backups}</span>}
                </div>
                {backupPolicy && (
                  <p className="text-xs text-slate-500">
                    Versión: {backupPolicy.version} · Actualizada: {new Date(backupPolicy.updatedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Exportación manual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Motivo de la exportación (opcional)"
                  value={backupTriggerReason}
                  onChange={(event) => setBackupTriggerReason(event.target.value)}
                />
                <button
                  onClick={handleTriggerBackupExport}
                  disabled={loadingStates.triggeringBackupExport}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                >
                  {loadingStates.triggeringBackupExport ? "Ejecutando..." : "Disparar exportación"}
                </button>
                <div className="rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Modo</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#2e75ba]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backupRuns.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{row.triggerMode}</td>
                          <td className="px-3 py-2">{row.status}</td>
                        </tr>
                      ))}
                      {backupRuns.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-3 text-slate-500">
                            No hay ejecuciones de exportación registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
