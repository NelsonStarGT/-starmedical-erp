"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const adminHeaders = { "x-role": "Administrador" };

type TenantMailMode = "inherit" | "override";

type EmailSandboxSettings = {
  enabled: boolean;
  modeDefault: TenantMailMode;
  tenantModes: Record<string, TenantMailMode>;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
};

type InboxItem = {
  id: string;
  subject: string;
  createdAt: string | null;
  from: string;
  to: string[];
  snippet: string;
  env: string | null;
  module: string | null;
  hasAttachments: boolean;
};

type InboxDetail = {
  id: string;
  subject: string;
  date: string | null;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  text: string | null;
  html: string | null;
  env: string | null;
  module: string | null;
  headers: Record<string, string[]>;
  attachmentsBlocked: boolean;
  attachmentsNotice: string;
};

const DEFAULT_SETTINGS: EmailSandboxSettings = {
  enabled: false,
  modeDefault: "inherit",
  tenantModes: {},
  mailpitHost: "127.0.0.1",
  mailpitSmtpPort: 1025,
  mailpitApiPort: 8025,
  aliasDomain: "sandbox.starmedical.test",
  retentionDays: 3,
  blockPhi: true
};

function safeJsonParse(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeSettings(payload: any): EmailSandboxSettings {
  const data = payload?.data || payload || {};
  const tenantModes = data.tenantModes && typeof data.tenantModes === "object" ? data.tenantModes : {};
  return {
    enabled: data.enabled === true,
    modeDefault: data.modeDefault === "override" ? "override" : "inherit",
    tenantModes: Object.fromEntries(
      Object.entries(tenantModes)
        .map(([key, value]) => [String(key), value === "override" ? "override" : "inherit"])
        .filter(([key]) => key.trim().length > 0)
    ) as Record<string, TenantMailMode>,
    mailpitHost: String(data.mailpitHost || DEFAULT_SETTINGS.mailpitHost),
    mailpitSmtpPort: Number(data.mailpitSmtpPort || DEFAULT_SETTINGS.mailpitSmtpPort),
    mailpitApiPort: Number(data.mailpitApiPort || DEFAULT_SETTINGS.mailpitApiPort),
    aliasDomain: String(data.aliasDomain || DEFAULT_SETTINGS.aliasDomain),
    retentionDays: Number(data.retentionDays ?? DEFAULT_SETTINGS.retentionDays),
    blockPhi: data.blockPhi !== false
  };
}

export default function CentralEmailSandboxPanel() {
  const [settings, setSettings] = useState<EmailSandboxSettings>(DEFAULT_SETTINGS);
  const [tenantModesJson, setTenantModesJson] = useState("{}");
  const [tenantId, setTenantId] = useState("global");
  const [testEmail, setTestEmail] = useState("");
  const [testType, setTestType] = useState("test");
  const [testModuleKey, setTestModuleKey] = useState("ADMIN");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string | undefined>>({});
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<InboxDetail | null>(null);

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({
      ...prev,
      [key]: value
    }));

  const resetMessages = () => setMessages({});

  const tenantModesPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(tenantModesJson || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed as Record<string, string>;
    } catch {
      return null;
    }
  }, [tenantModesJson]);

  const loadSettings = useCallback(async () => {
    setBusy("settings", true);
    resetMessages();
    try {
      const res = await configApiFetch("/api/admin/config/email/sandbox/settings", {
        headers: adminHeaders,
        cache: "no-store"
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo cargar sandbox");
      const normalized = normalizeSettings(json);
      setSettings(normalized);
      setTenantModesJson(JSON.stringify(normalized.tenantModes, null, 2));
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo cargar sandbox" });
    } finally {
      setBusy("settings", false);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    if (!inboxOpen) return;
    setBusy("inbox", true);
    resetMessages();
    try {
      const query = new URLSearchParams({
        tenantId: tenantId.trim() || "global",
        limit: "50",
        start: "0"
      });
      const res = await configApiFetch(`/api/admin/config/email/sandbox/inbox?${query.toString()}`, {
        headers: adminHeaders,
        cache: "no-store"
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo cargar inbox");
      const items = Array.isArray(json.data?.items) ? json.data.items : [];
      setInboxItems(
        items.map((item: any) => ({
          id: String(item.id || ""),
          subject: String(item.subject || "(sin asunto)"),
          createdAt: item.createdAt ? String(item.createdAt) : null,
          from: String(item.from || ""),
          to: Array.isArray(item.to) ? item.to.map((x: any) => String(x)) : [],
          snippet: String(item.snippet || ""),
          env: item.env ? String(item.env) : null,
          module: item.module ? String(item.module) : null,
          hasAttachments: item.hasAttachments === true
        }))
      );
      if (selectedMessageId && !items.some((item: any) => item.id === selectedMessageId)) {
        setSelectedMessageId("");
        setSelectedMessage(null);
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo cargar inbox" });
      setInboxItems([]);
      setSelectedMessageId("");
      setSelectedMessage(null);
    } finally {
      setBusy("inbox", false);
    }
  }, [inboxOpen, selectedMessageId, tenantId]);

  const loadMessageDetail = useCallback(
    async (id: string) => {
      if (!id) return;
      setBusy("detail", true);
      resetMessages();
      try {
        const query = new URLSearchParams({ tenantId: tenantId.trim() || "global" });
        const res = await configApiFetch(`/api/admin/config/email/sandbox/inbox/${encodeURIComponent(id)}?${query.toString()}`, {
          headers: adminHeaders,
          cache: "no-store"
        });
        const text = await res.text();
        const json = safeJsonParse(text);
        if (!json) throw new Error("Respuesta inválida del servidor");
        if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo cargar detalle");
        const data = json.data || {};
        setSelectedMessage({
          id: String(data.id || id),
          subject: String(data.subject || "(sin asunto)"),
          date: data.date ? String(data.date) : null,
          from: String(data.from || ""),
          to: Array.isArray(data.to) ? data.to.map((item: any) => String(item)) : [],
          cc: Array.isArray(data.cc) ? data.cc.map((item: any) => String(item)) : [],
          bcc: Array.isArray(data.bcc) ? data.bcc.map((item: any) => String(item)) : [],
          text: data.text ? String(data.text) : null,
          html: data.html ? String(data.html) : null,
          env: data.env ? String(data.env) : null,
          module: data.module ? String(data.module) : null,
          headers: data.headers && typeof data.headers === "object" ? data.headers : {},
          attachmentsBlocked: data.attachmentsBlocked !== false,
          attachmentsNotice: String(data.attachmentsNotice || "bloqueado por seguridad")
        });
        setSelectedMessageId(id);
      } catch (err: any) {
        setMessages({ error: err?.message || "No se pudo cargar detalle" });
      } finally {
        setBusy("detail", false);
      }
    },
    [tenantId]
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  async function handleSaveSettings() {
    setBusy("saving", true);
    resetMessages();
    try {
      const parsedTenantModes = JSON.parse(tenantModesJson || "{}");
      if (!parsedTenantModes || typeof parsedTenantModes !== "object" || Array.isArray(parsedTenantModes)) {
        throw new Error("tenantModes debe ser un objeto JSON");
      }

      const payload = {
        enabled: settings.enabled,
        modeDefault: settings.modeDefault,
        tenantModes: parsedTenantModes,
        mailpitHost: settings.mailpitHost.trim(),
        mailpitSmtpPort: Number(settings.mailpitSmtpPort),
        mailpitApiPort: Number(settings.mailpitApiPort),
        aliasDomain: settings.aliasDomain.trim().toLowerCase(),
        retentionDays: Number(settings.retentionDays),
        blockPhi: settings.blockPhi
      };

      const res = await configApiFetch("/api/admin/config/email/sandbox/settings", {
        method: "PUT",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo guardar sandbox");
      const normalized = normalizeSettings(json);
      setSettings(normalized);
      setTenantModesJson(JSON.stringify(normalized.tenantModes, null, 2));
      setMessages({ sandbox: "Sandbox Mailpit guardado" });
      if (inboxOpen) {
        await loadInbox();
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo guardar sandbox" });
    } finally {
      setBusy("saving", false);
    }
  }

  async function handleSendTenantTest() {
    setBusy("testing", true);
    resetMessages();
    try {
      const toEmail = testEmail.trim();
      if (!toEmail) throw new Error("Correo de prueba requerido");
      const payload = {
        toEmail,
        tenantId: tenantId.trim() || "global",
        emailType: testType.trim() || "test",
        moduleKey: testModuleKey.trim().toUpperCase() || "ADMIN"
      };
      const res = await configApiFetch("/api/admin/config/email/test", {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      const json = safeJsonParse(text);
      if (!json) throw new Error("Respuesta inválida del servidor");
      if (!res.ok || json.ok === false) throw new Error(json.error || "No se pudo enviar correo de prueba");
      setMessages({ test: "Prueba por tenant enviada" });
      if (inboxOpen) {
        await loadInbox();
      }
    } catch (err: any) {
      setMessages({ error: err?.message || "No se pudo enviar prueba por tenant" });
    } finally {
      setBusy("testing", false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Sandbox Email (Mailpit)</CardTitle>
          <p className="text-sm text-slate-500">Aisla correos por tenant usando alias y headers (X-Tenant-Id, X-Env, X-Module).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Habilitar sandbox Mailpit
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.blockPhi}
                onChange={(e) => setSettings((prev) => ({ ...prev, blockPhi: e.target.checked }))}
              />
              Bloquear PHI en sandbox
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600">Mailpit host</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.mailpitHost}
                onChange={(e) => setSettings((prev) => ({ ...prev, mailpitHost: e.target.value }))}
                placeholder="127.0.0.1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">SMTP port</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.mailpitSmtpPort}
                onChange={(e) => setSettings((prev) => ({ ...prev, mailpitSmtpPort: Number(e.target.value) }))}
                placeholder="1025"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">API port</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.mailpitApiPort}
                onChange={(e) => setSettings((prev) => ({ ...prev, mailpitApiPort: Number(e.target.value) }))}
                placeholder="8025"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600">Modo default por tenant</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.modeDefault}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    modeDefault: e.target.value === "override" ? "override" : "inherit"
                  }))
                }
              >
                <option value="inherit">inherit</option>
                <option value="override">override</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Alias domain</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.aliasDomain}
                onChange={(e) => setSettings((prev) => ({ ...prev, aliasDomain: e.target.value }))}
                placeholder="sandbox.starmedical.test"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Retención (días)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={settings.retentionDays}
                onChange={(e) => setSettings((prev) => ({ ...prev, retentionDays: Number(e.target.value) }))}
                placeholder="3"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">tenantModes (JSON)</label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
              value={tenantModesJson}
              onChange={(e) => setTenantModesJson(e.target.value)}
              placeholder='{"tenant-a":"override","tenant-b":"inherit"}'
            />
            <p className="text-[11px] text-slate-500">Formato: {'{"tenantId":"override|inherit"}'}</p>
            {tenantModesPreview === null && (
              <p className="text-[11px] text-rose-600">JSON inválido</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold text-slate-800">Prueba por tenant</p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="tenantId"
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                placeholder="tipo (otp, alert, test)"
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={testModuleKey}
                onChange={(e) => setTestModuleKey(e.target.value)}
                placeholder="moduleKey"
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="destino@correo.com"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendTenantTest}
                disabled={loading.testing}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
              >
                {loading.testing ? "Enviando..." : "Enviar prueba por tenant"}
              </button>
              {messages.test && <span className="text-xs text-green-700">{messages.test}</span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={loading.saving || loading.settings}
              className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
            >
              {loading.saving ? "Guardando..." : "Guardar sandbox"}
            </button>
            <button
              type="button"
              onClick={() => setInboxOpen((prev) => !prev)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {inboxOpen ? "Cerrar Inbox" : "Abrir Inbox"}
            </button>
            {inboxOpen && (
              <button
                type="button"
                onClick={loadInbox}
                disabled={loading.inbox}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading.inbox ? "Actualizando..." : "Actualizar Inbox"}
              </button>
            )}
            {messages.sandbox && <span className="text-xs text-green-700">{messages.sandbox}</span>}
            {messages.error && <span className="text-xs text-rose-700">{messages.error}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas Sandbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>El inbox se consulta vía API server-side y filtra por tenant.</p>
          <p>No se exponen adjuntos: siempre se marcan como bloqueados por seguridad.</p>
          <p>Si Mailpit no está disponible, los endpoints responden 503 con contrato estándar.</p>
        </CardContent>
      </Card>

      {inboxOpen && (
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Inbox Sandbox</CardTitle>
            <p className="text-sm text-slate-500">Tenant activo: {tenantId || "global"}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Asunto</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Módulo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {inboxItems.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => loadMessageDetail(item.id)}
                      >
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-800">{item.subject}</p>
                          <p className="text-[11px] text-slate-500">{item.snippet || "Sin snippet"}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{item.module || "core"}</td>
                      </tr>
                    ))}
                    {inboxItems.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-xs text-slate-500" colSpan={3}>
                          {loading.inbox ? "Cargando mensajes..." : "Sin mensajes para este tenant."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                {!selectedMessage && <p className="text-sm text-slate-500">Selecciona un mensaje para ver detalle.</p>}
                {selectedMessage && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500">Asunto</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedMessage.subject}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Desde</p>
                        <p className="text-sm text-slate-700">{selectedMessage.from || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Fecha</p>
                        <p className="text-sm text-slate-700">
                          {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Para</p>
                      <p className="text-sm text-slate-700">{selectedMessage.to.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Texto</p>
                      <pre className="max-h-44 overflow-auto rounded-lg bg-white p-2 text-xs text-slate-700">
                        {selectedMessage.text || "(sin texto)"}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Adjuntos</p>
                      <p className="text-sm text-amber-700">
                        {selectedMessage.attachmentsBlocked ? selectedMessage.attachmentsNotice : "permitido"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
