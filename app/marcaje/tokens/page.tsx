"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

type Token = {
  id: string;
  token: string;
  siteId: string | null;
  employeeId: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type TokensResponse = { data?: Token[]; error?: string };
type SiteOption = { id: string; name: string };

async function fetchSites(): Promise<SiteOption[]> {
  const res = await fetch("/api/hr/attendance/sites", { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json().catch(() => ({}));
  return json.data || [];
}

async function fetchTokens(siteId?: string): Promise<Token[]> {
  const qs = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
  const res = await fetch(`/api/attendance/punch-tokens${qs}`, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as TokensResponse;
  if (!res.ok) throw new Error(json?.error || "No se pudieron cargar los tokens");
  return json.data || [];
}

export default function PunchTokensPage() {
  const { toasts, showToast, dismiss } = useToast();
  const qc = useQueryClient();
  const [siteFilter, setSiteFilter] = useState("");
  const [createSite, setCreateSite] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());
  const sitesQuery = useQuery({ queryKey: ["attendance-sites"], queryFn: fetchSites, staleTime: 60_000 });
  const tokensQuery = useQuery({
    queryKey: ["punch-tokens", siteFilter],
    queryFn: () => fetchTokens(siteFilter || undefined),
    placeholderData: (prev) => prev
  });
  const tokens = useMemo(() => tokensQuery.data || [], [tokensQuery.data]);
  useEffect(() => {
    if (tokensQuery.error) {
      const message = (tokensQuery.error as Error)?.message || "Error al cargar tokens";
      showToast(message, "error");
    }
  }, [tokensQuery.error, showToast]);
  // Refresh timestamp when tokens change to avoid impure calls during render
  useEffect(() => {
    setNowTs(Date.now());
  }, [tokensQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/punch-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: createSite || undefined })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo crear el token");
      return json.data as Token;
    },
    onSuccess: (data) => {
      showToast("Token creado", "success", [{ label: "Copiar link", href: `/punch/${data.token}` }]);
      void qc.invalidateQueries({ queryKey: ["punch-tokens"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo crear el token", "error")
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/attendance/punch-tokens/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "No se pudo revocar el token");
      return json;
    },
    onSuccess: () => {
      showToast("Token revocado", "success");
      void qc.invalidateQueries({ queryKey: ["punch-tokens"] });
    },
    onError: (err: any) => showToast(err?.message || "No se pudo revocar", "error")
  });

  const activeTokens = useMemo(() => {
    return tokens.map((t) => {
      const expired = t.expiresAt ? new Date(t.expiresAt).getTime() < nowTs : false;
      const active = !t.revokedAt && !expired;
      return { ...t, active, expired };
    });
  }, [tokens, nowTs]);

  return (
    <div className="space-y-4 p-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Centro de marcaje</p>
        <h1 className="text-2xl font-semibold text-slate-900">Tokens de marcaje</h1>
        <p className="text-sm text-slate-600">Administra tokens de kiosk/biométrico para generar links rápidos de punch.</p>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Crear token</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={createSite}
              onChange={(e) => setCreateSite(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Sin site</option>
              {(sitesQuery.data || []).map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-60"
            >
              {createMutation.isPending ? "Generando..." : "Nuevo token"}
            </button>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Tokens activos y revocados</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Todos los sites</option>
              {(sitesQuery.data || []).map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <Badge variant="info">
              {tokensQuery.isFetching ? "Actualizando..." : `${activeTokens.filter((t) => t.active).length} activos / ${tokens.length} total`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 pr-4 font-medium">Token</th>
                <th className="py-2 pr-4 font-medium">Site</th>
                <th className="py-2 pr-4 font-medium">Expira</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTokens.map((token) => (
                <tr key={token.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-800">{token.token}</p>
                    <p className="text-xs text-slate-500">
                      Creado {format(new Date(token.createdAt), "yyyy-MM-dd HH:mm")}
                      {token.employeeId ? ` · empleado ${token.employeeId}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{token.siteId || "—"}</td>
                  <td className="py-3 pr-4 text-slate-700">
                    {token.expiresAt ? format(new Date(token.expiresAt), "yyyy-MM-dd HH:mm") : "Sin expiración"}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={token.active ? "success" : token.expired ? "warning" : "neutral"}>
                      {token.revokedAt ? "Revocado" : token.expired ? "Expirado" : "Activo"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/punch/${token.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-brand-primary hover:underline"
                      >
                        Abrir link
                      </a>
                      {!token.revokedAt && (
                        <button
                          onClick={() => revokeMutation.mutate(token.id)}
                          disabled={revokeMutation.isPending}
                          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tokensQuery.isLoading && <p className="text-sm text-slate-600 py-3">Cargando tokens...</p>}
          {tokens.length === 0 && !tokensQuery.isLoading && (
            <p className="text-sm text-slate-600 py-6 text-center">No hay tokens configurados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
