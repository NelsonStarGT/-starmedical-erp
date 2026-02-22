"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Account = { id: string; name: string; code?: string; type?: string };

type Line = { accountId: string; debit: number | ""; credit: number | ""; memo?: string };

export default function JournalNewPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", debit: 0, credit: "" },
    { accountId: "", debit: "", credit: 0 }
  ]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch("/api/finanzas/accounts", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setAccounts(json?.data || []);
      } catch {
        // ignore: fallback to manual input
      }
    };
    void loadAccounts();
  }, []);

  const totals = useMemo(() => {
    const debit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
    const credit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
    return { debit, credit, balanced: Math.abs(debit - credit) < 0.0001 };
  }, [lines]);

  const updateLine = (idx: number, key: keyof Line, value: any) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, { accountId: "", debit: "", credit: "" }]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!totals.balanced) {
      setError("Débitos y créditos deben cuadrar.");
      return;
    }
    if (lines.some((l) => !l.accountId || (!l.debit && !l.credit))) {
      setError("Cada línea requiere cuenta y valor en débito o crédito.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date,
        reference,
        description,
        legalEntityId: legalEntityId || null,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          memo: l.memo || ""
        }))
      };
      const res = await fetch("/api/finanzas/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear el asiento");
      setSuccess("Asiento creado");
      setTimeout(() => router.push("/admin/finanzas/journal"), 800);
    } catch (err: any) {
      setError(err?.message || "Error al crear");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finanzas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Nuevo asiento contable</h1>
        <p className="text-sm text-slate-600">Debes cuadrar débitos = créditos antes de guardar.</p>
      </div>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Fecha
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm text-slate-700">
              Referencia
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Opcional"
              />
            </label>
            <label className="text-sm text-slate-700">
              Entidad legal
              <input
                type="text"
                value={legalEntityId}
                onChange={(e) => setLegalEntityId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="ID de entidad (opcional)"
              />
            </label>
            <label className="text-sm text-slate-700 md:col-span-2">
              Descripción
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Breve descripción"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Líneas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-slate-200">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <span className="col-span-4">Cuenta</span>
              <span className="col-span-2 text-right">Débito</span>
              <span className="col-span-2 text-right">Crédito</span>
              <span className="col-span-3">Memo</span>
              <span className="col-span-1 text-center">-</span>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-100">
                <div className="col-span-4">
                  <select
                    value={line.accountId}
                    onChange={(e) => updateLine(idx, "accountId", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  >
                    <option value="">Selecciona cuenta</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code ? `${acc.code} · ${acc.name}` : acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={line.debit}
                    onChange={(e) => updateLine(idx, "debit", e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-right"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={line.credit}
                    onChange={(e) => updateLine(idx, "credit", e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm text-right"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={line.memo || ""}
                    onChange={(e) => updateLine(idx, "memo", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    placeholder="Opcional"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-700">
            <button onClick={addLine} className="text-brand-primary font-semibold hover:underline">
              + Añadir línea
            </button>
            <div className="space-x-4">
              <span className="font-semibold">Débito: {totals.debit.toFixed(2)}</span>
              <span className="font-semibold">Crédito: {totals.credit.toFixed(2)}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                )}
              >
                {totals.balanced ? "Balanceado" : "No cuadra"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="flex gap-3">
        <button
          disabled={submitting}
          onClick={submit}
          className="inline-flex items-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/finanzas/journal")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
