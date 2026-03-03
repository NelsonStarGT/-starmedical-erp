"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/subscriptions/SectionCard";
import { KPIStatCard } from "@/components/subscriptions/KPIStatCard";
import { money } from "@/app/admin/suscripciones/membresias/_lib";

type GatewayConfig = {
  provider: "RECURRENT" | "MANUAL";
  mode: "test" | "live";
  isEnabled: boolean;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  apiKeyMasked?: string | null;
  webhookSecretMasked?: string | null;
  lastWebhookAt?: string | null;
};

const DEFAULT_GATEWAY: GatewayConfig = {
  provider: "RECURRENT",
  mode: "test",
  isEnabled: false,
  hasApiKey: false,
  hasWebhookSecret: false,
  apiKeyMasked: null,
  webhookSecretMasked: null,
  lastWebhookAt: null
};

function dateTimeLabel(value?: string | null) {
  if (!value) return "Sin eventos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin eventos";
  return date.toLocaleString("es-GT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SubscriptionsGatewayPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [gateway, setGateway] = useState<GatewayConfig>(DEFAULT_GATEWAY);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [testProduct, setTestProduct] = useState({
    domain: "MEMBERSHIP",
    productName: "Membresía Familiar Plus",
    amount: "399",
    currency: "GTQ",
    deferredBilling: true
  });

  const webhookHealth = useMemo(() => {
    if (!gateway.lastWebhookAt) return "SIN_EVENTOS";
    const diff = Date.now() - new Date(gateway.lastWebhookAt).getTime();
    if (Number.isNaN(diff)) return "SIN_EVENTOS";
    return diff <= 1000 * 60 * 60 * 24 ? "OK" : "ATRASADO";
  }, [gateway.lastWebhookAt]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const configRes = await fetch("/api/subscriptions/memberships/config", { cache: "no-store" });
      const configJson = await configRes.json();
      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo verificar permisos de pasarela");

      const admin = Boolean(configJson?.meta?.canAdmin);
      setCanAdmin(admin);

      if (admin) {
        const gatewayRes = await fetch("/api/subscriptions/memberships/config/gateway", { cache: "no-store" });
        const gatewayJson = await gatewayRes.json();
        if (!gatewayRes.ok) throw new Error(gatewayJson?.error || "No se pudo cargar configuración de pasarela");
        setGateway(gatewayJson?.data || DEFAULT_GATEWAY);
      } else {
        setGateway(DEFAULT_GATEWAY);
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar pasarela");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function saveGateway(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdmin) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/subscriptions/memberships/config/gateway", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: gateway.provider,
          mode: gateway.mode,
          isEnabled: gateway.isEnabled,
          apiKey: apiKey.trim() || null,
          webhookSecret: webhookSecret.trim() || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar configuración");
      setMessage("Configuración de pasarela actualizada.");
      setApiKey("");
      setWebhookSecret("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar configuración");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    if (!canAdmin) return;
    setTesting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/subscriptions/memberships/config/gateway/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo probar conexión");
      setMessage(json?.data?.message || "Prueba ejecutada.");
    } catch (err: any) {
      setError(err?.message || "No se pudo probar conexión");
    } finally {
      setTesting(false);
    }
  }

  function simulateCheckout() {
    setMessage(
      `Modo prueba activo: ${testProduct.productName} (${testProduct.domain}) por ${money(
        Number(testProduct.amount || 0),
        testProduct.currency
      )}. Facturación diferida: ${testProduct.deferredBilling ? "sí" : "no"}.`
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Pasarela · Recurrente"
        subtitle="Configuración por tenant para cobro recurrente con estado de webhook y modo prueba."
      >
        {loading ? <p className="text-xs text-slate-500">Cargando pasarela...</p> : null}
        {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}

        {!loading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            <KPIStatCard label="Provider" value={gateway.provider} />
            <KPIStatCard label="Modo" value={gateway.mode.toUpperCase()} tone={gateway.mode === "test" ? "warning" : "default"} />
            <KPIStatCard label="Webhook" value={webhookHealth} tone={webhookHealth === "OK" ? "success" : "warning"} hint={dateTimeLabel(gateway.lastWebhookAt)} />
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Credenciales"
          subtitle="Solo administradores pueden editar llaves y secretos."
          actions={
            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={!canAdmin || testing}
              className="rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c] disabled:opacity-60"
            >
              {testing ? "Probando..." : "Probar conexión"}
            </button>
          }
        >
          {!canAdmin ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Acceso restringido: la gestión de credenciales requiere perfil administrador.
            </div>
          ) : (
            <form onSubmit={saveGateway} className="space-y-3">
              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Proveedor</span>
                <select
                  value={gateway.provider}
                  onChange={(event) =>
                    setGateway((prev) => ({ ...prev, provider: event.target.value as GatewayConfig["provider"] }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="RECURRENT">RECURRENT</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Modo</span>
                <select
                  value={gateway.mode}
                  onChange={(event) => setGateway((prev) => ({ ...prev, mode: event.target.value as "test" | "live" }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="test">Prueba</option>
                  <option value="live">Producción</option>
                </select>
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">API key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={gateway.apiKeyMasked || "••••••••"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1 text-xs text-slate-700">
                <span className="font-semibold">Webhook secret</span>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(event) => setWebhookSecret(event.target.value)}
                  placeholder={gateway.webhookSecretMasked || "••••••••"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={gateway.isEnabled}
                  onChange={(event) => setGateway((prev) => ({ ...prev, isEnabled: event.target.checked }))}
                />
                Pasarela habilitada
              </label>

              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
              >
                {busy ? "Guardando..." : "Guardar credenciales"}
              </button>
            </form>
          )}
        </SectionCard>

        <SectionCard title="Modo prueba" subtitle="Resumen de producto para validar UX de checkout sin cobro real.">
          <div className="space-y-3">
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Dominio</span>
              <select
                value={testProduct.domain}
                onChange={(event) => setTestProduct((prev) => ({ ...prev, domain: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="MEMBERSHIP">Membresías</option>
                <option value="PHARMACY">Farmacia</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-700">
              <span className="font-semibold">Producto</span>
              <input
                value={testProduct.productName}
                onChange={(event) => setTestProduct((prev) => ({ ...prev, productName: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={testProduct.amount}
                onChange={(event) => setTestProduct((prev) => ({ ...prev, amount: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Monto"
              />
              <select
                value={testProduct.currency}
                onChange={(event) => setTestProduct((prev) => ({ ...prev, currency: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="GTQ">GTQ</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={testProduct.deferredBilling}
                onChange={(event) => setTestProduct((prev) => ({ ...prev, deferredBilling: event.target.checked }))}
              />
              Facturación diferida habilitada (simulación)
            </label>
            <button
              type="button"
              onClick={simulateCheckout}
              className="rounded-lg border border-[#4aa59c] px-3 py-2 text-xs font-semibold text-[#4aa59c]"
            >
              Simular checkout (UI)
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
