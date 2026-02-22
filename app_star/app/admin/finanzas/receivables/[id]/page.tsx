"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type Receivable = {
  id: string;
  amount: number;
  paidAmount: number;
  status: string;
  date: string;
  dueDate?: string | null;
  reference?: string | null;
  party?: { name: string };
  legalEntityId?: string | null;
};

type Payment = {
  id: string;
  receivableId?: string | null;
  amount: number;
  date: string;
  method?: string | null;
  reference?: string | null;
};

export default function ReceivableDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [recRes, payRes] = await Promise.all([
          fetch("/api/finanzas/receivables", { cache: "no-store" }),
          fetch("/api/finanzas/payments", { cache: "no-store" })
        ]);
        const recJson = await recRes.json();
        const payJson = await payRes.json();
        if (!recRes.ok) throw new Error(recJson?.error || "No se pudo cargar factura");
        if (!payRes.ok) throw new Error(payJson?.error || "No se pudo cargar pagos");
        const recList: Receivable[] = recJson?.data || [];
        const found = recList.find((r) => r.id === id);
        if (!found) {
          setError("Factura no encontrada");
        } else {
          setReceivable(found);
        }
        const payList: Payment[] = payJson?.data || [];
        setPayments(payList.filter((p) => !p.receivableId || p.receivableId === id));
      } catch (err: any) {
        setError(err?.message || "Error al cargar");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const balance = useMemo(() => {
    if (!receivable) return null;
    return receivable.amount - receivable.paidAmount;
  }, [receivable]);

  if (!loading && !receivable && error) {
    return notFound();
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finanzas</p>
          <h1 className="text-2xl font-semibold text-slate-900">Factura / Receivable</h1>
          <p className="text-sm text-slate-600">Trazabilidad factura → pago → asiento.</p>
        </div>
        <button
          onClick={() => router.push("/admin/finanzas/receivables")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Volver
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {receivable && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Detalle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-800">
            <div className="grid gap-2 md:grid-cols-2">
              <div><span className="text-slate-500">ID:</span> {receivable.id}</div>
              <div><span className="text-slate-500">Cliente:</span> {receivable.party?.name || "—"}</div>
              <div><span className="text-slate-500">Fecha:</span> {receivable.date?.slice(0, 10)}</div>
              <div><span className="text-slate-500">Vence:</span> {receivable.dueDate?.slice(0, 10) || "—"}</div>
              <div><span className="text-slate-500">Monto:</span> {receivable.amount}</div>
              <div><span className="text-slate-500">Pagado:</span> {receivable.paidAmount}</div>
              <div><span className="text-slate-500">Balance:</span> {balance}</div>
              <div><span className="text-slate-500">Estado:</span> {receivable.status}</div>
              <div className="md:col-span-2"><span className="text-slate-500">Referencia:</span> {receivable.reference || "—"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {receivable && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Pagos asociados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.length === 0 && <p className="text-sm text-slate-500">Sin pagos registrados.</p>}
            {payments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Fecha</th>
                      <th className="px-3 py-2 font-semibold text-right">Monto</th>
                      <th className="px-3 py-2 font-semibold">Método</th>
                      <th className="px-3 py-2 font-semibold">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-slate-800">{p.date?.slice(0, 10)}</td>
                        <td className="px-3 py-2 text-right text-slate-800">{p.amount}</td>
                        <td className="px-3 py-2 text-slate-700">{p.method || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{p.reference || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {receivable && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Impacto contable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-1">
            <p>
              Este receivable debería generar un asiento (Journal Entry) al registrarse el pago. Usa{" "}
              <Link href="/admin/finanzas/journal" className="text-brand-primary font-semibold hover:underline">
                /admin/finanzas/journal
              </Link>{" "}
              para verificar el asiento asociado (por referencia o fecha).
            </p>
            <p className="text-xs text-slate-500">
              (Si el endpoint de pago retorna `journalEntryId`, se puede enlazar aquí en una mejora futura.)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
