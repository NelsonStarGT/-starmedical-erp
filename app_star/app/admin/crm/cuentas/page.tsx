"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const adminHeaders = { "x-role": "Administrador" };

type Account = {
  id: string;
  name: string;
  sector?: string | null;
  size?: string | null;
  paymentTerms?: string | null;
  _count?: { contacts: number; deals: number };
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ name: "", sector: "", size: "", paymentTerms: "" });
  const [loading, setLoading] = useState(false);

  async function fetchJson(url: string, options: RequestInit = {}) {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...adminHeaders } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    return json;
  }

  const loadAccounts = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/accounts");
      setAccounts(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleCreate() {
    setLoading(true);
    try {
      await fetchJson("/api/crm/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm({ name: "", sector: "", size: "", paymentTerms: "" });
      await loadAccounts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nueva cuenta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Sector"
            value={form.sector}
            onChange={(e) => setForm({ ...form, sector: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Tamaño"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Condición pago"
            value={form.paymentTerms}
            onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70 md:col-span-4"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Sector</th>
                <th className="px-3 py-2">Tamaño</th>
                <th className="px-3 py-2">Condición</th>
                <th className="px-3 py-2">Contactos</th>
                <th className="px-3 py-2">Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td className="px-3 py-2">{acc.name}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{acc.sector || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{acc.size || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{acc.paymentTerms || "—"}</td>
                  <td className="px-3 py-2 text-xs">{acc._count?.contacts ?? 0}</td>
                  <td className="px-3 py-2 text-xs">{acc._count?.deals ?? 0}</td>
                </tr>
              ))}
              {!accounts.length && (
                <tr>
                  <td className="px-3 py-2 text-sm text-slate-500" colSpan={6}>
                    Sin cuentas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
