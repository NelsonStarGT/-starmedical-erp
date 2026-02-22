"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const adminHeaders = { "x-role": "Administrador" };

type Activity = {
  id: string;
  type: string;
  dateTime: string;
  result?: string | null;
  notes?: string | null;
};

export default function ActividadesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState({ type: "CALL", dateTime: new Date().toISOString().slice(0, 16), result: "", notes: "" });

  async function fetchJson(url: string, options: RequestInit = {}) {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...adminHeaders } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    return json;
  }

  const loadActivities = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/activities");
      setActivities(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  async function handleCreate() {
    try {
      await fetchJson("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setForm((prev) => ({ ...prev, result: "", notes: "" }));
      await loadActivities();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nueva actividad</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="CALL">Llamada</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="MEETING">Reunión</option>
          </select>
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.dateTime}
            onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Resultado"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-4"
            placeholder="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <button
            onClick={handleCreate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft md:col-span-4"
          >
            Guardar
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-900">{a.type}</p>
              <p className="text-xs text-slate-500">{new Date(a.dateTime).toLocaleString()}</p>
              <p className="text-xs text-slate-600">{a.result || "—"}</p>
              {a.notes && <p className="text-xs text-slate-500">{a.notes}</p>}
            </div>
          ))}
          {!activities.length && <p className="text-sm text-slate-500">Sin actividades.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
