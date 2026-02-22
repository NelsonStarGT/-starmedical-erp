"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { AttendanceRawEventType } from "@prisma/client";
import { cn } from "@/lib/utils";

type SiteOption = { id: string; name: string };
type StatusData = {
  configured: boolean;
  activeTokens: number;
  lastEventAt: string | null;
  todayCount: number;
  errors?: string[];
};
type RawRow = {
  id: string;
  occurredAt: string;
  type: AttendanceRawEventType;
  source: string;
  status: string;
  biometricId?: string | null;
  employee?: { id: string; name: string; branchName?: string | null } | null;
  branchId?: string | null;
  errorMessage?: string | null;
  rawPayload?: any;
};
type RawResponse = { data: RawRow[]; nextCursor: string | null };
type SessionInfo = { permissions: string[] };

const typeLabel: Record<AttendanceRawEventType, string> = {
  CHECK_IN: "Entrada",
  CHECK_OUT: "Salida",
  BREAK_IN: "Regreso break",
  BREAK_OUT: "Inicio break"
};

const sourceLabel: Record<string, string> = {
  SELFIE_WEB: "Selfie web",
  BIOMETRIC: "Biométrico",
  MANUAL_IMPORT: "Import manual"
};

async function fetchSession(): Promise<SessionInfo | null> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchSites(): Promise<SiteOption[]> {
  const res = await fetch("/api/hr/attendance/sites", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudieron cargar sites");
  const json = await res.json();
  return json.data || [];
}

async function fetchStatus(siteId?: string | null): Promise<StatusData | null> {
  const qs = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
  const res = await fetch(`/api/marcaje/status${qs}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error || "No se pudo obtener el estado de marcaje");
  return json.data || null;
}

async function fetchRaw(params: { siteId?: string | null; range?: "today" | "7d"; cursor?: string | null; limit?: number }): Promise<RawResponse> {
  const qs = new URLSearchParams();
  if (params.siteId) qs.set("siteId", params.siteId);
  qs.set("range", params.range || "7d");
  qs.set("limit", String(params.limit || 20));
  if (params.cursor) qs.set("cursor", params.cursor);
  const res = await fetch(`/api/marcaje/raw?${qs.toString()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || json?.error?.message || "No se pudieron cargar marcajes");
  }
  return { data: json.data || [], nextCursor: json.nextCursor || null };
}

async function fetchActiveToken(siteId: string): Promise<string | null> {
  const res = await fetch(`/api/attendance/punch-tokens?siteId=${encodeURIComponent(siteId)}`, { cache: "no-store" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "No se pudieron cargar tokens");
  }
  const json = await res.json();
  const now = Date.now();
  const active = (json.data || []).find((t: any) => !t.revokedAt && (!t.expiresAt || new Date(t.expiresAt).getTime() > now));
  return active?.token || null;
}

async function createToken(siteId: string): Promise<string> {
  const res = await fetch("/api/attendance/punch-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ siteId })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "No se pudo crear token");
  if (!json.data?.token) throw new Error("No se pudo crear token");
  return json.data.token;
}

async function importRawFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/attendance/import/raw", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.error || "No se pudo importar");
  return json.data;
}

async function processRaw() {
  const res = await fetch("/api/attendance/process", { method: "POST" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error?.message || json?.error || "No se pudo procesar");
  return json.data;
}

export default function MarcajePage() {
  const { toasts, showToast, dismiss } = useToast();
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [range, setRange] = useState<"today" | "7d">("7d");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const sessionQuery = useQuery<SessionInfo | null>({ queryKey: ["me"], queryFn: fetchSession, staleTime: 60_000, retry: false });
  const sitesQuery = useQuery<SiteOption[]>({ queryKey: ["attendance-sites"], queryFn: fetchSites, staleTime: 5 * 60_000 });
  const statusQuery = useQuery<StatusData | null>({
    queryKey: ["marcaje-status", selectedSite || "all"],
    queryFn: () => fetchStatus(selectedSite || undefined),
    enabled: sessionQuery.data !== undefined
  });
  const rawQuery = useQuery<RawResponse>({
    queryKey: ["marcaje-raw", selectedSite || "all", range, cursor],
    queryFn: () => fetchRaw({ siteId: selectedSite || null, range, cursor, limit: 20 }),
    placeholderData: keepPreviousData
  });

  const isAdmin = useMemo(() => {
    const perms = sessionQuery.data?.permissions || [];
    return perms.includes("USERS:ADMIN");
  }, [sessionQuery.data]);

  useEffect(() => {
    if (!selectedSite && sitesQuery.data?.[0]?.id) {
      setSelectedSite(sitesQuery.data[0].id);
    }
  }, [selectedSite, sitesQuery.data]);

  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [selectedSite, range]);

  const copyLinkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSite) throw new Error("Selecciona un site para generar el link");
      if (!isAdmin) throw new Error("Solicita a un administrador para generar/copiar el link");
      const existing = await fetchActiveToken(selectedSite);
      const token = existing || (await createToken(selectedSite));
      const url = `${window.location.origin}/punch/${token}`;
      await navigator.clipboard.writeText(url);
      return url;
    },
    onSuccess: () => showToast("Link copiado", "success"),
    onError: (err: any) => showToast(err?.message || "No se pudo copiar el link", "error")
  });

  const nextCursor = rawQuery.data?.nextCursor || null;
  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor || ""]);
    setCursor(nextCursor);
  };
  const handlePrev = () => {
    setCursorStack((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setCursor(last || null);
      return prev.slice(0, -1);
    });
  };

  const todayParam = format(new Date(), "yyyy-MM-dd");
  const attendanceHref = selectedSite ? `/hr/attendance?date=${todayParam}&siteId=${selectedSite}` : `/hr/attendance?date=${todayParam}`;
  const importMutation = useMutation({ mutationFn: importRawFile, onSuccess: () => void rawQuery.refetch(), onError: (err: any) => showToast(err?.message || "Error al importar", "error") });
  const processMutation = useMutation({
    mutationFn: processRaw,
    onSuccess: (data) => {
      void rawQuery.refetch();
      showToast(`Procesado: ${data?.processed ?? 0} ok, ${data?.ignored ?? 0} ignorados, ${data?.failed ?? 0} fallidos`, "success");
    },
    onError: (err: any) => showToast(err?.message || "No se pudo procesar", "error")
  });

  return (
    <div className="space-y-6 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Centro de marcaje</p>
        <h1 className="font-['Montserrat'] text-2xl font-semibold text-slate-900">Marcaje biométrico y kiosk</h1>
        <p className="text-sm text-slate-600">
          Explica a recepción y administración cómo marcar entrada/salida. Los eventos crudos (biométrico, link y kiosk) se procesan en RRHH →
          Asistencia.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <Link href="/hr/attendance" className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50">
            Ir a RRHH → Asistencia
          </Link>
          {isAdmin && (
            <Link
              href="/admin/configuracion/marcaje"
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Administrar configuración de Marcaje
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-700">
            <span className="text-xs uppercase tracking-wide text-slate-500">Site</span>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              >
                {sitesQuery.data?.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
                {sitesQuery.data && sitesQuery.data.length > 1 && <option value="">Todos</option>}
              </select>
              {sitesQuery.isLoading && <span className="text-xs text-slate-500">Cargando sites...</span>}
            </div>
          </div>
          <div className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500">
            Vista rápida: {selectedSite || "Todos los sites"}
          </div>
        </div>
        <Link
          href={attendanceHref}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
        >
          Ver Asistencia del día →
        </Link>
      </div>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm text-slate-700">Estado de integración</CardTitle>
          <p className="text-xs text-slate-500">Llave de ingesta, tokens y flujo de marcajes</p>
        </CardHeader>
        <CardContent>
          {statusQuery.isLoading && <p className="text-sm text-slate-500">Cargando estado...</p>}
          {statusQuery.isError && <p className="text-sm text-rose-600">No se pudo cargar el estado.</p>}
          {!statusQuery.isLoading && statusQuery.data && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Integración</p>
                <div className="mt-2">
                  <Badge variant={statusQuery.data.configured ? "success" : "warning"}>
                    {statusQuery.data.configured ? "Conectado" : "No configurado"}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Tokens activos</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{statusQuery.data.activeTokens || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Último marcaje</p>
                <p className="mt-2 text-sm text-slate-800">
                  {statusQuery.data.lastEventAt ? format(new Date(statusQuery.data.lastEventAt), "yyyy-MM-dd HH:mm") : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Marcajes hoy</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{statusQuery.data.todayCount ?? 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Cómo marca el colaborador</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-inner">
            <p className="text-xs uppercase text-slate-500">Opción A · Biométrico</p>
            <p className="font-semibold text-slate-800">CMM220TFT</p>
            <p className="text-xs text-slate-500">Envía eventos con biometricId → se resuelven contra empleados y generan AttendanceRecord.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-inner">
            <p className="text-xs uppercase text-slate-500">Opción B · Link</p>
            <p className="font-semibold text-slate-800">/punch/&lt;token&gt;</p>
            <p className="text-xs text-slate-500">Genera tokens y comparte para marcaje remoto. Usa biometría opcional.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-inner">
            <p className="text-xs uppercase text-slate-500">Opción C · Kiosk</p>
            <p className="font-semibold text-slate-800">Recepción / tablet</p>
            <p className="text-xs text-slate-500">RRHH → Asistencia → pestaña Marcaje (busca empleado y marca).</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader>
          <CardTitle className="text-sm text-slate-700">Acciones rápidas (administrativo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copyLinkMutation.mutate()}
              disabled={copyLinkMutation.isPending || !selectedSite}
              className={cn(
                "inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
                !selectedSite && "cursor-not-allowed"
              )}
            >
              {copyLinkMutation.isPending ? "Generando..." : "Copiar link de marcaje"}
            </button>
            {isAdmin && (
              <>
                <Link
                  href="/admin/configuracion/marcaje"
                  className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  Administrar configuración
                </Link>
                <Link
                  href="/marcaje/tokens"
                  className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                >
                  Administrar tokens
                </Link>
              </>
            )}
            <Link
              href="/hr/attendance"
              className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Ver Asistencia (RRHH)
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white/70 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Importar marcajes (Excel/CSV ZKTime)</span>
              <input
                type="file"
                accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importMutation.mutate(file);
                }}
                disabled={importMutation.isPending}
                className="text-xs"
              />
            </div>
            <button
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white shadow-soft hover:-translate-y-px transition disabled:opacity-60"
            >
              {processMutation.isPending ? "Procesando..." : "Procesar pendientes"}
            </button>
            {processMutation.isSuccess && (
              <span className="text-[11px] text-slate-500">Procesa eventos NEW en orden; duplicados se ignoran.</span>
            )}
          </div>
          {!isAdmin && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Acciones de configuración y tokens requieren permiso USERS:ADMIN. Solicita a un administrador para generar links nuevos.
            </div>
          )}
          <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            Los marcajes capturados aquí son procesados en RRHH → Asistencia. Usa los links de /punch/&lt;token&gt; para que el colaborador
            marque.
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none ring-1 ring-slate-100">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm text-slate-700">Marcajes recientes (RAW)</CardTitle>
            <p className="text-xs text-slate-500">Fuente: AttendanceRawEvent</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setRange("today")}
              className={cn(
                "rounded-full border px-3 py-1 font-semibold",
                range === "today" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Hoy
            </button>
            <button
              onClick={() => setRange("7d")}
              className={cn(
                "rounded-full border px-3 py-1 font-semibold",
                range === "7d" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              7 días
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {rawQuery.isLoading && <p className="text-sm text-slate-500">Cargando marcajes...</p>}
          {rawQuery.isError && <p className="text-sm text-rose-600">No se pudieron cargar los marcajes.</p>}
          {!rawQuery.isLoading && (rawQuery.data?.data || []).length === 0 && <p className="text-sm text-slate-500">Sin marcajes recientes.</p>}
          {(rawQuery.data?.data || []).length > 0 && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Hora</th>
                      <th className="py-2 pr-4">Biométrico</th>
                      <th className="py-2 pr-4">Empleado</th>
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Origen</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2 pr-4">Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rawQuery.data?.data || []).map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="py-2 pr-4 text-xs text-slate-700">{format(new Date(row.occurredAt), "yyyy-MM-dd HH:mm")}</td>
                        <td className="py-2 pr-4 text-xs text-slate-700">{row.biometricId || "—"}</td>
                        <td className="py-2 pr-4 font-semibold text-slate-800">
                          {row.employee?.name || "Sin resolver"}
                          {row.employee?.branchName && <span className="ml-1 text-xs text-slate-500">({row.employee.branchName})</span>}
                        </td>
                        <td className="py-2 pr-4">{typeLabel[row.type] || row.type}</td>
                        <td className="py-2 pr-4 text-xs text-slate-600">{sourceLabel[row.source] || row.source}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={row.status === "PROCESSED" ? "success" : row.status === "FAILED" ? "warning" : "info"}>{row.status}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-xs text-slate-600">{row.errorMessage || "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <button
                  onClick={handlePrev}
                  disabled={!cursorStack.length}
                  className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ← Anterior
                </button>
                <div className="flex items-center gap-2">
                  <span>Página</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {cursorStack.length + 1}
                  </span>
                </div>
                <button
                  onClick={handleNext}
                  disabled={!nextCursor}
                  className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
