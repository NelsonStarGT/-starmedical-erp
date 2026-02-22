"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type SiteOption = { id: string; name: string };
type SiteConfig = {
  siteId: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  allowOutOfZone: boolean;
  requirePhoto: boolean;
  requireLiveness: "OFF" | "BASIC" | "PROVIDER";
  windowBeforeMinutes: number;
  windowAfterMinutes: number;
  antiPassback: boolean;
  allowedSources: string[];
};

type PunchToken = {
  id: string;
  token: string;
  siteId: string;
  employeeId?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  punchUrl?: string;
};

const defaultConfig: SiteConfig = {
  siteId: "",
  lat: 0,
  lng: 0,
  radiusMeters: 100,
  allowOutOfZone: false,
  requirePhoto: false,
  requireLiveness: "OFF",
  windowBeforeMinutes: 0,
  windowAfterMinutes: 0,
  antiPassback: false,
  allowedSources: ["SELFIE_WEB"]
};

const sourceLabels: Record<string, string> = {
  SELFIE_WEB: "Selfie Web",
  BIOMETRIC: "Biométrico",
  MANUAL_IMPORT: "Import manual"
};

async function fetchSites(): Promise<SiteOption[]> {
  const res = await fetch("/api/hr/attendance/sites");
  if (!res.ok) throw new Error("No se pudieron cargar sites");
  const json = await res.json();
  return json.data || [];
}

async function fetchConfig(siteId: string): Promise<SiteConfig | null> {
  const res = await fetch(`/api/attendance/config?siteId=${siteId}`);
  if (!res.ok) throw new Error("No se pudo cargar config");
  const json = await res.json();
  return json.data || null;
}

async function saveConfig(data: SiteConfig) {
  const res = await fetch("/api/attendance/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "No se pudo guardar");
  }
}

async function fetchTokens(siteId?: string | null): Promise<PunchToken[]> {
  const params = siteId ? `?siteId=${siteId}` : "";
  const res = await fetch(`/api/attendance/punch-tokens${params}`);
  if (!res.ok) throw new Error("No se pudieron cargar tokens");
  const json = await res.json();
  return json.data || [];
}

async function createToken(payload: { siteId: string; employeeId?: string; expiresAt?: string | null }): Promise<PunchToken> {
  const res = await fetch("/api/attendance/punch-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo crear token");
  return json.data;
}

async function revokeToken(id: string) {
  const res = await fetch(`/api/attendance/punch-tokens/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "No se pudo revocar token");
  }
}

export default function MarcajeConfigPage() {
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [tokens, setTokens] = useState<PunchToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tokenEmployeeId, setTokenEmployeeId] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");

  useEffect(() => {
    let active = true;
    fetchSites()
      .then((data) => {
        if (!active) return;
        setSites(data);
        if (data[0]?.id) setSiteId(data[0].id);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "No se pudieron cargar sites");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    Promise.all([fetchConfig(siteId), fetchTokens(siteId)])
      .then(([cfg, toks]) => {
        setConfig(cfg ? { ...cfg } : { ...defaultConfig, siteId });
        setTokens(toks);
      })
      .catch((err) => setError(err.message || "Error cargando configuración"))
      .finally(() => setLoading(false));
  }, [siteId]);

  const handleToggleSource = (source: string) => {
    setConfig((prev) => {
      const list = new Set(prev.allowedSources || []);
      if (list.has(source)) list.delete(source);
      else list.add(source);
      return { ...prev, allowedSources: Array.from(list) };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveConfig({ ...config, siteId });
      setMessage("Configuración guardada");
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateToken = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await createToken({
        siteId,
        employeeId: tokenEmployeeId || undefined,
        expiresAt: tokenExpiresAt ? new Date(tokenExpiresAt).toISOString() : undefined
      });
      setTokens((prev) => [token, ...prev]);
      setTokenEmployeeId("");
      setTokenExpiresAt("");
      setMessage("Token creado");
    } catch (err: any) {
      setError(err?.message || "No se pudo crear token");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await revokeToken(id);
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, revokedAt: new Date().toISOString() } : t)));
      setMessage("Token revocado");
    } catch (err: any) {
      setError(err?.message || "No se pudo revocar token");
    } finally {
      setSaving(false);
    }
  };

  const activeTokens = useMemo(() => tokens.filter((t) => !t.revokedAt), [tokens]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow">
        <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-300">Configuración</p>
            <h1 className="text-2xl font-semibold">Marcaje (SaaS)</h1>
            <p className="text-sm text-slate-200/80">Define geocercas, foto/liveness y tokens de acceso para cada site.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-200">
              Site
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="ml-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleSave}
              disabled={!siteId || saving}
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-900 shadow hover:bg-emerald-300 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {(error || message) && (
        <div className={cn("rounded-lg border px-4 py-3 text-sm", error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          {error || message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none ring-1 ring-slate-100 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Ubicación y radio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-slate-500">Cargando...</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Latitud
                    <input
                      type="number"
                      value={config.lat}
                      onChange={(e) => setConfig({ ...config, lat: parseFloat(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Longitud
                    <input
                      type="number"
                      value={config.lng}
                      onChange={(e) => setConfig({ ...config, lng: parseFloat(e.target.value) })}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="text-sm text-slate-700 block">
                  Radio (m)
                  <input
                    type="range"
                    min={20}
                    max={500}
                    step={10}
                    value={config.radiusMeters}
                    onChange={(e) => setConfig({ ...config, radiusMeters: Number(e.target.value) })}
                    className="mt-2 w-full accent-emerald-500"
                  />
                  <span className="text-xs text-slate-500">Actual: {config.radiusMeters}m</span>
                </label>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-slate-100">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Ventanas y reglas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={config.allowOutOfZone}
                onChange={(e) => setConfig({ ...config, allowOutOfZone: e.target.checked })}
              />
              Permitir fuera de zona
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={config.antiPassback} onChange={(e) => setConfig({ ...config, antiPassback: e.target.checked })} />
              Anti-passback
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-700">
                Ventana antes (min)
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={config.windowBeforeMinutes}
                  onChange={(e) => setConfig({ ...config, windowBeforeMinutes: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-700">
                Ventana después (min)
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={config.windowAfterMinutes}
                  onChange={(e) => setConfig({ ...config, windowAfterMinutes: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none ring-1 ring-slate-100">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Validación y selfie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={config.requirePhoto} onChange={(e) => setConfig({ ...config, requirePhoto: e.target.checked })} />
              Foto obligatoria
            </label>
            <label className="text-sm text-slate-700">
              Liveness
              <select
                value={config.requireLiveness}
                onChange={(e) => setConfig({ ...config, requireLiveness: e.target.value as SiteConfig["requireLiveness"] })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="OFF">Off</option>
                <option value="BASIC">Basic</option>
                <option value="PROVIDER">Provider</option>
              </select>
            </label>
          </CardContent>
        </Card>

        <Card className="shadow-none ring-1 ring-slate-100">
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">Fuentes permitidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(sourceLabels).map((source) => (
              <label key={source} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.allowedSources?.includes(source)}
                  onChange={() => handleToggleSource(source)}
                />
                {sourceLabels[source]}
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm text-slate-700">Tokens de marcaje</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Empleado (opcional)"
              value={tokenEmployeeId}
              onChange={(e) => setTokenEmployeeId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={tokenExpiresAt}
              onChange={(e) => setTokenExpiresAt(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreateToken}
              disabled={!siteId || saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Creando..." : "Crear token"}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {activeTokens.length === 0 && <p className="text-sm text-slate-500">No hay tokens activos.</p>}
          {activeTokens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Empleado</th>
                    <th className="py-2 pr-4">Expira</th>
                    <th className="py-2 pr-4">URL</th>
                    <th className="py-2 pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTokens.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-800">{t.token}</td>
                      <td className="py-2 pr-4">{t.employeeId || "—"}</td>
                      <td className="py-2 pr-4">{t.expiresAt ? new Date(t.expiresAt).toLocaleString() : "Sin expiración"}</td>
                      <td className="py-2 pr-4">
                        {t.punchUrl ? (
                          <span className="text-xs text-slate-600">{t.punchUrl}</span>
                        ) : (
                          <span className="text-xs text-slate-600">/punch/{t.token}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => handleRevoke(t.id)}
                          className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          disabled={saving}
                        >
                          Revocar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Estado de seguridad</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant={config.requirePhoto ? "info" : "neutral"}>Foto: {config.requirePhoto ? "Obligatoria" : "Opcional"}</Badge>
          <Badge variant={config.allowOutOfZone ? "warning" : "success"}>
            Zona: {config.allowOutOfZone ? "Permite fuera de zona" : "Restringe a geocerca"}
          </Badge>
          <Badge variant={config.antiPassback ? "info" : "neutral"}>Anti-passback: {config.antiPassback ? "Activo" : "Off"}</Badge>
          <Badge variant="neutral">Fuentes: {config.allowedSources.join(", ")}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
