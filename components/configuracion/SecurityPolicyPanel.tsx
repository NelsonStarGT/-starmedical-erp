"use client";

import { configApiFetch } from "@/lib/config-central/clientAuth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ToastContainer } from "@/components/ui/Toast";
import { useConfigToast } from "@/hooks/useConfigToast";

type SecurityPolicySnapshot = {
  tenantId: string;
  sessionTimeoutMinutes: number;
  enforce2FA: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  ipAllowlist: string[];
  allowRememberMe: boolean;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  updatedAt: string | null;
  source: "db" | "defaults";
};

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  actorRole: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  before: unknown;
  after: unknown;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  data?: T;
};

const defaultPolicy: SecurityPolicySnapshot = {
  tenantId: "global",
  sessionTimeoutMinutes: 480,
  enforce2FA: false,
  passwordMinLength: 10,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
  ipAllowlist: [],
  allowRememberMe: true,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
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

function stringifyIpAllowlist(value: string[]) {
  return value.join("\n");
}

function parseIpAllowlistInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\n|,/g)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export default function SecurityPolicyPanel() {
  const { toasts, dismiss, showToast } = useConfigToast();
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policy, setPolicy] = useState<SecurityPolicySnapshot>(defaultPolicy);
  const [ipAllowlistInput, setIpAllowlistInput] = useState("");

  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditAction, setAuditAction] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const lastUpdated = useMemo(() => {
    if (!policy.updatedAt) return "Sin cambios";
    return new Date(policy.updatedAt).toLocaleString();
  }, [policy.updatedAt]);

  const loadPolicy = useCallback(async () => {
    setLoadingPolicy(true);
    try {
      const response = await configApiFetch("/api/admin/config/security/policy", { cache: "no-store" });
      const payload = await parseEnvelope<SecurityPolicySnapshot>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo cargar política de seguridad."));
      }

      setPolicy(payload.data);
      setIpAllowlistInput(stringifyIpAllowlist(payload.data.ipAllowlist || []));
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando seguridad", message: (error as Error).message });
    } finally {
      setLoadingPolicy(false);
    }
  }, [showToast]);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const search = new URLSearchParams();
      if (auditAction.trim()) search.set("action", auditAction.trim());
      if (auditActor.trim()) search.set("actorUserId", auditActor.trim());
      if (auditFrom) search.set("dateFrom", auditFrom);
      if (auditTo) search.set("dateTo", auditTo);
      search.set("take", "150");

      const response = await configApiFetch(`/api/admin/config/security/audit?${search.toString()}`, { cache: "no-store" });
      const payload = await parseEnvelope<AuditRow[]>(response);
      if (!response.ok || payload.ok === false) {
        throw new Error(describeError(payload, "No se pudo cargar auditoría."));
      }

      setAuditRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      showToast({ tone: "error", title: "Error cargando auditoría", message: (error as Error).message });
    } finally {
      setLoadingAudit(false);
    }
  }, [auditAction, auditActor, auditFrom, auditTo, showToast]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  async function savePolicy() {
    try {
      setSavingPolicy(true);
      const response = await configApiFetch("/api/admin/config/security/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionTimeoutMinutes: Number(policy.sessionTimeoutMinutes),
          enforce2FA: policy.enforce2FA,
          passwordMinLength: Number(policy.passwordMinLength),
          passwordRequireUppercase: policy.passwordRequireUppercase,
          passwordRequireLowercase: policy.passwordRequireLowercase,
          passwordRequireNumber: policy.passwordRequireNumber,
          passwordRequireSymbol: policy.passwordRequireSymbol,
          ipAllowlist: parseIpAllowlistInput(ipAllowlistInput),
          allowRememberMe: policy.allowRememberMe,
          maxLoginAttempts: Number(policy.maxLoginAttempts),
          lockoutMinutes: Number(policy.lockoutMinutes)
        })
      });
      const payload = await parseEnvelope<SecurityPolicySnapshot>(response);
      if (!response.ok || payload.ok === false || !payload.data) {
        throw new Error(describeError(payload, "No se pudo guardar política de seguridad."));
      }

      setPolicy(payload.data);
      setIpAllowlistInput(stringifyIpAllowlist(payload.data.ipAllowlist || []));
      showToast({ tone: "success", title: "Política de seguridad actualizada" });
      await loadAudit();
    } catch (error) {
      showToast({ tone: "error", title: "Error guardando seguridad", message: (error as Error).message });
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismiss} placement="top-right" />

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Política de seguridad por tenant</CardTitle>
          <p className="text-sm text-slate-600">
            Controla expiración de sesión, fuerza de contraseña, lockout y remember-me. Los endpoints se validan en servidor con RBAC.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600">Timeout de sesión (min)</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={policy.sessionTimeoutMinutes}
                onChange={(event) =>
                  setPolicy((prev) => ({
                    ...prev,
                    sessionTimeoutMinutes: Number(event.target.value) || 5
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={loadingPolicy || savingPolicy}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Intentos máximos</label>
              <input
                type="number"
                min={3}
                max={20}
                value={policy.maxLoginAttempts}
                onChange={(event) =>
                  setPolicy((prev) => ({
                    ...prev,
                    maxLoginAttempts: Number(event.target.value) || 3
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={loadingPolicy || savingPolicy}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Bloqueo (min)</label>
              <input
                type="number"
                min={1}
                max={240}
                value={policy.lockoutMinutes}
                onChange={(event) =>
                  setPolicy((prev) => ({
                    ...prev,
                    lockoutMinutes: Number(event.target.value) || 1
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                disabled={loadingPolicy || savingPolicy}
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={policy.enforce2FA}
                onChange={(event) => setPolicy((prev) => ({ ...prev, enforce2FA: event.target.checked }))}
                disabled={loadingPolicy || savingPolicy}
              />
              Enforce 2FA
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={policy.allowRememberMe}
                onChange={(event) => setPolicy((prev) => ({ ...prev, allowRememberMe: event.target.checked }))}
                disabled={loadingPolicy || savingPolicy}
              />
              Permitir remember-me
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Política de contraseña</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-600">Longitud mínima</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={policy.passwordMinLength}
                  onChange={(event) =>
                    setPolicy((prev) => ({
                      ...prev,
                      passwordMinLength: Number(event.target.value) || 8
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  disabled={loadingPolicy || savingPolicy}
                />
              </div>
              <div className="grid gap-1">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireUppercase}
                    onChange={(event) =>
                      setPolicy((prev) => ({
                        ...prev,
                        passwordRequireUppercase: event.target.checked
                      }))
                    }
                    disabled={loadingPolicy || savingPolicy}
                  />
                  Requiere mayúscula
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireLowercase}
                    onChange={(event) =>
                      setPolicy((prev) => ({
                        ...prev,
                        passwordRequireLowercase: event.target.checked
                      }))
                    }
                    disabled={loadingPolicy || savingPolicy}
                  />
                  Requiere minúscula
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireNumber}
                    onChange={(event) =>
                      setPolicy((prev) => ({
                        ...prev,
                        passwordRequireNumber: event.target.checked
                      }))
                    }
                    disabled={loadingPolicy || savingPolicy}
                  />
                  Requiere número
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={policy.passwordRequireSymbol}
                    onChange={(event) =>
                      setPolicy((prev) => ({
                        ...prev,
                        passwordRequireSymbol: event.target.checked
                      }))
                    }
                    disabled={loadingPolicy || savingPolicy}
                  />
                  Requiere símbolo
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">IP allowlist (una IP por línea)</label>
            <textarea
              rows={4}
              value={ipAllowlistInput}
              onChange={(event) => setIpAllowlistInput(event.target.value)}
              placeholder="203.0.113.10"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              disabled={loadingPolicy || savingPolicy}
            />
            <p className="mt-1 text-xs text-slate-500">Vacío = sin restricción. Si defines lista, login rechaza IP fuera de la política.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void savePolicy()}
              disabled={loadingPolicy || savingPolicy}
              className="rounded-xl bg-[#4aa59c] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d9289] disabled:opacity-60"
            >
              {savingPolicy ? "Guardando..." : "Guardar política"}
            </button>
            <button
              type="button"
              onClick={() => void loadPolicy()}
              disabled={loadingPolicy}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {loadingPolicy ? "Actualizando..." : "Recargar"}
            </button>
            <span className="text-xs text-slate-500">Última actualización: {lastUpdated}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#2e75ba]">Audit logs</CardTitle>
          <p className="text-sm text-slate-600">
            Traza de cambios de Tema, Patentes, Facturación, Servicios, Navegación y Seguridad. Filtra por fecha/actor/acción.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-5">
            <input
              value={auditAction}
              onChange={(event) => setAuditAction(event.target.value)}
              placeholder="Acción"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={auditActor}
              onChange={(event) => setAuditActor(event.target.value)}
              placeholder="Actor user id"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={auditFrom}
              onChange={(event) => setAuditFrom(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={auditTo}
              onChange={(event) => setAuditTo(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void loadAudit()}
              disabled={loadingAudit}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              {loadingAudit ? "Cargando..." : "Filtrar"}
            </button>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#2e75ba]/10 text-xs uppercase text-[#2e75ba]">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Acción</th>
                  <th className="px-3 py-2 text-left">Entidad</th>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditRows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">{row.action}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.entityType} · {row.entityId}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">{row.actorUserId || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.ip || "—"}</td>
                  </tr>
                ))}
                {!loadingAudit && auditRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                      Sin eventos para el filtro seleccionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
