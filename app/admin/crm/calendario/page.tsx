"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const adminHeaders = { "x-role": "Administrador" };

type Event = {
  id: string;
  type: string;
  startAt: string;
  endAt?: string | null;
  title: string;
  notes?: string | null;
  leadId?: string | null;
  lead?: { id: string; leadType: string; companyName?: string | null; personName?: string | null } | null;
};

export default function CrmCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState({
    leadId: "",
    type: "LLAMADA",
    startAt: "",
    endAt: "",
    title: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);

  const fetchJson = useCallback(async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), ...adminHeaders } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error");
    return json;
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/calendar");
      setEvents(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchJson]);

  const loadLeads = useCallback(async () => {
    try {
      const json = await fetchJson("/api/crm/leads");
      setLeads(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [fetchJson]);

  useEffect(() => {
    loadEvents();
    loadLeads();
  }, [loadEvents, loadLeads]);

  async function handleCreate() {
    setLoading(true);
    try {
      await fetchJson("/api/crm/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startAt: form.startAt || new Date().toISOString(),
          endAt: form.endAt || null
        })
      });
      setForm({ leadId: "", type: "LLAMADA", startAt: "", endAt: "", title: "", notes: "" });
      await loadEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetchJson(`/api/crm/calendar?id=${id}`, { method: "DELETE" });
      await loadEvents();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Calendario CRM</h1>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft disabled:opacity-70"
        >
          {loading ? "Guardando..." : "Crear recordatorio"}
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo recordatorio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="VISITA">Visita</option>
            <option value="REUNION_VIRTUAL">Reunión virtual</option>
            <option value="LLAMADA">Llamada</option>
            <option value="SEGUIMIENTO">Seguimiento</option>
          </select>
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.startAt}
            onChange={(e) => setForm({ ...form, startAt: e.target.value })}
          />
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.endAt}
            onChange={(e) => setForm({ ...form, endAt: e.target.value })}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.leadId}
            onChange={(e) => setForm({ ...form, leadId: e.target.value })}
          >
            <option value="">Relacionado a lead</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.leadType === "COMPANY" ? l.companyName : l.personName}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3"
            placeholder="Notas"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              Sin eventos programados.
            </div>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                <p className="text-xs text-slate-600">
                  {ev.type} · {new Date(ev.startAt).toLocaleString()}
                </p>
                {ev.lead && (
                  <p className="text-xs text-slate-600">
                    Lead: {ev.lead.leadType === "COMPANY" ? ev.lead.companyName : ev.lead.personName}
                  </p>
                )}
                {ev.notes && <p className="text-xs text-slate-500">{ev.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(ev.id)}
                className="text-[11px] font-semibold text-rose-600 underline"
              >
                Eliminar
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
