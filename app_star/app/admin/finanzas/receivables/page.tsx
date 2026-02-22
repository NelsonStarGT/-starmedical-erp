"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Receivable = {
  id: string;
  party?: { name: string };
  amount: number;
  paidAmount: number;
  status: string;
  date: string;
  dueDate?: string | null;
  reference?: string | null;
};

export default function ReceivablesPage() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/finanzas/receivables", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar cuentas por cobrar");
        setItems(json?.data || []);
      } catch (err: any) {
        setError(err?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finanzas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Cuentas por cobrar</h1>
          <p className="text-sm text-slate-600">Revisa facturas y sus pagos.</p>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-slate-500">Cargando...</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="text-sm text-slate-500">Sin registros.</p>}
          {!loading && !error && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Fecha</th>
                    <th className="px-3 py-2 font-semibold">Cliente</th>
                    <th className="px-3 py-2 font-semibold text-right">Monto</th>
                    <th className="px-3 py-2 font-semibold text-right">Pagado</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-slate-800">{r.date?.slice(0, 10)}</td>
                      <td className="px-3 py-2 text-slate-800">{r.party?.name || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{r.amount}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{r.paidAmount}</td>
                      <td className="px-3 py-2 text-slate-700">{r.status}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/finanzas/receivables/${r.id}`}
                          className="text-sm font-semibold text-brand-primary hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
