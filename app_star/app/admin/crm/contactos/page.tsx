"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const adminHeaders = { "x-role": "Administrador" };

type Account = { id: string; name: string };
type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  account?: Account | null;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({
    accountId: "",
    firstName: "",
    lastName: "",
    position: "",
    email: "",
    phone: ""
  });

  async function fetchJson(url: string, options: RequestInit = {}) {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...adminHeaders } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    return json;
  }

  const loadContacts = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/contacts");
      setContacts(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/accounts");
      setAccounts(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadContacts();
    loadAccounts();
  }, [loadContacts, loadAccounts]);

  async function handleCreate() {
    try {
      await fetchJson("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm({ accountId: "", firstName: "", lastName: "", position: "", email: "", phone: "" });
      await loadContacts();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Apellido"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Puesto"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <button
            onClick={handleCreate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft md:col-span-3"
          >
            Guardar
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contactos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Puesto</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2">{`${c.firstName} ${c.lastName || ""}`}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{c.position || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{c.email || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{c.phone || "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{c.account?.name || "—"}</td>
                </tr>
              ))}
              {!contacts.length && (
                <tr>
                  <td className="px-3 py-2 text-sm text-slate-500" colSpan={5}>
                    Sin contactos.
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
