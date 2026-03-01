"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompactTable } from "@/components/memberships/CompactTable";
import { EmptyState } from "@/components/memberships/EmptyState";
import { MembershipsShell } from "@/components/memberships/MembershipsShell";

type PharmacyConfig = {
  id: number;
  medicationEnabled: boolean;
  discountEnabled: boolean;
  reminderLeadDays: number;
  discountSource?: "DB" | "ENV";
};

type QueueFlags = {
  prepared: boolean;
  contacted: boolean;
  delivered: boolean;
  pickupReady: boolean;
  billingLinked: boolean;
};

type MedicationSubscription = {
  id: string;
  patientId: string;
  branchId?: string | null;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM_DAYS";
  customDays?: number | null;
  nextFillAt: string;
  lastFillAt?: string | null;
  deliveryMethod: "PICKUP" | "DELIVERY";
  contactPreference: "CALL" | "WHATSAPP" | "EMAIL";
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  notes?: string | null;
  items: Array<{ id: string; medicationId: string; qty: number; instructions?: string | null }>;
  queueFlags?: QueueFlags;
  daysUntilNextFill?: number;
};

type DiscountPlan = {
  id: string;
  name: string;
  percentage: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type DiscountSubscription = {
  id: string;
  planId: string;
  patientId?: string | null;
  clientId?: string | null;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  startedAt: string;
  plan: DiscountPlan;
};

type TabId = "medicamentos" | "descuento" | "config";

const TAB_STYLE = "rounded-lg border px-3 py-2 text-xs font-semibold transition";

function dateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SubscriptionsPharmacyPage() {
  const [activeTab, setActiveTab] = useState<TabId>("medicamentos");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [config, setConfig] = useState<PharmacyConfig>({ id: 1, medicationEnabled: true, discountEnabled: false, reminderLeadDays: 3, discountSource: "DB" });
  const [subscriptions, setSubscriptions] = useState<MedicationSubscription[]>([]);
  const [queue, setQueue] = useState<MedicationSubscription[]>([]);
  const [discountPlans, setDiscountPlans] = useState<DiscountPlan[]>([]);
  const [discountSubscriptions, setDiscountSubscriptions] = useState<DiscountSubscription[]>([]);

  const [newMedication, setNewMedication] = useState({
    patientId: "",
    medicationId: "",
    qty: "1",
    frequency: "MONTHLY",
    customDays: "",
    nextFillAt: new Date().toISOString().slice(0, 10),
    deliveryMethod: "PICKUP",
    contactPreference: "WHATSAPP",
    notes: ""
  });

  const [newDiscountPlan, setNewDiscountPlan] = useState({
    name: "",
    percentage: "10"
  });

  const [newDiscountSubscription, setNewDiscountSubscription] = useState({
    planId: "",
    patientId: "",
    clientId: ""
  });

  const queueCounters = useMemo(() => {
    return queue.reduce(
      (acc, row) => {
        const days = typeof row.daysUntilNextFill === "number" ? row.daysUntilNextFill : 99;
        if (days <= 0) acc.today += 1;
        if (days <= 3) acc.in3 += 1;
        if (days <= 7) acc.in7 += 1;
        return acc;
      },
      { today: 0, in3: 0, in7: 0 }
    );
  }, [queue]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [configRes, subsRes, queueRes, plansRes, discountSubsRes] = await Promise.all([
        fetch("/api/subscriptions/pharmacy/config", { cache: "no-store" }),
        fetch("/api/subscriptions/pharmacy/medication-subscriptions?take=100", { cache: "no-store" }),
        fetch("/api/subscriptions/pharmacy/queue?windowDays=7", { cache: "no-store" }),
        fetch("/api/subscriptions/pharmacy/discount-plans?includeInactive=true&take=100", { cache: "no-store" }),
        fetch("/api/subscriptions/pharmacy/discount-subscriptions?take=100", { cache: "no-store" })
      ]);

      const configJson = await configRes.json();
      const subsJson = await subsRes.json();
      const queueJson = await queueRes.json();
      const plansJson = await plansRes.json();
      const discountSubsJson = await discountSubsRes.json();

      if (!configRes.ok) throw new Error(configJson?.error || "No se pudo cargar configuración de farmacia");
      if (!subsRes.ok) throw new Error(subsJson?.error || "No se pudieron cargar suscripciones de medicamento");
      if (!queueRes.ok) throw new Error(queueJson?.error || "No se pudo cargar cola operativa");
      if (!plansRes.ok) throw new Error(plansJson?.error || "No se pudieron cargar planes de descuento");
      if (!discountSubsRes.ok) throw new Error(discountSubsJson?.error || "No se pudieron cargar suscripciones de descuento");

      setConfig(configJson?.data);
      setSubscriptions(Array.isArray(subsJson?.data) ? subsJson.data : []);
      setQueue(Array.isArray(queueJson?.data) ? queueJson.data : []);
      setDiscountPlans(Array.isArray(plansJson?.data) ? plansJson.data : []);
      setDiscountSubscriptions(Array.isArray(discountSubsJson?.data) ? discountSubsJson.data : []);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar farmacia");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createMedicationSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setBusyId("create-medication");
      const res = await fetch("/api/subscriptions/pharmacy/medication-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: newMedication.patientId,
          frequency: newMedication.frequency,
          customDays: newMedication.frequency === "CUSTOM_DAYS" ? Number(newMedication.customDays || 0) : null,
          nextFillAt: new Date(`${newMedication.nextFillAt}T09:00:00`).toISOString(),
          deliveryMethod: newMedication.deliveryMethod,
          contactPreference: newMedication.contactPreference,
          notes: newMedication.notes || null,
          items: [
            {
              medicationId: newMedication.medicationId,
              qty: Number(newMedication.qty || 1)
            }
          ]
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear suscripción");

      setNewMedication({
        patientId: "",
        medicationId: "",
        qty: "1",
        frequency: "MONTHLY",
        customDays: "",
        nextFillAt: new Date().toISOString().slice(0, 10),
        deliveryMethod: "PICKUP",
        contactPreference: "WHATSAPP",
        notes: ""
      });

      setMessage("Suscripción por medicamento creada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear suscripción");
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(subscriptionId: string, status: "ACTIVE" | "PAUSED" | "CANCELLED") {
    try {
      setBusyId(subscriptionId);
      const res = await fetch(`/api/subscriptions/pharmacy/medication-subscriptions/${subscriptionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo actualizar estado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar estado");
    } finally {
      setBusyId(null);
    }
  }

  async function registerEvent(subscriptionId: string, eventType: "PREPARED" | "CONTACTED" | "DELIVERED" | "PICKUP_READY" | "BILLING_LINK") {
    try {
      setBusyId(subscriptionId);
      const res = await fetch(`/api/subscriptions/pharmacy/medication-subscriptions/${subscriptionId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo registrar evento");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo registrar evento");
    } finally {
      setBusyId(null);
    }
  }

  async function createDiscountPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setBusyId("create-discount-plan");
      const res = await fetch("/api/subscriptions/pharmacy/discount-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDiscountPlan.name,
          percentage: Number(newDiscountPlan.percentage || 0),
          isActive: true
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear plan de descuento");
      setNewDiscountPlan({ name: "", percentage: "10" });
      setMessage("Plan de descuento creado");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear plan de descuento");
    } finally {
      setBusyId(null);
    }
  }

  async function createDiscountSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setBusyId("create-discount-sub");
      const res = await fetch("/api/subscriptions/pharmacy/discount-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: newDiscountSubscription.planId,
          patientId: newDiscountSubscription.patientId || null,
          clientId: newDiscountSubscription.clientId || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo crear suscripción de descuento");
      setNewDiscountSubscription({ planId: "", patientId: "", clientId: "" });
      setMessage("Suscripción de descuento creada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear suscripción de descuento");
    } finally {
      setBusyId(null);
    }
  }

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      setBusyId("save-config");
      const res = await fetch("/api/subscriptions/pharmacy/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationEnabled: config.medicationEnabled,
          discountEnabled: config.discountEnabled,
          reminderLeadDays: Number(config.reminderLeadDays)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar configuración");
      setMessage("Configuración de farmacia guardada");
      await loadAll();
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar configuración");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <MembershipsShell
      title="Suscripciones · Farmacia"
      description="Operación de tratamiento recurrente y preparación del programa de descuento. Cobranza y facturación se ejecutan en Facturación/Finanzas."
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("medicamentos")}
          className={`${TAB_STYLE} ${
            activeTab === "medicamentos"
              ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
          }`}
        >
          Suscripciones por medicamento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("descuento")}
          className={`${TAB_STYLE} ${
            activeTab === "descuento"
              ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
          }`}
        >
          Suscripción de descuento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={`${TAB_STYLE} ${
            activeTab === "config"
              ? "border-[#4aa59c] bg-[#4aa59c]/10 text-[#2e75ba]"
              : "border-slate-200 bg-white text-slate-700 hover:border-[#4aadf5]"
          }`}
        >
          Configuración
        </button>
      </div>

      {loading ? <p className="text-xs text-slate-500">Cargando farmacia...</p> : null}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs font-semibold text-emerald-700">{message}</p> : null}

      {activeTab === "medicamentos" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cola hoy</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueCounters.today}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cola 3 días</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueCounters.in3}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cola 7 días</p>
              <p className="mt-1 text-lg font-semibold text-[#2e75ba]">{queueCounters.in7}</p>
            </article>
          </div>

          <form onSubmit={createMedicationSubscription} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-5">
            <input
              required
              value={newMedication.patientId}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, patientId: event.target.value }))}
              placeholder="Paciente ID"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <input
              required
              value={newMedication.medicationId}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, medicationId: event.target.value }))}
              placeholder="Medicamento ID"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <input
              required
              type="number"
              min={1}
              step="0.01"
              value={newMedication.qty}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, qty: event.target.value }))}
              placeholder="Cantidad"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <select
              value={newMedication.frequency}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, frequency: event.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            >
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quincenal</option>
              <option value="MONTHLY">Mensual</option>
              <option value="CUSTOM_DAYS">Custom (días)</option>
            </select>
            <input
              type="date"
              value={newMedication.nextFillAt}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, nextFillAt: event.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />

            {newMedication.frequency === "CUSTOM_DAYS" ? (
              <input
                required
                type="number"
                min={1}
                max={365}
                value={newMedication.customDays}
                onChange={(event) => setNewMedication((prev) => ({ ...prev, customDays: event.target.value }))}
                placeholder="Días custom"
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
              />
            ) : (
              <div className="hidden md:block" />
            )}

            <select
              value={newMedication.deliveryMethod}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, deliveryMethod: event.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            >
              <option value="PICKUP">Pickup</option>
              <option value="DELIVERY">Delivery</option>
            </select>

            <select
              value={newMedication.contactPreference}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, contactPreference: event.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            >
              <option value="CALL">Llamada</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>

            <input
              value={newMedication.notes}
              onChange={(event) => setNewMedication((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notas operativas"
              className="md:col-span-2 rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />

            <button
              type="submit"
              disabled={busyId === "create-medication"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
            >
              Crear suscripción
            </button>
          </form>

          {subscriptions.length === 0 ? (
            <EmptyState
              title="Sin suscripciones por medicamento"
              description="Crea la primera suscripción para activar la cola operativa de farmacia."
            />
          ) : (
            <CompactTable columns={["Paciente", "Medicamentos", "Próximo surtido", "Canal", "Estado", "Acciones"]}>
              {subscriptions.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-slate-800">
                    <p>{row.patientId}</p>
                    <p className="text-[11px] text-slate-500">{row.branchId || "Sin sede"}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.items.map((item) => `${item.medicationId} x${item.qty}`).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <p>{dateLabel(row.nextFillAt)}</p>
                    <p className="text-[11px] text-slate-500">{row.frequency === "CUSTOM_DAYS" ? `${row.customDays} días` : row.frequency}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    <p>{row.deliveryMethod}</p>
                    <p className="text-[11px] text-slate-500">{row.contactPreference}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        row.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "PAUSED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => registerEvent(row.id, "PREPARED")}
                        disabled={busyId === row.id}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        Preparado
                      </button>
                      <button
                        type="button"
                        onClick={() => registerEvent(row.id, "CONTACTED")}
                        disabled={busyId === row.id}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        Contactado
                      </button>
                      <button
                        type="button"
                        onClick={() => registerEvent(row.id, "DELIVERED")}
                        disabled={busyId === row.id}
                        className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                      >
                        Entregado
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(row.id, row.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
                        disabled={busyId === row.id || row.status === "CANCELLED"}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
                      >
                        {row.status === "ACTIVE" ? "Pausar" : "Reactivar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(row.id, "CANCELLED")}
                        disabled={busyId === row.id || row.status === "CANCELLED"}
                        className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <Link
                        href={`/admin/facturacion?source=pharmacy&subscriptionId=${encodeURIComponent(row.id)}`}
                        className="rounded-md border border-[#4aa59c] px-2 py-1 text-[11px] font-semibold text-[#4aa59c]"
                        onClick={() => {
                          registerEvent(row.id, "BILLING_LINK");
                        }}
                      >
                        Generar cobro
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </CompactTable>
          )}
        </div>
      ) : null}

      {activeTab === "descuento" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs text-slate-700">
            <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">Próximamente</span>
            <p className="mt-2">
              La suscripción de descuento está preparada en DB/API. Estado actual: <strong>{config.discountEnabled ? "habilitada" : "deshabilitada"}</strong>.
            </p>
          </div>

          <form onSubmit={createDiscountPlan} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-3">
            <input
              required
              value={newDiscountPlan.name}
              onChange={(event) => setNewDiscountPlan((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nombre plan descuento"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <input
              required
              type="number"
              min={1}
              max={100}
              step="0.01"
              value={newDiscountPlan.percentage}
              onChange={(event) => setNewDiscountPlan((prev) => ({ ...prev, percentage: event.target.value }))}
              placeholder="% descuento"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={busyId === "create-discount-plan"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
            >
              Crear plan
            </button>
          </form>

          <form onSubmit={createDiscountSubscription} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
            <select
              required
              value={newDiscountSubscription.planId}
              onChange={(event) => setNewDiscountSubscription((prev) => ({ ...prev, planId: event.target.value }))}
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            >
              <option value="">Plan de descuento</option>
              {discountPlans.filter((plan) => plan.isActive).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.percentage}%)
                </option>
              ))}
            </select>
            <input
              value={newDiscountSubscription.patientId}
              onChange={(event) => setNewDiscountSubscription((prev) => ({ ...prev, patientId: event.target.value }))}
              placeholder="Paciente ID"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <input
              value={newDiscountSubscription.clientId}
              onChange={(event) => setNewDiscountSubscription((prev) => ({ ...prev, clientId: event.target.value }))}
              placeholder="Cliente ID (opcional)"
              className="rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={!config.discountEnabled || busyId === "create-discount-sub"}
              className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Crear suscripción descuento
            </button>
          </form>

          <CompactTable columns={["Plan", "%", "Estado", "Vigencia"]}>
            {discountPlans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-3 py-2 text-slate-800">{plan.name}</td>
                <td className="px-3 py-2 text-slate-800">{plan.percentage}%</td>
                <td className="px-3 py-2 text-slate-800">{plan.isActive ? "ACTIVO" : "INACTIVO"}</td>
                <td className="px-3 py-2 text-slate-700">
                  {dateLabel(plan.startsAt)} - {dateLabel(plan.endsAt)}
                </td>
              </tr>
            ))}
          </CompactTable>

          {discountSubscriptions.length > 0 ? (
            <CompactTable columns={["Paciente", "Plan", "Estado", "Inicio"]}>
              {discountSubscriptions.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-slate-800">{row.patientId || row.clientId || "-"}</td>
                  <td className="px-3 py-2 text-slate-800">{row.plan?.name || "-"}</td>
                  <td className="px-3 py-2 text-slate-800">{row.status}</td>
                  <td className="px-3 py-2 text-slate-700">{dateLabel(row.startedAt)}</td>
                </tr>
              ))}
            </CompactTable>
          ) : null}
        </div>
      ) : null}

      {activeTab === "config" ? (
        <form onSubmit={saveConfig} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
            Operación de suscripción por medicamento
            <input
              type="checkbox"
              checked={config.medicationEnabled}
              onChange={(event) => setConfig((prev) => ({ ...prev, medicationEnabled: event.target.checked }))}
              className="h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
            Habilitar suscripción de descuento
            <input
              type="checkbox"
              checked={config.discountEnabled}
              onChange={(event) => setConfig((prev) => ({ ...prev, discountEnabled: event.target.checked }))}
              className="h-4 w-4"
            />
          </label>

          <label className="block rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
            Días previos para recordatorio operativo
            <input
              type="number"
              min={1}
              max={30}
              value={config.reminderLeadDays}
              onChange={(event) => setConfig((prev) => ({ ...prev, reminderLeadDays: Number(event.target.value || 3) }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
            />
          </label>

          <p className="text-[11px] text-slate-500">Fuente de feature flag descuento: {config.discountSource || "DB"}.</p>

          <button
            type="submit"
            disabled={busyId === "save-config"}
            className="rounded-lg bg-[#4aa59c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4aadf5] disabled:opacity-60"
          >
            Guardar configuración
          </button>
        </form>
      ) : null}
    </MembershipsShell>
  );
}
