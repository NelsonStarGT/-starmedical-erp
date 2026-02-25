"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcessingServiceAuthMode } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type ProcessingServiceConfig = {
  tenantId: string;
  baseUrl: string;
  authMode: ProcessingServiceAuthMode;
  tokenRef: string | null;
  hmacSecretRef: string | null;
  hasTokenRef?: boolean;
  hasHmacSecretRef?: boolean;
  enablePdf: boolean;
  enableExcel: boolean;
  enableDocx: boolean;
  enableImages: boolean;
  timeoutMs: number;
  retryCount: number;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type EmailSandboxSettings = {
  enabled: boolean;
  modeDefault: "inherit" | "override";
  tenantModes: Record<string, "inherit" | "override">;
  mailpitHost: string;
  mailpitSmtpPort: number;
  mailpitApiPort: number;
  aliasDomain: string;
  retentionDays: number;
  blockPhi: boolean;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

const emptyProcessing: ProcessingServiceConfig = {
  tenantId: "global",
  baseUrl: "http://127.0.0.1:4300",
  authMode: ProcessingServiceAuthMode.TOKEN_HMAC,
  tokenRef: null,
  hmacSecretRef: null,
  hasTokenRef: false,
  hasHmacSecretRef: false,
  enablePdf: true,
  enableExcel: true,
  enableDocx: true,
  enableImages: true,
  timeoutMs: 12000,
  retryCount: 2,
  updatedAt: null,
  source: "defaults"
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
}

function describeError<T>(payload: ApiEnvelope<T> | null, fallback: string) {
  if (!payload) return fallback;
  const issues = Array.isArray(payload.issues)
    ? payload.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" · ")
    : "";
  const message = payload.error || fallback;
  return issues ? `${message} (${issues})` : message;
}

export default function ServicesProcessingPanel() {
  const { toasts, dismiss, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const [processing, setProcessing] = useState<ProcessingServiceConfig>(emptyProcessing);
  const [tokenRefInput, setTokenRefInput] = useState("");
  const [hmacRefInput, setHmacRefInput] = useState("");
  const [clearTokenRef, setClearTokenRef] = useState(false);
  const [clearHmacRef, setClearHmacRef] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const [sandbox, setSandbox] = useState<EmailSandboxSettings | null>(null);

  const updatedAt = useMemo(() => {
    if (!processing.updatedAt) return "Sin cambios";
    return new Date(processing.updatedAt).toLocaleString();
  }, [processing.updatedAt]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [processingRes, sandboxRes] = await Promise.all([
        fetch("/api/admin/config/services/processing", { cache: "no-store" }),
        fetch("/api/admin/config/email/sandbox/settings", { cache: "no-store" })
      ]);

      const [processingJson, sandboxJson] = await Promise.all([
        parseEnvelope<ProcessingServiceConfig>(processingRes),
        parseEnvelope<EmailSandboxSettings>(sandboxRes)
      ]);

      if (!processingRes.ok || processingJson.ok === false || !processingJson.data) {
        throw new Error(describeError(processingJson, "No se pudo cargar processing-service."));
      }

      setProcessing(processingJson.data);
      setTokenRefInput("");
      setHmacRefInput("");
      setClearTokenRef(false);
      setClearHmacRef(false);
      setHealthStatus(null);

      if (sandboxRes.ok && sandboxJson.ok !== false && sandboxJson.data) {
        setSandbox(sandboxJson.data);
      } else {
        setSandbox(null);
      }
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando servicios", message: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    try {
      setSaving(true);
      const patch: Record<string, unknown> = {
        baseUrl: processing.baseUrl.trim(),
        authMode: processing.authMode,
        enablePdf: processing.enablePdf,
        enableExcel: processing.enableExcel,
        enableDocx: processing.enableDocx,
        enableImages: processing.enableImages,
        timeoutMs: Number(processing.timeoutMs),
        retryCount: Number(processing.retryCount)
      };

      if (clearTokenRef) {
        patch.tokenRef = null;
      } else if (tokenRefInput.trim().length > 0) {
        patch.tokenRef = tokenRefInput.trim();
      }

      if (clearHmacRef) {
        patch.hmacSecretRef = null;
      } else if (hmacRefInput.trim().length > 0) {
        patch.hmacSecretRef = hmacRefInput.trim();
      }

      const response = await fetch("/api/admin/config/services/processing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await parseEnvelope<ProcessingServiceConfig>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar processing-service."));
      }

      setProcessing(payload.data);
      setTokenRefInput("");
      setHmacRefInput("");
      setClearTokenRef(false);
      setClearHmacRef(false);
      showToast({ tone: "success", title: "Processing-service actualizado" });
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando", message: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function healthCheck() {
    try {
      setChecking(true);
      const response = await fetch("/api/admin/config/services/processing/health", {
        method: "POST"
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        setHealthStatus(`DOWN · ${(payload.error as string) || "sin respuesta"}`);
        return;
      }
      const elapsed = typeof payload.elapsedMs === "number" ? payload.elapsedMs : 0;
      const correlationId = typeof payload.correlationId === "string" ? payload.correlationId : "n/a";
      setHealthStatus(`UP · ${elapsed}ms · corrId ${correlationId}`);
    } catch (error) {
      setHealthStatus(`DOWN · ${(error as Error).message}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Processing Service</CardTitle>
          <p className="text-sm text-slate-600">
            Configuración por tenant para PDF/imágenes/Excel/DOCX con autenticación por token/HMAC y health check.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-slate-600">Base URL</label>
              <input
                value={processing.baseUrl}
                onChange={(event) => setProcessing((prev) => ({ ...prev, baseUrl: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://processing.internal"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Modo de autenticación</label>
              <select
                value={processing.authMode}
                onChange={(event) =>
                  setProcessing((prev) => ({
                    ...prev,
                    authMode: event.target.value as ProcessingServiceAuthMode
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value={ProcessingServiceAuthMode.TOKEN_HMAC}>Token + HMAC</option>
                <option value={ProcessingServiceAuthMode.TOKEN}>Solo Token</option>
                <option value={ProcessingServiceAuthMode.HMAC}>Solo HMAC</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Token ref (enmascarado)</p>
              <p className="mt-1 font-mono text-xs text-slate-700">{processing.tokenRef || "No definido"}</p>
              <input
                value={tokenRefInput}
                onChange={(event) => setTokenRefInput(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                placeholder="env:PROCESSING_SERVICE_TOKEN"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={clearTokenRef} onChange={(event) => setClearTokenRef(event.target.checked)} />
                Limpiar tokenRef
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">HMAC ref (enmascarado)</p>
              <p className="mt-1 font-mono text-xs text-slate-700">{processing.hmacSecretRef || "No definido"}</p>
              <input
                value={hmacRefInput}
                onChange={(event) => setHmacRefInput(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                placeholder="env:PROCESSING_HMAC_SECRET"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={clearHmacRef} onChange={(event) => setClearHmacRef(event.target.checked)} />
                Limpiar hmacSecretRef
              </label>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={processing.enablePdf}
                onChange={(event) => setProcessing((prev) => ({ ...prev, enablePdf: event.target.checked }))}
              />
              PDF
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={processing.enableExcel}
                onChange={(event) => setProcessing((prev) => ({ ...prev, enableExcel: event.target.checked }))}
              />
              Excel
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={processing.enableDocx}
                onChange={(event) => setProcessing((prev) => ({ ...prev, enableDocx: event.target.checked }))}
              />
              DOCX
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={processing.enableImages}
                onChange={(event) => setProcessing((prev) => ({ ...prev, enableImages: event.target.checked }))}
              />
              Imágenes
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600">Timeout (ms)</label>
              <input
                type="number"
                min={1000}
                max={120000}
                value={processing.timeoutMs}
                onChange={(event) =>
                  setProcessing((prev) => ({
                    ...prev,
                    timeoutMs: Number(event.target.value) || 12000
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Reintentos</label>
              <input
                type="number"
                min={0}
                max={5}
                value={processing.retryCount}
                onChange={(event) =>
                  setProcessing((prev) => ({
                    ...prev,
                    retryCount: Number(event.target.value) || 0
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Última actualización</p>
              <p>{updatedAt}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || loading}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
            <button
              type="button"
              onClick={() => void healthCheck()}
              disabled={checking || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {checking ? "Verificando..." : "Health check"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {loading ? "Actualizando..." : "Recargar"}
            </button>
            <span className="text-xs text-slate-500">{healthStatus || "Sin ejecutar health check"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Mailpit / Email sandbox</CardTitle>
          <p className="text-sm text-slate-600">
            Sección preparada para multi-tenant: dominios alias por tenant y aislamiento de pruebas de correo en ambiente de desarrollo.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sandbox ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-700">Sandbox</p>
                  <p className="text-slate-600">{sandbox.enabled ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-700">Modo default</p>
                  <p className="text-slate-600">{sandbox.modeDefault}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-slate-700">Alias domain</p>
                  <p className="text-slate-600">{sandbox.aliasDomain}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Hosts: SMTP {sandbox.mailpitHost}:{sandbox.mailpitSmtpPort} · API {sandbox.mailpitHost}:{sandbox.mailpitApiPort}. Tenant overrides:
                {" "}
                {Object.keys(sandbox.tenantModes || {}).length}.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-600">No se pudo cargar configuración de sandbox en este entorno.</p>
          )}
          <div className="rounded-lg border border-[#4aadf5]/40 bg-[#4aadf5]/10 p-3 text-xs text-[#2e75ba]">
            Usa refs de secretos (`env:...`) para credenciales y evita exponer tokens reales en la UI. Esta vista solo muestra referencias enmascaradas.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
