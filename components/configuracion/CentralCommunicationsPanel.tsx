"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type DeliverabilityStatus = {
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  updatedAt: string | null;
};

type GlobalEmailConfig = {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
  deliverability: DeliverabilityStatus;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  code?: string;
  error?: string;
  issues?: Array<{ path?: string; message?: string }>;
  conflict?: Record<string, unknown>;
  data?: T;
};

type EmailForm = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  fromName: string;
  fromEmail: string;
  includePassword: boolean;
  smtpPassword: string;
  deliverability: DeliverabilityStatus;
};

const defaultDeliverability: DeliverabilityStatus = {
  spf: false,
  dkim: false,
  dmarc: false,
  updatedAt: null
};

const defaultForm: EmailForm = {
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  fromName: "",
  fromEmail: "",
  includePassword: false,
  smtpPassword: "",
  deliverability: defaultDeliverability
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

  const conflict = payload.conflict && typeof payload.conflict === "object"
    ? Object.entries(payload.conflict)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(" ")
    : "";

  const detail = [issues, conflict].filter(Boolean).join(" · ");
  const base = payload.error || fallback;
  return `${code}${base}${detail ? ` (${detail})` : ""}`;
}

function normalizeDeliverability(value: unknown): DeliverabilityStatus {
  const row = (value && typeof value === "object" ? value : {}) as Partial<DeliverabilityStatus>;
  return {
    spf: row.spf === true,
    dkim: row.dkim === true,
    dmarc: row.dmarc === true,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null
  };
}

export default function CentralCommunicationsPanel() {
  const { toasts, dismiss, showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [form, setForm] = useState<EmailForm>(defaultForm);
  const [testEmail, setTestEmail] = useState("");

  const deliverabilitySummary = useMemo(() => {
    const enabled = [form.deliverability.spf, form.deliverability.dkim, form.deliverability.dmarc].filter(Boolean).length;
    if (enabled === 3) return "SPF/DKIM/DMARC completos";
    if (enabled === 0) return "Checklist sin completar";
    return `${enabled}/3 checklist completado`;
  }, [form.deliverability]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/config/email/global", { cache: "no-store" });
      const payload = await parseEnvelope<GlobalEmailConfig | null>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo cargar configuracion SMTP."));
      }

      if (!payload.data) {
        setForm(defaultForm);
        setHasPassword(false);
        return;
      }

      const row = payload.data;
      setHasPassword(Boolean(row.hasPassword));
      setForm({
        smtpHost: row.smtpHost,
        smtpPort: row.smtpPort,
        smtpSecure: row.smtpSecure,
        smtpUser: row.smtpUser,
        fromName: row.fromName,
        fromEmail: row.fromEmail,
        includePassword: false,
        smtpPassword: "",
        deliverability: normalizeDeliverability(row.deliverability)
      });
      setTestEmail((current) => current || row.fromEmail || "");
    } catch (error) {
      showToast({
        tone: "error",
        title: "Error cargando comunicaciones",
        message: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig() {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/config/email/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost: form.smtpHost.trim(),
          smtpPort: Number(form.smtpPort),
          smtpSecure: form.smtpSecure,
          smtpUser: form.smtpUser.trim(),
          fromName: form.fromName.trim(),
          fromEmail: form.fromEmail.trim(),
          includePassword: form.includePassword,
          smtpPassword: form.includePassword ? form.smtpPassword : "",
          deliverability: {
            spf: form.deliverability.spf,
            dkim: form.deliverability.dkim,
            dmarc: form.deliverability.dmarc
          }
        })
      });
      const payload = await parseEnvelope<GlobalEmailConfig>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar configuracion SMTP."));
      }

      setHasPassword(Boolean(payload.data.hasPassword));
      setForm((previous) => ({
        ...previous,
        includePassword: false,
        smtpPassword: "",
        deliverability: normalizeDeliverability(payload.data?.deliverability)
      }));
      showToast({ tone: "success", title: "Comunicaciones actualizadas" });
      await load();
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando SMTP", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    try {
      setSendingTest(true);
      const response = await fetch("/api/admin/config/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: testEmail.trim(), emailType: "config_test" })
      });
      const payload = await parseEnvelope<{ sent: boolean }>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo enviar correo de prueba."));
      }

      showToast({ tone: "success", title: "Correo de prueba enviado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error enviando prueba", message: (error as Error).message });
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Comunicaciones SMTP</CardTitle>
          <p className="text-sm text-slate-600">
            Configuracion global de salida de correo. Secretos protegidos: solo rotacion con campo password enmascarado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600">SMTP host</label>
              <input
                value={form.smtpHost}
                onChange={(event) => setForm((prev) => ({ ...prev, smtpHost: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="smtp.tudominio.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">SMTP puerto</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={form.smtpPort}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    smtpPort: Number(event.target.value) || 587
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <label className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(event) => setForm((prev) => ({ ...prev, smtpSecure: event.target.checked }))}
              />
              TLS/SSL habilitado
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">SMTP usuario</label>
              <input
                value={form.smtpUser}
                onChange={(event) => setForm((prev) => ({ ...prev, smtpUser: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="smtp@tudominio.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">From email</label>
              <input
                value={form.fromEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, fromEmail: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="noreply@tudominio.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">From name</label>
              <input
                value={form.fromName}
                onChange={(event) => setForm((prev) => ({ ...prev, fromName: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="StarMedical ERP"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Password SMTP</p>
              <p>Estado actual: {hasPassword ? "configurada" : "pendiente"}</p>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.includePassword}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      includePassword: event.target.checked,
                      smtpPassword: event.target.checked ? prev.smtpPassword : ""
                    }))
                  }
                />
                Rotar password ahora
              </label>
              {form.includePassword ? (
                <input
                  type="password"
                  value={form.smtpPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, smtpPassword: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  placeholder="********"
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[#4aadf5]/40 bg-[#eff8ff] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2e75ba]">Entregabilidad (SPF / DKIM / DMARC)</p>
            <p className="mt-1 text-xs text-slate-600">
              Checklist operativo guardado para este tenant. No modifica DNS, solo documenta estado.
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.deliverability.spf}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      deliverability: { ...prev.deliverability, spf: event.target.checked }
                    }))
                  }
                />
                SPF configurado
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.deliverability.dkim}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      deliverability: { ...prev.deliverability, dkim: event.target.checked }
                    }))
                  }
                />
                DKIM configurado
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.deliverability.dmarc}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      deliverability: { ...prev.deliverability, dmarc: event.target.checked }
                    }))
                  }
                />
                DMARC configurado
              </label>
            </div>
            <p className="mt-2 text-xs text-[#2e75ba]">
              {deliverabilitySummary}
              {form.deliverability.updatedAt ? ` · actualizado ${new Date(form.deliverability.updatedAt).toLocaleString()}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={loading || saving}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar comunicaciones"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {loading ? "Recargando..." : "Recargar"}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Enviar correo de prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="destino@dominio.com"
            />
            <button
              type="button"
              onClick={() => void sendTestEmail()}
              disabled={sendingTest || !testEmail.trim()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sendingTest ? "Enviando..." : "Enviar prueba"}
            </button>
          </div>
          <p className="text-xs text-slate-600">
            El endpoint usa la configuracion SMTP guardada y registra auditoria `EMAIL_TEST_SENT`.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
