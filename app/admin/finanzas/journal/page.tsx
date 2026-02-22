"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type JournalEntry = {
  id: string;
  date: string;
  reference?: string | null;
  description?: string | null;
  status: string;
  totalDebit?: number;
  totalCredit?: number;
  legalEntityId?: string | null;
};

export default function JournalListPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/finanzas/journal-entries", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No se pudo cargar journal entries");
        setEntries(json?.data || []);
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
          <h1 className="text-2xl font-semibold text-slate-900">Asientos contables</h1>
          <p className="text-sm text-slate-600">Crea y revisa asientos manuales.</p>
        </div>
        <Link
          href="/admin/finanzas/journal/new"
          className="inline-flex items-center rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow hover:bg-brand-primary/90"
        >
          Nuevo asiento
        </Link>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Listado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-slate-500">Cargando...</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && entries.length === 0 && (
            <p className="text-sm text-slate-500">Sin asientos aún.</p>
          )}
          {!loading && !error && entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Fecha</th>
                    <th className="px-3 py-2 font-semibold">Referencia</th>
                    <th className="px-3 py-2 font-semibold">Descripción</th>
                    <th className="px-3 py-2 font-semibold">Débito</th>
                    <th className="px-3 py-2 font-semibold">Crédito</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-3 py-2 text-slate-800">{entry.date?.slice(0, 10)}</td>
                      <td className="px-3 py-2 text-slate-800">{entry.reference || "—"}</td>
                      <td className="px-3 py-2 text-slate-700">{entry.description || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{entry.totalDebit ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-800">{entry.totalCredit ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-semibold",
                            entry.status === "posted"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {entry.status || "draft"}
                        </span>
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
