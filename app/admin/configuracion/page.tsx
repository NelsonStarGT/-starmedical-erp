"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import UploadField from "@/components/ui/UploadField";
import { cn } from "@/lib/utils";

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
  { key: "WEBHOOKS", label: "Webhooks internos" },
  { key: "OTRO", label: "Otra API / Inventario externo" }
] as const;

type ModuleKey = (typeof moduleOptions)[number]["key"];
type TabKey = "empresa" | "facturacion" | "correo" | "permisos" | "integraciones" | "apis" | "exportaciones";

type AppForm = {
  companyName: string;
  companyNit?: string;
  companyPhone?: string;
  companyAddress?: string;
  brandColor?: string;
  logoUrl?: string;
  timezone: string;
  openingHoursText: string;
};

type GlobalForm = {
  provider?: string | null;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
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

type PermissionForm = { key: string; description?: string };
type RoleForm = { name: string; description?: string; permissions: string[] };

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
  const [tab, setTab] = useState<TabKey>("empresa");

  const [appForm, setAppForm] = useState<AppForm>({
    companyName: "",
    companyNit: "",
    companyPhone: "",
    companyAddress: "",
    brandColor: "",
    logoUrl: "",
    timezone: "America/Guatemala",
    openingHoursText: ""
  });

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
    provider: "",
    smtpHost: "",
    smtpPort: 465,
    smtpSecure: true,
    imapHost: "",
    imapPort: 993,
    imapSecure: true
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

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string | undefined>>({});

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.moduleKey === accountForm.moduleKey),
    [accountForm.moduleKey, accounts]
  );

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

  const loadAppConfig = useCallback(async () => {
    setLoading("app", true);
    resetMessages();
    try {
      const res = await fetch("/api/config/app", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setAppForm({
          companyName: json.data.companyName || "",
          companyNit: json.data.companyNit || "",
          companyPhone: json.data.companyPhone || "",
          companyAddress: json.data.companyAddress || "",
          brandColor: json.data.brandColor || "",
          logoUrl: json.data.logoUrl || "",
          timezone: json.data.timezone || "America/Guatemala",
          openingHoursText: json.data.openingHours ? JSON.stringify(json.data.openingHours, null, 2) : ""
        });
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar configuración de empresa" });
    } finally {
      setLoading("app", false);
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
      const res = await fetch("/api/config/mail/global", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok && json.data) {
        setGlobalForm({
          provider: json.data.provider || "",
          smtpHost: json.data.smtpHost || "",
          smtpPort: json.data.smtpPort || 465,
          smtpSecure: json.data.smtpSecure !== false,
          imapHost: json.data.imapHost || "",
          imapPort: json.data.imapPort || 993,
          imapSecure: json.data.imapSecure !== false
        });
      }
    } catch (err) {
      console.error(err);
      setMessages({ error: "No se pudo cargar configuración de correo" });
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
      const res = await fetch("/api/config/rbac", { headers: adminHeaders });
      const json = await res.json();
      if (res.ok) {
        setPermissions(json.permissions || []);
        setRoles(
          (json.roles || []).map((r: any) => ({
            name: r.name,
            description: r.description || "",
            permissions: r.permissions || []
          }))
        );
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

  useEffect(() => {
    loadAppConfig();
    loadInvoiceConfig();
    loadMailGlobal();
    loadAccounts();
    loadRbac();
    loadAttendance();
    loadLab();
    loadApis();
  }, [loadAppConfig, loadInvoiceConfig, loadMailGlobal, loadAccounts, loadRbac, loadAttendance, loadLab, loadApis]);

  async function handleSaveApp() {
    setLoading("savingApp", true);
    resetMessages();
    try {
      let openingHours: any = null;
      if (appForm.openingHoursText.trim()) {
        openingHours = JSON.parse(appForm.openingHoursText);
      }
      const res = await fetch("/api/config/app", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ...appForm, openingHours })
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
      const payload = { ...globalForm, smtpPort: Number(globalForm.smtpPort), imapPort: Number(globalForm.imapPort) };
      const res = await fetch("/api/config/mail/global", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setMessages({ global: "Correo global guardado" });
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
      const res = await fetch(`/api/config/mail/modules/${accountForm.moduleKey}/test`, {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar la prueba");
      setMessages({ test: "Correo de prueba enviado" });
      await loadAccounts();
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
    setPermissions((prev) => [...prev, { key: "", description: "" }]);
  }

  function addRole() {
    setRoles((prev) => [...prev, { name: "", description: "", permissions: [] }]);
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
      const res = await fetch("/api/config/rbac", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: cleanPermissions, roles: cleanRoles })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar permisos/roles");
      setMessages({ rbac: "Permisos y roles guardados" });
      await loadRbac();
    } catch (err: any) {
      setMessages({ error: err?.message || "Error guardando permisos/roles" });
    } finally {
      setLoading("savingRbac", false);
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

  const rows = moduleOptions.map((opt) => ({
    ...opt,
    account: accounts.find((a) => a.moduleKey === opt.key)
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Configuración central</h1>
        <p className="text-sm text-slate-600">Panel maestro para empresa, facturación, correo, permisos e integraciones.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "empresa", label: "Empresa" },
          { key: "facturacion", label: "Facturación (SAT)" },
          { key: "correo", label: "Correo" },
          { key: "permisos", label: "Permisos / Roles" },
          { key: "integraciones", label: "Integraciones" },
          { key: "apis", label: "APIs" },
          { key: "exportaciones", label: "Exportaciones / respaldo" }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as TabKey)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold border transition",
              tab === item.key
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-white text-slate-700 border-slate-200 hover:border-brand-primary"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {messages.error && <p className="text-sm text-rose-600">{messages.error}</p>}

      {tab === "empresa" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Empresa</CardTitle>
              <p className="text-sm text-slate-500">Datos generales del ERP.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-600">Nombre</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.companyName}
                    onChange={(e) => setAppForm({ ...appForm, companyName: e.target.value })}
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
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.timezone}
                    onChange={(e) => setAppForm({ ...appForm, timezone: e.target.value })}
                    placeholder="America/Guatemala"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <div>
                  <label className="text-xs text-slate-600">Color de marca</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={appForm.brandColor || ""}
                    onChange={(e) => setAppForm({ ...appForm, brandColor: e.target.value })}
                    placeholder="#0F172A"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Se puede usar para theming y PDFs.</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-600">Horario de atención (JSON)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  rows={4}
                  placeholder='{"mon":"08:00-17:00"}'
                  value={appForm.openingHoursText}
                  onChange={(e) => setAppForm({ ...appForm, openingHoursText: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Logo</label>
                <UploadField
                  value={appForm.logoUrl || ""}
                  onChange={(url) => setAppForm({ ...appForm, logoUrl: url || "" })}
                  accept="image/*"
                  helperText="PNG/JPG recomendado, fondo transparente. Máx 20MB."
                  onUploadError={(message) => setMessages({ error: message || "Error al subir la imagen" })}
                  onUploadSuccess={() => setMessages({ app: "Logo cargado" })}
                />
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
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Estos datos se usan en reportes, correo y UI. Solo el rol Administrador puede editarlos.</p>
              <p>Añade horario y color para un look consistente en PDFs y facturas.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "facturacion" && (
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
      )}

      {tab === "correo" && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Correo global (SMTP/IMAP)</CardTitle>
                <p className="text-sm text-slate-500">Usado por todas las cuentas de módulo.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">Provider</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.provider || ""}
                      onChange={(e) => setGlobalForm({ ...globalForm, provider: e.target.value })}
                    >
                      <option value="">Custom</option>
                      <option value="dreamhost">DreamHost</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-end gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>Sugerido DreamHost:</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">smtp.dreamhost.com · 465</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">imap.dreamhost.com · 993</span>
                    </div>
                  </div>
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
                    <label className="text-xs text-slate-600">SMTP puerto</label>
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
                    <span className="text-sm text-slate-700">SMTP SSL/TLS (secure)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-slate-600">IMAP host</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.imapHost}
                      onChange={(e) => setGlobalForm({ ...globalForm, imapHost: e.target.value })}
                      placeholder="imap.dreamhost.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">IMAP puerto</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={globalForm.imapPort}
                      onChange={(e) => setGlobalForm({ ...globalForm, imapPort: Number(e.target.value) })}
                      placeholder="993"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={globalForm.imapSecure}
                      onChange={(e) => setGlobalForm({ ...globalForm, imapSecure: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700">IMAP SSL/TLS (secure)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveGlobal}
                    disabled={loadingStates.savingGlobal || loadingStates.mailGlobal}
                    className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
                  >
                    {loadingStates.savingGlobal ? "Guardando..." : "Guardar correo global"}
                  </button>
                  {messages.global && <span className="text-xs text-green-700">{messages.global}</span>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>Configura SMTP/IMAP una sola vez. Cada módulo usa estas credenciales de servidor.</p>
                <p>Las contraseñas por módulo están cifradas con AES-256-GCM.</p>
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
        </>
      )}

      {tab === "permisos" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Roles y permisos</CardTitle>
              <p className="text-sm text-slate-500">Administra RBAC para todo el ERP.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Permisos</p>
                <button onClick={addPermission} className="text-xs text-brand-primary underline" type="button">
                  + Agregar permiso
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {permissions.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-mono"
                      value={p.key}
                      onChange={(e) => {
                        const next = [...permissions];
                        next[idx] = { ...next[idx], key: e.target.value };
                        setPermissions(next);
                      }}
                      placeholder="INVENTARIO_VER"
                    />
                    <textarea
                      className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      rows={2}
                      value={p.description || ""}
                      onChange={(e) => {
                        const next = [...permissions];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setPermissions(next);
                      }}
                      placeholder="Descripción"
                    />
                  </div>
                ))}
                {permissions.length === 0 && (
                  <p className="text-sm text-slate-500">Agrega permisos para comenzar.</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Roles</p>
                <button onClick={addRole} className="text-xs text-brand-primary underline" type="button">
                  + Agregar rol
                </button>
              </div>
              <div className="space-y-3">
                {roles.map((role, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        value={role.name}
                        onChange={(e) => {
                          const next = [...roles];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setRoles(next);
                        }}
                        placeholder="Administrador"
                      />
                      <input
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        value={role.description || ""}
                        onChange={(e) => {
                          const next = [...roles];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setRoles(next);
                        }}
                        placeholder="Puede todo"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((p) => (
                        <label
                          key={p.key}
                          className={cn(
                            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                            role.permissions.includes(p.key)
                              ? "border-brand-primary text-brand-primary bg-brand-primary/10"
                              : "border-slate-200 text-slate-600"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={role.permissions.includes(p.key)}
                            onChange={() => toggleRolePermission(idx, p.key)}
                          />
                          {p.key}
                        </label>
                      ))}
                      {permissions.length === 0 && <span className="text-xs text-slate-500">Agrega permisos primero.</span>}
                    </div>
                  </div>
                ))}
                {roles.length === 0 && <p className="text-sm text-slate-500">Agrega roles para comenzar.</p>}
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
          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Este RBAC controla todas las rutas de admin. Ajusta permisos según tus módulos.</p>
              <p>Los cambios se guardan en Prisma (Role, Permission, RolePermission).</p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "integraciones" && (
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
      )}

      {tab === "apis" && (
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
      )}

      {tab === "exportaciones" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Respaldos y exportaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Próximamente: exportación de catálogos, usuarios, auditorías y configuración.</p>
              <p>
                Mantén respaldos seguros fuera de la base de datos productiva. Este módulo central será el lugar
                para programar exportaciones automáticas.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Define políticas de retención y descarga de PDFs o Excel para reportes clave.</p>
              <p>Se integrará con el scheduler existente de inventario y futuros módulos.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
