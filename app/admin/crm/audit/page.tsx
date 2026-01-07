"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { formatDateTime } from "@/lib/crmFormat";

type AuditLog = {
  id: string;
  timestamp: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  before?: any;
  after?: any;
};

export default function CrmAuditPage() {
  const { toasts, showToast, dismiss } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    actorUserId: "",
    entityId: "",
    from: "",
    to: ""
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.action) params.set("action", filters.action);
      if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);
      if (filters.entityId) params.set("entityId", filters.entityId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/crm/audit?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err: any) {
      const msg = err?.message || "No se pudieron cargar los logs";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    loadLogs();
  };

  const resetFilters = () => {
    setFilters({ entityType: "", action: "", actorUserId: "", entityId: "", from: "", to: "" });
    setPage(1);
    loadLogs();
  };

  const renderJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3rem] text-slate-400">CRM · Auditoría</p>
        <h1 className="text-2xl font-semibold text-slate-900">Eventos críticos</h1>
        <p className="text-sm text-slate-500">Registro inmutable de acciones en CRM.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="entityType"
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="action"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="actorUserId"
            value={filters.actorUserId}
            onChange={(e) => setFilters((f) => ({ ...f, actorUserId: e.target.value }))}
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="entityId"
            value={filters.entityId}
            onChange={(e) => setFilters((f) => ({ ...f, entityId: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              disabled={loading}
            >
              Filtrar
            </button>
            <button
              onClick={resetFilters}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              disabled={loading}
            >
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs ({total})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Entidad</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Ruta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 text-slate-700">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {log.entityType} · {log.entityId}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.actorUserId || "N/D"}</td>
                  <td className="px-4 py-3 text-slate-500">{log.metadata?.route || "-"}</td>
                </tr>
              ))}
              {!logs.length && !loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {page} de {pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Detalle · ${selected?.action || ""}`}>
        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="text-xs uppercase text-slate-500">Entidad</p>
            <p className="font-semibold">
              {selected?.entityType} · {selected?.entityId}
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-slate-500">Antes</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-100">
                {renderJson(selected?.before)}
              </pre>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Después</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-slate-900/90 px-3 py-2 text-xs text-slate-100">
                {renderJson(selected?.after)}
              </pre>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Metadata</p>
            <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {renderJson(selected?.metadata)}
            </pre>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
