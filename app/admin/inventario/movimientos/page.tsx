'use client';

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Movimiento } from "@/lib/types/inventario";
import { MovimientoCard } from "@/components/inventario/MovimientoCard";
import { ProductSelector } from "@/components/inventario/ProductSelector";
import ServiceUnavailableNotice from "@/components/inventario/ServiceUnavailableNotice";
import { inventoryReferenceData } from "@/lib/inventory/runtime-fallback";
import { parseServiceUnavailablePayload, type ServiceUnavailablePayload } from "@/lib/inventory/runtime-contract";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

type MovementApi = {
  id: string;
  productId: string;
  branchId: string;
  type: string;
  quantity: number;
  unitCost?: number | null;
  salePrice?: number | null;
  reference?: string | null;
  reason?: string | null;
  createdById: string;
  createdAt: string;
  productName?: string;
  productCode?: string;
};

type CierreRow = {
  productId: string;
  code: string;
  name: string;
  unit?: string | null;
  saldoInicial: number;
  entradas: number;
  salidas: number;
  ajustes: number;
  saldoFinal: number;
  valorInicial?: number;
  valorFinal?: number;
};

export default function MovimientosPage() {
  const token = process.env.NEXT_PUBLIC_INVENTORY_TOKEN;
  const headers = useMemo(() => (token ? { "x-inventory-token": token } : undefined), [token]);

  const [tab, setTab] = useState<"report" | "register" | "cierre">("report");
  const [movimientos, setMovimientos] = useState<MovementApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    branchId: "",
    type: "",
    productId: "",
    createdById: ""
  });
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Array<{ value: string; label: string }>>([]);
  const [loadIssue, setLoadIssue] = useState<ServiceUnavailablePayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cierreFilters, setCierreFilters] = useState({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    branchId: ""
  });
  const [cierreRows, setCierreRows] = useState<CierreRow[]>([]);
  const [cierreTotals, setCierreTotals] = useState<{ saldoInicial: number; entradas: number; salidas: number; ajustes: number; saldoFinal: number }>({
    saldoInicial: 0,
    entradas: 0,
    salidas: 0,
    ajustes: 0,
    saldoFinal: 0
  });
  const [cierreLoading, setCierreLoading] = useState(false);
  const [cierreError, setCierreError] = useState<string | null>(null);

  // Registrar movement (UI simple conservada)
  const [draft, setDraft] = useState<Partial<Movimiento>>({ tipo: "Entrada", fecha: new Date().toISOString().slice(0, 10) });
  const [localMovs, setLocalMovs] = useState<Movimiento[]>([]);

  const loadProducts = async () => {
    if (!headers) {
      setError("Falta token de inventario (NEXT_PUBLIC_INVENTORY_TOKEN) o sesión admin.");
      return;
    }
    try {
      const res = await fetch("/api/inventario/productos", { headers });
      const data = await res.json();
      if (!res.ok) {
        const unavailable = parseServiceUnavailablePayload(res.status, data);
        if (unavailable) {
          setLoadIssue(unavailable);
          setProducts([]);
          return;
        }
        throw new Error(data?.error || "No se pudieron cargar productos");
      }

      setLoadIssue(null);
      setProducts(
        (data.data || []).map((p: any) => ({
          value: p.id,
          label: `${p.codigo} - ${p.nombre}`
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const loadMovements = async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: String(page),
        pageSize: String(pageSize)
      });
      if (filters.branchId) params.set("branchId", filters.branchId);
      if (filters.type) params.set("type", filters.type);
      if (filters.productId) params.set("productId", filters.productId);
      if (filters.createdById) params.set("createdById", filters.createdById);
      const res = await fetch(`/api/inventario/movimientos?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar movimientos");
      setMovimientos(data.data || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    loadMovements();
  };

  const calculateCierre = async () => {
    if (!cierreFilters.dateFrom || !cierreFilters.dateTo) {
      setCierreError("Selecciona rango de fechas");
      return;
    }
    setCierreLoading(true);
    setCierreError(null);
    try {
      const params = new URLSearchParams({
        dateFrom: cierreFilters.dateFrom,
        dateTo: cierreFilters.dateTo
      });
      if (cierreFilters.branchId) params.set("branchId", cierreFilters.branchId);
      const res = await fetch(`/api/inventario/reports/cierre-sat?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo calcular");
      setCierreRows(data.data || []);
      setCierreTotals({
        saldoInicial: data.totals?.saldoInicial || 0,
        entradas: data.totals?.entradas || 0,
        salidas: data.totals?.salidas || 0,
        ajustes: data.totals?.ajustes || 0,
        saldoFinal: data.totals?.saldoFinal || 0
      });
    } catch (err: any) {
      setCierreError(err?.message || "Error al calcular");
    } finally {
      setCierreLoading(false);
    }
  };

  const downloadCierre = async (format: "xlsx" | "pdf") => {
    if (!cierreFilters.dateFrom || !cierreFilters.dateTo) {
      setCierreError("Selecciona rango de fechas");
      return;
    }
    setCierreError(null);
    try {
      const params = new URLSearchParams({
        dateFrom: cierreFilters.dateFrom,
        dateTo: cierreFilters.dateTo
      });
      if (cierreFilters.branchId) params.set("branchId", cierreFilters.branchId);
      const res = await fetch(`/api/inventario/reports/cierre-sat/export/${format}?${params.toString()}`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo descargar");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cierre-sat-${cierreFilters.dateFrom}-${cierreFilters.dateTo}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      link.click();
    } catch (err: any) {
      setCierreError(err?.message || "Error al descargar");
    }
  };

  const totals = useMemo(() => {
    const entries = movimientos.filter((m) => m.type === "ENTRY").reduce((acc, m) => acc + (m.quantity || 0), 0);
    const exits = movimientos.filter((m) => m.type === "EXIT").reduce((acc, m) => acc + (m.quantity || 0), 0);
    const adjustments = movimientos.filter((m) => m.type === "ADJUSTMENT").reduce((acc, m) => acc + (m.quantity || 0), 0);
    return { entries, exits, adjustments, count: movimientos.length };
  }, [movimientos]);

  const downloadPdf = async () => {
    if (!headers) {
      setError("Falta token de inventario (NEXT_PUBLIC_INVENTORY_TOKEN) o sesión admin.");
      return;
    }
    if (!filters.dateFrom || !filters.dateTo) {
      setError("Selecciona rango de fechas");
      return;
    }
    const params = new URLSearchParams({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    });
    if (filters.branchId) params.set("branchId", filters.branchId);
    if (filters.type) params.set("type", filters.type);
    if (filters.productId) params.set("productId", filters.productId);
    if (filters.createdById) params.set("createdById", filters.createdById);

    const res = await fetch(`/api/inventario/movimientos/export/pdf?${params.toString()}`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo descargar PDF");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimientos-${filters.dateFrom}-${filters.dateTo}.pdf`;
    link.click();
  };

  const sendReport = async () => {
    if (!headers) {
      setError("Falta token de inventario (NEXT_PUBLIC_INVENTORY_TOKEN) o sesión admin.");
      return;
    }
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/inventario/movimientos/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: JSON.stringify(filters)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setMessage(`Enviado a ${data.recipientsCount} destinatarios`);
    } catch (err: any) {
      setError(err?.message || "Error al enviar");
    }
  };

  const save = () => {
    if (!draft.productoId || !draft.cantidad || !draft.tipo) return;
    const nuevo: Movimiento = {
      id: `mov-${Date.now()}`,
      productoId: draft.productoId,
      cantidad: draft.cantidad,
      tipo: draft.tipo as Movimiento["tipo"],
      responsableId: "admin-1",
      sucursalId: draft.sucursalId || "s1",
      fecha: draft.fecha || new Date().toISOString().slice(0, 10),
      comentario: draft.comentario
    };
    setLocalMovs((prev) => [nuevo, ...prev]);
    setDraft({ tipo: "Entrada", fecha: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab("report")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "report" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Reporte
        </button>
        <button
          onClick={() => setTab("register")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "register" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Registrar
        </button>
        <button
          onClick={() => setTab("cierre")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === "cierre" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
        >
          Cierre SAT
        </button>
      </div>
      <ServiceUnavailableNotice issue={loadIssue} />

      {tab === "report" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte de movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
                <SearchableSelect
                  label="Sucursal"
                  value={filters.branchId}
                  onChange={(v) => setFilters({ ...filters, branchId: (v as string) || "" })}
                  options={[{ value: "", label: "Todas" }, ...inventoryReferenceData.branches.map((s) => ({ value: s.id, label: s.nombre }))]}
                  includeAllOption={false}
                />
                <SearchableSelect
                  label="Tipo"
                  value={filters.type}
                  onChange={(v) => setFilters({ ...filters, type: (v as string) || "" })}
                  options={[
                    { value: "", label: "Todos" },
                    { value: "ENTRY", label: "ENTRY" },
                    { value: "EXIT", label: "EXIT" },
                    { value: "ADJUSTMENT", label: "ADJUSTMENT" },
                    { value: "PRICE_UPDATE", label: "PRICE_UPDATE" },
                    { value: "COST_UPDATE", label: "COST_UPDATE" }
                  ]}
                  includeAllOption={false}
                />
                <SearchableSelect
                  label="Producto"
                  value={filters.productId}
                  onChange={(v) => setFilters({ ...filters, productId: (v as string) || "" })}
                  options={[{ value: "", label: "Todos" }, ...products]}
                  includeAllOption={false}
                />
                <div>
                  <label className="text-xs font-semibold text-slate-600">Usuario</label>
                  <input
                    value={filters.createdById}
                    onChange={(e) => setFilters({ ...filters, createdById: e.target.value })}
                    placeholder="ID usuario"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={applyFilters}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
                  disabled={loading}
                >
                  Aplicar filtros
                </button>
                <button
                  onClick={downloadPdf}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Descargar PDF
                </button>
                <button
                  onClick={sendReport}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Enviar a correos configurados
                </button>
                <span className="text-xs text-slate-500">Total: {total} movimientos</span>
              </div>
              {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
              {error && (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <p>{error}</p>
                  {error.includes("No autorizado") && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Configura el token en NEXT_PUBLIC_INVENTORY_TOKEN (solo en entorno local) o inicia sesión con rol adecuado.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryPill label="Total entradas" value={totals.entries} tone="emerald" />
                <SummaryPill label="Total salidas" value={totals.exits} tone="rose" />
                <SummaryPill label="Total ajustes" value={totals.adjustments} tone="amber" />
                <SummaryPill label="Total movimientos" value={totals.count} tone="slate" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-2 py-2">Fecha</th>
                      <th className="px-2 py-2">Producto</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Cantidad</th>
                      <th className="px-2 py-2">Sucursal</th>
                      <th className="px-2 py-2">Referencia/Motivo</th>
                      <th className="px-2 py-2">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-2 py-2">{new Date(m.createdAt).toLocaleString()}</td>
                        <td className="px-2 py-2">{m.productCode || m.productId} · {m.productName}</td>
                        <td className="px-2 py-2">{m.type}</td>
                        <td className="px-2 py-2">{signedQty(m)}</td>
                        <td className="px-2 py-2">{m.branchId}</td>
                        <td className="px-2 py-2">{[m.reference, m.reason].filter(Boolean).join(" / ")}</td>
                        <td className="px-2 py-2">{m.createdById}</td>
                      </tr>
                    ))}
                    {movimientos.length === 0 && !loading && (
                      <tr>
                        <td className="px-2 py-3 text-center text-slate-500" colSpan={7}>Sin resultados para el filtro seleccionado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  Página {page} / {Math.max(1, Math.ceil(total / pageSize))}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "register" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registrar movimiento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <ProductSelector value={draft.productoId} onChange={(id) => setDraft({ ...draft, productoId: id })} />
              <input
                type="number"
                placeholder="Cantidad"
                value={draft.cantidad || 0}
                onChange={(e) => setDraft({ ...draft, cantidad: Number(e.target.value) })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
              <select
                value={draft.tipo}
                onChange={(e) => setDraft({ ...draft, tipo: e.target.value as Movimiento["tipo"] })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              >
                <option value="Entrada">Entrada</option>
                <option value="Salida">Salida</option>
                <option value="Ajuste">Ajuste</option>
              </select>
              <select
                value={draft.sucursalId || ""}
                onChange={(e) => setDraft({ ...draft, sucursalId: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              >
                <option value="">Sucursal</option>
                {inventoryReferenceData.branches.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              <input
                type="date"
                value={draft.fecha || ""}
                onChange={(e) => setDraft({ ...draft, fecha: e.target.value })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
              <input
                placeholder="Comentario"
                value={draft.comentario || ""}
                onChange={(e) => setDraft({ ...draft, comentario: e.target.value })}
                className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
              <div>
                <button
                  onClick={save}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft"
                >
                  Guardar movimiento
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Movimientos recientes (local)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {localMovs.map((m) => (
                <MovimientoCard key={m.id} movimiento={m} />
              ))}
              {localMovs.length === 0 && <p className="text-sm text-slate-500">Registra para verlos aquí.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "cierre" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cierre de inventario (SAT)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Desde</label>
                  <input
                    type="date"
                    value={cierreFilters.dateFrom}
                    onChange={(e) => setCierreFilters({ ...cierreFilters, dateFrom: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Hasta</label>
                  <input
                    type="date"
                    value={cierreFilters.dateTo}
                    onChange={(e) => setCierreFilters({ ...cierreFilters, dateTo: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
                <SearchableSelect
                  label="Sucursal"
                  value={cierreFilters.branchId}
                  onChange={(v) => setCierreFilters({ ...cierreFilters, branchId: (v as string) || "" })}
                  options={[{ value: "", label: "Todas" }, ...inventoryReferenceData.branches.map((s) => ({ value: s.id, label: s.nombre }))]}
                  includeAllOption={false}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={calculateCierre}
                  disabled={cierreLoading}
                  className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
                >
                  {cierreLoading ? "Calculando…" : "Calcular"}
                </button>
                <button
                  onClick={() => downloadCierre("xlsx")}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={cierreLoading}
                >
                  Descargar Excel
                </button>
                <button
                  onClick={() => downloadCierre("pdf")}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={cierreLoading}
                >
                  Descargar PDF
                </button>
              </div>
              {cierreError && (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <p>{cierreError}</p>
                  {cierreError.includes("No autorizado") && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Configura el token en NEXT_PUBLIC_INVENTORY_TOKEN (solo en entorno local) o inicia sesión con rol adecuado.
                    </p>
                  )}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-2 py-2">Código</th>
                      <th className="px-2 py-2">Producto</th>
                      <th className="px-2 py-2">Unidad</th>
                      <th className="px-2 py-2">Saldo inicial</th>
                      <th className="px-2 py-2">Entradas</th>
                      <th className="px-2 py-2">Salidas</th>
                      <th className="px-2 py-2">Ajustes</th>
                      <th className="px-2 py-2">Saldo final</th>
                      <th className="px-2 py-2">Valor inicial</th>
                      <th className="px-2 py-2">Valor final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierreRows.map((r) => (
                      <tr key={r.productId} className="border-t border-slate-100">
                        <td className="px-2 py-2">{r.code}</td>
                        <td className="px-2 py-2">{r.name}</td>
                        <td className="px-2 py-2">{r.unit}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(r.saldoInicial)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(r.entradas)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(r.salidas)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(r.ajustes)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(r.saldoFinal)}</td>
                        <td className="px-2 py-2 text-right">{r.valorInicial !== undefined ? formatCurrency(r.valorInicial) : "-"}</td>
                        <td className="px-2 py-2 text-right">{r.valorFinal !== undefined ? formatCurrency(r.valorFinal) : "-"}</td>
                      </tr>
                    ))}
                    {cierreRows.length === 0 && !cierreLoading && (
                      <tr>
                        <td className="px-2 py-3 text-center text-slate-500" colSpan={10}>Sin resultados para el rango seleccionado.</td>
                      </tr>
                    )}
                  </tbody>
                  {cierreRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                        <td className="px-2 py-2" colSpan={3}>Totales</td>
                        <td className="px-2 py-2 text-right">{formatNumber(cierreTotals.saldoInicial)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(cierreTotals.entradas)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(cierreTotals.salidas)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(cierreTotals.ajustes)}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(cierreTotals.saldoFinal)}</td>
                        <td className="px-2 py-2 text-right">—</td>
                        <td className="px-2 py-2 text-right">—</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" | "amber" | "slate" }) {
  const colors: Record<"emerald" | "rose" | "amber" | "slate", string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
  };
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${colors[tone]}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function signedQty(m: MovementApi) {
  if (m.type === "EXIT") return -Math.abs(m.quantity || 0);
  if (m.type === "ADJUSTMENT") return m.quantity || 0;
  return Math.abs(m.quantity || 0);
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("es-GT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("es-GT", { style: "currency", currency: "GTQ", minimumFractionDigits: 2 });
}
